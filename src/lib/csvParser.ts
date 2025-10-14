import Papa from "papaparse";
import { CSVRow, ParsedTicket } from "@/types/openproject";

export const parseCSV = (file: File): Promise<ParsedTicket[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const tickets = results.data.map((row) => parseRow(row));
          resolve(tickets.filter((t) => t !== null) as ParsedTicket[]);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

const parseRow = (row: CSVRow): ParsedTicket | null => {
  try {
    const storyPoints = parseInt(row["Story Points"] || "0", 10) || 0;
    const createdDate = new Date(row["Created Date"]);
    const closedDate = row["Closed Date"] ? new Date(row["Closed Date"]) : null;
    
    const cycleDays = closedDate 
      ? Math.round((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const subject = row.Subject || "";
    const isRevise = subject.toLowerCase().includes("revise") || 
                     subject.toLowerCase().includes("[revise]");

    return {
      assignee: row.Assignee || "Unassigned",
      function: row.Function,
      status: row.Status,
      storyPoints,
      type: row.Type || "Task",
      project: row.Project || "Unknown",
      sprintClosed: row["Sprint Closed"] || "",
      createdDate,
      closedDate,
      subject,
      isBug: row.Type?.toLowerCase() === "bug",
      isRevise,
      cycleDays,
    };
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

    tickets.push({
      assignee: assignee.name,
      function: assignee.function,
      status: "Closed",
      storyPoints: Math.floor(Math.random() * 8) + 1,
      type: isBug ? "Bug" : Math.random() < 0.5 ? "Feature" : "Task",
      project: projects[Math.floor(Math.random() * projects.length)],
      sprintClosed: sprints[Math.floor(Math.random() * sprints.length)],
      createdDate,
      closedDate,
      subject: isRevise 
        ? `REVISE: Fix issue in ${projects[Math.floor(Math.random() * projects.length)]}`
        : `Implement feature ${i + 1}`,
      isBug,
      isRevise,
      cycleDays: Math.round((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)),
    });
  }

  return tickets;
};
