import { Card } from "@/components/ui/card";

export interface HeatmapDatum {
  row: string; // e.g., project or assignee
  col: string; // e.g., sprint or month
  value: number; // intensity
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function valueToColor(value: number, maxValue: number) {
  if (value <= 0) return "hsl(var(--muted) / 0.06)"; // empty cells clearly distinct
  const t = maxValue > 0 ? clamp(value / maxValue, 0, 1) : 0;
  // Solid brand color with alpha for reliable rendering, more prominent at low non-zero
  const base = t < 0.5 ? "var(--accent)" : "var(--primary)";
  const alpha = 0.25 + t * 0.6; // 0.25 -> 0.85
  return `hsl(${base} / ${alpha})`;
}

export function Heatmap({
  data,
  title = "Activity Heatmap",
}: {
  data: HeatmapDatum[];
  title?: string;
}) {
  const rows = Array.from(new Set(data.map((d) => d.row)));
  const cols = Array.from(new Set(data.map((d) => d.col)));
  const matrix = rows.map((r) =>
    cols.map((c) => data.find((d) => d.row === r && d.col === c)?.value ?? 0),
  );
  const maxValue = Math.max(0, ...data.map((d) => d.value));

  return (
    <Card className="p-6 bg-card/80 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {title}
        </h2>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="h-2 w-24 rounded-full"
               style={{ background: "linear-gradient(90deg, hsl(var(--muted)/0.06), hsl(var(--accent)/0.25), hsl(var(--primary)/0.85))" }} />
          <span className="text-xs text-muted-foreground">High</span>
        </div>
      </div>
      <div className="overflow-x-auto w-full">
        <div className="grid w-full" style={{ gridTemplateColumns: `auto repeat(${cols.length}, 1fr)` }}>
          {/* Header corner */}
          <div />
          {cols.map((c) => (
            <div key={c} className="px-2 py-1 text-xs text-muted-foreground text-center">
              {c}
            </div>
          ))}
          {rows.map((r, i) => (
            <>
              <div key={`row-${r}`} className="pr-2 py-1 text-xs text-muted-foreground whitespace-nowrap flex items-center">
                {r}
              </div>
              {matrix[i].map((val, j) => (
                <div
                  key={`cell-${i}-${j}`}
                  className="m-0.5 h-10 rounded-md border border-border transition-colors duration-300 hover:border-ring"
                  style={{ backgroundColor: valueToColor(val, maxValue) }}
                  title={`${r} · ${cols[j]}: ${val}`}
                />
              ))}
            </>
          ))}
        </div>
      </div>
    </Card>
  );
}


