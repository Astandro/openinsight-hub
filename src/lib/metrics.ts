import { ParsedTicket, AssigneeMetrics, FunctionMetrics, FunctionType } from "@/types/openproject";

export const calculateAssigneeMetrics = (
  tickets: ParsedTicket[],
  assignee: string
): Omit<AssigneeMetrics, "zScore"> => {
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

  return {
    assignee,
    function: assigneeTickets[0]?.function || "BE",
    totalClosedTickets: closedTickets.length,
    totalClosedStoryPoints,
    bugCountClosed,
    reviseCountClosed,
    bugRateClosed: closedTickets.length > 0 ? bugCountClosed / closedTickets.length : 0,
    reviseRateClosed: bugCountClosed > 0 ? reviseCountClosed / bugCountClosed : 0,
    avgCycleTimeDays,
  };
};

export const calculateZScores = (metrics: Omit<AssigneeMetrics, "zScore">[]): AssigneeMetrics[] => {
  const storyPoints = metrics.map((m) => m.totalClosedStoryPoints);
  const mean = storyPoints.reduce((a, b) => a + b, 0) / storyPoints.length;
  const variance = storyPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / storyPoints.length;
  const stdDev = Math.sqrt(variance);

  return metrics.map((m) => ({
    ...m,
    zScore: stdDev > 0 ? (m.totalClosedStoryPoints - mean) / stdDev : 0,
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
    reviseRate: bugCount > 0 ? reviseCount / bugCount : 0,
    utilization: avgStoryPoints,
  };
};

export const applyFilters = (tickets: ParsedTicket[], filters: any): ParsedTicket[] => {
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
    const quarters: { [key: string]: number } = { "1q": 3, "2q": 6, "3q": 9 };
    const monthsAgo = quarters[filters.timePeriod];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

    filtered = filtered.filter((t) => t.closedDate && t.closedDate >= cutoffDate);
  }

  return filtered;
};
