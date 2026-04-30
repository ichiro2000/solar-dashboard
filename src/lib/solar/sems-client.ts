import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  CrossLoginData,
  SemsEnvelope,
} from "./sems-schemas";

/**
 * Low-level SEMS HTTP client.
 *
 * Handles:
 *  - CrossLogin auth + persisted, encrypted token cache
 *  - Regional host routing (auto / eu / us / au / hk)
 *  - 100001 (token expired) → re-login + retry once
 *  - 100002 (wrong region)  → swap host + retry
 *  - Single-flighted re-auth (concurrent calls share one login promise)
 *  - Global single-flight on the request itself (SEMS hates concurrency)
 *
 * Reference: github.com/markruys/gw2pvo, github.com/TimSoethout/goodwe-sems-home-assistant
 */

const ROOT = "https://www.semsportal.com/api/";
const REGION_HOSTS: Record<string, string> = {
  eu: "https://eu.semsportal.com/api/",
  us: "https://us.semsportal.com/api/",
  au: "https://au.semsportal.com/api/",
  hk: "https://hk.semsportal.com/api/",
};

const INITIAL_TOKEN_HEADER = JSON.stringify({
  version: "v2.1.0",
  client: "ios",
  language: "en",
});

const USER_AGENT = "PVMaster/2.0.4 (iPhone; iOS 11.4.1; Scale/2.00)";

class SemsError extends Error {
  constructor(
    message: string,
    public readonly code?: number | string,
  ) {
    super(message);
    this.name = "SemsError";
  }
}

interface Session {
  apiHost: string;
  tokenJson: string; // raw JSON string used as the `Token` header
}

let _session: Session | null = null;
let _loginPromise: Promise<Session> | null = null;
let _requestQueue: Promise<unknown> = Promise.resolve();

function configuredRegion(): keyof typeof REGION_HOSTS | null {
  const r = (process.env.SEMS_REGION ?? "auto").toLowerCase();
  if (r === "auto") return null;
  if (r in REGION_HOSTS) return r as keyof typeof REGION_HOSTS;
  return null;
}

function ensureCreds(): { account: string; pwd: string } {
  const account = process.env.SEMS_ACCOUNT;
  const pwd = process.env.SEMS_PASSWORD;
  if (!account || !pwd) {
    throw new SemsError(
      "SEMS_ACCOUNT and SEMS_PASSWORD must be set when DATA_SOURCE=sems",
    );
  }
  return { account, pwd };
}

async function loadPersistedSession(): Promise<Session | null> {
  try {
    const row = await prisma.semsSession.findUnique({ where: { id: "singleton" } });
    if (!row) return null;
    if (row.expiresAt < new Date()) return null;
    const tokenJson = decrypt(row.tokenCipher);
    return { apiHost: row.apiHost, tokenJson };
  } catch (err) {
    logger.warn({ err }, "failed to load persisted SEMS session");
    return null;
  }
}

async function persistSession(s: Session, region: string) {
  const expiresAt = new Date(Date.now() + 20 * 60 * 60 * 1000); // 20h, conservative
  const tokenCipher = encrypt(s.tokenJson);
  await prisma.semsSession.upsert({
    where: { id: "singleton" },
    update: { apiHost: s.apiHost, tokenCipher, expiresAt, region },
    create: {
      id: "singleton",
      apiHost: s.apiHost,
      tokenCipher,
      expiresAt,
      region,
    },
  });
}

async function clearSession() {
  _session = null;
  await prisma.semsSession
    .delete({ where: { id: "singleton" } })
    .catch(() => undefined);
}

async function login(): Promise<Session> {
  if (_loginPromise) return _loginPromise;
  _loginPromise = (async () => {
    const { account, pwd } = ensureCreds();
    const region = configuredRegion();
    const loginUrl = (region ? REGION_HOSTS[region] ?? ROOT : ROOT) + "v2/Common/CrossLogin";

    logger.info({ region: region ?? "auto" }, "SEMS login");

    const res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        Token: INITIAL_TOKEN_HEADER,
      },
      body: JSON.stringify({
        account,
        pwd,
        // SEMS now requires explicit agreement acknowledgement on login —
        // without these two fields the response carries no token.
        agreement_agreement: 1,
        is_local: false,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new SemsError(`CrossLogin HTTP ${res.status}`);
    }

    const raw = await res.json();
    const env = SemsEnvelope.parse(raw);
    const code = typeof env.code === "string" ? Number(env.code) : env.code ?? 0;

    // SEMS often signals invalid credentials with `hasError: false` and a non-
    // zero `code` plus an empty `data`. Treat anything other than code 0 with
    // a token-shaped data payload as a failure with a helpful message.
    if (env.hasError || (code !== 0 && code !== 100002)) {
      logger.warn(
        { code, msg: env.msg, hasData: !!env.data },
        "SEMS CrossLogin rejected — check SEMS_ACCOUNT / SEMS_PASSWORD",
      );
      throw new SemsError(
        `CrossLogin failed: ${env.msg ?? "unknown"} (code ${code})`,
        code,
      );
    }

    if (
      !env.data ||
      typeof env.data !== "object" ||
      !("token" in env.data) ||
      !(env.data as { token?: unknown }).token
    ) {
      logger.warn(
        { code, msg: env.msg, dataPreview: JSON.stringify(env.data).slice(0, 200) },
        "SEMS CrossLogin returned no token — credentials likely invalid",
      );
      throw new SemsError(
        `CrossLogin returned no token: ${env.msg ?? "credentials likely invalid"}`,
        code,
      );
    }

    const tokenData = CrossLoginData.parse(env.data);
    const apiHost =
      env.api ??
      env.components?.api ??
      (region ? REGION_HOSTS[region] ?? ROOT : ROOT);

    const session: Session = { apiHost, tokenJson: JSON.stringify(tokenData) };
    _session = session;
    await persistSession(session, region ?? "auto");
    return session;
  })().finally(() => {
    _loginPromise = null;
  });
  return _loginPromise;
}

async function getSession(): Promise<Session> {
  if (_session) return _session;
  const persisted = await loadPersistedSession();
  if (persisted) {
    _session = persisted;
    return persisted;
  }
  return login();
}

interface CallOptions {
  /** Retry budget for transparent error recovery */
  attempt?: number;
}

/** Single-flighted POST against the SEMS regional API host. */
async function call<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  opts: CallOptions = {},
): Promise<T> {
  // Serialize all SEMS calls — concurrency triggers token invalidation.
  const next = _requestQueue.then(() => callInner<T>(path, body, opts));
  _requestQueue = next.catch(() => undefined);
  return next;
}

async function callInner<T>(
  path: string,
  body: Record<string, unknown>,
  opts: CallOptions,
): Promise<T> {
  const session = await getSession();
  const url = session.apiHost.replace(/\/$/, "/") + path.replace(/^\//, "");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      Token: session.tokenJson,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new SemsError(`${path} HTTP ${res.status}`);
  }

  const json = await res.json();
  const env = SemsEnvelope.parse(json);
  const code = typeof env.code === "string" ? Number(env.code) : env.code ?? 0;

  if (code === 0 && !env.hasError) {
    return env.data as T;
  }

  const attempt = opts.attempt ?? 0;

  // SEMS uses 100002 for two cases (distinguished by presence of `api`):
  //   - Wrong region:   carries new `api` host → swap host, retry
  //   - Auth expired:   no `api` → message says "authorization expired"
  // SEMS uses 100001 for explicit token-expired in older paths.
  const newHost = env.api ?? env.components?.api;
  if (code === 100002 && newHost) {
    if (attempt >= 2) throw new SemsError("region redirect loop", code);
    _session = { apiHost: newHost, tokenJson: session.tokenJson };
    return callInner<T>(path, body, { attempt: attempt + 1 });
  }

  const looksLikeAuthExpired =
    code === 100001 ||
    (code === 100002 && !newHost) ||
    (typeof env.msg === "string" && /authoriz|expired|log in again/i.test(env.msg));

  if (looksLikeAuthExpired) {
    if (attempt >= 1) throw new SemsError(env.msg ?? "auth expired (max retries)", code);
    await clearSession();
    return callInner<T>(path, body, { attempt: attempt + 1 });
  }

  throw new SemsError(env.msg ?? "SEMS error", code);
}

export const semsClient = {
  /** Force a fresh login on next call. */
  invalidate: clearSession,
  call,
};

export { SemsError };
