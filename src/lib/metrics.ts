import { ParsedTicket, AssigneeMetrics, FunctionMetrics, FunctionType, Thresholds, FeatureContribution } from "@/types/openproject";

// Helper function to calculate Z-score for any metric
const calculateZScore = (values: number[], value: number): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const zScore = stdDev > 0 ? (value - mean) / stdDev : 0;
  return isNaN(zScore) || !isFinite(zScore) ? 0 : zScore;
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

// Helper function to get feature contributions for an assignee
const getFeatureContributions = (tickets: ParsedTicket[], assignee: string): FeatureContribution[] => {
  // Track which FEATURE-level tickets this user contributed to
  const featureSet = new Set<string>();
  
  // Find all tickets assigned to this user
  const assigneeTickets = tickets.filter((t) => t.assignee === assignee);
  
  // Collect unique FEATURE IDs (from child tickets' parentId or if user is on FEATURE itself)
  assigneeTickets.forEach(ticket => {
    if (ticket.parentId) {
      // This is a child ticket (User Story, Bug, etc.) - track its parent FEATURE
      featureSet.add(ticket.parentId);
    } else if (ticket.normalizedType === "Feature") {
      // This user worked on the FEATURE ticket itself
      featureSet.add(ticket.id);
    }
  });
  
  // Now build the contribution list from unique FEATURE-level tickets
  // Use a Map to group by feature NAME (to combine duplicates)
  const contributionMap = new Map<string, FeatureContribution>();
  
  featureSet.forEach(featureId => {
    // Find the FEATURE ticket (normalizedType === "Feature" and no parentId)
    const parentFeature = tickets.find(t => 
      t.id === featureId && 
      !t.parentId && 
      t.normalizedType === "Feature"
    );
    
    if (!parentFeature) {
      return;
    }
    
    // Calculate total story points from this user's work on child tickets ONLY
    // (User Story, Bug, etc. under this FEATURE)
    const userChildWork = tickets.filter(t => 
      t.assignee === assignee && 
      t.parentId === featureId
    );
    
    const totalSP = userChildWork.reduce((sum, t) => sum + t.storyPoints, 0);
    
    const featureName = parentFeature.title.trim();
    
    // Group by feature name - if same name exists, sum the story points
    if (contributionMap.has(featureName)) {
      const existing = contributionMap.get(featureName)!;
      existing.storyPoints += totalSP;
    } else {
      contributionMap.set(featureName, {
        featureId,
        featureName,
        storyPoints: totalSP,
        project: parentFeature.project,
      });
    }
  });
  
  return Array.from(contributionMap.values());
};

export const calculateAssigneeMetrics = (
  tickets: ParsedTicket[],
  assignee: string,
  allTickets?: ParsedTicket[], // Optional: use for feature contributions to avoid filter impact
  multiplier?: number // Optional: multiplier for performance calculations
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
  
  const sprintsParticipated = new Set(closedTickets.map(t => t.sprintClosed).filter(s => s && s !== "#N/A")).size;
  const velocityPerSprint = sprintsParticipated > 0 ? totalClosedStoryPoints / sprintsParticipated : 0;
  const safeVelocity = isNaN(velocityPerSprint) || !isFinite(velocityPerSprint) ? 0 : velocityPerSprint;

  // Calculate project variety (distinct projects worked on)
  const projectVariety = new Set(closedTickets.map(t => t.project)).size;
  
  // Calculate effective story points (penalized by revise rate)
  // Then apply multiplier for performance/z-score calculations (NOT for utilization)
  const reviseRate = closedTickets.length > 0 ? reviseCountClosed / closedTickets.length : 0;
  const safeReviseRate = isNaN(reviseRate) || !isFinite(reviseRate) ? 0 : reviseRate;
  const effectiveStoryPointsBase = totalClosedStoryPoints * (1 - safeReviseRate * 0.5);
  // Apply multiplier for performance calculations (z-score, performance score)
  const effectiveStoryPoints = effectiveStoryPointsBase * (multiplier || 1.0);
  const safeEffectiveSP = isNaN(effectiveStoryPoints) || !isFinite(effectiveStoryPoints) ? 0 : effectiveStoryPoints;
  
  // Calculate active weeks
  const activeWeeks = calculateActiveWeeks(closedTickets);
  
  // Calculate feature contributions from ALL tickets (not filtered) to show true feature count
  const ticketsForFeatures = allTickets || tickets;
  const featureContributions = getFeatureContributions(ticketsForFeatures, assignee);
  const featureCount = featureContributions.length;

  const bugRateClosed = closedTickets.length > 0 ? bugCountClosed / closedTickets.length : 0;
  const reviseRateClosed = closedTickets.length > 0 ? reviseCountClosed / closedTickets.length : 0;
  
  return {
    assignee,
    function: assigneeTickets[0]?.function || "BE",
    totalClosedTickets: closedTickets.length,
    totalClosedStoryPoints,
    bugCountClosed,
    reviseCountClosed,
    bugRateClosed: isNaN(bugRateClosed) || !isFinite(bugRateClosed) ? 0 : bugRateClosed,
    reviseRateClosed: isNaN(reviseRateClosed) || !isFinite(reviseRateClosed) ? 0 : reviseRateClosed,
    avgCycleTimeDays: isNaN(avgCycleTimeDays) || !isFinite(avgCycleTimeDays) ? 0 : avgCycleTimeDays,
    sprintsParticipated,
    velocityPerSprint: safeVelocity,
    projectVariety,
    effectiveStoryPoints: safeEffectiveSP,
    activeWeeks,
    featureContributions,
    featureCount,
  };
};

/**
 * NEW UTILIZATION CALCULATION - Config-Based Capacity
 * 
 * This calculation shows the REAL workload of each person based on their configured capacity.
 * Goal: Help determine if someone is at full capacity or has room for more work.
 * 
 * Methodology:
 * 1. Get person's configured capacity and metric from multiplier database
 *    - Capacity: Max number for 100% utilization
 *    - Metric: "sp" (story points) or "ticket" (ticket count)
 * 2. Calculate their AVERAGE WORKLOAD per sprint
 *    - If metric="sp": Average story points per sprint
 *    - If metric="ticket": Average ticket count per sprint
 * 3. Utilization = (Average Workload / Configured Capacity) × 100%
 *    - <70%: Underutilized (has capacity for more work)
 *    - 70-90%: Good utilization
 *    - 90-100%: Fully utilized
 *    - >100%: Overloaded (unsustainable)
 * 
 * Fallback: If no capacity configured, use historical peak capacity (95th percentile)
 */
const calculateUtilizationIndex = (
  tickets: ParsedTicket[],
  assignee: string,
  functionBaseline: number, // Not used but kept for compatibility
  multiplierEntry?: { capacity?: number; metric?: "sp" | "ticket" } // Optional multiplier entry with capacity/metric
): number => {
  const assigneeTickets = tickets.filter(
    (t) => t.assignee === assignee && t.status === "Closed" && t.sprintClosed && t.sprintClosed !== "#N/A"
  );
  
  if (assigneeTickets.length === 0) return 0;
  
  // Determine metric type: "sp" (story points) or "ticket" (ticket count)
  const metric = multiplierEntry?.metric || "sp"; // Default to "sp" if not specified
  
  // Group tickets by sprint and calculate workload per sprint
  const sprintMap = new Map<string, { sp: number; tickets: number }>();
  assigneeTickets.forEach(ticket => {
    const sprint = ticket.sprintClosed;
    const current = sprintMap.get(sprint) || { sp: 0, tickets: 0 };
    sprintMap.set(sprint, {
      sp: current.sp + ticket.storyPoints,
      tickets: current.tickets + 1
    });
  });
  
  if (sprintMap.size === 0) return 0;
  
  // Calculate workload based on metric type
  const sprintWorkloads = Array.from(sprintMap.values()).map(entry => 
    metric === "sp" ? entry.sp : entry.tickets
  ).filter(w => w > 0).sort((a, b) => a - b);
  
  if (sprintWorkloads.length === 0) return 0;
  
  // Calculate AVERAGE WORKLOAD: mean workload per sprint
  const avgWorkload = sprintWorkloads.reduce((a, b) => a + b, 0) / sprintWorkloads.length;
  
  // Get configured capacity or fall back to historical peak capacity
  let capacity: number;
  
  if (multiplierEntry?.capacity && multiplierEntry.capacity > 0) {
    // Use configured capacity from multiplier database
    capacity = multiplierEntry.capacity;
  } else {
    // Fallback: Calculate peak capacity from historical data
    if (sprintWorkloads.length >= 5) {
      // If 5+ sprints: use 95th percentile as peak capacity
      const percentile95Index = Math.floor(sprintWorkloads.length * 0.95);
      capacity = sprintWorkloads[Math.min(percentile95Index, sprintWorkloads.length - 1)];
    } else if (sprintWorkloads.length >= 3) {
      // If 3-4 sprints: use maximum as peak capacity
      capacity = Math.max(...sprintWorkloads);
    } else {
      // If 1-2 sprints: use average * 1.3 as estimated peak capacity
      capacity = avgWorkload * 1.3;
    }
    
    // Ensure capacity is at least as high as average
    capacity = Math.max(capacity, avgWorkload);
  }
  
  if (capacity === 0 || isNaN(capacity) || !isFinite(capacity)) return 0;
  
  // Calculate utilization: Average Workload / Configured Capacity
  const utilization = avgWorkload / capacity;
  
  // Return as ratio (will be displayed as percentage)
  // Guard against unrealistic values
  return isNaN(utilization) || !isFinite(utilization) ? 0 : Math.min(utilization, 2.0); // Cap at 200%
};

/**
 * Calculate function baseline capacity using 90th percentile approach
 * Returns median of all 90th percentiles within a function
 */
const calculateFunctionBaseline = (
  tickets: ParsedTicket[],
  func: FunctionType
): number => {
  const funcTickets = tickets.filter(
    (t) => t.function === func && t.status === "Closed" && t.sprintClosed
  );
  
  if (funcTickets.length === 0) return 1; // Avoid division by zero
  
  // Group by assignee
  const assigneeMap = new Map<string, Map<string, number>>();
  funcTickets.forEach(ticket => {
    if (!assigneeMap.has(ticket.assignee)) {
      assigneeMap.set(ticket.assignee, new Map());
    }
    const sprintMap = assigneeMap.get(ticket.assignee)!;
    const sprint = ticket.sprintClosed;
    sprintMap.set(sprint, (sprintMap.get(sprint) || 0) + ticket.storyPoints);
  });
  
  // Calculate 90th percentile for each assignee
  const percentile90s: number[] = [];
  assigneeMap.forEach((sprintMap, assignee) => {
    const sprintTotals = Array.from(sprintMap.values()).sort((a, b) => a - b);
    if (sprintTotals.length > 0) {
      // Calculate 90th percentile
      const index = Math.floor(sprintTotals.length * 0.9);
      const p90 = sprintTotals[Math.min(index, sprintTotals.length - 1)];
      percentile90s.push(p90);
    }
  });
  
  if (percentile90s.length === 0) return 1;
  
  // Return median of all 90th percentiles
  const sorted = percentile90s.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  
  return median;
};

// Enhanced performance scoring with holistic metrics
export const calculateEnhancedMetrics = (
  metrics: Omit<AssigneeMetrics, "zScore" | "performanceScore" | "utilizationIndex" | "flags">[],
  thresholds: Thresholds,
  tickets: ParsedTicket[] = [],
  multiplierDB: Array<{ name: string; capacity?: number; metric?: "sp" | "ticket" }> = []
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
  
  // Calculate function baselines using 90th percentile methodology
  const functionBaselines = new Map<FunctionType, number>();
  const FUNCTIONS: FunctionType[] = ["BE", "FE", "QA", "DESIGNER", "PRODUCT", "INFRA", "OPERATION", "APPS", "BUSINESS SUPPORT", "RESEARCHER", "FOUNDRY", "UX WRITER", "ENGINEERING MANAGER"];
  FUNCTIONS.forEach(func => {
    const baseline = calculateFunctionBaseline(tickets, func);
    functionBaselines.set(func, baseline);
  });
  
  // Keep function stats for backward compatibility with other features
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
    
    // Calculate NEW individual capacity-based utilization index
    // This shows real workload vs configured or historical capacity
    const functionBaseline = functionBaselines.get(m.function as FunctionType) || 1;
    
    // Find multiplier entry for this person to get capacity and metric
    const multiplierEntry = multiplierDB.find(entry => 
      entry.name.toLowerCase() === m.assignee.toLowerCase()
    );
    
    const utilizationIndex = calculateUtilizationIndex(
      tickets, 
      m.assignee, 
      functionBaseline,
      multiplierEntry ? { capacity: multiplierEntry.capacity, metric: multiplierEntry.metric } : undefined
    );
    
    // Determine flags based on function-relative performance and utilization
    const flags: string[] = [];
    
    // Get function stats for this assignee's function
    const funcStats = functionStats.get(m.function);
    
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
      
      // Calculate function-relative Z-score for this assignee's performance score
      const performanceZScore = funcStd > 0 ? (performanceScore - funcMean) / funcStd : 0;
      
      // Use configured thresholds for top/low performer detection
      if (performanceZScore >= thresholds.topPerformerZ) flags.push("top_performer");
      if (performanceZScore <= thresholds.lowPerformerZ) flags.push("low_performer");
    }
    
    if (m.bugRateClosed > thresholds.highBugRate) flags.push("high_bug_rate");
    if (m.reviseRateClosed > thresholds.highReviseRate) flags.push("high_revise_rate");
    
    // Enhanced underutilization detection based on NEW individual capacity model
    // Flag as underutilized if working at <70% of their own demonstrated capacity
    if (utilizationIndex < 0.7 && utilizationIndex > 0) {
      flags.push("underutilized");
    }
    
    // Overload detection based on NEW capacity model
    // Flag as overloaded if working at >100% of their demonstrated peak capacity
    // OR if utilization is high with quality issues
    if (utilizationIndex > 1.0) {
      flags.push("overloaded");
    } else if (utilizationIndex > 0.9 && (m.bugRateClosed > 0.2 || m.reviseRateClosed > 0.3)) {
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
    // Get the year with the most tickets (not just max year)
    // This prevents issues when a few tickets spill into next year
    const ticketsWithDates = tickets.filter(t => t.closedDate);
    
    if (ticketsWithDates.length === 0) {
      return filtered;
    }
    
    // Count tickets by year
    const yearCounts = new Map<number, number>();
    ticketsWithDates.forEach(t => {
      const year = t.closedDate!.getFullYear();
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    });
    
    // Find year with most tickets (2025 has 11,730 vs 2026's 333)
    let dataYear = new Date().getFullYear();
    let maxCount = 0;
    yearCounts.forEach((count, year) => {
      if (count > maxCount) {
        maxCount = count;
        dataYear = year;
      }
    });
    
    let startDate: Date;
    let endDate: Date;
    
    if (filters.timePeriod === "current_year") {
      startDate = new Date(dataYear, 0, 1); // January 1st
      endDate = new Date(dataYear, 11, 31); // December 31st
    } else {
      // Quarterly filtering
      const quarterMap = {
        "Q1": { start: 0, end: 2 },   // Jan-Mar
        "Q2": { start: 3, end: 5 },   // Apr-Jun
        "Q3": { start: 6, end: 8 },   // Jul-Sep
        "Q4": { start: 9, end: 11 }   // Oct-Dec
      };
      
      const quarter = quarterMap[filters.timePeriod as keyof typeof quarterMap];
      
      // Check if quarter exists, if not, skip filtering
      if (!quarter) {
        return filtered;
      }
      
      startDate = new Date(dataYear, quarter.start, 1);
      endDate = new Date(dataYear, quarter.end + 1, 0); // Last day of the quarter
    }

    filtered = filtered.filter((t) => {
      if (!t.closedDate) return false;
      return t.closedDate >= startDate && t.closedDate <= endDate;
    });
  }

  return filtered;
};
