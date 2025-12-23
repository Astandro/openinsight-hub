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
 * Uses sprint configurations if available
 * Sprint dates are pre-adjusted with +1 day tolerance from original schedule
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
    
    // Find which sprint the reference date falls into
    // Sprint dates are already adjusted with +1 day tolerance built in
    for (const config of sortedConfigs) {
      const configStart = new Date(config.startDate);
      const configEnd = new Date(config.endDate);

      if (referenceDate >= configStart && referenceDate <= configEnd) {
        return `Sprint ${String(config.sprintNumber).padStart(2, '0')}`; // Format as "Sprint 01"
      }
    }
    
    // If date is AFTER the last configured sprint, assign to the last sprint (future work)
    const lastConfig = sortedConfigs[sortedConfigs.length - 1];
    if (referenceDate > new Date(lastConfig.endDate)) {
      return `Sprint ${String(lastConfig.sprintNumber).padStart(2, '0')}`;
    }
    
    // If date is BEFORE the first configured sprint, return N/A
    const firstConfig = sortedConfigs[0];
    if (referenceDate < new Date(firstConfig.startDate)) {
      return "#N/A";
    }
  }

  // Fallback ONLY for projects without sprint configs
  // (Don't use fallback if configs exist but date doesn't match)
  if (projectConfigs.length === 0) {
    // Calculate sprint based on 2-week cycles from a reference date
    const year = referenceDate.getFullYear();
    const yearStart = new Date(year, 0, 1);
    
    const daysSinceYearStart = Math.floor(
      (referenceDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate sprint number (2-week cycles = 14 days), max 26 per year
    const sprintNumber = Math.min(Math.floor(daysSinceYearStart / 14) + 1, 26);
    return `Sprint ${String(sprintNumber).padStart(2, '0')}`;
  }

  return "#N/A";
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
      // Validate that the date didn't overflow (e.g., 2025-12-43 becomes 2026-01-12)
      // Check if the parsed date matches the input format
      const dateStrNormalized = dateStr.trim();
      
      // If input looks like YYYY-MM-DD format, validate day is correct
      if (dateStrNormalized.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = dateStrNormalized.split('-');
        const inputYear = parseInt(parts[0], 10);
        const inputMonth = parseInt(parts[1], 10);
        const inputDay = parseInt(parts[2].substring(0, 2), 10); // Take first 2 digits
        
        // Check if parsed date matches input (catches overflow like Dec 43 -> Jan 12)
        if (date.getFullYear() !== inputYear || 
            date.getMonth() + 1 !== inputMonth || 
            date.getDate() !== inputDay) {
          console.warn(`⚠️ Invalid date detected (overflow): "${dateStr}" -> parsed as ${date.toISOString().split('T')[0]}`);
          return null; // Reject invalid dates
        }
      }
      
      return date;
    }
  } catch (e) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }

  return null;
};

/**
 * Generate sprint configurations based on actual 2025 schedule
 * Sprint dates are adjusted +1 day from original schedule
 * Sprint 01 starts 2025-01-09, Sprint 25 ends 2026-01-06
 */
export const generateSampleSprintConfigs = (): SprintConfig[] => {
  const configs: SprintConfig[] = [];
  const projects = ["Orion", "Threat Intel", "Aman"];
  
  // Exact sprint schedule from 2025 (with +1 day adjustment)
  // Original dates + 1 day for both start and end
  const sprintDates = [
    { sprint: 1, start: "2025-01-09", end: "2025-01-22" },
    { sprint: 2, start: "2025-01-23", end: "2025-02-05" },
    { sprint: 3, start: "2025-02-06", end: "2025-02-26" },
    { sprint: 4, start: "2025-02-27", end: "2025-03-12" },
    { sprint: 5, start: "2025-03-13", end: "2025-03-26" },
    { sprint: 6, start: "2025-03-27", end: "2025-04-16" },
    { sprint: 7, start: "2025-04-17", end: "2025-04-30" },
    { sprint: 8, start: "2025-05-01", end: "2025-05-14" },
    { sprint: 9, start: "2025-05-15", end: "2025-05-28" },
    { sprint: 10, start: "2025-05-29", end: "2025-06-11" },
    { sprint: 11, start: "2025-06-12", end: "2025-06-25" },
    { sprint: 12, start: "2025-06-26", end: "2025-07-09" },
    { sprint: 13, start: "2025-07-10", end: "2025-07-23" },
    { sprint: 14, start: "2025-07-24", end: "2025-08-06" },
    { sprint: 15, start: "2025-08-07", end: "2025-08-20" },
    { sprint: 16, start: "2025-08-21", end: "2025-09-03" },
    { sprint: 17, start: "2025-09-04", end: "2025-09-17" },
    { sprint: 18, start: "2025-09-18", end: "2025-10-01" },
    { sprint: 19, start: "2025-10-02", end: "2025-10-15" },
    { sprint: 20, start: "2025-10-16", end: "2025-10-29" },
    { sprint: 21, start: "2025-10-30", end: "2025-11-12" },
    { sprint: 22, start: "2025-11-13", end: "2025-11-26" },
    { sprint: 23, start: "2025-11-27", end: "2025-12-10" },
    { sprint: 24, start: "2025-12-11", end: "2025-12-24" },
    { sprint: 25, start: "2025-12-25", end: "2026-01-06" },
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

