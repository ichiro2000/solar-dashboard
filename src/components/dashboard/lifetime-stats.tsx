import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  totalYieldKwh: number;
  monthYieldKwh: number;
  income?: { today: number; total: number; currency: string };
  capacityKw: number;
}

function compactKwh(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)} MWh`;
  return `${n.toFixed(1)} kWh`;
}

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(0)}`;
  }
}

export function LifetimeStats({ totalYieldKwh, monthYieldKwh, income, capacityKw }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifetime production</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {compactKwh(totalYieldKwh)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">This month</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {compactKwh(monthYieldKwh)}
            </div>
          </div>
          {income && (
            <>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Today&apos;s income
                </div>
                <div className="mt-1 text-sm font-medium tabular-nums">
                  {fmtMoney(income.today, income.currency)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total earned
                </div>
                <div className="mt-1 text-sm font-medium tabular-nums">
                  {fmtMoney(income.total, income.currency)}
                </div>
              </div>
            </>
          )}
          <div className="col-span-2 mt-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            System capacity:{" "}
            <span className="font-medium text-foreground">{capacityKw.toFixed(2)} kW</span>
            {" · "}
            Capacity factor (YTD est.):{" "}
            <span className="font-medium text-foreground">
              {capacityKw > 0
                ? `${((monthYieldKwh / (capacityKw * 24 * new Date().getDate())) * 100).toFixed(0)}%`
                : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
