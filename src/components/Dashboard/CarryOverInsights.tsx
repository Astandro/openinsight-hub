import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ParsedTicket, FunctionType, MultiplierEntry } from "@/types/openproject";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Clock, Users, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ComposedChart, Area } from "recharts";

interface CarryOverInsightsProps {
  tickets: ParsedTicket[];
  selectedProject: string | null;
  selectedFunction: FunctionType | null;
  multipliers?: MultiplierEntry[];
}

// Invalid assignee patterns to filter out
const INVALID_ASSIGNEE_PATTERNS = [
  "team", "unassigned", "frontend", "backend", "tester", "orion", "aman", 
  "threat", "product", "chatbot", "website", "infra", "operation"
];

// Check if an assignee name is valid (a real person)
const isValidAssignee = (assignee: string, multipliers?: MultiplierEntry[]): boolean => {
  if (!assignee || assignee.trim() === "") return false;
  
  const lowerAssignee = assignee.toLowerCase().trim();
  
  // Filter out common invalid patterns
  if (INVALID_ASSIGNEE_PATTERNS.some(pattern => lowerAssignee.includes(pattern))) {
    return false;
  }
  
  // If we have multipliers, check if the assignee is in the list
  if (multipliers && multipliers.length > 0) {
    return multipliers.some(m => 
      m.name.toLowerCase().trim() === lowerAssignee
    );
  }
  
  // If no multipliers, assume names with spaces (first + last name) are valid
  // and filter out single words that might be team/project names
  const words = assignee.trim().split(/\s+/);
  return words.length >= 2; // At least first and last name
};

// Projects that should show carry-over insights
const CARRY_OVER_PROJECTS = ["Orion", "Aman", "Threat Intel", "Intellibron Aman"];

// Functions that should show carry-over insights
const CARRY_OVER_FUNCTIONS: FunctionType[] = ["BE", "FE", "APPS"];

// A ticket is "carried over" if it runs for more than 2 weeks + 1 day (15 days)
const CARRY_OVER_THRESHOLD_DAYS = 15;

export const CarryOverInsights = ({ tickets, selectedProject, selectedFunction, multipliers }: CarryOverInsightsProps) => {
  // Check if we should show this component
  const shouldShow = useMemo(() => {
    // Show for specific projects (when project filter is applied)
    if (selectedProject && CARRY_OVER_PROJECTS.some(p => selectedProject.toLowerCase().includes(p.toLowerCase()))) {
      return true;
    }
    // Show for specific functions (when function filter is applied)
    if (selectedFunction && CARRY_OVER_FUNCTIONS.includes(selectedFunction)) {
      return true;
    }
    // Show when viewing all projects but data contains relevant projects
    if (!selectedProject && !selectedFunction) {
      const hasRelevantProject = tickets.some(t => 
        CARRY_OVER_PROJECTS.some(p => t.project.toLowerCase().includes(p.toLowerCase()))
      );
      return hasRelevantProject;
    }
    return false;
  }, [selectedProject, selectedFunction, tickets]);

  // Calculate carry-over metrics
  const carryOverData = useMemo(() => {
    if (!shouldShow) return null;

    // Filter tickets to relevant projects and functions
    let relevantTickets = tickets.filter(t => {
      const isRelevantProject = CARRY_OVER_PROJECTS.some(p => 
        t.project.toLowerCase().includes(p.toLowerCase())
      );
      const isRelevantFunction = CARRY_OVER_FUNCTIONS.includes(t.function);
      const isClosed = t.status === "Closed";
      const hasValidCycle = t.cycleDays !== null && t.cycleDays > 0;
      
      return isRelevantProject && isRelevantFunction && isClosed && hasValidCycle;
    });

    // Apply current filters
    if (selectedProject) {
      relevantTickets = relevantTickets.filter(t => t.project === selectedProject);
    }
    if (selectedFunction) {
      relevantTickets = relevantTickets.filter(t => t.function === selectedFunction);
    }

    // Filter to only include tickets with valid assignees (real people, not team names)
    // This ensures consistency between overall stats and contributor breakdown
    relevantTickets = relevantTickets.filter(t => isValidAssignee(t.assignee, multipliers));

    if (relevantTickets.length === 0) return null;

    // Calculate overall carry-over rate (now only counts tickets from valid assignees)
    const carriedOverTickets = relevantTickets.filter(t => t.cycleDays! > CARRY_OVER_THRESHOLD_DAYS);
    const overallRate = relevantTickets.length > 0 
      ? (carriedOverTickets.length / relevantTickets.length) * 100 
      : 0;

    // Calculate by sprint
    const sprintData = new Map<string, { total: number; carriedOver: number; avgCycleDays: number; totalCycleDays: number }>();
    relevantTickets.forEach(ticket => {
      const sprint = ticket.sprintClosed || "No Sprint";
      if (sprint === "#N/A" || !sprint) return;
      
      if (!sprintData.has(sprint)) {
        sprintData.set(sprint, { total: 0, carriedOver: 0, avgCycleDays: 0, totalCycleDays: 0 });
      }
      const data = sprintData.get(sprint)!;
      data.total += 1;
      data.totalCycleDays += ticket.cycleDays!;
      if (ticket.cycleDays! > CARRY_OVER_THRESHOLD_DAYS) {
        data.carriedOver += 1;
      }
    });

    // Calculate averages and sort by sprint number
    const sprintChartData = Array.from(sprintData.entries())
      .map(([sprint, data]) => ({
        sprint,
        sprintNum: parseInt(sprint.replace(/\D/g, '')) || 0,
        total: data.total,
        carriedOver: data.carriedOver,
        rate: data.total > 0 ? (data.carriedOver / data.total) * 100 : 0,
        avgCycleDays: data.total > 0 ? data.totalCycleDays / data.total : 0,
      }))
      .filter(d => d.sprintNum > 0)
      .sort((a, b) => a.sprintNum - b.sprintNum)
      .slice(-8); // Last 8 sprints

    // Calculate by function
    const functionData = new Map<string, { total: number; carriedOver: number }>();
    relevantTickets.forEach(ticket => {
      const func = ticket.function;
      if (!functionData.has(func)) {
        functionData.set(func, { total: 0, carriedOver: 0 });
      }
      const data = functionData.get(func)!;
      data.total += 1;
      if (ticket.cycleDays! > CARRY_OVER_THRESHOLD_DAYS) {
        data.carriedOver += 1;
      }
    });

    const functionChartData = Array.from(functionData.entries())
      .map(([func, data]) => ({
        function: func,
        total: data.total,
        carriedOver: data.carriedOver,
        rate: data.total > 0 ? (data.carriedOver / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    // Calculate by assignee (top offenders) - only include valid person names
    const assigneeData = new Map<string, { total: number; carriedOver: number; function: string }>();
    relevantTickets.forEach(ticket => {
      const assignee = ticket.assignee;
      
      // Skip invalid assignees (team names, project names, unassigned, etc.)
      if (!isValidAssignee(assignee, multipliers)) {
        return;
      }
      
      if (!assigneeData.has(assignee)) {
        assigneeData.set(assignee, { total: 0, carriedOver: 0, function: ticket.function });
      }
      const data = assigneeData.get(assignee)!;
      data.total += 1;
      if (ticket.cycleDays! > CARRY_OVER_THRESHOLD_DAYS) {
        data.carriedOver += 1;
      }
    });

    const topCarryOverAssignees = Array.from(assigneeData.entries())
      .map(([assignee, data]) => ({
        assignee,
        function: data.function,
        total: data.total,
        carriedOver: data.carriedOver,
        rate: data.total > 0 ? (data.carriedOver / data.total) * 100 : 0,
      }))
      .filter(d => d.total >= 3) // At least 3 tickets
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // Trend analysis - compare recent sprints
    const recentSprints = sprintChartData.slice(-4);
    const olderSprints = sprintChartData.slice(-8, -4);
    const recentAvgRate = recentSprints.length > 0 
      ? recentSprints.reduce((sum, d) => sum + d.rate, 0) / recentSprints.length 
      : 0;
    const olderAvgRate = olderSprints.length > 0 
      ? olderSprints.reduce((sum, d) => sum + d.rate, 0) / olderSprints.length 
      : 0;
    const trendDirection = recentAvgRate < olderAvgRate ? "improving" : recentAvgRate > olderAvgRate ? "worsening" : "stable";

    return {
      overallRate,
      totalTickets: relevantTickets.length,
      carriedOverCount: carriedOverTickets.length,
      sprintChartData,
      functionChartData,
      topCarryOverAssignees,
      trendDirection,
      trendChange: Math.abs(recentAvgRate - olderAvgRate),
    };
  }, [tickets, selectedProject, selectedFunction, shouldShow, multipliers]);

  if (!shouldShow || !carryOverData) {
    return null;
  }

  const getRateColor = (rate: number) => {
    if (rate <= 10) return "text-green-500";
    if (rate <= 25) return "text-yellow-500";
    return "text-red-500";
  };

  const getRateBg = (rate: number) => {
    if (rate <= 10) return "bg-green-500/10 border-green-500/20";
    if (rate <= 25) return "bg-yellow-500/10 border-yellow-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <Card className="p-6 bg-card/80 backdrop-blur">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-amber-500" />
            Carry-Over Insights
          </h2>
          <Badge variant="outline" className="text-xs">
            {CARRY_OVER_FUNCTIONS.join(", ")} • {"> "}15 days
          </Badge>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Overall Rate */}
          <motion.div
            className={`p-4 rounded-xl border-2 ${getRateBg(carryOverData.overallRate)}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${getRateColor(carryOverData.overallRate)}`} />
              <span className="text-xs text-muted-foreground font-medium">Carry-Over Rate</span>
            </div>
            <div className={`text-3xl font-bold ${getRateColor(carryOverData.overallRate)}`}>
              {carryOverData.overallRate.toFixed(1)}%
            </div>
          </motion.div>

          {/* Total Tickets */}
          <motion.div
            className="p-4 rounded-xl border-2 bg-primary/5 border-primary/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Total Analyzed</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {carryOverData.totalTickets}
            </div>
          </motion.div>

          {/* Carried Over Count */}
          <motion.div
            className="p-4 rounded-xl border-2 bg-amber-500/5 border-amber-500/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground font-medium">Carried Over</span>
            </div>
            <div className="text-3xl font-bold text-amber-500">
              {carryOverData.carriedOverCount}
            </div>
          </motion.div>

          {/* Trend */}
          <motion.div
            className={`p-4 rounded-xl border-2 ${
              carryOverData.trendDirection === "improving" 
                ? "bg-green-500/5 border-green-500/20" 
                : carryOverData.trendDirection === "worsening"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-muted/50 border-muted"
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-2">
              {carryOverData.trendDirection === "improving" ? (
                <TrendingDown className="h-4 w-4 text-green-500" />
              ) : carryOverData.trendDirection === "worsening" ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground font-medium">Trend</span>
            </div>
            <div className={`text-lg font-bold capitalize ${
              carryOverData.trendDirection === "improving" 
                ? "text-green-500" 
                : carryOverData.trendDirection === "worsening"
                ? "text-red-500"
                : "text-muted-foreground"
            }`}>
              {carryOverData.trendDirection}
              {carryOverData.trendChange > 0 && (
                <span className="text-sm font-normal ml-1">
                  ({carryOverData.trendChange.toFixed(1)}%)
                </span>
              )}
            </div>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sprint Trend Chart */}
          <motion.div
            className="p-4 rounded-xl border bg-card/50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Carry-Over Rate by Sprint
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={carryOverData.sprintChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="sprint" 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => value.replace("Sprint ", "S")}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "rate") return [`${value.toFixed(1)}%`, "Carry-Over Rate"];
                    if (name === "total") return [value, "Total Tickets"];
                    return [value, name];
                  }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  stroke="none"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Function Breakdown */}
          <motion.div
            className="p-4 rounded-xl border bg-card/50"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Carry-Over Rate by Function
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={carryOverData.functionChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis 
                  dataKey="function" 
                  type="category"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Carry-Over Rate"]}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {carryOverData.functionChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.rate <= 10 ? "#22c55e" : entry.rate <= 25 ? "#eab308" : "#ef4444"}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Top Carry-Over Assignees */}
        {carryOverData.topCarryOverAssignees.length > 0 && (
          <motion.div
            className="p-4 rounded-xl border bg-card/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Top Carry-Over Contributors
              <span className="text-xs text-muted-foreground font-normal">(min. 3 tickets)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {carryOverData.topCarryOverAssignees.map((person, index) => (
                <motion.div
                  key={person.assignee}
                  className={`p-3 rounded-lg border ${getRateBg(person.rate)}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.45 + index * 0.05 }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium truncate flex-1" title={person.assignee}>
                      {person.assignee}
                    </span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 flex-shrink-0">
                      {person.function}
                    </Badge>
                  </div>
                  <div className={`text-xl font-bold ${getRateColor(person.rate)}`}>
                    {person.rate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {person.carriedOver}/{person.total} tickets
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Info Footer */}
        <div className="mt-4 text-xs text-muted-foreground text-center">
          A ticket is considered "carried over" if it takes more than 15 days (2 weeks + 1 day) to complete.
          Lower rates indicate better sprint planning and execution.
        </div>
      </Card>
    </motion.div>
  );
};

