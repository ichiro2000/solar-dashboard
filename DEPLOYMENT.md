# Deployment to DigitalOcean App Platform

This is a one-shot deployment guide. Total time: ~10 minutes (most of which
is App Platform's first build).

## Prerequisites

- `doctl` authenticated (already done — you're logged in as `default`)
- GitHub repo: https://github.com/ichiro2000/solar-dashboard (private)

## Cost estimate

- **Web service** (`basic-xxs`): **$5 / month**
- **Postgres dev DB**: **$7 / month** *(or skip — see "No-DB option" below)*
- **Total**: ~$12 / month, ~$0.40 / day

You can destroy the app at any time with `doctl apps delete <APP_ID>` and
billing stops within an hour.

---

## Step 1 — Generate production secrets

Run this **once**, save the output somewhere safe:

```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "SESSION_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "DASHBOARD_PASSWORD_HASH=$(node -e "console.log(require('bcryptjs').hashSync('YOUR-DASHBOARD-PASSWORD', 10))")"
```

(Replace `YOUR-DASHBOARD-PASSWORD` with whatever you'll type into the login
page in production. Keep it different from your SEMS portal password.)

## Step 2 — First deployment

```bash
cd "/Users/ichirosadeepa-m4/Documents/Claude AI/Solar System"

# Connect doctl to your GitHub if not already done:
doctl apps create --spec .do/app.yaml
```

DO will:
1. Read `.do/app.yaml`
2. Pull from your GitHub repo
3. Provision a Postgres database (named `db`)
4. Build via the `Dockerfile`
5. Deploy with `instance_size_slug: basic-xxs`

Note the `App ID` it returns — save it.

```bash
APP_ID="<paste app id here>"
```

## Step 3 — Set the secret env vars

DO won't let you commit secrets in `app.yaml`. Set them after creation:

```bash
doctl apps update $APP_ID --spec - <<EOF
$(cat .do/app.yaml)

  - name: web
    envs:
      - key: SEMS_ACCOUNT
        value: '<your goodwe email>'
        type: SECRET
        scope: RUN_TIME
      - key: SEMS_PASSWORD
        value: '<your goodwe password>'
        type: SECRET
        scope: RUN_TIME
      - key: NEXTAUTH_SECRET
        value: '<from step 1>'
        type: SECRET
        scope: RUN_TIME
      - key: SESSION_ENCRYPTION_KEY
        value: '<from step 1>'
        type: SECRET
        scope: RUN_TIME
      - key: DASHBOARD_PASSWORD_HASH
        value: '<bcrypt hash from step 1>'
        type: SECRET
        scope: RUN_TIME
EOF
```

…or much easier: **open the DO control panel** at
https://cloud.digitalocean.com/apps → your app → Settings → App-Level
Environment Variables → add each `SECRET` one through the UI. Less
error-prone for the bcrypt hash with its `$` characters.

## Step 4 — Wait for the first build (~5 min)

```bash
doctl apps get $APP_ID --format Phase,UpdatedAt,LiveURL --no-header
# When Phase=ACTIVE, the LiveURL is ready
```

You'll get a URL like `https://solar-dashboard-xxxxx.ondigitalocean.app`.
Open it in a browser, log in with whatever password matches your bcrypt
hash, and your live SEMS data appears.

## Step 5 — Subsequent deploys

Every push to `main` triggers a fresh build automatically (because
`deploy_on_push: true` is set in `.do/app.yaml`). Manual force-deploy:

```bash
doctl apps create-deployment $APP_ID --force-rebuild
```

## Useful commands

```bash
doctl apps list                                 # all apps
doctl apps logs $APP_ID --type=run --follow     # tail run-time logs
doctl apps logs $APP_ID --type=build            # build logs
doctl apps update $APP_ID --spec .do/app.yaml   # apply spec changes
doctl apps delete $APP_ID                       # nuke the app + DB
```

## No-DB option (cheaper, $5/mo total)

If you're OK with history resetting on every deploy, remove the
`databases:` block from `.do/app.yaml` and keep `DATABASE_URL` pointing at
SQLite:

```yaml
envs:
  - key: DATABASE_URL
    value: file:/tmp/solar.db
```

Sampler still runs in-process; you just lose history across container
restarts.

## Custom domain

1. DO control panel → your app → Settings → Domains → Add Domain
2. Add a CNAME record at your DNS host pointing to the app's
   `*.ondigitalocean.app` URL
3. DO will issue a Let's Encrypt cert automatically

## Tearing it all down

```bash
doctl apps delete $APP_ID
# DB is deleted with the app. Billing stops.
```
