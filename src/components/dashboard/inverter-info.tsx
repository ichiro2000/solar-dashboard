import { Cpu, Thermometer } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  sn?: string;
  model?: string;
  workMode?: string;
  firmware?: string;
  batteryCapacityKwh?: number;
  gridVoltage?: string;
  inverterTempC?: number;
}

export function InverterInfo(props: Props) {
  const rows: Array<[string, string | undefined]> = [
    ["Model", props.model],
    ["Serial", props.sn],
    ["Mode", props.workMode],
    [
      "Battery",
      props.batteryCapacityKwh !== undefined
        ? `${props.batteryCapacityKwh.toFixed(1)} kWh`
        : undefined,
    ],
    ["Grid V", props.gridVoltage],
    ["Firmware", props.firmware],
  ];
  const visible = rows.filter(([, v]) => v && v.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="size-4 text-muted-foreground" />
          Inverter
          {props.inverterTempC !== undefined && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Thermometer className="size-3" />
              {props.inverterTempC.toFixed(1)}°C
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {visible.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="truncate font-mono text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
