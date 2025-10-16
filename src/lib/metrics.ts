import { ParsedTicket, AssigneeMetrics, FunctionMetrics, FunctionType, Thresholds } from "@/types/openproject";

// Helper function to calculate Z-score for any metric
const calculateZScore = (values: number[], value: number): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev > 0 ? (value - mean) / stdDev : 0;
};

// Helper function to calculate active weeks from tickets
const calculateActiveWeeks = (tickets: ParsedTicket[]): number => {
  const weeks = new Set<string>();
  tickets.forEach(ticket => {
    if (ticket.createdDate) {
      // Handle both Date objects and date strings
      const date = ticket.createdDate instanceof Date ? ticket.createdDate : new Date(ticket.createdDate);
      if (!isNaN(date.getTime())) {
        const week = getWeekKey(date);
        weeks.add(week);
      }
    }
  });
  return weeks.size;
};

// Helper function to get week key (YYYY-WW format)
const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, '0')}`;
};

// Helper function to get week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const calculateAssigneeMetrics = (
  tickets: ParsedTicket[],
  assignee: string
): Omit<AssigneeMetrics, "zScore" | "performanceScore" | "utilizationIndex" | "flags"> => {
  const assigneeTickets = tickets.filter((t) => t.assignee === assignee);
  const closedTickets = assigneeTickets.filter((t) => t.status === "Closed");

  const bugCountClosed = closedTickets.filter((t) => t.isBug).length;
  const reviseCountClosed = closedTickets.filter((t) => t.isRevise).length;

  const cycleTimes = closedTickets
    .filter((t) => t.cycleDays !== null)
    .map((t) => t.cycleDays as number);

  const avgCycleTimeDays = cycleTimes.length > 0
    ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
    : 0;

  const totalClosedStoryPoints = closedTickets.reduce((sum, t) => sum + t.storyPoints, 0);
  
  const sprintsParticipated = new Set(closedTickets.map(t => t.sprintClosed).filter(Boolean)).size;
  const velocityPerSprint = sprintsParticipated > 0 ? totalClosedStoryPoints / sprintsParticipated : 0;

  // Calculate project variety (distinct projects worked on)
  const projectVariety = new Set(closedTickets.map(t => t.project)).size;
  
  // Calculate effective story points (penalized by revise rate)
  const reviseRate = closedTickets.length > 0 ? reviseCountClosed / closedTickets.length : 0;
  const effectiveStoryPoints = totalClosedStoryPoints * (1 - reviseRate * 0.5);
  
  // Calculate active weeks
  const activeWeeks = calculateActiveWeeks(closedTickets);

  return {
    assignee,
    function: assigneeTickets[0]?.function || "BE",
    totalClosedTickets: closedTickets.length,
    totalClosedStoryPoints,
    bugCountClosed,
    reviseCountClosed,
    bugRateClosed: closedTickets.length > 0 ? bugCountClosed / closedTickets.length : 0,
    reviseRateClosed: closedTickets.length > 0 ? reviseCountClosed / closedTickets.length : 0,
    avgCycleTimeDays,
    sprintsParticipated,
    velocityPerSprint,
    projectVariety,
    effectiveStoryPoints,
    activeWeeks,
  };
};

// Enhanced performance scoring with holistic metrics
export const calculateEnhancedMetrics = (
  metrics: Omit<AssigneeMetrics, "zScore" | "performanceScore" | "utilizationIndex" | "flags">[],
  thresholds: Thresholds,
  tickets: ParsedTicket[] = []
): AssigneeMetrics[] => {
  // Extract arrays for Z-score calculations
  const storyPoints = metrics.map((m) => m.effectiveStoryPoints);
  const ticketCounts = metrics.map((m) => m.totalClosedTickets);
  const projectVarieties = metrics.map((m) => m.projectVariety);
  
  // Calculate Z-scores for each metric (handle empty arrays)
  const storyPointsZScores = storyPoints.length > 0 ? storyPoints.map(sp => calculateZScore(storyPoints, sp)) : new Array(metrics.length).fill(0);
  const ticketCountZScores = ticketCounts.length > 0 ? ticketCounts.map(tc => calculateZScore(ticketCounts, tc)) : new Array(metrics.length).fill(0);
  const projectVarietyZScores = projectVarieties.length > 0 ? projectVarieties.map(pv => calculateZScore(projectVarieties, pv)) : new Array(metrics.length).fill(0);
  
  // Group by function for utilization calculations
  const functionGroups = new Map<string, typeof metrics>();
  metrics.forEach(metric => {
    if (!functionGroups.has(metric.function)) {
      functionGroups.set(metric.function, []);
    }
    functionGroups.get(metric.function)!.push(metric);
  });
  
  // Calculate function medians and averages
  const functionStats = new Map<string, { medianSP: number, avgActiveWeeks: number }>();
  functionGroups.forEach((funcMetrics, func) => {
    const spValues = funcMetrics.map(m => m.effectiveStoryPoints).sort((a, b) => a - b);
    const medianSP = spValues.length > 0 ? spValues[Math.floor(spValues.length / 2)] : 0;
    const avgActiveWeeks = funcMetrics.reduce((sum, m) => sum + m.activeWeeks, 0) / funcMetrics.length;
    functionStats.set(func, { medianSP, avgActiveWeeks });
  });

  return metrics.map((m, index) => {
    // Calculate performance score with weighted factors
    const baseScore = 
      (thresholds.storyPointsWeight || 0.5) * (storyPointsZScores[index] || 0) +
      (thresholds.ticketCountWeight || 0.25) * (ticketCountZScores[index] || 0) +
      (thresholds.projectVarietyWeight || 0.25) * (projectVarietyZScores[index] || 0);
    
    // Apply penalties for high revise/bug rates
    const revisePenalty = Math.max(0.1, 1 - (m.reviseRateClosed * (thresholds.reviseRatePenalty || 0.8)));
    const bugPenalty = Math.max(0.1, 1 - (m.bugRateClosed * (thresholds.bugRatePenalty || 0.5)));
    const performanceScore = isNaN(baseScore * revisePenalty * bugPenalty) ? 0 : baseScore * revisePenalty * bugPenalty;
    
    // Calculate enhanced utilization index considering multiple factors
    const funcStats = functionStats.get(m.function);
    let utilizationIndex = 0;
    if (funcStats && funcStats.medianSP > 0) {
      // Factor 1: Story Points relative to function median (40% weight)
      const spFactor = Math.min(1, m.effectiveStoryPoints / funcStats.medianSP);
      
      // Factor 2: Ticket count relative to function average (25% weight)
      const funcTicketCounts = functionGroups.get(m.function)?.map(fm => fm.totalClosedTickets) || [];
      const avgTickets = funcTicketCounts.reduce((sum, tc) => sum + tc, 0) / funcTicketCounts.length;
      const ticketFactor = avgTickets > 0 ? Math.min(1, m.totalClosedTickets / avgTickets) : 0;
      
      // Factor 3: Project variety relative to function average (20% weight)
      const funcProjectVarieties = functionGroups.get(m.function)?.map(fm => fm.projectVariety) || [];
      const avgProjects = funcProjectVarieties.reduce((sum, pv) => sum + pv, 0) / funcProjectVarieties.length;
      const projectFactor = avgProjects > 0 ? Math.min(1, m.projectVariety / avgProjects) : 0;
      
      // Factor 4: Active weeks relative to function average (10% weight)
      const funcActiveWeeks = functionGroups.get(m.function)?.map(fm => fm.activeWeeks) || [];
      const avgActiveWeeks = funcActiveWeeks.reduce((sum, aw) => sum + aw, 0) / funcActiveWeeks.length;
      const weeksFactor = avgActiveWeeks > 0 ? Math.min(1, m.activeWeeks / avgActiveWeeks) : 0;
      
      // Factor 5: Heatmap density (activity consistency) (15% weight)
      const userTickets = tickets.filter(t => t.assignee === m.assignee && t.status === "Closed");
      const sprintActivity = new Map<string, number>();
      userTickets.forEach(ticket => {
        if (ticket.sprintClosed) {
          sprintActivity.set(ticket.sprintClosed, (sprintActivity.get(ticket.sprintClosed) || 0) + 1);
        }
      });
      const activeSprints = sprintActivity.size;
      const totalSprints = new Set(tickets.map(t => t.sprintClosed).filter(Boolean)).size;
      const heatmapDensity = totalSprints > 0 ? activeSprints / totalSprints : 0;
      
      // Weighted combination of all factors
      utilizationIndex = (
        spFactor * 0.4 +
        ticketFactor * 0.25 +
        projectFactor * 0.2 +
        weeksFactor * 0.1 +
        heatmapDensity * 0.15
      );
    }
    
    // Determine flags based on function-relative performance and utilization
    const flags: string[] = [];
    
    // Get function-specific performance scores for comparison
    const funcMetrics = functionGroups.get(m.function) || [];
    const funcPerformanceScores = funcMetrics.map(fm => {
      const funcIndex = metrics.findIndex(metric => metric.assignee === fm.assignee);
      if (funcIndex === -1) return 0;
      
      const baseScore = 
        (thresholds.storyPointsWeight || 0.5) * (storyPointsZScores[funcIndex] || 0) +
        (thresholds.ticketCountWeight || 0.25) * (ticketCountZScores[funcIndex] || 0) +
        (thresholds.projectVarietyWeight || 0.25) * (projectVarietyZScores[funcIndex] || 0);
      
      const revisePenalty = Math.max(0.1, 1 - (fm.reviseRateClosed * (thresholds.reviseRatePenalty || 0.8)));
      const bugPenalty = Math.max(0.1, 1 - (fm.bugRateClosed * (thresholds.bugRatePenalty || 0.5)));
      return isNaN(baseScore * revisePenalty * bugPenalty) ? 0 : baseScore * revisePenalty * bugPenalty;
    });
    
    if (funcPerformanceScores.length > 0) {
      const funcMean = funcPerformanceScores.reduce((sum, score) => sum + score, 0) / funcPerformanceScores.length;
      const funcStd = Math.sqrt(funcPerformanceScores.reduce((sum, score) => sum + Math.pow(score - funcMean, 2), 0) / funcPerformanceScores.length);
      
      // Function-relative thresholds
      const funcTopThreshold = funcMean + (funcStd * 0.8); // Top 20% within function
      const funcLowThreshold = funcMean - (funcStd * 0.8); // Bottom 20% within function
      
      if (performanceScore > funcTopThreshold) flags.push("top_performer");
      if (performanceScore < funcLowThreshold) flags.push("low_performer");
    }
    
    if (m.bugRateClosed > thresholds.highBugRate) flags.push("high_bug_rate");
    if (m.reviseRateClosed > thresholds.highReviseRate) flags.push("high_revise_rate");
    
    // Enhanced underutilization detection
    if (funcStats && 
        m.effectiveStoryPoints < thresholds.underutilizedThreshold * funcStats.medianSP &&
        m.activeWeeks < thresholds.activeWeeksThreshold * funcStats.avgActiveWeeks) {
      flags.push("underutilized");
    }
    
    // Overload detection (high performance but high bug/revise rates)
    if (performanceScore > 0.5 && (m.bugRateClosed > 0.2 || m.reviseRateClosed > 0.3)) {
      flags.push("overloaded");
    }

    return {
      ...m,
      zScore: storyPointsZScores[index], // Keep original Z-score for backward compatibility
      performanceScore,
      utilizationIndex,
      flags,
    };
  });
};

// Legacy function for backward compatibility
export const calculateZScores = (metrics: Omit<AssigneeMetrics, "zScore">[]): AssigneeMetrics[] => {
  const storyPoints = metrics.map((m) => m.totalClosedStoryPoints);
  const mean = storyPoints.reduce((a, b) => a + b, 0) / storyPoints.length;
  const variance = storyPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / storyPoints.length;
  const stdDev = Math.sqrt(variance);

  return metrics.map((m) => ({
    ...m,
    zScore: stdDev > 0 ? (m.totalClosedStoryPoints - mean) / stdDev : 0,
    performanceScore: 0,
    utilizationIndex: 0,
    activeWeeks: 0,
    projectVariety: 0,
    effectiveStoryPoints: m.totalClosedStoryPoints,
    flags: [],
  }));
};

export const calculateFunctionMetrics = (
  tickets: ParsedTicket[],
  func: FunctionType
): FunctionMetrics => {
  const funcTickets = tickets.filter((t) => t.function === func && t.status === "Closed");
  const assignees = Array.from(new Set(funcTickets.map((t) => t.assignee)));

  const assigneeStoryPoints = assignees.map((assignee) =>
    funcTickets.filter((t) => t.assignee === assignee).reduce((sum, t) => sum + t.storyPoints, 0)
  );

  const totalStoryPoints = assigneeStoryPoints.reduce((a, b) => a + b, 0);
  const avgStoryPoints = assignees.length > 0 ? totalStoryPoints / assignees.length : 0;

  const variance = assigneeStoryPoints.reduce(
    (sum, val) => sum + Math.pow(val - avgStoryPoints, 2),
    0
  ) / Math.max(assignees.length, 1);
  const stdDevStoryPoints = Math.sqrt(variance);

  const bugCount = funcTickets.filter((t) => t.isBug).length;
  const reviseCount = funcTickets.filter((t) => t.isRevise).length;

  return {
    function: func,
    memberCount: assignees.length,
    totalStoryPoints,
    avgStoryPoints,
    stdDevStoryPoints,
    bugRate: funcTickets.length > 0 ? bugCount / funcTickets.length : 0,
    reviseRate: funcTickets.length > 0 ? reviseCount / funcTickets.length : 0,
    utilization: avgStoryPoints,
  };
};

export const applyFilters = (tickets: ParsedTicket[], filters: any): ParsedTicket[] => {
  // Validate input
  if (!tickets || !Array.isArray(tickets)) {
    return [];
  }
  
  let filtered = tickets;

  if (!filters.includeAllStatuses) {
    filtered = filtered.filter((t) => t.status === "Closed");
  }

  if (filters.searchAssignee) {
    filtered = filtered.filter((t) =>
      t.assignee.toLowerCase().includes(filters.searchAssignee.toLowerCase())
    );
  }

  if (filters.selectedProject) {
    filtered = filtered.filter((t) => t.project === filters.selectedProject);
  }

  if (filters.selectedFunction) {
    filtered = filtered.filter((t) => t.function === filters.selectedFunction);
  }

  if (filters.selectedSprints.length > 0) {
    filtered = filtered.filter((t) => filters.selectedSprints.includes(t.sprintClosed));
  }

  if (filters.timePeriod !== "all") {
    const quarters: { [key: string]: number } = { "1q": 3, "2q": 6, "3q": 9, "4q": 12 };
    const monthsAgo = quarters[filters.timePeriod];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

    filtered = filtered.filter((t) => {
      if (!t.createdDate) return false;
      const ticketDate = t.createdDate instanceof Date ? t.createdDate : new Date(t.createdDate);
      return !isNaN(ticketDate.getTime()) && ticketDate >= cutoffDate;
    });
  }

  return filtered;
};
