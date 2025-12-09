import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Eye, EyeOff } from "lucide-react";
import { ParsedTicket, FunctionType } from "@/types/openproject";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface UtilizationTrendlineProps {
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

// Helper function to calculate utilization for a set of tickets
// Returns utilization as a ratio (will be multiplied by 100 for percentage)
const calculateUtilization = (
  tickets: ParsedTicket[],
  assignee: string,
  func: FunctionType,
  functionBaselines: Map<FunctionType, number>
): number => {
  const assigneeTickets = tickets.filter(
    (t) => t.assignee === assignee && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
  );
  
  if (assigneeTickets.length === 0) return 0;
  
  const totalSP = assigneeTickets.reduce((sum, t) => sum + t.storyPoints, 0);
  const multiplier = assigneeTickets[0]?.multiplier || 1.0;
  const baseline = functionBaselines.get(func) || 1;
  
  // Average SP per sprint for this period
  const sprints = new Set(assigneeTickets.map(t => t.sprintClosed).filter(s => s && s !== "#N/A"));
  const avgSprintSP = sprints.size > 0 ? totalSP / sprints.size : 0;
  
  // Calculate utilization with NaN guards
  const utilization = (avgSprintSP * multiplier) / baseline;
  
  return isNaN(utilization) || !isFinite(utilization) ? 0 : utilization;
};

// Calculate function baseline with outlier handling
// This uses a robust approach that excludes people who are just helping out or recently joined
const calculateFunctionBaseline = (
  tickets: ParsedTicket[],
  func: FunctionType
): number => {
  const funcTickets = tickets.filter(
    (t) => t.function === func && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
  );
  
  if (funcTickets.length === 0) return 1;
  
  // Group by assignee and sprint
  const assigneeMap = new Map<string, Map<string, number>>();
  funcTickets.forEach(ticket => {
    if (!assigneeMap.has(ticket.assignee)) {
      assigneeMap.set(ticket.assignee, new Map());
    }
    const sprintMap = assigneeMap.get(ticket.assignee)!;
    const sprint = ticket.sprintClosed;
    sprintMap.set(sprint, (sprintMap.get(sprint) || 0) + ticket.storyPoints);
  });
  
  // Calculate median SP per sprint for each assignee
  // Only include assignees with at least 3 sprints to exclude helpers/recent joiners
  const MIN_SPRINTS_FOR_BASELINE = 3;
  const medianSPPerSprint: number[] = [];
  
  assigneeMap.forEach((sprintMap, assignee) => {
    const sprintTotals = Array.from(sprintMap.values()).filter(sp => sp > 0);
    
    // Only include if they have enough sprints (filters out people just helping out)
    if (sprintTotals.length >= MIN_SPRINTS_FOR_BASELINE) {
      // Sort and calculate median
      const sorted = sprintTotals.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      
      if (median > 0) {
        medianSPPerSprint.push(median);
      }
    }
  });
  
  if (medianSPPerSprint.length === 0) {
    // Fallback: if no one has enough sprints, use all available data with 75th percentile
    const allSprintTotals: number[] = [];
    assigneeMap.forEach((sprintMap) => {
      allSprintTotals.push(...Array.from(sprintMap.values()).filter(sp => sp > 0));
    });
    
    if (allSprintTotals.length === 0) return 1;
    
    const sorted = allSprintTotals.sort((a, b) => a - b);
    const p75Index = Math.floor(sorted.length * 0.75);
    return sorted[Math.min(p75Index, sorted.length - 1)];
  }
  
  // Use IQR (Interquartile Range) method to remove outliers
  const sorted = medianSPPerSprint.sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  // Filter out outliers (values outside 1.5 * IQR)
  const lowerBound = Math.max(0, q1 - 1.5 * iqr);
  const upperBound = q3 + 1.5 * iqr;
  const filtered = sorted.filter(val => val >= lowerBound && val <= upperBound);
  
  if (filtered.length === 0) return q3; // Fallback to Q3 if all filtered out
  
  // Return median of filtered values
  const mid = Math.floor(filtered.length / 2);
  const result = filtered.length % 2 === 0
    ? (filtered[mid - 1] + filtered[mid]) / 2
    : filtered[mid];
    
  return result > 0 ? result : 1;
};

export const UtilizationTrendline = ({
  tickets,
  selectedFunction,
  timePeriod,
}: UtilizationTrendlineProps) => {
  // State for toggling series visibility
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const trendData = useMemo(() => {
    const closedTickets = tickets.filter(
      (t) => t.status === "Closed" && 
            t.closedDate && 
            t.sprintClosed !== "#N/A" && 
            t.assignee !== "#N/A" &&
            t.function !== "#N/A"
    );
    
    if (closedTickets.length === 0) return [];
    
    // Calculate function baselines - extract unique functions from actual data
    const uniqueFunctions = Array.from(new Set(
      closedTickets.map(t => t.function).filter(f => f && f !== "#N/A")
    )) as FunctionType[];
    
    const functionBaselines = new Map<FunctionType, number>();
    uniqueFunctions.forEach(func => {
      functionBaselines.set(func, calculateFunctionBaseline(tickets, func));
    });
    
    // Determine if we use quarters or sprints
    const useQuarters = timePeriod === "current_year";
    
    if (useQuarters) {
      // Group by quarter
      const quarterMap = new Map<string, ParsedTicket[]>();
      closedTickets.forEach(ticket => {
        if (ticket.closedDate) {
          const quarter = getQuarter(ticket.closedDate);
          if (!quarterMap.has(quarter)) {
            quarterMap.set(quarter, []);
          }
          quarterMap.get(quarter)!.push(ticket);
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
      
      if (selectedFunction) {
        // Show person-level data for selected function
        const assignees = Array.from(
          new Set(
            closedTickets
              .filter(t => t.function === selectedFunction)
              .map(t => t.assignee)
          )
        );
        
        return sortedQuarters.map(quarter => {
          const quarterTickets = quarterMap.get(quarter)!;
          const dataPoint: any = { period: quarter };
          
          assignees.forEach(assignee => {
            const utilization = calculateUtilization(
              quarterTickets,
              assignee,
              selectedFunction,
              functionBaselines
            );
            const utilizationPercent = utilization * 100;
            dataPoint[assignee] = isNaN(utilizationPercent) || !isFinite(utilizationPercent) ? 0 : utilizationPercent;
          });
          
          return dataPoint;
        });
      } else {
        // Show function-level data (average utilization per function)
        // Use all functions that have any data across all quarters
        const activeFunctions = uniqueFunctions.filter(func => 
          closedTickets.some(t => t.function === func)
        );
        
        return sortedQuarters.map(quarter => {
          const quarterTickets = quarterMap.get(quarter)!;
          const dataPoint: any = { period: quarter };
          
          activeFunctions.forEach(func => {
            const funcTickets = quarterTickets.filter(t => t.function === func);
            const assignees = Array.from(new Set(funcTickets.map(t => t.assignee)));
            
            if (assignees.length > 0) {
              const utilizations = assignees.map(assignee =>
                calculateUtilization(funcTickets, assignee, func, functionBaselines)
              );
              const avgUtilization = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
              const utilizationPercent = avgUtilization * 100;
              dataPoint[func] = isNaN(utilizationPercent) || !isFinite(utilizationPercent) ? 0 : utilizationPercent;
            } else {
              // Set to 0 if no data for this quarter but function exists in other quarters
              dataPoint[func] = 0;
            }
          });
          
          return dataPoint;
        });
      }
    } else {
      // Group by sprint
      const sprintMap = new Map<string, ParsedTicket[]>();
      closedTickets.forEach(ticket => {
        if (ticket.sprintClosed) {
          if (!sprintMap.has(ticket.sprintClosed)) {
            sprintMap.set(ticket.sprintClosed, []);
          }
          sprintMap.get(ticket.sprintClosed)!.push(ticket);
        }
      });
      
      // Sort sprints
      const sortedSprints = Array.from(sprintMap.keys()).sort();
      
      if (selectedFunction) {
        // Show person-level data for selected function
        const assignees = Array.from(
          new Set(
            closedTickets
              .filter(t => t.function === selectedFunction)
              .map(t => t.assignee)
          )
        );
        
        return sortedSprints.map(sprint => {
          const sprintTickets = sprintMap.get(sprint)!;
          const dataPoint: any = { period: sprint };
          
          assignees.forEach(assignee => {
            const utilization = calculateUtilization(
              sprintTickets,
              assignee,
              selectedFunction,
              functionBaselines
            );
            const utilizationPercent = utilization * 100;
            dataPoint[assignee] = isNaN(utilizationPercent) || !isFinite(utilizationPercent) ? 0 : utilizationPercent;
          });
          
          return dataPoint;
        });
      } else {
        // Show function-level data (average utilization per function)
        // Use all functions that have any data across all sprints
        const activeFunctions = uniqueFunctions.filter(func => 
          closedTickets.some(t => t.function === func)
        );
        
        return sortedSprints.map(sprint => {
          const sprintTickets = sprintMap.get(sprint)!;
          const dataPoint: any = { period: sprint };
          
          activeFunctions.forEach(func => {
            const funcTickets = sprintTickets.filter(t => t.function === func);
            const assignees = Array.from(new Set(funcTickets.map(t => t.assignee)));
            
            if (assignees.length > 0) {
              const utilizations = assignees.map(assignee =>
                calculateUtilization(funcTickets, assignee, func, functionBaselines)
              );
              const avgUtilization = utilizations.reduce((a, b) => a + b, 0) / utilizations.length;
              const utilizationPercent = avgUtilization * 100;
              dataPoint[func] = isNaN(utilizationPercent) || !isFinite(utilizationPercent) ? 0 : utilizationPercent;
            } else {
              // Set to 0 if no data for this sprint but function exists in other sprints
              dataPoint[func] = 0;
            }
          });
          
          return dataPoint;
        });
      }
    }
  }, [tickets, selectedFunction, timePeriod]);
  
  // Get series names (either functions or assignees)
  const seriesNames = useMemo(() => {
    if (trendData.length === 0) return [];
    return Object.keys(trendData[0]).filter(key => key !== "period");
  }, [trendData]);
  
  // Toggle series visibility
  const toggleSeries = (seriesName: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seriesName)) {
        newSet.delete(seriesName);
      } else {
        newSet.add(seriesName);
      }
      return newSet;
    });
  };
  
  // Show/hide all series
  const toggleAllSeries = () => {
    if (hiddenSeries.size === seriesNames.length) {
      setHiddenSeries(new Set());
    } else {
      setHiddenSeries(new Set(seriesNames));
    }
  };
  
  // Color palette for lines - vibrant gradients
  const colors = [
    "#8b5cf6", // purple
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
    "#14b8a6", // teal
    "#f97316", // orange
    "#6366f1", // indigo
    "#a855f7", // violet
  ];
  
  const title = selectedFunction
    ? `${selectedFunction} Team Utilization Over Time`
    : "Function Utilization Over Time";
  
  const xAxisLabel = timePeriod === "current_year" ? "Quarter" : "Sprint";
  
  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No utilization data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-primary/20">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <TrendingUp className="h-5 w-5 text-primary" />
                </motion.div>
                {title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-semibold">
                  {seriesNames.length - hiddenSeries.size} / {seriesNames.length} visible
                </Badge>
                <motion.button
                  onClick={toggleAllSeries}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={hiddenSeries.size === seriesNames.length ? "Show All" : "Hide All"}
                >
                  {hiddenSeries.size === seriesNames.length ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </motion.button>
              </div>
            </div>
            
            {/* Interactive Legend */}
            <div className="flex flex-wrap gap-2">
              {seriesNames.map((name, index) => {
                const isHidden = hiddenSeries.has(name);
                const color = colors[index % colors.length];
                
                return (
                  <motion.button
                    key={name}
                    onClick={() => toggleSeries(name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${
                      isHidden
                        ? "bg-muted/20 border-muted/30 opacity-50"
                        : "bg-card/80 border-current shadow-sm hover:shadow-md"
                    }`}
                    style={{
                      borderColor: isHidden ? undefined : color,
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={`w-3 h-3 rounded-full transition-all ${
                        isHidden ? "bg-muted" : ""
                      }`}
                      style={{
                        backgroundColor: isHidden ? undefined : color,
                        boxShadow: isHidden ? undefined : `0 0 8px ${color}40`,
                      }}
                    />
                    <span className={`text-xs font-medium ${isHidden ? "text-muted-foreground line-through" : ""}`}>
                      {name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={trendData}>
              <defs>
                {seriesNames.map((name, index) => (
                  <linearGradient
                    key={name}
                    id={`gradient-${name}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={colors[index % colors.length]}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              
              {/* Reference lines for utilization zones */}
              <line
                x1="0"
                y1="0"
                x2="100%"
                y2="0"
                stroke="#10b981"
                strokeWidth={1}
                strokeDasharray="5 5"
                opacity={0.3}
              />
              
              <XAxis
                dataKey="period"
                stroke="#9ca3af"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#9ca3af" }}
                axisLine={{ stroke: "#4b5563" }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: "12px", fontWeight: 500 }}
                tick={{ fill: "#9ca3af" }}
                axisLine={{ stroke: "#4b5563" }}
                label={{
                  value: "Utilization (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#9ca3af", fontWeight: 600 },
                }}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(17, 24, 39, 0.98)",
                  border: "2px solid #374151",
                  borderRadius: "12px",
                  boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
                  padding: "12px",
                }}
                formatter={(value: any, name: string) => [`${value.toFixed(1)}%`, name]}
                labelStyle={{ color: "#f9fafb", fontWeight: 600, marginBottom: "8px" }}
                itemStyle={{ color: "#e5e7eb", padding: "4px 0" }}
              />
              
              {/* Render lines - skip hidden series */}
              {seriesNames.map((name, index) => {
                if (hiddenSeries.has(name)) return null;
                
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      strokeWidth: 2,
                      fill: colors[index % colors.length],
                      stroke: "#fff",
                    }}
                    activeDot={{
                      r: 7,
                      strokeWidth: 3,
                      fill: colors[index % colors.length],
                      stroke: "#fff",
                      filter: `drop-shadow(0 0 8px ${colors[index % colors.length]})`,
                    }}
                    animationBegin={index * 80}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          
          {/* Reference line indicators */}
          <div className="mt-4 flex justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-green-500" />
              <span>Under 80%: Underutilized</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-blue-500" />
              <span>80-100%: Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-red-500" />
              <span>Over 100%: Overutilized</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

