import { Thresholds } from "@/types/openproject";

const THRESHOLDS_KEY = "openproject_thresholds";

export const DEFAULT_THRESHOLDS: Thresholds = {
  topPerformerZ: 1.0,
  lowPerformerZ: -1.0,
  highBugRate: 0.25,
  highReviseRate: 0.20,
  overloadedMultiplier: 1.3,
  underutilizedMultiplier: 0.6,
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
