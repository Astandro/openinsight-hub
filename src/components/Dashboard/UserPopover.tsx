import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AssigneeMetrics, ParsedTicket } from "@/types/openproject";
import { motion } from "framer-motion";

interface UserPopoverProps {
  children: React.ReactNode;
  metrics: AssigneeMetrics;
  allMetrics: AssigneeMetrics[];
  tickets: ParsedTicket[];
}

export const UserPopover = ({ children, metrics, allMetrics, tickets }: UserPopoverProps) => {
  // Calculate real project distribution from ticket data
  const userTickets = tickets.filter(t => t.assignee === metrics.assignee && t.status === "Closed");
  const projectDistribution = userTickets.reduce((acc, ticket) => {
    const project = ticket.project;
    const sp = ticket.storyPoints;
    acc[project] = (acc[project] || 0) + sp;
    return acc;
  }, {} as Record<string, number>);

  const maxSP = Object.values(projectDistribution).length > 0 ? Math.max(...Object.values(projectDistribution)) : 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Card className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{metrics.assignee}</h3>
                <Badge variant="secondary" className="text-xs">
                  {metrics.function}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Z-Score</div>
                <div className="text-2xl font-bold text-primary">
                  {metrics.zScore.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Project Distribution Graph */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground/90">Project Distribution</h4>
              <div className="space-y-2">
                {Object.entries(projectDistribution).map(([project, sp]) => (
                  <div key={project} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{project}</span>
                      <span className="text-primary font-semibold">{sp} SP</span>
                    </div>
                    <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(sp / maxSP) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{metrics.effectiveStoryPoints.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">Effective SP</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{metrics.projectVariety}</div>
                <div className="text-xs text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{(metrics.utilizationIndex * 100).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Utilization</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">{metrics.activeWeeks}</div>
                <div className="text-xs text-muted-foreground">Active Weeks</div>
              </div>
            </div>

            {/* Performance Flags */}
            {metrics.flags.length > 0 && (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-foreground/90 mb-2">Performance Indicators</div>
                <div className="flex flex-wrap gap-1">
                  {metrics.flags.map((flag) => (
                    <Badge 
                      key={flag} 
                      variant={flag === "top_performer" ? "default" : flag === "low_performer" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {flag.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
