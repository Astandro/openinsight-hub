import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from "recharts";
import { ParsedTicket, FunctionType, Filters } from "@/types/openproject";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { TrendingUp, Sparkles } from "lucide-react";

interface FunctionPerformanceProps {
  tickets: ParsedTicket[];
  selectedFunction: FunctionType | null;
  selectedProject: string | null;
  timePeriod?: Filters["timePeriod"];
}

export const FunctionPerformance = ({ tickets, selectedFunction, selectedProject, timePeriod = "all" }: FunctionPerformanceProps) => {
  // Check if we should show the quarterly trend (current_year + all projects + all functions)
  const showQuarterlyTrend = timePeriod === "current_year" && !selectedProject && !selectedFunction;

  // Calculate quarterly trend data
  const quarterlyTrendData = useMemo(() => {
    if (!showQuarterlyTrend) return null;

    const closedTickets = tickets.filter(t => t.status === "Closed" && t.closedDate);
    if (closedTickets.length === 0) return null;

    // Get the year with most tickets
    const yearCounts = new Map<number, number>();
    closedTickets.forEach(t => {
      const year = t.closedDate!.getFullYear();
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });
    let dataYear = new Date().getFullYear();
    let maxCount = 0;
    yearCounts.forEach((count, year) => {
      if (count > maxCount) {
        maxCount = count;
        dataYear = year;
      }
    });

    // Group by quarter
    const quarterData = new Map<string, { storyPoints: number; tickets: number; quarter: string; quarterNum: number }>();
    
    closedTickets.forEach(ticket => {
      if (!ticket.closedDate) return;
      const ticketYear = ticket.closedDate.getFullYear();
      if (ticketYear !== dataYear) return;

      const month = ticket.closedDate.getMonth();
      let quarterNum: number;
      let quarterLabel: string;
      
      if (month < 3) { quarterNum = 1; quarterLabel = "Q1"; }
      else if (month < 6) { quarterNum = 2; quarterLabel = "Q2"; }
      else if (month < 9) { quarterNum = 3; quarterLabel = "Q3"; }
      else { quarterNum = 4; quarterLabel = "Q4"; }

      const key = `${dataYear}-${quarterLabel}`;
      
      if (!quarterData.has(key)) {
        quarterData.set(key, { storyPoints: 0, tickets: 0, quarter: quarterLabel, quarterNum });
      }
      
      const data = quarterData.get(key)!;
      data.storyPoints += ticket.storyPoints;
      data.tickets += 1;
    });

    const sortedData = Array.from(quarterData.values())
      .sort((a, b) => a.quarterNum - b.quarterNum);

    // Calculate growth percentages
    const withGrowth = sortedData.map((item, index) => {
      const prevItem = index > 0 ? sortedData[index - 1] : null;
      const spGrowth = prevItem && prevItem.storyPoints > 0 
        ? ((item.storyPoints - prevItem.storyPoints) / prevItem.storyPoints) * 100 
        : 0;
      const ticketGrowth = prevItem && prevItem.tickets > 0 
        ? ((item.tickets - prevItem.tickets) / prevItem.tickets) * 100 
        : 0;
      
      return {
        ...item,
        spGrowth,
        ticketGrowth,
      };
    });

    // Calculate overall year growth (Q1 to latest quarter)
    const firstQuarter = withGrowth[0];
    const lastQuarter = withGrowth[withGrowth.length - 1];
    const yearlySpGrowth = firstQuarter && firstQuarter.storyPoints > 0
      ? ((lastQuarter.storyPoints - firstQuarter.storyPoints) / firstQuarter.storyPoints) * 100
      : 0;
    const yearlyTicketGrowth = firstQuarter && firstQuarter.tickets > 0
      ? ((lastQuarter.tickets - firstQuarter.tickets) / firstQuarter.tickets) * 100
      : 0;

    return {
      data: withGrowth,
      year: dataYear,
      totalSP: sortedData.reduce((sum, d) => sum + d.storyPoints, 0),
      totalTickets: sortedData.reduce((sum, d) => sum + d.tickets, 0),
      yearlySpGrowth,
      yearlyTicketGrowth,
    };
  }, [tickets, showQuarterlyTrend]);

  const chartData = useMemo(() => {
    if (selectedFunction) {
      // Show assignees when a specific function is selected
      const functionTickets = tickets.filter(t => t.function === selectedFunction && t.status === "Closed");
      
      // Group by assignee
      const assigneeData = new Map<string, { userStory: number; bug: number; revise: number }>();
      
      functionTickets.forEach(ticket => {
        const assignee = ticket.assignee;
        if (!assigneeData.has(assignee)) {
          assigneeData.set(assignee, { userStory: 0, bug: 0, revise: 0 });
        }
        
        const data = assigneeData.get(assignee)!;
        const sp = ticket.storyPoints;
        
        if (ticket.isRevise) {
          data.revise += sp;
        } else if (ticket.isBug) {
          data.bug += sp;
        } else {
          data.userStory += sp;
        }
      });
      
      return Array.from(assigneeData.entries()).map(([name, data]) => ({
        name,
        "User Story": data.userStory,
        "Bug": data.bug,
        "Revise": data.revise,
      })).sort((a, b) => {
        const totalA = a["User Story"] + a["Bug"] + a["Revise"];
        const totalB = b["User Story"] + b["Bug"] + b["Revise"];
        return totalB - totalA;
      });
    } else if (!selectedProject) {
      // Show PROJECTS when both function and project are "all"
      const closedTickets = tickets.filter(t => t.status === "Closed");
      const projectData = new Map<string, { userStory: number; bug: number; revise: number }>();
      
      closedTickets.forEach(ticket => {
        const project = ticket.project;
        if (!projectData.has(project)) {
          projectData.set(project, { userStory: 0, bug: 0, revise: 0 });
        }
        
        const data = projectData.get(project)!;
        const sp = ticket.storyPoints;
        
        if (ticket.isRevise) {
          data.revise += sp;
        } else if (ticket.isBug) {
          data.bug += sp;
        } else {
          data.userStory += sp;
        }
      });
      
      return Array.from(projectData.entries()).map(([name, data]) => ({
        name,
        "User Story": data.userStory,
        "Bug": data.bug,
        "Revise": data.revise,
      })).sort((a, b) => {
        const totalA = a["User Story"] + a["Bug"] + a["Revise"];
        const totalB = b["User Story"] + b["Bug"] + b["Revise"];
        return totalB - totalA;
      });
    } else {
      // Show functions when project is selected but function is "all"
      const closedTickets = tickets.filter(t => t.status === "Closed");
      const functionData = new Map<string, { userStory: number; bug: number; revise: number }>();
      
      closedTickets.forEach(ticket => {
        const func = ticket.function;
        if (!functionData.has(func)) {
          functionData.set(func, { userStory: 0, bug: 0, revise: 0 });
        }
        
        const data = functionData.get(func)!;
        const sp = ticket.storyPoints;
        
        if (ticket.isRevise) {
          data.revise += sp;
        } else if (ticket.isBug) {
          data.bug += sp;
        } else {
          data.userStory += sp;
        }
      });
      
      return Array.from(functionData.entries()).map(([name, data]) => ({
        name,
        "User Story": data.userStory,
        "Bug": data.bug,
        "Revise": data.revise,
      })).sort((a, b) => {
        const totalA = a["User Story"] + a["Bug"] + a["Revise"];
        const totalB = b["User Story"] + b["Bug"] + b["Revise"];
        return totalB - totalA;
      });
    }
  }, [tickets, selectedFunction, selectedProject]);

  const title = selectedFunction 
    ? `${selectedFunction} Team Performance`
    : (!selectedProject ? "Project Performance Overview" : "Function Performance Overview");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="p-6 bg-card/80 backdrop-blur">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {title}
        </h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <defs>
                <linearGradient id="colorUserStory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorBug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#f87171" stopOpacity={0.7}/>
                </linearGradient>
                <linearGradient id="colorRevise" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.9}/>
                  <stop offset="100%" stopColor="#fb923c" stopOpacity={0.7}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { fill: "hsl(var(--foreground))", fontSize: 14 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "13px",
                  padding: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number, name: string) => [`${value} SP`, name]}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="square"
              />
              <Bar 
                dataKey="User Story" 
                stackId="a" 
                fill="url(#colorUserStory)" 
                radius={[0, 0, 0, 0]}
                animationBegin={0}
                animationDuration={800}
              />
              <Bar 
                dataKey="Bug" 
                stackId="a" 
                fill="url(#colorBug)" 
                radius={[0, 0, 0, 0]}
                animationBegin={200}
                animationDuration={800}
              />
              <Bar 
                dataKey="Revise" 
                stackId="a" 
                fill="url(#colorRevise)" 
                radius={[8, 8, 0, 0]}
                animationBegin={400}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Enhanced Legend */}
        <motion.div 
          className="mt-6 flex flex-wrap gap-6 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-400 shadow-sm" />
            <span className="text-sm font-medium">User Story</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-400 shadow-sm" />
            <span className="text-sm font-medium">Bug</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-orange-400 shadow-sm" />
            <span className="text-sm font-medium">Revise</span>
          </div>
        </motion.div>

        {/* Quarterly Trend Section - Only shown when current_year + all projects + all functions */}
        {showQuarterlyTrend && quarterlyTrendData && quarterlyTrendData.data.length > 1 && (
          <motion.div
            className="mt-8 pt-8 border-t border-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                {quarterlyTrendData.year} Quarterly Growth
              </h3>
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  quarterlyTrendData.yearlySpGrowth >= 0 
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" 
                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                }`}>
                  <TrendingUp className={`h-4 w-4 ${quarterlyTrendData.yearlySpGrowth < 0 ? "rotate-180" : ""}`} />
                  <span>SP: {quarterlyTrendData.yearlySpGrowth >= 0 ? "+" : ""}{quarterlyTrendData.yearlySpGrowth.toFixed(0)}%</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  quarterlyTrendData.yearlyTicketGrowth >= 0 
                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" 
                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                }`}>
                  <TrendingUp className={`h-4 w-4 ${quarterlyTrendData.yearlyTicketGrowth < 0 ? "rotate-180" : ""}`} />
                  <span>Tickets: {quarterlyTrendData.yearlyTicketGrowth >= 0 ? "+" : ""}{quarterlyTrendData.yearlyTicketGrowth.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Quarterly Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {quarterlyTrendData.data.map((quarter, index) => (
                <motion.div
                  key={quarter.quarter}
                  className="relative p-4 rounded-xl bg-gradient-to-br from-card to-muted/20 border border-border/50 overflow-hidden"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 + index * 0.1 }}
                >
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
                  
                  <div className="relative">
                    <div className="text-lg font-bold text-primary mb-3">{quarter.quarter}</div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Story Points</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold">{quarter.storyPoints.toLocaleString()}</span>
                          {index > 0 && quarter.spGrowth !== 0 && (
                            <span className={`text-xs font-medium ${quarter.spGrowth >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                              {quarter.spGrowth >= 0 ? "↑" : "↓"}{Math.abs(quarter.spGrowth).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Tickets</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold">{quarter.tickets.toLocaleString()}</span>
                          {index > 0 && quarter.ticketGrowth !== 0 && (
                            <span className={`text-xs font-medium ${quarter.ticketGrowth >= 0 ? "text-blue-500" : "text-red-500"}`}>
                              {quarter.ticketGrowth >= 0 ? "↑" : "↓"}{Math.abs(quarter.ticketGrowth).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Trend Chart */}
            <motion.div
              className="p-4 rounded-xl border bg-card/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={quarterlyTrendData.data}>
                  <defs>
                    <linearGradient id="spGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="quarter" 
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: 'Story Points', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: 'Tickets', angle: 90, position: 'insideRight', style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "13px",
                      padding: "12px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "storyPoints") return [value.toLocaleString(), "Story Points"];
                      if (name === "tickets") return [value.toLocaleString(), "Tickets"];
                      return [value, name];
                    }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="storyPoints"
                    fill="url(#spGradient)"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tickets"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              
              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-8 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded bg-gradient-to-r from-emerald-500/80 to-emerald-400/50" />
                  <span className="text-xs text-muted-foreground">Story Points (Area)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500 rounded" />
                  <div className="w-2 h-2 rounded-full bg-blue-500 -ml-3" />
                  <span className="text-xs text-muted-foreground ml-1">Tickets (Line)</span>
                </div>
              </div>
            </motion.div>

            {/* Summary Message */}
            <motion.div
              className="mt-4 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              <p className="text-sm text-muted-foreground">
                {quarterlyTrendData.yearlySpGrowth > 0 && quarterlyTrendData.yearlyTicketGrowth > 0 ? (
                  <span className="text-emerald-600 font-medium">
                    🚀 Great progress! Team productivity has grown {quarterlyTrendData.yearlySpGrowth.toFixed(0)}% in story points 
                    and {quarterlyTrendData.yearlyTicketGrowth.toFixed(0)}% in ticket throughput this year.
                  </span>
                ) : quarterlyTrendData.yearlySpGrowth > 0 ? (
                  <span className="text-blue-600 font-medium">
                    📈 Story point delivery improved by {quarterlyTrendData.yearlySpGrowth.toFixed(0)}% while maintaining consistent ticket volume.
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    📊 Year-to-date performance data for {quarterlyTrendData.year}.
                  </span>
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};
