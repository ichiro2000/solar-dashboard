import { z } from "zod";

/**
 * SEMS responses are loosely typed and drift between v1/v2/v3.
 * Schemas below stay tolerant: extra fields are ignored, missing
 * optional fields are coerced. Anything we actually rely on is required.
 */

export const SemsEnvelope = z.object({
  hasError: z.boolean().optional(),
  code: z.union([z.number(), z.string()]).optional(),
  msg: z.string().optional(),
  data: z.unknown(),
  // Newer SEMS responses expose the regional api host at the top level.
  // Older responses (and 100002 redirects) carry it under `components.api`.
  api: z.string().optional(),
  components: z
    .object({
      api: z.string().nullish(),
      msgSocketAdr: z.string().nullish(),
    })
    .passthrough()
    .nullish(),
});
export type SemsEnvelope = z.infer<typeof SemsEnvelope>;

export const CrossLoginData = z.object({
  uid: z.string(),
  timestamp: z.union([z.number(), z.string()]).transform(String),
  token: z.string(),
  client: z.string().default("ios"),
  version: z.string().default("v2.1.0"),
  language: z.string().default("en"),
});
export type CrossLoginData = z.infer<typeof CrossLoginData>;

const PlantStation = z.object({
  powerstation_id: z.string(),
  stationname: z.string().optional(),
  name: z.string().optional(),
  capacity: z.coerce.number().optional(),
  status: z.coerce.number().optional(),
  location: z.string().optional(),
  longitude: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  time_zone: z.coerce.number().optional(),
});

export const PowerStationListData = z.object({
  list: z.array(PlantStation).default([]),
});

const InverterDetail = z.object({
  d: z
    .object({
      pac: z.coerce.number().optional(),
      eday: z.coerce.number().optional(),
      etotal: z.coerce.number().optional(),
      // Yes — typo is real upstream. Don't "fix" it.
      tempperature: z.coerce.number().optional(),
      status: z.coerce.number().optional(),
      workmode: z.coerce.number().optional(),
      last_refresh_time: z.string().optional(),
    })
    .partial()
    .default({}),
  invert_full: z.record(z.unknown()).optional(),
});

const SocBlock = z
  .object({
    power: z.coerce.number().optional(),
    soc: z.coerce.number().optional(),
    status: z.coerce.number().optional(),
  })
  .partial();

const KpiBlock = z
  .object({
    pac: z.coerce.number().optional(),
    pmeter: z.coerce.number().optional(),
    pload: z.coerce.number().optional(),
    power: z.coerce.number().optional(),
    yield_rate: z.coerce.number().optional(),
    month_generation: z.coerce.number().optional(),
    total_power: z.coerce.number().optional(),
  })
  .partial();

const InfoBlock = z
  .object({
    powerstation_id: z.string().optional(),
    stationname: z.string().optional(),
    capacity: z.coerce.number().optional(),
    status: z.coerce.number().optional(),
    org_name: z.string().optional(),
    longitude: z.coerce.number().optional(),
    latitude: z.coerce.number().optional(),
    time_zone: z.coerce.number().optional(),
  })
  .partial();

export const MonitorDetailData = z
  .object({
    info: InfoBlock.default({}),
    kpi: KpiBlock.default({}),
    soc: SocBlock.default({}),
    inverter: z.array(InverterDetail).default([]),
    energeStatisticsCharts: z.record(z.unknown()).optional(),
    powerflow: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const PowerByDayData = z.object({
  lines: z
    .array(
      z.object({
        xy: z
          .array(
            z.object({
              x: z.union([z.string(), z.number()]),
              y: z.coerce.number(),
            }),
          )
          .default([]),
      }),
    )
    .default([]),
});

const WarningRow = z.object({
  warning_id: z.union([z.string(), z.number()]).transform(String).optional(),
  id: z.union([z.string(), z.number()]).transform(String).optional(),
  warning_code: z.union([z.string(), z.number()]).transform(String).optional(),
  error_code: z.union([z.string(), z.number()]).transform(String).optional(),
  warningname: z.string().optional(),
  warning_message: z.string().optional(),
  message: z.string().optional(),
  fault_class: z.coerce.number().optional(),
  status: z.coerce.number().optional(),
  happentime: z.string().optional(),
  recoverytime: z.string().optional(),
});

export const WarningListData = z.object({
  list: z.array(WarningRow).default([]),
  record: z.array(WarningRow).optional(),
});

export const ChartByPlantData = z
  .object({
    lines: z
      .array(
        z.object({
          xy: z
            .array(
              z.object({
                x: z.union([z.string(), z.number()]),
                y: z.coerce.number(),
              }),
            )
            .default([]),
        }),
      )
      .default([]),
  })
  .or(
    z.object({
      list: z.array(z.unknown()).default([]),
    }),
  );
