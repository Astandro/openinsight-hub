import Papa from "papaparse";
import { CSVRow, ParsedTicket, MultiplierEntry, SprintConfig, FunctionType } from "@/types/openproject";
import { getMultiplierEntryByName } from "./multiplierManager";
import { usesDateBasedSprints, calculateSprintRange, parseDate } from "./sprintCalculator";

export const parseCSV = (
  csvText: string,
  multiplierDB: MultiplierEntry[] = [],
  sprintConfigs: SprintConfig[] = []
): ParsedTicket[] => {
  const results = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  
  // Log first row to see available columns - ONLY ONCE
  if (results.data.length > 0) {
    console.log("📋 CSV loaded:", Object.keys(results.data[0]).length, "columns,", results.data.length, "rows");
  }
  
  const tickets = results.data.map((row) => parseRow(row, multiplierDB, sprintConfigs));
  const parsed = tickets.filter((t) => t !== null) as ParsedTicket[];
  
  // Summary only
  const features = parsed.filter(t => t.normalizedType === "Feature");
  const childTickets = parsed.filter(t => t.parentId);
  
  console.log(`\n📊 Parsed ${features.length} features, ${childTickets.length} children (${parsed.length} total)\n`);
  
  return parsed;
};

const normalizeType = (type: string): "Feature" | "Bug" | "Regression" | "Improvement" | "Release" | "Task" | "Other" => {
  const lower = type.toLowerCase();
  if (lower === "feature" || lower === "epic") return "Feature"; // Treat Epic as Feature
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
    const project = row.Project || "Unknown";
    const assigneeName = row.Assignee || "Unassigned";
    
    // Parse dates from CSV
    const csvStartDate = parseDate(row["Start Date"]);
    const csvDueDate = parseDate(row["Due Date"] || row["Finish Date"] || row["End Date"]);
    const updatedAt = parseDate(row["Updated At"]);
    const status = row.Status || "";
    const isClosed = status.toLowerCase() === "closed";
    
    // Apply user's date logic:
    // Start date = LATEST between Start Date and Created At (when work actually started)
    let startDate = createdDate; // Default to Created At
    if (csvStartDate && csvStartDate > createdDate) {
      startDate = csvStartDate; // Use Start Date if it's later
    }
    
    // Closed date logic:
    // - For CLOSED tickets: Use EARLIEST between Due Date and Updated At
    // - For IN-PROGRESS tickets: Use Due Date only (Updated At is not completion date)
    let closedDate: Date | null = null;
    if (isClosed) {
      // Ticket is closed, use actual completion date
      if (csvDueDate && updatedAt) {
        closedDate = csvDueDate < updatedAt ? csvDueDate : updatedAt;
      } else if (updatedAt) {
        closedDate = updatedAt;
      } else if (csvDueDate) {
        closedDate = csvDueDate;
      }
    } else {
      // Ticket is not closed, use planned/due date only
      if (csvDueDate) {
        closedDate = csvDueDate;
      }
    }
    
    // Determine sprint assignment method based on project
    let sprintCreated: string;
    let sprintClosed: string;
    
    if (usesDateBasedSprints(project) && (startDate || csvDueDate || closedDate)) {
      // Use date-based sprint calculation for Orion, Threat Intel, and Aman
      const sprints = calculateSprintRange(startDate, csvDueDate, closedDate, project, sprintConfigs);
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

    // Generate a unique ID based on the hierarchy:
    // - Row with Type="Feature" → Use ID column as its ID (this is the parent feature)
    // - Row with Type="User story"/"Bug"/etc → Child ticket, Parent column is parentId
    const title = row.Subject || "";
    let id: string;
    let parentId: string | undefined = undefined;
    
    if (normalizedType === "Feature") {
      // This row IS a FEATURE - use ID column or generate if not available
      id = row.ID || `FEATURE-${Math.random().toString(36).substr(2, 9)}`;
      parentId = undefined; // Features don't have parents
    } else if (row.Parent) {
      // This is a child ticket (User Story, Bug, etc.) with a parent feature
      // Parent column contains the parent feature ID directly
      id = row.ID || `${row.Parent}-${type.toUpperCase()}-${Math.random().toString(36).substr(2, 6)}`;
      parentId = row.Parent; // Use Parent column as-is
    } else {
      // No parent - this is an independent ticket
      id = row.ID || `TICKET-${Math.random().toString(36).substr(2, 9)}`;
      parentId = undefined;
    }

    // Get function AND multiplier from database
    // Priority: 1. Multiplier Database, 2. CSV columns, 3. Skip (warn user)
    // EXCEPTION: Feature tickets don't require assignee validation
    let personFunction: FunctionType | undefined;
    let multiplier = 1.0;
    
    // Feature tickets: Don't require assignee validation, use default values
    if (normalizedType === "Feature") {
      personFunction = "PRODUCT"; // Default for features
      multiplier = 1.0;
    } else {
      // Non-feature tickets: Require assignee validation
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
        // Not in database AND no Function in CSV - this person is not properly configured
        // Skip this ticket or log warning
        if (multiplierDB.length > 0) {
          // Only warn if multiplier DB exists but person not found
          console.warn(`⚠️ "${assigneeName}" not found in multiplier database and no Function in CSV. Skipping ticket ID: ${row.ID}, Type: ${normalizedType}, Subject: ${subject.substring(0, 40)}`);
        }
        return null; // Skip this ticket
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
