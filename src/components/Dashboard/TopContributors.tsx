import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Target, Package, Bug, RotateCcw, Sparkles } from "lucide-react";
import { AssigneeMetrics } from "@/types/openproject";
import { motion } from "framer-motion";
import { UserPopover } from "./UserPopover";

import { ParsedTicket } from "@/types/openproject";

interface TopContributorsProps {
  metrics: AssigneeMetrics[];
  tickets: ParsedTicket[];
}

export const TopContributors = ({ metrics, tickets }: TopContributorsProps) => {
  // Sort by performance score instead of raw story points
  const sorted = [...metrics].sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 10);

  const getPerformanceIcon = (performanceScore: number, flags: string[]) => {
    if (flags.includes("top_performer")) return <Trophy className="h-4 w-4 text-success" />;
    if (flags.includes("low_performer")) return <AlertTriangle className="h-4 w-4 text-danger" />;
    if (flags.includes("overloaded")) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return null;
  };

  const getPerformanceColor = (performanceScore: number, flags: string[]) => {
    if (flags.includes("top_performer")) return "border-success/50 bg-success/5";
    if (flags.includes("low_performer")) return "border-danger/50 bg-danger/5";
    if (flags.includes("overloaded")) return "border-warning/50 bg-warning/5";
    if (flags.includes("underutilized")) return "border-muted/50 bg-muted/5";
    return "border-border bg-card/50";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="p-6 bg-card/80 backdrop-blur">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Top Contributors
        </h2>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-secondary/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-primary rounded" />
            <span>Effective SP</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-muted rounded" />
            <span>Tickets</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-accent rounded" />
            <span>Projects</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-success rounded" />
            <span>Performance</span>
          </div>
        </div>

        <div className="space-y-4">
          {sorted.map((contributor, index) => (
            <UserPopover key={contributor.assignee} metrics={contributor} allMetrics={metrics} tickets={tickets}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg cursor-pointer ${getPerformanceColor(
                  contributor.performanceScore,
                  contributor.flags
                )}`}
              >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold">#{index + 1}</div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {contributor.assignee}
                      {getPerformanceIcon(contributor.performanceScore, contributor.flags)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {contributor.function}
                      </Badge>
                      {contributor.flags.map((flag) => (
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
                </div>
                <div className="text-sm text-muted-foreground">
                  Score: {contributor.performanceScore.toFixed(2)}
                </div>
              </div>

              {/* Badges */}
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{contributor.effectiveStoryPoints.toFixed(0)}</span>
                  <span className="text-muted-foreground text-xs">Eff SP</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Package className="h-4 w-4 text-muted" />
                  <span className="font-semibold">{contributor.totalClosedTickets}</span>
                  <span className="text-muted-foreground text-xs">Tickets</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  <span className="font-semibold">{contributor.featureCount || 0}</span>
                  <span className="text-muted-foreground text-xs">Features</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Target className="h-4 w-4 text-accent" />
                  <span className="font-semibold">{contributor.projectVariety}</span>
                  <span className="text-muted-foreground text-xs">Projects</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Trophy className="h-4 w-4 text-success" />
                  <span className="font-semibold">{(contributor.utilizationIndex * 100).toFixed(0)}%</span>
                  <span className="text-muted-foreground text-xs">Util</span>
                </div>
              </div>

              {/* Gauge Style Performance Indicators */}
              <div className="grid grid-cols-2 gap-3">
                {/* Effective Story Points Gauge */}
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                      <path
                        className="text-secondary/30"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                      <motion.path
                        className="text-primary"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ 
                          strokeDasharray: `${(contributor.effectiveStoryPoints / Math.max(...sorted.map(s => s.effectiveStoryPoints), 1)) * 100}, 100` 
                        }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span 
                        className="text-sm font-bold text-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.6 }}
                      >
                        {contributor.effectiveStoryPoints.toFixed(0)}
                      </motion.span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-primary">Effective SP</div>
                    <div className="text-xs text-muted-foreground">Story Points</div>
                  </div>
                </motion.div>

                {/* Project Variety Gauge */}
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 group"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                      <path
                        className="text-secondary/30"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                      <motion.path
                        className="text-accent"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ 
                          strokeDasharray: `${(contributor.projectVariety / Math.max(...sorted.map(s => s.projectVariety), 1)) * 100}, 100` 
                        }}
                        transition={{ delay: index * 0.1 + 0.4, duration: 0.8, ease: "easeOut" }}
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span 
                        className="text-sm font-bold text-accent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.7 }}
                      >
                        {contributor.projectVariety}
                      </motion.span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-accent">Projects</div>
                    <div className="text-xs text-muted-foreground">Variety</div>
                  </div>
                </motion.div>

                {/* Utilization Gauge */}
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                      <path
                        className="text-secondary/30"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                      <motion.path
                        className="text-success"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ 
                          strokeDasharray: `${contributor.utilizationIndex * 100}, 100` 
                        }}
                        transition={{ delay: index * 0.1 + 0.5, duration: 0.8, ease: "easeOut" }}
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span 
                        className="text-sm font-bold text-success"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.8 }}
                      >
                        {(contributor.utilizationIndex * 100).toFixed(0)}%
                      </motion.span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-success">Utilization</div>
                    <div className="text-xs text-muted-foreground">Performance</div>
                  </div>
                </motion.div>

                {/* Active Weeks Gauge */}
                <motion.div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 group"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 40 40">
                      <path
                        className="text-secondary/30"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                      <motion.path
                        className="text-warning"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ 
                          strokeDasharray: `${(contributor.activeWeeks / Math.max(...sorted.map(s => s.activeWeeks), 1)) * 100}, 100` 
                        }}
                        transition={{ delay: index * 0.1 + 0.6, duration: 0.8, ease: "easeOut" }}
                        d="M20 3 a 17 17 0 0 1 0 34 a 17 17 0 0 1 0 -34"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.span 
                        className="text-sm font-bold text-warning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.9 }}
                      >
                        {contributor.activeWeeks}
                      </motion.span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-warning">Active Weeks</div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                </motion.div>
              </div>

              {/* Simplified Additional Metrics */}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Bug className={`h-3 w-3 ${
                    contributor.bugRateClosed > 0.2 
                      ? 'text-red-500' 
                      : contributor.bugRateClosed > 0.1 
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }`} />
                  <span>Bug Rate: </span>
                  <span className={`font-medium ${
                    contributor.bugRateClosed > 0.2 
                      ? 'text-red-500' 
                      : contributor.bugRateClosed > 0.1 
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }`}>
                    {(contributor.bugRateClosed * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <RotateCcw className={`h-3 w-3 ${
                    contributor.reviseRateClosed > 0.3 
                      ? 'text-red-500' 
                      : contributor.reviseRateClosed > 0.2 
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }`} />
                  <span>Revise Rate: </span>
                  <span className={`font-medium ${
                    contributor.reviseRateClosed > 0.3 
                      ? 'text-red-500' 
                      : contributor.reviseRateClosed > 0.2 
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }`}>
                    {(contributor.reviseRateClosed * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Target className={`h-3 w-3 ${
                    contributor.activeWeeks > 8 
                      ? 'text-blue-500' 
                      : contributor.activeWeeks > 4 
                      ? 'text-purple-500'
                      : 'text-gray-500'
                  }`} />
                  <span>Active Weeks: </span>
                  <span className={`font-medium ${
                    contributor.activeWeeks > 8 
                      ? 'text-blue-500' 
                      : contributor.activeWeeks > 4 
                      ? 'text-purple-500'
                      : 'text-gray-500'
                  }`}>
                    {contributor.activeWeeks}
                  </span>
                </div>
              </div>
              </motion.div>
            </UserPopover>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
