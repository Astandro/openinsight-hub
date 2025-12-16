import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Info, BarChart3, User } from "lucide-react";
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
  multipliers?: Array<{ name: string; capacity?: number; metric?: "sp" | "ticket" }>;
  allTickets: ParsedTicket[];
}

// Helper: Calculate utilization for one person
const calculatePersonUtilization = (
  personTickets: ParsedTicket[],
  allPersonTickets: ParsedTicket[],
  multiplierEntry?: { capacity?: number; metric?: "sp" | "ticket" }
): number => {
  if (personTickets.length === 0) return 0;
  
  const metric = multiplierEntry?.metric || "sp";
  
  // Group by sprint
  const sprintMap = new Map<string, { sp: number; tickets: number }>();
  personTickets.forEach(ticket => {
    const sprint = ticket.sprintClosed;
    if (sprint && sprint !== "#N/A") {
      const current = sprintMap.get(sprint) || { sp: 0, tickets: 0 };
      sprintMap.set(sprint, {
        sp: current.sp + ticket.storyPoints,
        tickets: current.tickets + 1
      });
    }
  });
  
  if (sprintMap.size === 0) return 0;
  
  // Calculate average workload
  const sprintWorkloads = Array.from(sprintMap.values()).map(entry => 
    metric === "sp" ? entry.sp : entry.tickets
  ).filter(w => w > 0);
  
  if (sprintWorkloads.length === 0) return 0;
  
  const avgWorkload = sprintWorkloads.reduce((a, b) => a + b, 0) / sprintWorkloads.length;
  
  // Get capacity (from config or historical peak)
  let capacity: number;
  
  if (multiplierEntry?.capacity && multiplierEntry.capacity > 0) {
    capacity = multiplierEntry.capacity;
  } else {
    // Calculate historical peak capacity
    const historicalSprintMap = new Map<string, { sp: number; tickets: number }>();
    allPersonTickets.forEach(ticket => {
      const sprint = ticket.sprintClosed;
      if (sprint && sprint !== "#N/A") {
        const current = historicalSprintMap.get(sprint) || { sp: 0, tickets: 0 };
        historicalSprintMap.set(sprint, {
          sp: current.sp + ticket.storyPoints,
          tickets: current.tickets + 1
        });
      }
    });
    
    const historicalWorkloads = Array.from(historicalSprintMap.values())
      .map(entry => metric === "sp" ? entry.sp : entry.tickets)
      .filter(w => w > 0)
      .sort((a, b) => b - a);
    
    if (historicalWorkloads.length === 0) return 0;
    
    // Use 95th percentile, max, or average based on data points
    if (historicalWorkloads.length >= 5) {
      const percentile95Index = Math.floor(historicalWorkloads.length * 0.05);
      capacity = historicalWorkloads[percentile95Index];
    } else if (historicalWorkloads.length >= 3) {
      capacity = historicalWorkloads[0]; // max
    } else {
      capacity = historicalWorkloads.reduce((a, b) => a + b, 0) / historicalWorkloads.length * 1.3;
    }
  }
  
  if (capacity === 0) return 0;
  
  return avgWorkload / capacity;
};

export const UtilizationTrendline = ({
  tickets,
  selectedFunction,
  timePeriod,
  multipliers,
  allTickets,
}: UtilizationTrendlineProps) => {
  // Toggle between overall vs detailed view
  const [showDetailed, setShowDetailed] = useState(false);
  
  // Track which series are selected (empty = show all)
  const [selectedSeries, setSelectedSeries] = useState<Set<string>>(new Set());
  
  // Real stats calculation
  const stats = useMemo(() => {
    const closedTickets = tickets.filter(
      t => t.status === "Closed" && 
           t.sprintClosed && 
            t.sprintClosed !== "#N/A" && 
           t.assignee !== "#N/A"
    );
    
    if (closedTickets.length === 0) {
      return {
        avgUtilization: 0,
        totalPeople: 0,
        overutilizedCount: 0,
        underutilizedCount: 0,
        optimalCount: 0,
      };
    }
    
    // Get unique assignees
    const assignees = Array.from(new Set(closedTickets.map(t => t.assignee)));
    
    // Calculate utilization for each person
    const utilizations: number[] = [];
    assignees.forEach(assignee => {
      const assigneeTickets = closedTickets.filter(t => t.assignee === assignee);
      const allAssigneeTickets = allTickets.filter(
        t => t.assignee === assignee && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
      );
      
      const multiplierEntry = multipliers?.find(m => m.name?.toLowerCase() === assignee.toLowerCase());
      
      const utilization = calculatePersonUtilization(
        assigneeTickets,
        allAssigneeTickets,
        multiplierEntry ? { capacity: multiplierEntry.capacity, metric: multiplierEntry.metric } : undefined
      );
      
      if (isFinite(utilization) && !isNaN(utilization)) {
        utilizations.push(utilization);
      }
    });
    
    if (utilizations.length === 0) {
      return {
        avgUtilization: 0,
        totalPeople: assignees.length,
        overutilizedCount: 0,
        underutilizedCount: 0,
        optimalCount: 0,
      };
    }
    
    // Calculate statistics
    const avgUtil = (utilizations.reduce((a, b) => a + b, 0) / utilizations.length) * 100;
    const overutilizedCount = utilizations.filter(u => u > 1.0).length;
    const underutilizedCount = utilizations.filter(u => u < 0.7).length;
    const optimalCount = utilizations.filter(u => u >= 0.7 && u <= 1.0).length;
    
    return {
      avgUtilization: avgUtil,
      totalPeople: utilizations.length,
      overutilizedCount,
      underutilizedCount,
      optimalCount,
    };
  }, [tickets, multipliers, allTickets]);

  // Real hiring recommendation based on utilization
  const hiring = useMemo(() => {
    if (stats.totalPeople === 0) {
      return {
        status: "No Data",
        message: "No data available",
        color: "text-gray-600",
        score: 0,
      };
    }
    
    const avgUtil = stats.avgUtilization / 100; // Convert to ratio
    const overutilizedPercent = (stats.overutilizedCount / stats.totalPeople) * 100;
    
    // Score calculation (0-100)
    let score = 0;
    
    // Factor 1: Average utilization (0-50 points)
    if (avgUtil >= 1.0) score += 50;
    else if (avgUtil >= 0.7) score += 25 + ((avgUtil - 0.7) / 0.3) * 25;
    else score += (avgUtil / 0.7) * 25;
    
    // Factor 2: Overutilized percentage (0-50 points)
    if (overutilizedPercent >= 50) score += 50;
    else if (overutilizedPercent >= 30) score += 30 + ((overutilizedPercent - 30) / 20) * 20;
    else score += (overutilizedPercent / 30) * 30;
    
    // Penalty for high underutilization
    const underutilizedPercent = (stats.underutilizedCount / stats.totalPeople) * 100;
    if (underutilizedPercent > 50) score -= 20;
    else if (underutilizedPercent > 30) score -= 10;
    
    score = Math.max(0, Math.min(100, score));
    
    let status: string, message: string, color: string;
    if (score >= 65) {
      status = "✓ Hire Recommended";
      message = `${Math.round(score)}% recommendation score`;
      color = "text-purple-600";
    } else if (score >= 40) {
      status = "⚠ Consider Hiring";
      message = `${Math.round(score)}% recommendation score`;
      color = "text-amber-600";
    } else {
      status = "✗ Not Recommended";
      message = `${Math.round(score)}% recommendation score`;
      color = "text-gray-600";
    }
    
    return { status, message, color, score: Math.round(score) };
  }, [stats]);

  // Real chart data based on sprints - supports both overall and detailed views
  const chartData = useMemo(() => {
    const closedTickets = tickets.filter(
      t => t.status === "Closed" && 
           t.sprintClosed && 
           t.sprintClosed !== "#N/A" && 
           t.assignee !== "#N/A"
    );
    
    if (closedTickets.length === 0) return [];
    
      // Group by sprint
      const sprintMap = new Map<string, ParsedTicket[]>();
      closedTickets.forEach(ticket => {
      const sprint = ticket.sprintClosed;
      if (!sprintMap.has(sprint)) {
        sprintMap.set(sprint, []);
      }
      sprintMap.get(sprint)!.push(ticket);
      });
      
      // Sort sprints
      const sortedSprints = Array.from(sprintMap.keys()).sort();
      
    if (!showDetailed) {
      // Overall view - single average line
      return sortedSprints.map(sprint => {
        const sprintTickets = sprintMap.get(sprint)!;
        const assignees = Array.from(new Set(sprintTickets.map(t => t.assignee)));
        
        const utilizations: number[] = [];
        assignees.forEach(assignee => {
          const assigneeTickets = sprintTickets.filter(t => t.assignee === assignee);
          const allAssigneeTickets = allTickets.filter(
            t => t.assignee === assignee && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
          );
          
          const multiplierEntry = multipliers?.find(m => m.name?.toLowerCase() === assignee.toLowerCase());
          
          const utilization = calculatePersonUtilization(
            assigneeTickets,
            allAssigneeTickets,
            multiplierEntry ? { capacity: multiplierEntry.capacity, metric: multiplierEntry.metric } : undefined
          );
          
          if (isFinite(utilization) && !isNaN(utilization)) {
            utilizations.push(utilization);
          }
        });
        
        const avgUtil = utilizations.length > 0 
          ? (utilizations.reduce((a, b) => a + b, 0) / utilizations.length) * 100 
          : 0;
        
        return {
          sprint,
          Overall: Math.round(avgUtil * 10) / 10,
        };
      });
    } else {
      // Detailed view - per function or per individual
      if (selectedFunction) {
        // Show per individual (names) when function is selected
        // First, collect ALL assignees across all sprints
        const allAssignees = Array.from(new Set(closedTickets.map(t => t.assignee)));
        
        return sortedSprints.map(sprint => {
          const sprintTickets = sprintMap.get(sprint)!;
          const dataPoint: any = { sprint };
          
          // Calculate for ALL assignees (not just those in this sprint)
          allAssignees.forEach(assignee => {
            const assigneeTickets = sprintTickets.filter(t => t.assignee === assignee);
            const allAssigneeTickets = allTickets.filter(
              t => t.assignee === assignee && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
            );
            
            const multiplierEntry = multipliers?.find(m => m.name?.toLowerCase() === assignee.toLowerCase());
            
            const utilization = calculatePersonUtilization(
              assigneeTickets,
              allAssigneeTickets,
              multiplierEntry ? { capacity: multiplierEntry.capacity, metric: multiplierEntry.metric } : undefined
            );
            
            // Always add to dataPoint (even if 0) so line is continuous
            dataPoint[assignee] = isFinite(utilization) && !isNaN(utilization) 
              ? Math.round(utilization * 1000) / 10 
              : 0;
          });
          
          return dataPoint;
        });
      } else {
        // Show per function when no function filter
        // First, collect ALL functions across all sprints
        const allFunctions = Array.from(new Set(closedTickets.map(t => t.function).filter(f => f !== "#N/A")));
        
        return sortedSprints.map(sprint => {
          const sprintTickets = sprintMap.get(sprint)!;
          const dataPoint: any = { sprint };
          
          // Calculate for ALL functions (not just those in this sprint)
          allFunctions.forEach(func => {
            const funcTickets = sprintTickets.filter(t => t.function === func);
            
            if (funcTickets.length === 0) {
              // No tickets for this function in this sprint
              dataPoint[func] = 0;
            } else {
              const assignees = Array.from(new Set(funcTickets.map(t => t.assignee)));
              
              const utilizations: number[] = [];
              assignees.forEach(assignee => {
                const assigneeTickets = funcTickets.filter(t => t.assignee === assignee);
                const allAssigneeTickets = allTickets.filter(
                  t => t.assignee === assignee && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
                );
                
                const multiplierEntry = multipliers?.find(m => m.name?.toLowerCase() === assignee.toLowerCase());
                
                const utilization = calculatePersonUtilization(
                  assigneeTickets,
                  allAssigneeTickets,
                  multiplierEntry ? { capacity: multiplierEntry.capacity, metric: multiplierEntry.metric } : undefined
                );
                
                if (isFinite(utilization) && !isNaN(utilization)) {
                  utilizations.push(utilization);
                }
              });
              
              const avgUtil = utilizations.length > 0 
                ? (utilizations.reduce((a, b) => a + b, 0) / utilizations.length) * 100 
                : 0;
              
              dataPoint[func] = Math.round(avgUtil * 10) / 10;
            }
          });
          
          return dataPoint;
        });
      }
    }
  }, [tickets, multipliers, allTickets, showDetailed, selectedFunction]);
  
  // Get all series names (for detailed view)
  const seriesNames = useMemo(() => {
    if (chartData.length === 0) return [];
    const keys = Object.keys(chartData[0]).filter(key => key !== "sprint");
    return keys;
  }, [chartData]);
  
  // Color palette for multiple lines
  const colors = [
    "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#a855f7",
  ];
  
  // Toggle series selection
  const toggleSeries = (seriesName: string) => {
    setSelectedSeries(prev => {
      const newSet = new Set(prev);
      
      // If clicking on already selected item (and it's the only one), clear selection (show all)
      if (newSet.has(seriesName) && newSet.size === 1) {
        return new Set();
      }
      
      // If clicking on a new item, show only that one
      return new Set([seriesName]);
    });
  };
  
    return (
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Utilization Over Time
          </CardTitle>
          
          {/* Toggle for detailed view */}
          <div className="flex items-center gap-2">
            <Button
              variant={showDetailed ? "outline" : "default"}
              size="sm"
              onClick={() => setShowDetailed(false)}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Overall
            </Button>
            <Button
              variant={showDetailed ? "default" : "outline"}
              size="sm"
              onClick={() => setShowDetailed(true)}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              {selectedFunction ? "Individual" : "By Function"}
            </Button>
          </div>
        </div>
        </CardHeader>
        <CardContent>
        {/* Summary Cards - Simple and Clean */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Hiring Recommendation */}
          <Card className="bg-purple-50 dark:bg-purple-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">Hiring Recommendation</p>
                  <p className={`text-xl font-bold ${hiring.color}`}>
                    {hiring.status}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {hiring.message}
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 via-amber-500 to-red-500 h-2 rounded-full"
                          style={{ width: `${hiring.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{hiring.score}%</span>
                    </div>
                  </div>
                </div>
                <Users className="h-8 w-8 text-purple-600 ml-4" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Average Utilization */}
          <Card className="bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Average Utilization</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.avgUtilization.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Across {stats.totalPeople} people
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

          {/* Card 3: Team Status */}
          <Card className="bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-6">
            <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Team Status</p>
                  <p className="text-lg font-bold text-green-600">
                    {stats.overutilizedCount > stats.underutilizedCount 
                      ? "⚠ Overloaded" 
                      : stats.underutilizedCount > stats.optimalCount 
                      ? "✓ Has Capacity" 
                      : "✓ Balanced"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.optimalCount} in optimal range
                  </p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>Over: {stats.overutilizedCount}</div>
                  <div>Under: {stats.underutilizedCount}</div>
                  <div>Optimal: {stats.optimalCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
            
            {/* Interactive Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
              {seriesNames.map((name, index) => {
            const isSelected = selectedSeries.size === 0 || selectedSeries.has(name);
                const color = colors[index % colors.length];
                
                return (
              <button
                    key={name}
                    onClick={() => toggleSeries(name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 transition-all ${
                  isSelected
                    ? "bg-white dark:bg-gray-900 border-current shadow-sm hover:shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-50"
                    }`}
                    style={{
                  borderColor: isSelected ? color : undefined,
                    }}
                  >
                    <div
                  className="w-3 h-3 rounded-full"
                      style={{
                    backgroundColor: isSelected ? color : "#9ca3af",
                      }}
                    />
                <span className={`text-sm font-medium ${isSelected ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
                      {name}
                    </span>
              </button>
                );
              })}
            </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
              <XAxis
              dataKey="sprint" 
              style={{ fontSize: "12px" }}
              />
              <YAxis
              label={{ value: 'Utilization (%)', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            
            {/* Render lines based on view mode and visibility */}
              {seriesNames.map((name, index) => {
              const isVisible = selectedSeries.size === 0 || selectedSeries.has(name);
                
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={colors[index % colors.length]}
                  strokeWidth={showDetailed ? 2 : 3}
                  dot={{ r: showDetailed ? 3 : 4 }}
                  activeDot={{ r: showDetailed ? 5 : 6 }}
                  name={name}
                  hide={!isVisible}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
  );
};
