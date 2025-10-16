import { Thresholds } from "@/types/openproject";

const THRESHOLDS_KEY = "openproject_thresholds";

export const DEFAULT_THRESHOLDS: Thresholds = {
  topPerformerZ: 1.0,
  lowPerformerZ: -1.0,
  highBugRate: 0.25,
  highReviseRate: 0.20,
  overloadedMultiplier: 1.3,
  underutilizedMultiplier: 0.6,
  // Performance scoring weights
  storyPointsWeight: 0.5,
  ticketCountWeight: 0.25,
  projectVarietyWeight: 0.25,
  reviseRatePenalty: 0.8,
  bugRatePenalty: 0.5,
  underutilizedThreshold: 0.6,
  activeWeeksThreshold: 0.7,
};

export const loadThresholds = (): Thresholds => {
  try {
    const stored = localStorage.getItem(THRESHOLDS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_THRESHOLDS;
  } catch {
    return DEFAULT_THRESHOLDS;
  }
};

export const saveThresholds = (thresholds: Thresholds): void => {
  localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds));
};
