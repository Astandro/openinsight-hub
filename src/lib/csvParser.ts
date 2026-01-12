import Papa from "papaparse";
import { CSVRow, ParsedTicket, MultiplierEntry, SprintConfig, FunctionType } from "@/types/openproject";
import { getMultiplierEntryByName } from "./multiplierManager";
import { usesDateBasedSprints, calculateSprintRange, parseDate } from "./sprintCalculator";

// Extract function from Subject line pattern like "[Project_Version] FE - Task description"
const extractFunctionFromSubject = (subject: string): FunctionType | null => {
  if (!subject) return null;
  
  // Pattern: [anything] FUNCTION - rest
  // Common functions: QA, FE, BE, INFRA, DESIGNER, PRODUCT, UX WRITER, APPS, OPERATION
  const functionPatterns: { pattern: RegExp; func: FunctionType }[] = [
    { pattern: /\]\s*QA\s*[-–]/i, func: "QA" },
    { pattern: /\]\s*FE\s*[-–]/i, func: "FE" },
    { pattern: /\]\s*BE\s*[-–]/i, func: "BE" },
    { pattern: /\]\s*INFRA\s*[-–]/i, func: "INFRA" },
    { pattern: /\]\s*DESIGNER\s*[-–]/i, func: "DESIGNER" },
    { pattern: /\]\s*PRODUCT\s*[-–]/i, func: "PRODUCT" },
    { pattern: /\]\s*UX\s*WRITER\s*[-–]/i, func: "UX WRITER" },
    { pattern: /\]\s*APPS\s*[-–]/i, func: "APPS" },
    { pattern: /\]\s*OPERATION\s*[-–]/i, func: "OPERATION" },
    { pattern: /\]\s*FOUNDRY\s*[-–]/i, func: "FOUNDRY" },
    { pattern: /\]\s*RESEARCHER\s*[-–]/i, func: "RESEARCHER" },
    { pattern: /\]\s*BUSINESS\s*SUPPORT\s*[-–]/i, func: "BUSINESS SUPPORT" },
    { pattern: /\]\s*EM\s*[-–]/i, func: "ENGINEERING MANAGER" },
  ];
  
  for (const { pattern, func } of functionPatterns) {
    if (pattern.test(subject)) {
      return func;
    }
  }
  
  return null;
};

export const parseCSV = (
  csvText: string,
  multiplierDB: MultiplierEntry[] = [],
  sprintConfigs: SprintConfig[] = []
): ParsedTicket[] => {
  const results = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  
  const tickets = results.data.map((row) => parseRow(row, multiplierDB, sprintConfigs));
  return tickets.filter((t) => t !== null) as ParsedTicket[];
};

const normalizeType = (type: string): "Feature" | "Bug" | "Regression" | "Improvement" | "Release" | "Task" | "Other" => {
  const lower = type.toLowerCase();
  if (lower === "feature") return "Feature";
  if (lower === "bug" || lower.includes("bug")) return "Bug";
  if (lower === "regression") return "Regression";
  if (lower === "improvement") return "Improvement";
  if (lower === "release") return "Release";
  if (lower === "task") return "Task";
  return "Other";
};

const parseRow = (
  row: CSVRow,
  multiplierDB: MultiplierEntry[] = [],
  sprintConfigs: SprintConfig[] = []
): ParsedTicket | null => {
  try {
    const storyPoints = parseInt(row["Story Points"] || "0", 10) || 0;
    const createdDate = new Date(row["Created At"]);
    const closedDate = row["Updated At"] ? new Date(row["Updated At"]) : null;
    const project = row.Project || "Unknown";
    const assigneeName = row.Assignee || "Unassigned";
    
    // Parse start date and due date for date-based sprint calculation
    const startDate = parseDate(row["Start Date"]);
    const dueDate = parseDate(row["Due Date"] || row["Finish Date"] || row["End Date"]);
    
    // Determine sprint assignment method based on project
    let sprintCreated: string;
    let sprintClosed: string;
    
    if (usesDateBasedSprints(project) && (startDate || dueDate || closedDate)) {
      // Use date-based sprint calculation for Orion, Threat Intel, and Aman
      // Pass closedDate for +1 day tolerance
      const sprints = calculateSprintRange(startDate, dueDate, closedDate, project, sprintConfigs);
      sprintCreated = sprints.sprintCreated;
      sprintClosed = sprints.sprintClosed;
    } else {
      // Use original CSV sprint values for other projects
      sprintCreated = row["Sprint Created"] || "#N/A";
      sprintClosed = row["Sprint Closed"] || "#N/A";
    }
    
    // Calculate cycle days using multiple methods and pick the shortest (most optimistic)
    // This prevents inflated cycle times from parked/blocked tickets
    const cycleDaysOptions: number[] = [];
    
    // Method 1: Start Date (if exists) to Updated At
    if (closedDate && startDate) {
      const daysFromStart = Math.round((closedDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysFromStart >= 1 && daysFromStart <= 180) {
        cycleDaysOptions.push(daysFromStart);
      }
    }
    
    // Method 2: Created At to Updated At
    if (closedDate) {
      const daysFromCreated = Math.round((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysFromCreated >= 1 && daysFromCreated <= 180) {
        cycleDaysOptions.push(daysFromCreated);
      }
    }
    
    // Method 3: Sprint Created to Sprint Closed (sprint-based calculation)
    if (sprintClosed && sprintClosed !== "#N/A" && sprintCreated && sprintCreated !== "#N/A") {
      // Extract sprint numbers (e.g., "Sprint 16" -> 16)
      const sprintClosedNum = parseInt(sprintClosed.replace(/\D/g, ""), 10);
      const sprintCreatedNum = parseInt(sprintCreated.replace(/\D/g, ""), 10);
      
      if (!isNaN(sprintClosedNum) && !isNaN(sprintCreatedNum)) {
        // Calculate number of sprints (inclusive of both start and end sprint)
        const sprintCount = Math.max(1, sprintClosedNum - sprintCreatedNum + 1);
        // Assume 14 days (2 weeks) per sprint
        const sprintBasedDays = sprintCount * 14;
        if (sprintBasedDays >= 1 && sprintBasedDays <= 180) {
          cycleDaysOptions.push(sprintBasedDays);
        }
      }
    }
    
    // Pick the shortest duration (most optimistic, removes parking/blocking time)
    let cycleDays: number | null = null;
    if (cycleDaysOptions.length > 0) {
      cycleDays = Math.min(...cycleDaysOptions);
    }
    
    // Fallback: if no valid options, ensure minimum of 1 day for closed tickets
    if (cycleDays === null && closedDate) {
      cycleDays = 1;
    }

    const subject = row.Subject || "";
    const type = row.Type || "Task";
    const normalizedType = normalizeType(type);
    
    const isRevise = subject.toLowerCase().startsWith("revise") || 
                     subject.toLowerCase().includes("revise");
    const isBug = normalizedType === "Bug" || type.toLowerCase().includes("bug");

    // Get the ticket ID from CSV - support multiple column names
    // Priority: ID, #, Work Package ID, Ticket ID, id
    const title = row.Subject || "";
    const csvId = row.ID || row["#"] || row["Work Package ID"] || row["Ticket ID"] || row.id;
    
    let id: string;
    let parentId: string | undefined = undefined;
    
    if (csvId) {
      // Use the actual ID from CSV
      id = String(csvId).trim();
    } else {
      // No ID in CSV - generate a unique one
      id = `TICKET-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Set parentId if this ticket has a Parent value
    // Parent column contains the ID of the parent Feature ticket
    if (row.Parent && row.Parent.trim()) {
      parentId = String(row.Parent).trim();
    } else {
      parentId = undefined;
    }

    // Get function AND multiplier from database
    // Priority: 1. Multiplier Database, 2. CSV Function column, 3. Extract from Subject, 4. Default to "OTHER"
    let personFunction: FunctionType | undefined;
    let multiplier = 1.0;
    
    // Try to find person in multiplier database first
    const multiplierEntry = multiplierDB.length > 0 
      ? getMultiplierEntryByName(assigneeName, multiplierDB)
      : null;
    
    if (multiplierEntry) {
      // Found in database - use database values
      personFunction = multiplierEntry.position;
      multiplier = multiplierEntry.formula;
    } else if (row.Function) {
      // Not in database but has Function in CSV - use that as fallback
      personFunction = row.Function;
      multiplier = row.Multiplier ? parseFloat(row.Multiplier) : 1.0;
    } else {
      // Try to extract function from Subject line pattern like "[Project] FE - Task"
      const extractedFunction = extractFunctionFromSubject(subject);
      if (extractedFunction) {
        personFunction = extractedFunction;
        multiplier = 1.0; // Default multiplier when extracted from subject
      } else {
        // Last resort: use a default function instead of skipping
        // This ensures all tickets are processed
        personFunction = "BE" as FunctionType; // Default to BE if we can't determine
        multiplier = 1.0;
        console.warn(`⚠️ "${assigneeName}" - function could not be determined, defaulting to BE`);
      }
    }

    const ticket = {
      id,
      title,
      assignee: assigneeName,
      function: personFunction, // Use looked-up or fallback function
      status: row.Status,
      storyPoints,
      type,
      normalizedType,
      project,
      sprintClosed, // Use calculated sprint (date-based or CSV-based)
      createdDate,
      closedDate,
      subject,
      isBug,
      isRevise,
      cycleDays,
      parentId, // Use the parentId we calculated above
      multiplier: isNaN(multiplier) ? 1.0 : multiplier, // Ensure valid number
    };
    
    return ticket;
  } catch (error) {
    console.error("Error parsing row:", row, error);
    return null;
  }
};

export const generateSampleData = (): ParsedTicket[] => {
  const assignees = [
    { name: "Alice Johnson", function: "FE" as const, multiplier: 1.2 }, // Junior
    { name: "Bob Smith", function: "BE" as const, multiplier: 1.0 }, // Senior
    { name: "Charlie Brown", function: "QA" as const, multiplier: 0.8 }, // Mid
    { name: "Diana Prince", function: "DESIGNER" as const, multiplier: 0.6 }, // Principal
    { name: "Eve Martinez", function: "PRODUCT" as const, multiplier: 1.0 }, // Senior
    { name: "Frank Castle", function: "BE" as const, multiplier: 0.8 }, // Mid
    { name: "Grace Hopper", function: "FE" as const, multiplier: 1.0 }, // Senior
    { name: "Henry Ford", function: "INFRA" as const, multiplier: 1.2 }, // Junior
  ];

  const projects = ["Orion", "Threat Intel", "Intellibron Aman", "Chatbot", "Website"];
  const sprints = ["Sprint 23", "Sprint 24", "Sprint 25", "Sprint 26"];
  const tickets: ParsedTicket[] = [];

  for (let i = 0; i < 150; i++) {
    const assignee = assignees[Math.floor(Math.random() * assignees.length)];
    const createdDate = new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28));
    const closedDate = new Date(createdDate.getTime() + Math.random() * 20 * 24 * 60 * 60 * 1000);
    const isBug = Math.random() < 0.2;
    const isRevise = isBug && Math.random() < 0.3;

    const type = isBug ? "Bug" : Math.random() < 0.5 ? "Feature" : "Task";
    const id = `SAMPLE-${1000 + i}`;
    const subject = isRevise 
      ? `REVISE: Fix issue in ${projects[Math.floor(Math.random() * projects.length)]}`
      : `Implement feature ${i + 1}`;
    
    tickets.push({
      id,
      title: subject,
      assignee: assignee.name,
      function: assignee.function,
      status: "Closed",
      storyPoints: Math.floor(Math.random() * 8) + 1,
      multiplier: assignee.multiplier,
      type,
      normalizedType: normalizeType(type),
      project: projects[Math.floor(Math.random() * projects.length)],
      sprintClosed: sprints[Math.floor(Math.random() * sprints.length)],
      createdDate,
      closedDate,
      subject,
      isBug,
      isRevise,
      cycleDays: Math.round((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)),
      severity: isBug ? (Math.random() < 0.5 ? "High" : "Medium") : undefined,
      parentId: undefined,
    });
  }

  return tickets;
};
