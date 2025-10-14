export type FunctionType = 
  | "BE" 
  | "FE" 
  | "QA" 
  | "DESIGNER" 
  | "PRODUCT" 
  | "INFRA" 
  | "BUSINESS SUPPORT" 
  | "RESEARCHER" 
  | "PRINCIPAL" 
  | "COORDINATOR" 
  | "UX WRITER";

export type StatusType = "Closed" | "Open" | "In Progress" | "Review" | string;

export type TicketType = "Bug" | "Feature" | "Task" | "Story" | string;

export interface CSVRow {
  Assignee: string;
  Function: FunctionType;
  Status: StatusType;
  "Story Points": string;
  Type: TicketType;
  Project: string;
  "Sprint Closed": string;
  "Created Date": string;
  "Closed Date": string;
  Subject: string;
}

export interface ParsedTicket {
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
  timePeriod: "1q" | "2q" | "3q" | "all";
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
}

export interface Alert {
  type: "top-performer" | "low-performer" | "high-bug" | "high-revise" | "overloaded" | "underutilized";
  message: string;
  assignee?: string;
  function?: FunctionType;
  value?: number;
}
