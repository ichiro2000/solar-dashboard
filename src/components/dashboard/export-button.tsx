import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HistoryRange } from "@/lib/solar/types";

export function ExportButton({ range }: { range: HistoryRange }) {
  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <a href={`/api/solar/export?range=${range}`}>
        <Download className="size-4" />
        Export CSV
      </a>
    </Button>
  );
}
