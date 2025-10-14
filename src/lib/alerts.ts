import { AssigneeMetrics, FunctionMetrics, Alert, Thresholds } from "@/types/openproject";

export const generateAlerts = (
  assigneeMetrics: AssigneeMetrics[],
  functionMetrics: FunctionMetrics[],
  thresholds: Thresholds
): Alert[] => {
  const alerts: Alert[] = [];

  // Check for top and low performers
  assigneeMetrics.forEach((m) => {
    if (m.zScore >= thresholds.topPerformerZ) {
      alerts.push({
        type: "top-performer",
        message: `${m.assignee} (${m.function}) is a top performer with ${m.totalClosedStoryPoints} SP (z=${m.zScore.toFixed(2)})`,
        assignee: m.assignee,
        function: m.function,
        value: m.zScore,
      });
    }
    if (m.zScore <= thresholds.lowPerformerZ) {
      alerts.push({
        type: "low-performer",
        message: `${m.assignee} (${m.function}) needs support: ${m.totalClosedStoryPoints} SP (z=${m.zScore.toFixed(2)})`,
        assignee: m.assignee,
        function: m.function,
        value: m.zScore,
      });
    }
    if ((m.function === "BE" || m.function === "FE") && m.bugRateClosed > thresholds.highBugRate) {
      alerts.push({
        type: "high-bug",
        message: `${m.assignee} has high bug rate: ${(m.bugRateClosed * 100).toFixed(1)}%`,
        assignee: m.assignee,
        value: m.bugRateClosed,
      });
    }
    if ((m.function === "BE" || m.function === "FE") && m.reviseRateClosed > thresholds.highReviseRate) {
      alerts.push({
        type: "high-revise",
        message: `${m.assignee} has high revise rate: ${(m.reviseRateClosed * 100).toFixed(1)}%`,
        assignee: m.assignee,
        value: m.reviseRateClosed,
      });
    }
  });

  // Check for overloaded/underutilized functions
  const avgSPs = functionMetrics.map((f) => f.avgStoryPoints).sort((a, b) => a - b);
  const median = avgSPs.length > 0 ? avgSPs[Math.floor(avgSPs.length / 2)] : 0;

  functionMetrics.forEach((fm) => {
    if (fm.avgStoryPoints > thresholds.overloadedMultiplier * median && median > 0) {
      alerts.push({
        type: "overloaded",
        message: `${fm.function} is overloaded: avg ${fm.avgStoryPoints.toFixed(1)} SP/person (median: ${median.toFixed(1)})`,
        function: fm.function,
        value: fm.avgStoryPoints,
      });
    }
    if (fm.avgStoryPoints < thresholds.underutilizedMultiplier * median && median > 0) {
      alerts.push({
        type: "underutilized",
        message: `${fm.function} may be underutilized: avg ${fm.avgStoryPoints.toFixed(1)} SP/person`,
        function: fm.function,
        value: fm.avgStoryPoints,
      });
    }
  });

  return alerts;
};
