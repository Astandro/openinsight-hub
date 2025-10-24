import { Alert } from "@/types/openproject";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Scale,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface AlertsBarProps {
  alerts: Alert[];
}

const getAlertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "achievement":
      return <Sparkles className="h-5 w-5" />;
    case "quality-concern":
      return <AlertCircle className="h-5 w-5" />;
    case "overutilized":
      return <TrendingUp className="h-5 w-5" />;
    case "underutilized":
      return <TrendingDown className="h-5 w-5" />;
    case "optimal":
      return <CheckCircle2 className="h-5 w-5" />;
    case "workload-imbalance":
      return <Scale className="h-5 w-5" />;
  }
};

const getAlertColor = (type: Alert["type"]) => {
  switch (type) {
    case "achievement":
      return {
        bg: "from-green-500/10 to-emerald-500/5",
        border: "border-green-500/30",
        text: "text-green-600 dark:text-green-400",
        icon: "text-green-500",
        badge: "bg-green-500/20 text-green-700 dark:text-green-300",
      };
    case "quality-concern":
      return {
        bg: "from-red-500/10 to-rose-500/5",
        border: "border-red-500/30",
        text: "text-red-600 dark:text-red-400",
        icon: "text-red-500",
        badge: "bg-red-500/20 text-red-700 dark:text-red-300",
      };
    case "overutilized":
      return {
        bg: "from-orange-500/10 to-amber-500/5",
        border: "border-orange-500/30",
        text: "text-orange-600 dark:text-orange-400",
        icon: "text-orange-500",
        badge: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
      };
    case "underutilized":
      return {
        bg: "from-blue-500/10 to-sky-500/5",
        border: "border-blue-500/30",
        text: "text-blue-600 dark:text-blue-400",
        icon: "text-blue-500",
        badge: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
      };
    case "optimal":
      return {
        bg: "from-green-500/10 to-teal-500/5",
        border: "border-green-500/30",
        text: "text-green-600 dark:text-green-400",
        icon: "text-green-500",
        badge: "bg-green-500/20 text-green-700 dark:text-green-300",
      };
    case "workload-imbalance":
      return {
        bg: "from-purple-500/10 to-violet-500/5",
        border: "border-purple-500/30",
        text: "text-purple-600 dark:text-purple-400",
        icon: "text-purple-500",
        badge: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
      };
  }
};

const groupAlertsByCategory = (alerts: Alert[]) => {
  return {
    project: alerts.filter(a => a.category === "project"),
    function: alerts.filter(a => a.category === "function"),
    crossFunction: alerts.filter(a => a.category === "cross-function"),
  };
};

export const AlertsBar = ({ alerts }: AlertsBarProps) => {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());

  const toggleAlert = (index: number) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (alerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <h3 className="font-semibold text-green-600 dark:text-green-400">All systems normal! 🎉</h3>
              <p className="text-sm text-muted-foreground">Teams are performing well within expected ranges.</p>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  const groupedAlerts = groupAlertsByCategory(alerts);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <Card className="p-6 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-primary/20">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Team Highlights
          </h3>
          <Badge variant="secondary" className="font-semibold">
            {alerts.length} insight{alerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const colors = getAlertColor(alert.type);
            const isExpanded = expandedAlerts.has(index);
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  p-4 rounded-xl border-2 bg-gradient-to-br cursor-pointer
                  transition-all hover:shadow-lg
                  ${colors.bg} ${colors.border}
                `}
                onClick={() => toggleAlert(index)}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${colors.badge} flex-shrink-0`}>
                    <div className={colors.icon}>
                      {getAlertIcon(alert.type)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium ${colors.text} flex-1`}>
                        {alert.message}
                      </p>
                      <Badge variant="outline" className={`${colors.badge} text-xs flex-shrink-0`}>
                        {alert.category.replace("-", " ")}
                      </Badge>
                    </div>
                    
                    {/* Actionable recommendation */}
                    {alert.actionable && (
                      <motion.div
                        initial={false}
                        animate={{
                          height: isExpanded ? "auto" : 0,
                          opacity: isExpanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-current/20">
                          <div className="flex items-start gap-2">
                            <ArrowRight className={`h-4 w-4 mt-0.5 flex-shrink-0 ${colors.icon}`} />
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold">Action: </span>
                              {alert.actionable}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Click hint */}
                    {alert.actionable && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        {isExpanded ? "Click to collapse" : "Click for recommendation"}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary by category */}
        <div className="mt-5 pt-5 border-t border-border/50">
          <div className="flex flex-wrap gap-3 text-xs">
            {groupedAlerts.project.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <span className="font-semibold">{groupedAlerts.project.length}</span>
                Project insight{groupedAlerts.project.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {groupedAlerts.function.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <span className="font-semibold">{groupedAlerts.function.length}</span>
                Function insight{groupedAlerts.function.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {groupedAlerts.crossFunction.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <span className="font-semibold">{groupedAlerts.crossFunction.length}</span>
                Cross-team insight{groupedAlerts.crossFunction.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
