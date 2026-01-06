export type FunctionType = 
  | "BE" 
  | "FE" 
  | "QA" 
  | "DESIGNER" 
  | "PRODUCT" 
  | "INFRA" 
  | "OPERATION"
  | "BUSINESS SUPPORT" 
  | "RESEARCHER" 
  | "FOUNDRY" 
  | "UX WRITER"
  | "APPS"
  | "ENGINEERING MANAGER";

export type StatusType = "Closed" | "Open" | "In Progress" | "Review" | string;

export type TicketType = "Bug" | "Feature" | "Task" | "Story" | string;

export interface CSVRow {
  Assignee: string;
  Function?: FunctionType; // Optional - will be looked up from multiplier database
  Status: StatusType;
  "Story Points": string;
  Type: TicketType;
  Project: string;
  "Sprint Closed": string;
  "Sprint Created": string;
  "Created At": string;
  "Updated At": string;
  "Start Date"?: string; // Optional start date column
  "Due Date"?: string;   // Optional due date column
  "Finish Date"?: string; // Alternative due date column name
  "End Date"?: string;    // Alternative due date column name
  Subject: string;
  Parent?: string;
  Multiplier?: string; // Optional - will be looked up from multiplier database
}

export interface ParsedTicket {
  id: string;
  title: string;
  assignee: string;
  function: FunctionType;
  status: string;
  storyPoints: number;
  type: string;
  project: string;
  sprintClosed: string;
  createdDate: Date;
  closedDate: Date | null;
  subject: string;
  isBug: boolean;
  isRevise: boolean;
  cycleDays: number | null;
  normalizedType: "Feature" | "Bug" | "Regression" | "Improvement" | "Release" | "Task" | "Other";
  severity?: string;
  parentId?: string; // Parent feature ID for child tickets
  multiplier: number; // Seniority multiplier (0.6=Principal, 0.8=Mid, 1.0=Senior, 1.2=Junior)
}

export interface FeatureContribution {
  featureId: string;
  featureName: string;
  storyPoints: number;
  project: string;
}

export interface AssigneeMetrics {
  assignee: string;
  function: FunctionType;
  totalClosedTickets: number;
  totalClosedStoryPoints: number;
  bugCountClosed: number;
  reviseCountClosed: number;
  bugRateClosed: number;
  reviseRateClosed: number;
  avgCycleTimeDays: number;
  zScore: number;
  sprintsParticipated: number;
  velocityPerSprint: number;
  // Enhanced performance metrics
  projectVariety: number;
  effectiveStoryPoints: number;
  performanceScore: number;
  utilizationIndex: number;
  activeWeeks: number;
  flags: string[];
  // Feature contributions
  featureContributions: FeatureContribution[];
  featureCount: number;
}

export interface FunctionMetrics {
  function: FunctionType;
  memberCount: number;
  totalStoryPoints: number;
  avgStoryPoints: number;
  stdDevStoryPoints: number;
  bugRate: number;
  reviseRate: number;
  utilization: number;
}

export interface Filters {
  searchAssignee: string;
  selectedProject: string | null;
  selectedFunction: FunctionType | null;
  timePeriod: "Q1" | "Q2" | "Q3" | "Q4" | "current_year" | "all";
  selectedSprints: string[];
  includeAllStatuses: boolean;
}

export interface Thresholds {
  topPerformerZ: number;
  lowPerformerZ: number;
  highBugRate: number;
  highReviseRate: number;
  overloadedMultiplier: number;
  underutilizedMultiplier: number;
  // Performance scoring weights
  storyPointsWeight: number;
  ticketCountWeight: number;
  projectVarietyWeight: number;
  reviseRatePenalty: number;
  bugRatePenalty: number;
  underutilizedThreshold: number;
  activeWeeksThreshold: number;
}

export interface Alert {
  type: "achievement" | "quality-concern" | "overutilized" | "underutilized" | "optimal" | "workload-imbalance";
  category: "project" | "function" | "cross-function";
  message: string;
  actionable?: string; // Actionable recommendation
  project?: string;
  function?: FunctionType;
  assignee?: string;
  value?: number;
}

// Multiplier Database Entry (Name, Position/Function, Formula/Multiplier, Capacity, Metric)
export interface MultiplierEntry {
  name: string;          // Nama - person's name
  position: FunctionType; // Posisi - function/role (BE, FE, QA, etc)
  formula: number;       // Formula - multiplier value
  capacity?: number;     // Capacity - max number for 100% utilization (optional)
  metric?: "sp" | "ticket"; // Metric - "sp" for story points, "ticket" for ticket count (optional)
}

// Sprint Configuration for date-based sprint calculation
export interface SprintConfig {
  sprintNumber: number;
  startDate: Date;
  endDate: Date;
  project: string;
}
