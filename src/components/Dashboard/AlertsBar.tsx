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

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          Alerts & Recommendations ({alerts.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert, i) => (
            <Badge
              key={i}
              variant={getAlertVariant(alert.type)}
              className="gap-1.5 py-1.5 px-3"
            >
              {getAlertIcon(alert.type)}
              <span className="text-xs">{alert.message}</span>
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
