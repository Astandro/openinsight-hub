import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Info } from "lucide-react";
import { ParsedTicket, FunctionType } from "@/types/openproject";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TeamEfficiencyProps {
  tickets: ParsedTicket[];
  selectedFunction: FunctionType | null;
  timePeriod: string;
}

// Helper function to get quarter from date
const getQuarter = (date: Date): string => {
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
};

export const TeamEfficiency = ({
  tickets,
  selectedFunction,
  timePeriod,
}: TeamEfficiencyProps) => {
  const chartData = useMemo(() => {
    const closedTickets = tickets.filter(
      (t) => t.status === "Closed" && 
            t.closedDate && 
            t.sprintClosed !== "#N/A" && 
            t.assignee !== "#N/A"
    );
    
    if (closedTickets.length === 0) return [];
    
    // Determine if we use quarters or sprints
    const useQuarters = timePeriod === "current_year";
    
    if (useQuarters) {
      // Group by quarter
      const quarterMap = new Map<string, { tickets: ParsedTicket[], assignees: Set<string> }>();
      
      closedTickets.forEach(ticket => {
        if (ticket.closedDate) {
          const quarter = getQuarter(ticket.closedDate);
          if (!quarterMap.has(quarter)) {
            quarterMap.set(quarter, { tickets: [], assignees: new Set() });
          }
          const data = quarterMap.get(quarter)!;
          data.tickets.push(ticket);
          data.assignees.add(ticket.assignee);
        }
      });
      
      // Sort quarters chronologically
      const sortedQuarters = Array.from(quarterMap.keys()).sort((a, b) => {
        const [qA, yearA] = a.split(" ");
        const [qB, yearB] = b.split(" ");
        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return parseInt(qA.substring(1)) - parseInt(qB.substring(1));
      });
      
      return sortedQuarters.map(quarter => {
        const data = quarterMap.get(quarter)!;
        const totalSP = data.tickets.reduce((sum, t) => sum + t.storyPoints, 0);
        const teamSize = data.assignees.size;
        const spPerPerson = teamSize > 0 ? totalSP / teamSize : 0;
        
        return {
          period: quarter,
          storyPoints: totalSP,
          teamSize: teamSize,
          spPerPerson: parseFloat(spPerPerson.toFixed(1)),
        };
      });
    } else {
      // Group by sprint
      const sprintMap = new Map<string, { tickets: ParsedTicket[], assignees: Set<string> }>();
      
      closedTickets.forEach(ticket => {
        if (ticket.sprintClosed) {
          if (!sprintMap.has(ticket.sprintClosed)) {
            sprintMap.set(ticket.sprintClosed, { tickets: [], assignees: new Set() });
          }
          const data = sprintMap.get(ticket.sprintClosed)!;
          data.tickets.push(ticket);
          data.assignees.add(ticket.assignee);
        }
      });
      
      // Sort sprints
      const sortedSprints = Array.from(sprintMap.keys()).sort();
      
      return sortedSprints.map(sprint => {
        const data = sprintMap.get(sprint)!;
        const totalSP = data.tickets.reduce((sum, t) => sum + t.storyPoints, 0);
        const teamSize = data.assignees.size;
        const spPerPerson = teamSize > 0 ? totalSP / teamSize : 0;
        
        return {
          period: sprint,
          storyPoints: totalSP,
          teamSize: teamSize,
          spPerPerson: parseFloat(spPerPerson.toFixed(1)),
        };
      });
    }
  }, [tickets, timePeriod]);
  
  // Calculate insights
  const insights = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const firstPeriod = chartData[0];
    const lastPeriod = chartData[chartData.length - 1];
    
    const spGrowth = lastPeriod.storyPoints - firstPeriod.storyPoints;
    const spGrowthPercent = firstPeriod.storyPoints > 0 
      ? ((spGrowth / firstPeriod.storyPoints) * 100).toFixed(1)
      : 0;
    
    const teamGrowth = lastPeriod.teamSize - firstPeriod.teamSize;
    const teamGrowthPercent = firstPeriod.teamSize > 0
      ? ((teamGrowth / firstPeriod.teamSize) * 100).toFixed(1)
      : 0;
    
    const avgSPPerPerson = chartData.reduce((sum, d) => sum + d.spPerPerson, 0) / chartData.length;
    
    // Calculate efficiency trend (is SP/person improving or declining?)
    const firstHalfAvg = chartData
      .slice(0, Math.floor(chartData.length / 2))
      .reduce((sum, d) => sum + d.spPerPerson, 0) / Math.floor(chartData.length / 2);
    
    const secondHalfAvg = chartData
      .slice(Math.floor(chartData.length / 2))
      .reduce((sum, d) => sum + d.spPerPerson, 0) / Math.ceil(chartData.length / 2);
    
    const efficiencyTrend = secondHalfAvg > firstHalfAvg ? "improving" : "declining";
    const efficiencyChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(1);
    
    return {
      spGrowth,
      spGrowthPercent,
      teamGrowth,
      teamGrowthPercent,
      avgSPPerPerson: avgSPPerPerson.toFixed(1),
      efficiencyTrend,
      efficiencyChange,
    };
  }, [chartData]);
  
  const xAxisLabel = timePeriod === "current_year" ? "Quarter" : "Sprint";
  const title = selectedFunction
    ? `${selectedFunction} Team Efficiency: SP vs Team Size`
    : "Team Efficiency: SP vs Team Size";
  
  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No efficiency data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Users className="h-5 w-5 text-primary" />
              </motion.div>
              <CardTitle>{title}</CardTitle>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>This chart shows the relationship between team size and story points delivered. 
                    It helps identify if adding more people is improving delivery.</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            
            <Badge variant="secondary" className="font-semibold">
              {chartData.length} {xAxisLabel.toLowerCase()}s
            </Badge>
          </div>
          
          {/* Key Insights */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
              >
                <div className="text-xs text-muted-foreground mb-1">SP Growth</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {insights.spGrowth > 0 ? '+' : ''}{insights.spGrowth}
                  <span className="text-sm ml-1">({insights.spGrowthPercent}%)</span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20"
              >
                <div className="text-xs text-muted-foreground mb-1">Team Growth</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {insights.teamGrowth > 0 ? '+' : ''}{insights.teamGrowth}
                  <span className="text-sm ml-1">({insights.teamGrowthPercent}%)</span>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
              >
                <div className="text-xs text-muted-foreground mb-1">Avg SP/Person</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {insights.avgSPPerPerson}
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`p-3 rounded-lg bg-gradient-to-br border ${
                  insights.efficiencyTrend === "improving"
                    ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
                    : "from-orange-500/10 to-orange-500/5 border-orange-500/20"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">Efficiency Trend</div>
                <div className={`text-lg font-bold ${
                  insights.efficiencyTrend === "improving"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}>
                  <TrendingUp className={`h-4 w-4 inline mr-1 ${
                    insights.efficiencyTrend === "declining" ? "rotate-180" : ""
                  }`} />
                  {insights.efficiencyChange}%
                </div>
              </motion.div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <ComposedChart data={chartData}>
              <defs>
                {/* Gradient for bars */}
                <linearGradient id="spGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
                </linearGradient>
                
                {/* Gradient for line */}
                <linearGradient id="teamGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              
              <XAxis
                dataKey="period"
                stroke="#9ca3af"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#9ca3af" }}
                axisLine={{ stroke: "#4b5563" }}
              />
              
              {/* Left Y-Axis for Story Points */}
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#3b82f6" }}
                axisLine={{ stroke: "#3b82f6" }}
                label={{
                  value: "Story Points",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#3b82f6", fontWeight: 600 },
                }}
              />
              
              {/* Right Y-Axis for Team Size */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#8b5cf6"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#8b5cf6" }}
                axisLine={{ stroke: "#8b5cf6" }}
                label={{
                  value: "Team Size",
                  angle: 90,
                  position: "insideRight",
                  style: { fill: "#8b5cf6", fontWeight: 600 },
                }}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.98)",
                  border: "2px solid #374151",
                  borderRadius: "12px",
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
                  padding: "12px",
                }}
                labelStyle={{ color: "#f9fafb", fontWeight: 600, marginBottom: "8px" }}
                itemStyle={{ padding: "4px 0" }}
                formatter={(value: any, name: string) => {
                  if (name === "Story Points") return [`${value} SP`, "Story Points"];
                  if (name === "Team Size") return [`${value} people`, "Team Size"];
                  if (name === "SP/Person") return [`${value} SP`, "Avg SP/Person"];
                  return [value, name];
                }}
              />
              
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
              />
              
              {/* Story Points Bar */}
              <Bar
                yAxisId="left"
                dataKey="storyPoints"
                name="Story Points"
                fill="url(#spGradient)"
                radius={[8, 8, 0, 0]}
                animationBegin={0}
                animationDuration={1000}
                animationEasing="ease-out"
              />
              
              {/* Team Size Line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="teamSize"
                name="Team Size"
                stroke="url(#teamGradient)"
                strokeWidth={4}
                dot={{
                  r: 6,
                  strokeWidth: 3,
                  fill: "#8b5cf6",
                  stroke: "#fff",
                }}
                activeDot={{
                  r: 8,
                  strokeWidth: 3,
                  fill: "#8b5cf6",
                  stroke: "#fff",
                  filter: "drop-shadow(0 0 8px #8b5cf6)",
                }}
                animationBegin={500}
                animationDuration={1200}
                animationEasing="ease-in-out"
              />
              
              {/* SP per Person Line (secondary insight) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spPerPerson"
                name="SP/Person"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  fill: "#10b981",
                  stroke: "#fff",
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  fill: "#10b981",
                  stroke: "#fff",
                }}
                animationBegin={800}
                animationDuration={1000}
                opacity={0.7}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Interpretation Guide */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              How to Read This Chart
            </h4>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Bars (Story Points):</span> Show total delivery per period
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Solid Line (Team Size):</span> Number of active team members
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-green-500 flex-shrink-0 mt-1.5" />
                <div>
                  <span className="font-medium text-foreground">Dashed Line (SP/Person):</span> Average productivity per person
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Ideal:</span> SP and SP/Person both trending upward
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

