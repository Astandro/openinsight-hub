import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ParsedTicket, FunctionType } from "@/types/openproject";
import { motion } from "framer-motion";
import { useMemo } from "react";

interface FunctionPerformanceProps {
  tickets: ParsedTicket[];
  selectedFunction: FunctionType | null;
  selectedProject: string | null;
}

export const FunctionPerformance = ({ tickets, selectedFunction, selectedProject }: FunctionPerformanceProps) => {
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
                formatter={(value: number) => [`${value} SP`, '']}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
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
      </Card>
    </motion.div>
  );
};
