import { Cloud, CloudDrizzle, CloudRain, CloudSnow, MapPin, Sun, Wind } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  description: string;
  temperatureC: number;
  humidityPct?: number;
  cloudCoverPct?: number;
  windKph?: number;
  location?: string;
}

function pickIcon(description: string) {
  const d = description.toLowerCase();
  if (d.includes("snow")) return <CloudSnow className="size-7 text-sky-300" />;
  if (d.includes("drizzle")) return <CloudDrizzle className="size-7 text-sky-400" />;
  if (d.includes("rain")) return <CloudRain className="size-7 text-sky-400" />;
  if (d.includes("cloud")) return <Cloud className="size-7 text-zinc-300" />;
  return <Sun className="size-7 text-amber-400" />;
}

export function WeatherCard({
  description,
  temperatureC,
  humidityPct,
  cloudCoverPct,
  windKph,
  location,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditions</CardTitle>
        {location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {location}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {pickIcon(description)}
          <div>
            <div className="text-2xl font-semibold tabular-nums">
              {Math.round(temperatureC)}°<span className="text-sm text-muted-foreground">C</span>
            </div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Stat label="Humidity" value={humidityPct !== undefined ? `${humidityPct}%` : "—"} />
          <Stat label="Cloud" value={cloudCoverPct !== undefined ? `${cloudCoverPct}%` : "—"} />
          <Stat
            label="Wind"
            value={windKph !== undefined ? `${windKph} km/h` : "—"}
            icon={<Wind className="size-3" />}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/20 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xs font-medium tabular-nums">{value}</div>
    </div>
  );
}
