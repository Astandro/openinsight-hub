import { AssigneeMetrics, FunctionMetrics, Alert, Thresholds } from "@/types/openproject";

export const generateAlerts = (
  assigneeMetrics: AssigneeMetrics[],
  functionMetrics: FunctionMetrics[],
  thresholds: Thresholds
): Alert[] => {
  const alerts: Alert[] = [];

  // Check for top and low performers using the flags from enhanced metrics
  assigneeMetrics.forEach((m) => {
    if (m.flags && m.flags.includes("top_performer")) {
      alerts.push({
        type: "top-performer",
        message: `${m.assignee} (${m.function}) is a top performer with ${m.effectiveStoryPoints} SP (z=${m.performanceScore.toFixed(2)})`,
        assignee: m.assignee,
        function: m.function,
        value: m.performanceScore,
      });
    }
    if (m.flags && m.flags.includes("low_performer")) {
      alerts.push({
        type: "low-performer",
        message: `${m.assignee} (${m.function}) needs support: ${m.effectiveStoryPoints} SP (z=${m.performanceScore.toFixed(2)})`,
        assignee: m.assignee,
        function: m.function,
        value: m.performanceScore,
      });
    }
    // Check for quality issues using flags from enhanced metrics
    if (m.flags && m.flags.includes("high_bug_rate")) {
      alerts.push({
        type: "high-bug",
        message: `${m.assignee} has high bug rate: ${(m.bugRateClosed * 100).toFixed(1)}%`,
        assignee: m.assignee,
        value: m.bugRateClosed,
      });
    }
    if (m.flags && m.flags.includes("high_revise_rate")) {
      alerts.push({
        type: "high-revise",
        message: `${m.assignee} has high revise rate: ${(m.reviseRateClosed * 100).toFixed(1)}%`,
        assignee: m.assignee,
        value: m.reviseRateClosed,
      });
    }
    if (m.flags && m.flags.includes("overloaded")) {
      alerts.push({
        type: "overloaded",
        message: `${m.assignee} is overloaded with high performance but quality issues`,
        assignee: m.assignee,
        value: m.performanceScore,
      });
    }
    if (m.flags && m.flags.includes("underutilized")) {
      alerts.push({
        type: "underutilized",
        message: `${m.assignee} may be underutilized`,
        assignee: m.assignee,
        value: m.utilizationIndex,
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
