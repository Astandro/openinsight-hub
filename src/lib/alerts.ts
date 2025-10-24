import { AssigneeMetrics, FunctionMetrics, Alert, Thresholds, ParsedTicket, FunctionType } from "@/types/openproject";

/**
 * Generate team-level highlights focusing on:
 * 1. Utilization rates (project and function level)
 * 2. Revise rates (quality concerns)
 * 3. Story points achievement (delivery capacity)
 * 
 * Messages are actionable and friendly
 */
export const generateAlerts = (
  assigneeMetrics: AssigneeMetrics[],
  functionMetrics: FunctionMetrics[],
  thresholds: Thresholds,
  tickets: ParsedTicket[] = []
): Alert[] => {
  const alerts: Alert[] = [];

  // === PROJECT-LEVEL HIGHLIGHTS ===
  
  // Calculate overall project metrics
  const closedTickets = tickets.filter(t => t.status === "Closed");
  const totalSP = closedTickets.reduce((sum, t) => sum + t.storyPoints, 0);
  const projects = Array.from(new Set(closedTickets.map(t => t.project)));
  
  projects.forEach(project => {
    const projectTickets = closedTickets.filter(t => t.project === project);
    const projectSP = projectTickets.reduce((sum, t) => sum + t.storyPoints, 0);
    const reviseTickets = projectTickets.filter(t => t.isRevise);
    const reviseRate = projectTickets.length > 0 ? reviseTickets.length / projectTickets.length : 0;
    
    // High achievement
    const projectPercentage = totalSP > 0 ? (projectSP / totalSP) * 100 : 0;
    if (projectPercentage > 40 && projectSP > 50) {
      alerts.push({
        type: "achievement",
        category: "project",
        message: `🎯 ${project} delivered ${projectSP} SP (${projectPercentage.toFixed(0)}% of total)! Great team effort!`,
        project,
        value: projectSP,
        actionable: "Consider recognizing the team's success and documenting best practices.",
      });
    }
    
    // High revise rate - needs attention
    if (reviseRate > 0.3 && projectTickets.length >= 10) {
      alerts.push({
        type: "quality-concern",
        category: "project",
        message: `⚠️ ${project} has ${(reviseRate * 100).toFixed(0)}% revise rate. Quality may need attention.`,
        project,
        value: reviseRate,
        actionable: "Consider increasing code review rigor, adding more tests, or conducting a retrospective.",
      });
    }
  });

  // === FUNCTION-LEVEL HIGHLIGHTS ===
  
  functionMetrics.forEach((fm) => {
    const funcMembers = assigneeMetrics.filter(m => m.function === fm.function);
    if (funcMembers.length === 0) return;
    
    // Calculate average utilization for this function
    const avgUtilization = funcMembers.reduce((sum, m) => sum + m.utilizationIndex, 0) / funcMembers.length;
    
    // Over-utilized function (>110%)
    if (avgUtilization > 1.1 && funcMembers.length >= 2) {
      alerts.push({
        type: "overutilized",
        category: "function",
        message: `🔥 ${fm.function} team is over-utilized at ${(avgUtilization * 100).toFixed(0)}% capacity!`,
        function: fm.function,
        value: avgUtilization,
        actionable: `Consider hiring ${Math.ceil(funcMembers.length * 0.3)} additional ${fm.function} member(s) or redistributing work.`,
      });
    }
    
    // Under-utilized function (<60%)
    if (avgUtilization < 0.6 && funcMembers.length >= 2) {
      alerts.push({
        type: "underutilized",
        category: "function",
        message: `📊 ${fm.function} team is at ${(avgUtilization * 100).toFixed(0)}% capacity. Room for more work.`,
        function: fm.function,
        value: avgUtilization,
        actionable: `Consider allocating more features to ${fm.function} or redistributing from overloaded teams.`,
      });
    }
    
    // Optimal utilization (80-100%)
    if (avgUtilization >= 0.8 && avgUtilization <= 1.0 && funcMembers.length >= 2) {
      alerts.push({
        type: "optimal",
        category: "function",
        message: `✅ ${fm.function} team is optimally utilized at ${(avgUtilization * 100).toFixed(0)}% capacity!`,
        function: fm.function,
        value: avgUtilization,
        actionable: "Maintain current workload balance. Monitor for changes.",
      });
    }
    
    // High story points achievement
    if (fm.totalStoryPoints > 100 && funcMembers.length >= 2) {
      const avgPerPerson = fm.avgStoryPoints;
      alerts.push({
        type: "achievement",
        category: "function",
        message: `🏆 ${fm.function} delivered ${fm.totalStoryPoints} SP (${avgPerPerson.toFixed(0)} SP/person avg)!`,
        function: fm.function,
        value: fm.totalStoryPoints,
        actionable: "Great delivery! Share their workflow practices with other teams.",
      });
    }
    
    // High revise rate at function level
    const funcReviseRate = fm.reviseCount / Math.max(fm.ticketCount, 1);
    if (funcReviseRate > 0.25 && fm.ticketCount >= 10) {
      alerts.push({
        type: "quality-concern",
        category: "function",
        message: `⚠️ ${fm.function} has ${(funcReviseRate * 100).toFixed(0)}% revise rate. Quality needs improvement.`,
        function: fm.function,
        value: funcReviseRate,
        actionable: `Review ${fm.function} team's processes. Consider pair programming, increased testing, or technical training.`,
      });
    }
    
    // Low revise rate (good quality)
    if (funcReviseRate < 0.15 && fm.ticketCount >= 10) {
      alerts.push({
        type: "achievement",
        category: "function",
        message: `✨ ${fm.function} maintains excellent quality with only ${(funcReviseRate * 100).toFixed(0)}% revise rate!`,
        function: fm.function,
        value: funcReviseRate,
        actionable: "Document their quality practices for other teams to learn from.",
      });
    }
  });

  // === CROSS-FUNCTION WORKLOAD BALANCE ===
  
  // Check if workload is heavily skewed
  if (functionMetrics.length >= 2) {
    const utilizations = functionMetrics
      .filter(fm => {
        const members = assigneeMetrics.filter(m => m.function === fm.function);
        return members.length >= 2;
      })
      .map(fm => {
        const funcMembers = assigneeMetrics.filter(m => m.function === fm.function);
        const avgUtil = funcMembers.reduce((sum, m) => sum + m.utilizationIndex, 0) / funcMembers.length;
        return { function: fm.function, utilization: avgUtil };
      });
    
    if (utilizations.length >= 2) {
      const sortedUtils = utilizations.sort((a, b) => b.utilization - a.utilization);
      const highest = sortedUtils[0];
      const lowest = sortedUtils[sortedUtils.length - 1];
      
      // If gap is > 40% between highest and lowest
      if (highest.utilization - lowest.utilization > 0.4) {
        alerts.push({
          type: "workload-imbalance",
          category: "cross-function",
          message: `⚖️ Workload imbalance: ${highest.function} (${(highest.utilization * 100).toFixed(0)}%) vs ${lowest.function} (${(lowest.utilization * 100).toFixed(0)}%)`,
          value: highest.utilization - lowest.utilization,
          actionable: `Consider moving work from ${highest.function} to ${lowest.function}, or hiring for ${highest.function}.`,
        });
      }
    }
  }

  // Sort alerts: issues first, then achievements
  const priorityOrder = {
    "overutilized": 1,
    "quality-concern": 2,
    "workload-imbalance": 3,
    "underutilized": 4,
    "optimal": 5,
    "achievement": 6,
  };
  
  return alerts.sort((a, b) => {
    const priorityA = priorityOrder[a.type as keyof typeof priorityOrder] || 999;
    const priorityB = priorityOrder[b.type as keyof typeof priorityOrder] || 999;
    return priorityA - priorityB;
  });
};
