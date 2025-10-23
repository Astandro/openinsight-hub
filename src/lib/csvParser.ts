import Papa from "papaparse";
import { CSVRow, ParsedTicket } from "@/types/openproject";

export const parseCSV = (csvText: string): ParsedTicket[] => {
  const results = Papa.parse<CSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  
  const tickets = results.data.map((row) => parseRow(row));
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

const parseRow = (row: CSVRow): ParsedTicket | null => {
  try {
    const storyPoints = parseInt(row["Story Points"] || "0", 10) || 0;
    const createdDate = new Date(row["Created At"]);
    const closedDate = row["Updated At"] ? new Date(row["Updated At"]) : null;
    
    const cycleDays = closedDate 
      ? Math.round((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const subject = row.Subject || "";
    const type = row.Type || "Task";
    const normalizedType = normalizeType(type);
    
    const isRevise = subject.toLowerCase().startsWith("revise") || 
                     subject.toLowerCase().includes("revise");
    const isBug = normalizedType === "Bug" || type.toLowerCase().includes("bug");

    // Generate a unique ID based on the hierarchy:
    // - Row with Type="Feature" AND has Parent value → This is the PARENT feature, use Parent as its ID
    // - Row with Type="User story"/"Bug"/etc AND has Parent value → These are CHILDREN, Parent is their parentId
    const title = row.Subject || "";
    let id: string;
    let parentId: string | undefined = undefined;
    
    if (!row.Parent) {
      // No parent - this is an independent ticket
      id = `TICKET-${Math.random().toString(36).substr(2, 9)}`;
      parentId = undefined;
    } else {
      // Has a parent value in CSV
      if (normalizedType === "Feature") {
        // This row IS the top-level FEATURE - use Parent column value as its ID
        id = row.Parent;
        parentId = undefined; // It IS the parent, so no parentId
      } else {
        // This is a child ticket (User Story, Bug, etc.) - generate unique ID
        id = `${row.Parent}-${type.toUpperCase()}-${Math.random().toString(36).substr(2, 6)}`;
        parentId = row.Parent; // Parent column value is its parentId
      }
    }

    const ticket = {
      id,
      title,
      assignee: row.Assignee || "Unassigned",
      function: row.Function,
      status: row.Status,
      storyPoints,
      type,
      normalizedType,
      project: row.Project || "Unknown",
      sprintClosed: row["Sprint Closed"] || "",
      createdDate,
      closedDate,
      subject,
      isBug,
      isRevise,
      cycleDays,
      parentId, // Use the parentId we calculated above
    };
    
    // Debug logging for first few tickets
    if (Math.random() < 0.05) { // Log ~5% of tickets
      console.log('Parsed ticket:', {
        id: ticket.id,
        type: ticket.type,
        normalizedType: ticket.normalizedType,
        parentId: ticket.parentId,
        assignee: ticket.assignee,
        function: ticket.function
      });
    }
    
    return ticket;
  } catch (error) {
    console.error("Error parsing row:", row, error);
    return null;
  }
};

export const generateSampleData = (): ParsedTicket[] => {
  const assignees = [
    { name: "Alice Johnson", function: "FE" as const },
    { name: "Bob Smith", function: "BE" as const },
    { name: "Charlie Brown", function: "QA" as const },
    { name: "Diana Prince", function: "DESIGNER" as const },
    { name: "Eve Martinez", function: "PRODUCT" as const },
    { name: "Frank Castle", function: "BE" as const },
    { name: "Grace Hopper", function: "FE" as const },
    { name: "Henry Ford", function: "INFRA" as const },
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
