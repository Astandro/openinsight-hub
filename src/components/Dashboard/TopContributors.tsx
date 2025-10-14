import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Target, Package, Bug, RotateCcw } from "lucide-react";
import { AssigneeMetrics } from "@/types/openproject";
import { motion } from "framer-motion";

interface TopContributorsProps {
  metrics: AssigneeMetrics[];
}

export const TopContributors = ({ metrics }: TopContributorsProps) => {
  const sorted = [...metrics].sort((a, b) => b.totalClosedStoryPoints - a.totalClosedStoryPoints).slice(0, 10);

  const getPerformanceIcon = (zScore: number) => {
    if (zScore >= 1) return <Trophy className="h-4 w-4 text-success" />;
    if (zScore <= -1) return <AlertTriangle className="h-4 w-4 text-danger" />;
    return null;
  };

  const getPerformanceColor = (zScore: number) => {
    if (zScore >= 1) return "border-success/50 bg-success/5";
    if (zScore <= -1) return "border-danger/50 bg-danger/5";
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
            <span>Story Points</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-muted rounded" />
            <span>Tickets</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-danger rounded" />
            <span>Bugs</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-6 bg-warning rounded" />
            <span>Revise</span>
          </div>
        </div>

        <div className="space-y-4">
          {sorted.map((contributor, index) => (
            <motion.div
              key={contributor.assignee}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${getPerformanceColor(
                contributor.zScore
              )}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold">#{index + 1}</div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {contributor.assignee}
                      {getPerformanceIcon(contributor.zScore)}
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {contributor.function}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  z-score: {contributor.zScore.toFixed(2)}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="gap-1">
                  <Target className="h-3 w-3" />
                  {contributor.totalClosedStoryPoints} SP
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Package className="h-3 w-3" />
                  {contributor.totalClosedTickets} tickets
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Bug className="h-3 w-3" />
                  {contributor.bugCountClosed} bugs
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {contributor.reviseCountClosed} revise
                </Badge>
              </div>

              {/* Horizontal Stacked Bar */}
              <div className="h-4 flex rounded-full overflow-hidden bg-secondary/30">
                <div
                  className="bg-primary transition-all"
                  style={{
                    width: `${(contributor.totalClosedStoryPoints / sorted[0].totalClosedStoryPoints) * 40}%`,
                  }}
                />
                <div
                  className="bg-muted transition-all"
                  style={{
                    width: `${(contributor.totalClosedTickets / sorted[0].totalClosedTickets) * 30}%`,
                  }}
                />
                <div
                  className="bg-danger transition-all"
                  style={{
                    width: `${(contributor.bugCountClosed / Math.max(...sorted.map(s => s.bugCountClosed), 1)) * 20}%`,
                  }}
                />
                <div
                  className="bg-warning transition-all"
                  style={{
                    width: `${(contributor.reviseCountClosed / Math.max(...sorted.map(s => s.reviseCountClosed), 1)) * 10}%`,
                  }}
                />
              </div>

              {/* Additional Metrics */}
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>Bug Rate: {(contributor.bugRateClosed * 100).toFixed(1)}%</span>
                <span>Avg Cycle: {contributor.avgCycleTimeDays.toFixed(1)}d</span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
