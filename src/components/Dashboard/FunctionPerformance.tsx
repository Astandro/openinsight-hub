import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FunctionMetrics } from "@/types/openproject";
import { motion } from "framer-motion";

interface FunctionPerformanceProps {
  functionMetrics: FunctionMetrics[];
}

export const FunctionPerformance = ({ functionMetrics }: FunctionPerformanceProps) => {
  const chartData = functionMetrics.map((fm) => ({
    name: fm.function,
    "Story Points": fm.totalStoryPoints,
    "Bug Rate": (fm.bugRate * 100).toFixed(1),
    "Revise Rate": (fm.reviseRate * 100).toFixed(1),
    members: fm.memberCount,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="p-6 bg-card/80 backdrop-blur">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Function Performance Overview
        </h2>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend />
            <Bar dataKey="Story Points" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Bug Rate" fill="hsl(var(--danger))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {functionMetrics.map((fm) => (
            <div key={fm.function} className="p-3 bg-secondary/30 rounded-lg">
              <div className="text-sm font-medium mb-1">{fm.function}</div>
              <div className="text-xs text-muted-foreground">
                {fm.memberCount} members • {(fm.bugRate * 100).toFixed(1)}% bugs
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};
