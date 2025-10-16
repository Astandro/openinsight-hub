import { Alert } from "@/types/openproject";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Bug, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface AlertsBarProps {
  alerts: Alert[];
}

const getAlertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "top-performer":
      return <Trophy className="h-4 w-4" />;
    case "low-performer":
      return <AlertTriangle className="h-4 w-4" />;
    case "high-bug":
      return <Bug className="h-4 w-4" />;
    case "high-revise":
      return <RotateCcw className="h-4 w-4" />;
    case "overloaded":
      return <TrendingUp className="h-4 w-4" />;
    case "underutilized":
      return <TrendingDown className="h-4 w-4" />;
  }
};

const getAlertVariant = (type: Alert["type"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case "top-performer":
      return "default";
    case "low-performer":
    case "high-bug":
    case "high-revise":
      return "destructive";
    default:
      return "secondary";
  }
};

const groupAlertsByType = (alerts: Alert[]) => {
  const groups = {
    positive: alerts.filter(a => a.type === "top-performer"),
    issues: alerts.filter(a => ["low-performer", "high-bug", "high-revise"].includes(a.type)),
    workload: alerts.filter(a => ["overloaded", "underutilized"].includes(a.type)),
  };
  return groups;
};

export const AlertsBar = ({ alerts }: AlertsBarProps) => {
  if (alerts.length === 0) {
    return (
      <Card className="p-4 bg-success/5 border-success/20">
        <div className="flex items-center gap-2 text-success">
          <Trophy className="h-5 w-5" />
          <span className="font-medium">All metrics within normal range</span>
        </div>
      </Card>
    );
  }

  const groupedAlerts = groupAlertsByType(alerts);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <Card className="p-6 bg-card/80 backdrop-blur">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          Team Performance Highlight ({alerts.length})
        </h3>
        
        <div className="space-y-4">
          {groupedAlerts.positive.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-success mb-2 flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                Achievements
              </h4>
              <div className="flex flex-wrap gap-2 justify-start">
                {groupedAlerts.positive.map((alert, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-md text-success text-sm"
                  >
                    {getAlertIcon(alert.type)}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupedAlerts.issues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Issues
              </h4>
              <div className="flex flex-wrap gap-2 justify-start">
                {groupedAlerts.issues.map((alert, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm"
                  >
                    {getAlertIcon(alert.type)}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupedAlerts.workload.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-warning mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Workload
              </h4>
              <div className="flex flex-wrap gap-2 justify-start">
                {groupedAlerts.workload.map((alert, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-md text-warning text-sm"
                  >
                    {getAlertIcon(alert.type)}
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
