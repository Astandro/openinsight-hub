import { TrendingUp, Target, Clock, Bug, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface KPICardsProps {
  totalClosedTickets: number;
  totalStoryPoints: number;
  avgCycleTime: number;
  bugRate: number;
  avgUtilization: number;
}

export const KPICards = ({
  totalClosedTickets,
  totalStoryPoints,
  avgCycleTime,
  bugRate,
  avgUtilization,
}: KPICardsProps) => {
  const kpis = [
    {
      label: "Total Closed Tickets",
      value: totalClosedTickets,
      icon: Target,
      color: "text-primary",
      gradient: "from-primary/20 to-primary/5",
    },
    {
      label: "Total Story Points",
      value: totalStoryPoints,
      icon: TrendingUp,
      color: "text-success",
      gradient: "from-success/20 to-success/5",
    },
    {
      label: "Avg Cycle Time",
      value: `${avgCycleTime.toFixed(1)} days`,
      icon: Clock,
      color: "text-warning",
      gradient: "from-warning/20 to-warning/5",
    },
    {
      label: "Bug Rate",
      value: `${(bugRate * 100).toFixed(1)}%`,
      icon: Bug,
      color: "text-danger",
      gradient: "from-danger/20 to-danger/5",
    },
    {
      label: "Avg Utilization",
      value: avgUtilization.toFixed(1),
      icon: Users,
      color: "text-accent",
      gradient: "from-accent/20 to-accent/5",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`p-6 bg-gradient-to-br ${kpi.gradient} border-border/50 hover:border-primary/50 transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-background/50 ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{kpi.value}</div>
            <div className="text-sm text-muted-foreground">{kpi.label}</div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
