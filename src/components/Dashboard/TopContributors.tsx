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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Top Contributors
          </h2>
        </div>

        <div className="space-y-4">
          {sorted.map((contributor, index) => (
            <UserPopover key={contributor.assignee} metrics={contributor} allMetrics={metrics} tickets={tickets}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-5 rounded-xl border-2 transition-all hover:shadow-xl cursor-pointer backdrop-blur-sm ${getPerformanceColor(
                  contributor.performanceScore,
                  contributor.flags
                )}`}
                whileHover={{ scale: 1.01, y: -2 }}
              >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <span className="text-lg font-bold text-primary">#{index + 1}</span>
                  </motion.div>
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2">
                      {contributor.assignee}
                      {getPerformanceIcon(contributor.performanceScore, contributor.flags)}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary" className="text-xs font-medium">
                        {contributor.function}
                      </Badge>
                      {contributor.flags.slice(0, 2).map((flag) => (
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
                <div className="text-right">
                  <div className="text-xs text-muted-foreground mb-1">Z-Score</div>
                  <div className="text-lg font-bold text-primary">
                    {contributor.performanceScore.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Metrics Grid - Clean and Compact */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <motion.div 
                  className="flex flex-col gap-1 p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Eff SP</span>
                  </div>
                  <span className="text-xl font-bold text-primary">{contributor.effectiveStoryPoints.toFixed(0)}</span>
                </motion.div>

                <motion.div 
                  className="flex flex-col gap-1 p-3 rounded-lg bg-gradient-to-br from-muted/30 to-muted/5 border border-muted/30 hover:border-muted/50 transition-all hover:shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-foreground/70" />
                    <span className="text-xs text-muted-foreground">Tickets</span>
                  </div>
                  <span className="text-xl font-bold">{contributor.totalClosedTickets}</span>
                </motion.div>

                <motion.div 
                  className="flex flex-col gap-1 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40 transition-all hover:shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-muted-foreground">Features</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{contributor.featureCount || 0}</span>
                </motion.div>

                <motion.div 
                  className="flex flex-col gap-1 p-3 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 hover:border-accent/40 transition-all hover:shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.15 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Projects</span>
                  </div>
                  <span className="text-xl font-bold text-accent">{contributor.projectVariety}</span>
                </motion.div>

                <motion.div 
                  className="flex flex-col gap-1 p-3 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20 hover:border-success/40 transition-all hover:shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 + 0.2 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Util</span>
                  </div>
                  <span className="text-xl font-bold text-success">{(contributor.utilizationIndex * 100).toFixed(0)}%</span>
                </motion.div>
              </div>

              {/* Quality Metrics */}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge 
                  variant="outline" 
                  className={`${
                    contributor.bugRateClosed > 0.2 
                      ? 'border-red-500/50 bg-red-500/10 text-red-600' 
                      : contributor.bugRateClosed > 0.1 
                      ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600'
                      : 'border-green-500/50 bg-green-500/10 text-green-600'
                  }`}
                >
                  <Bug className="h-3 w-3 mr-1" />
                  Bug: {(contributor.bugRateClosed * 100).toFixed(1)}%
                </Badge>
                
                <Badge 
                  variant="outline"
                  className={`${
                    contributor.reviseRateClosed > 0.3 
                      ? 'border-red-500/50 bg-red-500/10 text-red-600' 
                      : contributor.reviseRateClosed > 0.2 
                      ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600'
                      : 'border-green-500/50 bg-green-500/10 text-green-600'
                  }`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Revise: {(contributor.reviseRateClosed * 100).toFixed(1)}%
                </Badge>
                
                <Badge 
                  variant="outline"
                  className={`${
                    contributor.activeWeeks > 8 
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-600' 
                      : contributor.activeWeeks > 4 
                      ? 'border-purple-500/50 bg-purple-500/10 text-purple-600'
                      : 'border-gray-500/50 bg-gray-500/10 text-gray-600'
                  }`}
                >
                  <Target className="h-3 w-3 mr-1" />
                  {contributor.activeWeeks} weeks
                </Badge>
              </div>
              </motion.div>
            </UserPopover>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
