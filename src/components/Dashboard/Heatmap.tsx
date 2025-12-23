import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParsedTicket } from "@/types/openproject";
import { useState } from "react";

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
  tickets,
}: {
  data: HeatmapDatum[];
  title?: string;
  tickets?: ParsedTicket[];
}) {
  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string } | null>(null);
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
              {matrix[i].map((val, j) => {
                const project = r;
                const sprint = cols[j];
                const cellTickets = tickets?.filter(
                  (t) => t.project === project && t.sprintClosed === sprint && t.status === "Closed"
                ) || [];
                
                // Get unique features from tickets
                const featureIds = new Set(cellTickets.map(t => t.parentId).filter(Boolean));
                const features = Array.from(featureIds).map(featureId => {
                  const featureTicket = tickets?.find(t => t.id === featureId && t.normalizedType === "Feature");
                  const childTickets = cellTickets.filter(t => t.parentId === featureId);
                  const featureSP = childTickets.reduce((sum, t) => sum + t.storyPoints, 0);
                  return {
                    id: featureId!,
                    title: featureTicket?.title || `Feature ${featureId}`,
                    storyPoints: featureSP,
                    ticketCount: childTickets.length
                  };
                }).sort((a, b) => b.storyPoints - a.storyPoints);

                return (
                  <Popover key={`cell-${i}-${j}`}>
                    <PopoverTrigger asChild>
                      <div
                        className="m-0.5 h-10 rounded-md border border-border transition-all duration-200 hover:border-ring hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: valueToColor(val, maxValue) }}
                        onClick={() => setSelectedCell({ row: project, col: sprint })}
                      />
                    </PopoverTrigger>
                    {cellTickets.length > 0 && (
                      <PopoverContent className="w-[500px]" align="start">
                        <div className="space-y-3">
                          {/* Header */}
                          <div>
                            <h4 className="font-semibold text-lg">{project}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{sprint}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {val} SP · {cellTickets.length} tickets
                              </span>
                            </div>
                          </div>

                          {/* Features List */}
                          {features.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Features ({features.length})
                              </div>
                              <ScrollArea className="h-[300px] pr-3">
                                <div className="space-y-2">
                                  {features.map((feature, idx) => (
                                    <div
                                      key={feature.id}
                                      className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-mono text-primary">#{feature.id}</div>
                                          <div className="text-sm font-medium mt-0.5 truncate" title={feature.title}>
                                            {feature.title}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                          <Badge variant="secondary" className="text-xs">
                                            {feature.storyPoints} SP
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {feature.ticketCount} tickets
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}

                          {/* Tickets without parent */}
                          {cellTickets.some(t => !t.parentId) && (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Standalone Tickets ({cellTickets.filter(t => !t.parentId).length})
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {cellTickets.filter(t => !t.parentId).reduce((sum, t) => sum + t.storyPoints, 0)} SP from tickets without features
                              </div>
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </Card>
  );
}


