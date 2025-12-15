import { SprintConfig } from "@/types/openproject";

/**
 * Projects that use date-based sprint calculation
 */
const DATE_BASED_SPRINT_PROJECTS = [
  "Orion",
  "Threat Intel",
  "Intellibron Aman",
  "Aman",
];

/**
 * Check if a project should use date-based sprint calculation
 */
export const usesDateBasedSprints = (projectName: string): boolean => {
  return DATE_BASED_SPRINT_PROJECTS.some((project) =>
    projectName.toLowerCase().includes(project.toLowerCase())
  );
};

/**
 * Calculate sprint number based on start date and due date
 * Uses sprint configurations if available, with +1 day tolerance
 * Tolerance: If ticket closedDate is <= endDate + 1 day, count it in that sprint
 */
export const calculateSprintFromDates = (
  startDate: Date | null,
  dueDate: Date | null,
  projectName: string,
  sprintConfigs: SprintConfig[] = [],
  closedDate: Date | null = null // Optional: for tolerance check
): string => {
  // If no dates provided, return N/A
  if (!startDate && !dueDate && !closedDate) {
    return "#N/A";
  }

  // Use the most relevant date for sprint assignment
  // Priority: closedDate (actual completion) > dueDate (planned) > startDate
  const referenceDate = closedDate || dueDate || startDate;
  if (!referenceDate) {
    return "#N/A";
  }

  // Try to find sprint from configurations
  const projectConfigs = sprintConfigs.filter(
    (config) =>
      config.project.toLowerCase() === projectName.toLowerCase() ||
      projectName.toLowerCase().includes(config.project.toLowerCase())
  );

  if (projectConfigs.length > 0) {
    // Sort configs by sprint number to process in order
    const sortedConfigs = [...projectConfigs].sort((a, b) => a.sprintNumber - b.sprintNumber);
    
    // Find which sprint the reference date falls into (with +1 day tolerance)
    for (const config of sortedConfigs) {
      const configStart = new Date(config.startDate);
      const configEnd = new Date(config.endDate);
      
      // Add +1 day tolerance to end date
      // If ticket closed <= endDate + 1 day, count it in this sprint (not carry over)
      const configEndWithTolerance = new Date(configEnd);
      configEndWithTolerance.setDate(configEndWithTolerance.getDate() + 1);

      if (referenceDate >= configStart && referenceDate <= configEndWithTolerance) {
        return `Sprint ${String(config.sprintNumber).padStart(2, '0')}`; // Format as "Sprint 01"
      }
    }
  }

  // Fallback: Calculate sprint based on 2-week cycles from a reference date
  // Using the year's start date to ensure sprints stay within reasonable bounds
  const year = referenceDate.getFullYear();
  const yearStart = new Date(year, 0, 1); // January 1st of the ticket's year
  
  const daysSinceYearStart = Math.floor(
    (referenceDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate sprint number (2-week cycles = 14 days)
  // Max 26 sprints per year (52 weeks / 2)
  const sprintNumber = Math.min(Math.floor(daysSinceYearStart / 14) + 1, 26);

  return `Sprint ${String(sprintNumber).padStart(2, '0')}`; // Format as "Sprint 01"
};

/**
 * Calculate sprint created and sprint closed from start and due dates
 */
export const calculateSprintRange = (
  startDate: Date | null,
  dueDate: Date | null,
  closedDate: Date | null,
  projectName: string,
  sprintConfigs: SprintConfig[] = []
): { sprintCreated: string; sprintClosed: string } => {
  const sprintCreated = startDate
    ? calculateSprintFromDates(startDate, null, projectName, sprintConfigs)
    : "#N/A";
  const sprintClosed = closedDate || dueDate
    ? calculateSprintFromDates(startDate, dueDate, projectName, sprintConfigs, closedDate)
    : "#N/A";

  return { sprintCreated, sprintClosed };
};

/**
 * Parse CSV date formats to Date object
 * Handles various date formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.
 */
export const parseDate = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr || dateStr === "#N/A" || dateStr.trim() === "") {
    return null;
  }

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }

  return null;
};

/**
 * Generate sprint configurations based on actual 2025 schedule
 * Sprint 01 starts 2025-01-08, Sprint 25 ends 2025-12-30
 */
export const generateSampleSprintConfigs = (): SprintConfig[] => {
  const configs: SprintConfig[] = [];
  const projects = ["Orion", "Threat Intel", "Aman"];
  
  // Exact sprint schedule from 2025
  const sprintDates = [
    { sprint: 1, start: "2025-01-08", end: "2025-01-21" },
    { sprint: 2, start: "2025-01-22", end: "2025-02-04" },
    { sprint: 3, start: "2025-02-05", end: "2025-02-25" },
    { sprint: 4, start: "2025-02-26", end: "2025-03-11" },
    { sprint: 5, start: "2025-03-12", end: "2025-03-25" },
    { sprint: 6, start: "2025-03-26", end: "2025-04-15" },
    { sprint: 7, start: "2025-04-16", end: "2025-04-29" },
    { sprint: 8, start: "2025-04-30", end: "2025-05-13" },
    { sprint: 9, start: "2025-05-14", end: "2025-05-27" },
    { sprint: 10, start: "2025-05-28", end: "2025-06-10" },
    { sprint: 11, start: "2025-06-11", end: "2025-06-24" },
    { sprint: 12, start: "2025-06-25", end: "2025-07-08" },
    { sprint: 13, start: "2025-07-09", end: "2025-07-22" },
    { sprint: 14, start: "2025-07-23", end: "2025-08-05" },
    { sprint: 15, start: "2025-08-06", end: "2025-08-19" },
    { sprint: 16, start: "2025-08-20", end: "2025-09-02" },
    { sprint: 17, start: "2025-09-03", end: "2025-09-16" },
    { sprint: 18, start: "2025-09-17", end: "2025-09-30" },
    { sprint: 19, start: "2025-10-01", end: "2025-10-14" },
    { sprint: 20, start: "2025-10-15", end: "2025-10-28" },
    { sprint: 21, start: "2025-10-29", end: "2025-11-11" },
    { sprint: 22, start: "2025-11-12", end: "2025-11-25" },
    { sprint: 23, start: "2025-11-26", end: "2025-12-09" },
    { sprint: 24, start: "2025-12-10", end: "2025-12-23" },
    { sprint: 25, start: "2025-12-24", end: "2025-12-30" },
  ];

  projects.forEach((project) => {
    sprintDates.forEach(({ sprint, start, end }) => {
      configs.push({
        sprintNumber: sprint,
        startDate: new Date(start + "T00:00:00"), // Ensure proper date parsing
        endDate: new Date(end + "T23:59:59"), // End of day
        project,
      });
    });
  });

  return configs;
};

/**
 * Parse sprint configurations from CSV
 * Expected columns: Sprint, Project, Start Date, End Date
 */
export const parseSprintConfigCSV = (csvText: string): SprintConfig[] => {
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const configs: SprintConfig[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const sprintNumber = parseInt(
      row.sprint || row["sprint number"] || "0",
      10
    );
    const project = row.project || "";
    const startDate = parseDate(row["start date"] || row.start);
    const endDate = parseDate(row["end date"] || row.end);

    if (sprintNumber > 0 && project && startDate && endDate) {
      configs.push({
        sprintNumber,
        startDate,
        endDate,
        project,
      });
    }
  }

  return configs;
};

