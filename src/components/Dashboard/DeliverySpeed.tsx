import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Info, Award, AlertCircle } from "lucide-react";
import { ParsedTicket, FunctionType } from "@/types/openproject";
import { isValidAssignee } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DeliverySpeedProps {
  tickets: ParsedTicket[];
  selectedFunction: FunctionType | null;
  timePeriod?: string;
}

interface SpeedData {
  name: string;
  daysPerSP: number;
  totalSP: number;
  totalDays: number;
  ticketCount: number;
  color: string;
}

// Helper function to convert calendar days to working days (excluding weekends)
// Assumes 5 working days per 7 calendar days
const toWorkingDays = (calendarDays: number): number => {
  return Math.round(calendarDays * (5 / 7));
};

// Helper function to remove outliers using IQR (Interquartile Range) method
// Outliers are values below Q1 - 1.5*IQR or above Q3 + 1.5*IQR
const removeOutliers = (rates: number[]): number[] => {
  if (rates.length < 4) return rates; // Need at least 4 data points for IQR
  
  // Sort rates
  const sorted = [...rates].sort((a, b) => a - b);
  
  // Calculate quartiles
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  // Define bounds
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // Filter out outliers
  const filtered = rates.filter(rate => rate >= lowerBound && rate <= upperBound);
  
  // If we filtered out too many (>40%), keep original to avoid data loss
  if (filtered.length < rates.length * 0.6) {
    return rates;
  }
  
  return filtered;
};

export const DeliverySpeed = ({
  tickets,
  selectedFunction,
  timePeriod = "all",
}: DeliverySpeedProps) => {
  const speedData = useMemo(() => {
    // Filter for closed tickets with User Story or Bug type only
    // Also filter out invalid assignees (teams, unassigned, deleted users)
    const closedTickets = tickets.filter(
      (t) => t.status === "Closed" && 
            t.storyPoints > 0 &&
            isValidAssignee(t.assignee) &&
            t.sprintClosed !== "#N/A" &&
            t.sprintClosed !== "" &&
            (t.normalizedType === "Feature" || t.normalizedType === "Bug" || 
             t.type.toLowerCase().includes("user story") || t.type.toLowerCase().includes("story"))
    );
    
    if (closedTickets.length === 0) return [];
    
    if (selectedFunction) {
      // Show person-level data for selected function using SPRINT-BASED VELOCITY
      const assigneeSprintMap = new Map<string, Map<string, number>>(); // assignee -> (sprint -> totalSP)
      
      // Group tickets by assignee and sprint, sum SP per sprint
      closedTickets.forEach(ticket => {
        if (!assigneeSprintMap.has(ticket.assignee)) {
          assigneeSprintMap.set(ticket.assignee, new Map());
        }
        const sprintMap = assigneeSprintMap.get(ticket.assignee)!;
        const sprint = ticket.sprintClosed;
        sprintMap.set(sprint, (sprintMap.get(sprint) || 0) + ticket.storyPoints);
      });
      
      // Calculate velocity (days per 5 SP) for each person
      const result: SpeedData[] = [];
      assigneeSprintMap.forEach((sprintMap, assignee) => {
        // Get SP completed per sprint (array of sprint velocities)
        const sprintVelocities = Array.from(sprintMap.values());
        
        // Remove outlier sprints (unusually high or low productivity)
        const cleanedVelocities = removeOutliers(sprintVelocities);
        
        // Calculate average SP per sprint
        const avgSPPerSprint = cleanedVelocities.length > 0 
          ? cleanedVelocities.reduce((sum, sp) => sum + sp, 0) / cleanedVelocities.length 
          : 0;
        
        // Convert to days per 5 SP
        // Assumption: 1 sprint = 10 working days (2 weeks, 5 days/week)
        const spPerWorkingDay = avgSPPerSprint / 10;
        const daysPer5SP = spPerWorkingDay > 0 ? 5 / spPerWorkingDay : 0;
        
        // Guard against NaN and Infinity
        const safeDaysPer5SP = isNaN(daysPer5SP) || !isFinite(daysPer5SP) ? 0 : daysPer5SP;
        
        // Calculate totals for display
        const totalSP = sprintVelocities.reduce((sum, sp) => sum + sp, 0);
        const totalSprints = sprintVelocities.length;
        
        result.push({
          name: assignee,
          daysPerSP: parseFloat(safeDaysPer5SP.toFixed(1)),
          totalSP: totalSP,
          totalDays: totalSprints * 10, // sprints × 10 working days
          ticketCount: totalSprints, // Show sprint count instead of ticket count
          color: "#3b82f6",
        });
      });
      
      // Sort by speed (faster = lower days)
      return result.sort((a, b) => a.daysPerSP - b.daysPerSP);
      
    } else {
      // Show function-level data using SPRINT-BASED VELOCITY
      const functionSprintMap = new Map<FunctionType, Map<string, Map<string, number>>>(); // function -> assignee -> (sprint -> totalSP)
      
      // Group tickets by function, assignee, and sprint
      closedTickets.forEach(ticket => {
        if (!functionSprintMap.has(ticket.function)) {
          functionSprintMap.set(ticket.function, new Map());
        }
        const assigneeMap = functionSprintMap.get(ticket.function)!;
        
        if (!assigneeMap.has(ticket.assignee)) {
          assigneeMap.set(ticket.assignee, new Map());
        }
        const sprintMap = assigneeMap.get(ticket.assignee)!;
        const sprint = ticket.sprintClosed;
        sprintMap.set(sprint, (sprintMap.get(sprint) || 0) + ticket.storyPoints);
      });
      
      // Color palette for functions
      const functionColors: Record<string, string> = {
        "BE": "#3b82f6",
        "FE": "#8b5cf6",
        "QA": "#10b981",
        "DESIGNER": "#f59e0b",
        "PRODUCT": "#ec4899",
        "INFRA": "#14b8a6",
        "BUSINESS SUPPORT": "#f97316",
        "RESEARCHER": "#6366f1",
        "FOUNDRY": "#a855f7",
        "UX WRITER": "#06b6d4",
      };
      
      // Calculate average velocity for each function
      const result: SpeedData[] = [];
      functionSprintMap.forEach((assigneeMap, func) => {
        const allSprintVelocities: number[] = [];
        let totalSP = 0;
        let totalSprints = 0;
        
        // Collect all sprint velocities from all assignees in this function
        assigneeMap.forEach((sprintMap) => {
          const velocities = Array.from(sprintMap.values());
          allSprintVelocities.push(...velocities);
          totalSP += velocities.reduce((sum, sp) => sum + sp, 0);
          totalSprints += velocities.length;
        });
        
        if (allSprintVelocities.length === 0) return;
        
        // Remove outlier sprints
        const cleanedVelocities = removeOutliers(allSprintVelocities);
        
        // Calculate average SP per sprint across all people in function
        const avgSPPerSprint = cleanedVelocities.length > 0
          ? cleanedVelocities.reduce((sum, sp) => sum + sp, 0) / cleanedVelocities.length
          : 0;
        
        // Convert to days per 5 SP
        const spPerWorkingDay = avgSPPerSprint / 10;
        const daysPer5SP = spPerWorkingDay > 0 ? 5 / spPerWorkingDay : 0;
        
        // Guard against NaN and Infinity
        const safeDaysPer5SP = isNaN(daysPer5SP) || !isFinite(daysPer5SP) ? 0 : daysPer5SP;
        
        result.push({
          name: func,
          daysPerSP: parseFloat(safeDaysPer5SP.toFixed(1)),
          totalSP: totalSP,
          totalDays: totalSprints * 10,
          ticketCount: totalSprints,
          color: functionColors[func] || "#3b82f6",
        });
      });
      
      // Sort by speed (faster = lower days)
      return result.sort((a, b) => a.daysPerSP - b.daysPerSP);
    }
  }, [tickets, selectedFunction]);
  
  // Calculate speed trend over time
  const speedTrend = useMemo(() => {
    const closedTickets = tickets.filter(
      (t) => t.status === "Closed" && 
            t.storyPoints > 0 &&
            isValidAssignee(t.assignee) &&
            t.sprintClosed !== "#N/A" &&
            t.sprintClosed !== "" &&
            t.function !== "#N/A" &&
            (t.normalizedType === "Feature" || t.normalizedType === "Bug" || 
             t.type.toLowerCase().includes("user story") || t.type.toLowerCase().includes("story"))
    );
    
    if (closedTickets.length < 3) return null;
    
    // Group by sprint and calculate speed for each sprint
    const sprintSpeedMap = new Map<string, { totalSP: number; count: number }>();
    
    closedTickets.forEach(ticket => {
      const sprint = ticket.sprintClosed;
      if (!sprintSpeedMap.has(sprint)) {
        sprintSpeedMap.set(sprint, { totalSP: 0, count: 0 });
      }
      const data = sprintSpeedMap.get(sprint)!;
      data.totalSP += ticket.storyPoints;
      data.count += 1;
    });
    
    // Convert to array and sort by sprint
    const sprintSpeeds = Array.from(sprintSpeedMap.entries())
      .map(([sprint, data]) => ({
        sprint,
        spPerDay: data.totalSP / 10, // Assume 10 working days per sprint
        daysPerSP: data.totalSP > 0 ? 10 / data.totalSP : 0,
      }))
      .sort((a, b) => a.sprint.localeCompare(b.sprint));
    
    if (sprintSpeeds.length < 2) return null;
    
    // Calculate trend using linear regression
    const n = sprintSpeeds.length;
    const timeIndices = sprintSpeeds.map((_, i) => i);
    const daysPerSPValues = sprintSpeeds.map(s => s.daysPerSP);
    
    // Linear regression
    const sumX = timeIndices.reduce((a, b) => a + b, 0);
    const sumY = daysPerSPValues.reduce((a, b) => a + b, 0);
    const sumXY = timeIndices.reduce((sum, xi, i) => sum + xi * daysPerSPValues[i], 0);
    const sumXX = timeIndices.reduce((sum, xi) => sum + xi * xi, 0);
    
    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const avgSpeed = n > 0 ? sumY / n : 0;
    
    // Calculate percentage change with NaN guard
    const percentChange = avgSpeed > 0 ? (slope / avgSpeed) * 100 * n : 0;
    const safePercentChange = isNaN(percentChange) || !isFinite(percentChange) ? 0 : percentChange;
    
    // Determine trend (negative slope = getting faster, positive = getting slower)
    const trend = slope < -0.5 ? "improving" : slope > 0.5 ? "declining" : "stable";
    
    return {
      trend,
      percentChange: safePercentChange.toFixed(1),
      slope: (isNaN(slope) || !isFinite(slope) ? 0 : slope).toFixed(2),
      avgSpeed: (isNaN(avgSpeed) || !isFinite(avgSpeed) ? 0 : avgSpeed).toFixed(1),
      sprintCount: n,
    };
  }, [tickets, selectedFunction]);
  
  // Calculate insights
  const insights = useMemo(() => {
    if (speedData.length === 0) return null;
    
    const fastest = speedData[0];
    const slowest = speedData[speedData.length - 1];
    const avgSpeed = speedData.length > 0 
      ? speedData.reduce((sum, d) => sum + d.daysPerSP, 0) / speedData.length 
      : 0;
    const speedVariation = slowest.daysPerSP - fastest.daysPerSP;
    
    // Calculate if variation is high (>50% difference from average)
    const variationPercent = avgSpeed > 0 ? (speedVariation / avgSpeed) * 100 : 0;
    const safeVariationPercent = isNaN(variationPercent) || !isFinite(variationPercent) ? 0 : variationPercent;
    const isHighVariation = safeVariationPercent > 50;
    
    return {
      fastest,
      slowest,
      avgSpeed: (isNaN(avgSpeed) || !isFinite(avgSpeed) ? 0 : avgSpeed).toFixed(1),
      speedVariation: (isNaN(speedVariation) || !isFinite(speedVariation) ? 0 : speedVariation).toFixed(1),
      variationPercent: safeVariationPercent.toFixed(0),
      isHighVariation,
      speedTrend,
    };
  }, [speedData, speedTrend]);
  
  const title = selectedFunction
    ? `${selectedFunction} Team Delivery Speed`
    : "Delivery Speed by Function";
  
  if (speedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No delivery speed data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Get color based on speed (faster = green, slower = red)
  const getSpeedColor = (days: number) => {
    if (!insights) return "#3b82f6";
    const avgDays = parseFloat(insights.avgSpeed);
    if (days < avgDays * 0.8) return "#10b981"; // Fast - Green
    if (days > avgDays * 1.2) return "#ef4444"; // Slow - Red
    return "#3b82f6"; // Average - Blue
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              >
                <Zap className="h-5 w-5 text-yellow-500" />
              </motion.div>
              <CardTitle>{title}</CardTitle>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>This chart shows the average time needed to complete 5 story points. 
                    Lower values indicate faster delivery. Based on cycle time data.</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            
            <Badge variant="secondary" className="font-semibold">
              {speedData.length} {selectedFunction ? "member" : "function"}{speedData.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          
          {/* Key Insights */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
              >
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <Award className="h-3 w-3" />
                  Fastest
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {insights.fastest.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {insights.fastest.daysPerSP} days/5SP
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
              >
                <div className="text-xs text-muted-foreground mb-1">Average Speed</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {insights.avgSpeed}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  days/5SP
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className={`p-3 rounded-lg bg-gradient-to-br border ${
                  insights.speedTrend
                    ? insights.speedTrend.trend === "improving"
                      ? "from-green-500/10 to-green-500/5 border-green-500/20"
                      : insights.speedTrend.trend === "declining"
                      ? "from-red-500/10 to-red-500/5 border-red-500/20"
                      : "from-gray-500/10 to-gray-500/5 border-gray-500/20"
                    : "from-gray-500/10 to-gray-500/5 border-gray-500/20"
                }`}
              >
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Zap className="h-3 w-3" />
                          Speed Trend
                          <Info className="h-3 w-3" />
                        </div>
                        {insights.speedTrend ? (
                          <>
                            <div className={`text-lg font-bold capitalize ${
                              insights.speedTrend.trend === "improving"
                                ? "text-green-600 dark:text-green-400"
                                : insights.speedTrend.trend === "declining"
                                ? "text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}>
                              {insights.speedTrend.trend === "improving" ? "↗ " : insights.speedTrend.trend === "declining" ? "↘ " : "→ "}
                              {insights.speedTrend.trend}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {parseFloat(insights.speedTrend.percentChange) > 0 ? "+" : ""}{insights.speedTrend.percentChange}% over time
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Need more data
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {insights.speedTrend ? (
                        <p>
                          Delivery speed is <strong>{insights.speedTrend.trend}</strong> over time.
                          {insights.speedTrend.trend === "improving" 
                            ? " Team is getting faster at completing work (fewer days per SP)."
                            : insights.speedTrend.trend === "declining"
                            ? " Team is slowing down (more days per SP). Consider investigating blockers or workload."
                            : " Speed remains relatively stable across sprints."}
                          {" "}Analysis based on {insights.speedTrend.sprintCount} sprints.
                        </p>
                      ) : (
                        <p>Need at least 3 sprints of data to calculate speed trend.</p>
                      )}
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className={`p-3 rounded-lg bg-gradient-to-br border ${
                  insights.isHighVariation
                    ? "from-orange-500/10 to-orange-500/5 border-orange-500/20"
                    : "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">Speed Variation</div>
                <div className={`text-lg font-bold ${
                  insights.isHighVariation
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {insights.speedVariation}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  days ({insights.variationPercent}%)
                </div>
              </motion.div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(400, speedData.length * 50)}>
            <BarChart 
              data={speedData} 
              layout="vertical"
              margin={{ top: 20, right: 80, left: 120, bottom: 20 }}
            >
              <defs>
                {speedData.map((entry, index) => (
                  <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="5%" stopColor={selectedFunction ? getSpeedColor(entry.daysPerSP) : entry.color} stopOpacity={0.9} />
                    <stop offset="95%" stopColor={selectedFunction ? getSpeedColor(entry.daysPerSP) : entry.color} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} horizontal={false} />
              
              <XAxis
                type="number"
                stroke="#9ca3af"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#9ca3af" }}
                axisLine={{ stroke: "#4b5563" }}
                label={{
                  value: "Days to Complete 5 Story Points",
                  position: "insideBottom",
                  offset: -10,
                  style: { fill: "#9ca3af", fontWeight: 600 },
                }}
              />
              
              <YAxis
                dataKey="name"
                type="category"
                stroke="#9ca3af"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#9ca3af" }}
                axisLine={{ stroke: "#4b5563" }}
                width={110}
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
                formatter={(value: any, name: string, props: any) => {
                  const data = props.payload;
                  const avgSPPerSprint = data.totalSP / data.ticketCount;
                  return [
                    <div key="content" className="space-y-1">
                      <div className="text-white font-semibold">{data.daysPerSP} days for 5 SP</div>
                      <div className="text-xs text-gray-300">
                        Average: {avgSPPerSprint.toFixed(1)} SP per sprint
                      </div>
                      <div className="text-xs text-gray-400">
                        {data.ticketCount} sprints • {data.totalSP} total SP
                      </div>
                    </div>,
                    ""
                  ];
                }}
                cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              />
              
              <Bar
                dataKey="daysPerSP"
                radius={[0, 8, 8, 0]}
                animationDuration={1000}
                animationBegin={200}
                animationEasing="ease-out"
              >
                {speedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${index})`}
                  />
                ))}
                <LabelList
                  dataKey="daysPerSP"
                  position="right"
                  style={{ 
                    fill: "#9ca3af", 
                    fontSize: "13px", 
                    fontWeight: 600 
                  }}
                  formatter={(value: number) => `${value}d`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Interpretation Guide */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              How to Read This Chart
            </h4>
            <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Zap className="h-3 w-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Lower is Better:</span> Fewer days means faster delivery
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Green Bars:</span> 20%+ faster than average
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Blue Bars:</span> Average speed (±20%)
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded bg-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Red Bars:</span> 20%+ slower than average
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Award className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">Example:</span> 10 days = completes 5 SP in 10 days
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-foreground">High Variation:</span> May need process standardization
                </div>
              </div>
            </div>
          </div>
          
          {/* Actionable Insights */}
          {insights && insights.isHighVariation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                    High Speed Variation Detected
                  </h5>
                  <p className="text-sm text-muted-foreground">
                    There's a {insights.variationPercent}% difference between fastest and slowest. 
                    Consider reviewing processes, providing training, or investigating if different 
                    ticket complexities are affecting these metrics.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

