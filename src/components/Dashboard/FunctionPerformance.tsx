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
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              iconType="rect"
            />
            <Bar dataKey="Story Points" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            <Bar dataKey="Bug Rate" fill="hsl(var(--danger))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {functionMetrics.map((fm) => {
            const isHighBugRate = fm.bugRate > 0.15;
            const isHighReviseRate = fm.reviseRate > 0.1;
            const isLowUtilization = fm.utilization < 10;
            const cardClass = isHighBugRate || isHighReviseRate 
              ? "border-destructive/30 bg-destructive/5" 
              : isLowUtilization 
                ? "border-warning/30 bg-warning/5"
                : "border-success/30 bg-success/5";
            
            return (
              <div key={fm.function} className={`p-3 rounded-lg border ${cardClass} transition-colors`}>
                <div className="text-sm font-medium mb-1 flex items-center gap-2">
                  {fm.function}
                  {isHighBugRate && <span className="text-xs text-destructive">⚠️</span>}
                  {isHighReviseRate && <span className="text-xs text-destructive">🔄</span>}
                  {isLowUtilization && <span className="text-xs text-warning">📉</span>}
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="text-muted-foreground">Members: <span className="font-medium text-foreground">{fm.memberCount}</span></div>
                  <div className="text-muted-foreground">Avg SP: <span className="font-medium text-foreground">{fm.avgStoryPoints.toFixed(1)}</span> <span className="text-xs">(σ {fm.stdDevStoryPoints.toFixed(1)})</span></div>
                  <div className={`${isHighBugRate ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    Bug Rate: <span className="font-medium">{fm.bugRate > 0 ? (fm.bugRate * 100).toFixed(1) : '0'}%</span>
                  </div>
                  <div className={`${isHighReviseRate ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    Revise Rate: <span className="font-medium">{fm.reviseRate > 0 ? (fm.reviseRate * 100).toFixed(1) : '0'}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
};
