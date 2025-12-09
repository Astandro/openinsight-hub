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
            t.assignee !== "#N/A" &&
            t.function !== "#N/A"
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
          spPerPerson: isNaN(spPerPerson) || !isFinite(spPerPerson) ? 0 : parseFloat(spPerPerson.toFixed(1)),
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
          spPerPerson: isNaN(spPerPerson) || !isFinite(spPerPerson) ? 0 : parseFloat(spPerPerson.toFixed(1)),
        };
      });
    }
  }, [tickets, timePeriod]);
  
  // Calculate statistical insights using linear regression
  const insights = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const n = chartData.length;
    
    // Calculate linear regression for Team Size vs Story Points
    const teamSizes = chartData.map(d => d.teamSize);
    const storyPoints = chartData.map(d => d.storyPoints);
    const spPerPersonValues = chartData.map(d => d.spPerPerson);
    
    // Helper: Calculate linear regression
    const linearRegression = (x: number[], y: number[]) => {
      const n = x.length;
      if (n === 0) return { slope: 0, intercept: 0, rSquared: 0 };
      
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
      
      const denominator = n * sumXX - sumX * sumX;
      const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const intercept = n !== 0 ? (sumY - slope * sumX) / n : 0;
      
      // Calculate R² (coefficient of determination)
      const meanY = n !== 0 ? sumY / n : 0;
      const ssTotal = sumYY - n * meanY * meanY;
      const ssResidual = y.reduce((sum, yi, i) => {
        const predicted = slope * x[i] + intercept;
        return sum + Math.pow(yi - predicted, 2);
      }, 0);
      const rSquared = ssTotal !== 0 ? 1 - (ssResidual / ssTotal) : 0;
      
      return { 
        slope: isNaN(slope) || !isFinite(slope) ? 0 : slope, 
        intercept: isNaN(intercept) || !isFinite(intercept) ? 0 : intercept, 
        rSquared: isNaN(rSquared) || !isFinite(rSquared) ? 0 : Math.max(0, Math.min(1, rSquared)) 
      };
    };
    
    // Regression: Team Size vs Story Points
    const spRegression = linearRegression(teamSizes, storyPoints);
    
    // Regression: Team Size vs SP/Person (efficiency)
    const efficiencyRegression = linearRegression(teamSizes, spPerPersonValues);
    
    // Calculate average metrics
    const avgTeamSize = teamSizes.reduce((a, b) => a + b, 0) / n;
    const avgSP = storyPoints.reduce((a, b) => a + b, 0) / n;
    const avgSPPerPerson = spPerPersonValues.reduce((a, b) => a + b, 0) / n;
    
    // Predict impact of adding/removing 1 person
    const addOnePersonSP = spRegression.slope;
    const addOnePersonEfficiency = efficiencyRegression.slope;
    
    // Calculate overall productivity trend (using time as x-axis)
    const timeIndices = chartData.map((_, i) => i);
    const productivityTrendRegression = linearRegression(timeIndices, spPerPersonValues);
    
    // Determine if team should grow based on efficiency trend
    const shouldGrow = efficiencyRegression.slope >= 0; // If adding people maintains/improves efficiency
    const correlationStrength = spRegression.rSquared;
    
    // Calculate trend direction (threshold at ±5% to avoid false "stable" classification)
    const productivityTrend = productivityTrendRegression.slope > 0.05 ? "improving" : 
                             productivityTrendRegression.slope < -0.05 ? "declining" : "stable";
    
    // Safe number formatting helper
    const safeFormat = (value: number, decimals: number = 1): string => {
      if (isNaN(value) || !isFinite(value)) return "0";
      return value.toFixed(decimals);
    };
    
    return {
      // Statistical predictions
      addOnePersonSP: safeFormat(addOnePersonSP, 1),
      removeOnePersonSP: safeFormat(-addOnePersonSP, 1),
      addOnePersonEfficiency: safeFormat(addOnePersonEfficiency, 2),
      
      // Averages
      avgTeamSize: safeFormat(avgTeamSize, 1),
      avgSP: safeFormat(avgSP, 0),
      avgSPPerPerson: safeFormat(avgSPPerPerson, 1),
      
      // Correlation & confidence
      correlationStrength: safeFormat(correlationStrength * 100, 0),
      rSquared: safeFormat(correlationStrength, 2),
      
      // Recommendations
      shouldGrow,
      productivityTrend,
      productivitySlope: safeFormat(productivityTrendRegression.slope * 100, 1),
      
      // Efficiency metrics
      efficiencySlope: safeFormat(efficiencyRegression.slope, 2),
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
          
          {/* Key Insights - Statistical Analysis */}
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {/* Impact of Adding 1 Person */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-3 rounded-lg bg-gradient-to-br border ${
                  parseFloat(insights.addOnePersonSP) > 0
                    ? "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
                    : "from-orange-500/10 to-orange-500/5 border-orange-500/20"
                }`}
              >
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          Add 1 Person
                          <Info className="h-3 w-3" />
                        </div>
                        <div className={`text-lg font-bold ${
                          parseFloat(insights.addOnePersonSP) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}>
                          {parseFloat(insights.addOnePersonSP) > 0 ? '+' : ''}{insights.addOnePersonSP} SP
                          <div className="text-xs font-normal mt-1">
                            {parseFloat(insights.addOnePersonEfficiency) >= 0 ? '↗' : '↘'} {insights.addOnePersonEfficiency} SP/person
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Based on statistical analysis of all periods, adding 1 team member is predicted to change total SP by {insights.addOnePersonSP} and individual productivity by {insights.addOnePersonEfficiency} SP/person.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </motion.div>
              
              {/* Current Performance */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
              >
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          Avg Performance
                          <Info className="h-3 w-3" />
                        </div>
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {insights.avgSP} SP
                          <div className="text-xs font-normal mt-1">
                            {insights.avgTeamSize} people · {insights.avgSPPerPerson} SP/person
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Average across all {chartData.length} periods: {insights.avgSP} story points delivered by {insights.avgTeamSize} team members, averaging {insights.avgSPPerPerson} SP per person.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </motion.div>
              
              {/* Productivity Trend */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`p-3 rounded-lg bg-gradient-to-br border ${
                  insights.productivityTrend === "improving"
                    ? "from-green-500/10 to-green-500/5 border-green-500/20"
                    : insights.productivityTrend === "declining"
                    ? "from-red-500/10 to-red-500/5 border-red-500/20"
                    : "from-gray-500/10 to-gray-500/5 border-gray-500/20"
                }`}
              >
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          Productivity Trend
                          <Info className="h-3 w-3" />
                        </div>
                        <div className={`text-lg font-bold ${
                          insights.productivityTrend === "improving"
                            ? "text-green-600 dark:text-green-400"
                            : insights.productivityTrend === "declining"
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}>
                          <TrendingUp className={`h-4 w-4 inline mr-1 ${
                            insights.productivityTrend === "declining" ? "rotate-180" : 
                            insights.productivityTrend === "stable" ? "rotate-90" : ""
                          }`} />
                          {insights.productivityTrend}
                          <div className="text-xs font-normal mt-1 capitalize">
                            {parseFloat(insights.productivitySlope) > 0 ? '+' : ''}{insights.productivitySlope}% over time
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Individual productivity (SP/person) is {insights.productivityTrend} over time with a {insights.productivitySlope}% change rate. This trend considers all {chartData.length} periods.</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </motion.div>
              
              {/* Recommendation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`p-3 rounded-lg bg-gradient-to-br border ${
                  insights.shouldGrow
                    ? "from-purple-500/10 to-purple-500/5 border-purple-500/20"
                    : "from-amber-500/10 to-amber-500/5 border-amber-500/20"
                }`}
              >
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          Scaling Impact
                          <Info className="h-3 w-3" />
                        </div>
                        <div className={`text-sm font-bold ${
                          insights.shouldGrow
                            ? "text-purple-600 dark:text-purple-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}>
                          {insights.shouldGrow ? '✓ Scales Well' : '⚠ Review Scaling'}
                          <div className="text-xs font-normal mt-1">
                            Confidence: {insights.correlationStrength}%
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        {insights.shouldGrow
                          ? `Team scales efficiently. Adding members maintains or improves per-person productivity (${insights.efficiencySlope} SP/person per member).`
                          : `Adding members may reduce per-person productivity (${insights.efficiencySlope} SP/person per member). Consider process improvements before scaling.`
                        }
                        {' '}Data correlation: {insights.correlationStrength}% (R²={insights.rSquared}).
                      </p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
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
                  <span className="font-medium text-foreground">Bars (Story Points):</span> Total delivery per period across all team members
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Solid Line (Team Size):</span> Number of active contributors in each period
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-green-500 flex-shrink-0 mt-1.5" />
                <div>
                  <span className="font-medium text-foreground">Dashed Line (SP/Person):</span> Individual productivity = Total SP ÷ Team Size
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Statistical Analysis:</span> Predictions use linear regression across all {chartData.length} periods
                </div>
              </div>
            </div>
            {insights && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Recommendation:</span> {
                    insights.shouldGrow
                      ? `Team scales efficiently (${insights.efficiencySlope} SP/person per new member). Adding people is recommended if workload demands.`
                      : `Consider improving team processes before scaling. Current data shows ${insights.efficiencySlope} SP/person change per new member.`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};


