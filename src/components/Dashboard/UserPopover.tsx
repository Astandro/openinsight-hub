import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AssigneeMetrics, ParsedTicket } from "@/types/openproject";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

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
      <PopoverContent className="w-[700px] p-0" align="start">
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: User Info & Metrics */}
            <div className="space-y-4">
              {/* Header */}
              <div>
                <h3 className="font-semibold text-xl mb-1">{metrics.assignee}</h3>
                <Badge variant="secondary" className="text-xs">
                  {metrics.function}
                </Badge>
              </div>
              
              {/* Z-Score Display */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm text-muted-foreground">Z-Score</div>
                <div className="text-3xl font-bold text-primary">
                  {metrics.zScore.toFixed(2)}
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

              {/* Key Metrics Summary */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold">{metrics.effectiveStoryPoints.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">Effective SP</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold">{metrics.projectVariety}</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold">{(metrics.utilizationIndex * 100).toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Utilization</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <div className="text-lg font-bold">{metrics.activeWeeks}</div>
                  <div className="text-xs text-muted-foreground">Active Weeks</div>
                </div>
              </div>

              {/* Performance Flags */}
              {metrics.flags.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Performance</div>
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
            
            {/* Right Column: Feature Contributions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Feature Contributions</h4>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.featureCount || 0}
                </Badge>
              </div>
              
              <ScrollArea className="h-[400px] pr-2">
                {metrics.featureContributions && metrics.featureContributions.length > 0 ? (
                  <div className="space-y-2">
                    {metrics.featureContributions.map((feature, index) => (
                      <motion.div
                        key={feature.featureId}
                        className="group relative"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                          <Badge 
                            variant="outline" 
                            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold"
                          >
                            {index + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" title={feature.featureName}>
                              {feature.featureName}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground truncate">
                                {feature.project}
                              </span>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {feature.storyPoints} SP
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No feature contributions
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
