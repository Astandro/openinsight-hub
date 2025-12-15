import Papa from "papaparse";
import { MultiplierEntry, FunctionType } from "@/types/openproject";

interface MultiplierCSVRow {
  Nama?: string;
  Name?: string;
  Posisi?: string;
  Position?: string;
  Formula?: string;
  Multiplier?: string;
  Capacity?: string;
  Metric?: string;
}

/**
 * Parse multiplier CSV file with columns: Nama (Name), Posisi (Position/Function), Formula (Multiplier)
 */
export const parseMultiplierCSV = (csvText: string): MultiplierEntry[] => {
  const results = Papa.parse<MultiplierCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const multipliers = results.data.map((row) => {
    // Support both Indonesian (Nama, Posisi) and English (Name, Position) column names
    const name = row.Nama || row.Name || "";
    const positionStr = row.Posisi || row.Position || "BE";
    const formulaStr = row.Formula || row.Multiplier || "1.0";
    const capacityStr = row.Capacity || "";
    const metricStr = row.Metric || "";

    // Parse and validate position
    const position = normalizePosition(positionStr);

    // Parse formula value
    const formula = parseFloat(formulaStr);

    // Parse capacity (optional)
    const capacity = capacityStr ? parseFloat(capacityStr) : undefined;

    // Parse metric (optional, must be "sp" or "ticket")
    let metric: "sp" | "ticket" | undefined = undefined;
    if (metricStr) {
      const normalizedMetric = metricStr.toLowerCase().trim();
      if (normalizedMetric === "sp" || normalizedMetric === "story point" || normalizedMetric === "story points") {
        metric = "sp";
      } else if (normalizedMetric === "ticket" || normalizedMetric === "tickets") {
        metric = "ticket";
      }
    }

    return {
      name: name.trim(),
      position,
      formula: isNaN(formula) ? 1.0 : formula,
      capacity: capacity !== undefined && !isNaN(capacity) && capacity > 0 ? capacity : undefined,
      metric,
    };
  });

  // Filter out entries with empty names
  return multipliers.filter((m) => m.name.length > 0);
};

/**
 * Normalize position string to FunctionType
 */
const normalizePosition = (position: string): FunctionType => {
  const normalized = position.toUpperCase().trim();

  // Map various position formats to FunctionType
  const mapping: Record<string, FunctionType> = {
    BE: "BE",
    BACKEND: "BE",
    FE: "FE",
    FRONTEND: "FE",
    QA: "QA",
    TESTER: "QA",
    TEST: "QA",
    DESIGNER: "DESIGNER",
    DESIGN: "DESIGNER",
    PRODUCT: "PRODUCT",
    PM: "PRODUCT",
    "PRODUCT MANAGER": "PRODUCT",
    INFRA: "INFRA",
    INFRASTRUCTURE: "INFRA",
    DEVOPS: "INFRA",
    OPERATION: "OPERATION",
    OPS: "OPERATION",
    "BUSINESS SUPPORT": "BUSINESS SUPPORT",
    RESEARCHER: "RESEARCHER",
    RESEARCH: "RESEARCHER",
    FOUNDRY: "FOUNDRY",
    "UX WRITER": "UX WRITER",
    WRITER: "UX WRITER",
    "UX DESIGN": "DESIGNER",
    "UX DESIGNER": "DESIGNER",
    APPS: "APPS",
    "ENGINEERING MANAGER": "ENGINEERING MANAGER",
    "ENG MANAGER": "ENGINEERING MANAGER",
    "ENGINEERING MGR": "ENGINEERING MANAGER",
    "TECH LEAD": "ENGINEERING MANAGER",
    "TECH LEADER": "ENGINEERING MANAGER",
  };

  return mapping[normalized] || "BE";
};

/**
 * Get complete multiplier entry for a specific person (by name)
 * Returns null if person not found in database
 */
export const getMultiplierEntryByName = (
  name: string,
  multiplierDB: MultiplierEntry[]
): MultiplierEntry | null => {
  const entry = multiplierDB.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  );
  return entry || null;
};

/**
 * Get multiplier for a specific person (by name)
 * Returns 1.0 if person not found in database
 */
export const getMultiplierByName = (
  name: string,
  multiplierDB: MultiplierEntry[]
): number => {
  const entry = getMultiplierEntryByName(name, multiplierDB);
  return entry?.formula || 1.0;
};

/**
 * Get multiplier by name and validate position matches
 * Returns 1.0 if person not found or position doesn't match
 */
export const getMultiplierByNameAndPosition = (
  name: string,
  position: FunctionType,
  multiplierDB: MultiplierEntry[]
): number => {
  const entry = multiplierDB.find(
    (m) =>
      m.name.toLowerCase() === name.toLowerCase() && m.position === position
  );
  return entry?.formula || 1.0;
};

/**
 * Get all people in a specific function/position
 */
export const getPeopleByPosition = (
  position: FunctionType,
  multiplierDB: MultiplierEntry[]
): MultiplierEntry[] => {
  return multiplierDB.filter((m) => m.position === position);
};

/**
 * Validate multiplier database
 * Returns array of validation errors
 */
export const validateMultiplierDB = (
  multiplierDB: MultiplierEntry[]
): string[] => {
  const errors: string[] = [];

  // Check for duplicate names
  const nameCount = new Map<string, number>();
  multiplierDB.forEach((entry) => {
    const name = entry.name.toLowerCase();
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
  });

  nameCount.forEach((count, name) => {
    if (count > 1) {
      errors.push(`Duplicate name found: ${name} (appears ${count} times)`);
    }
  });

  // Check for invalid multiplier values
  multiplierDB.forEach((entry) => {
    if (entry.formula < 0 || entry.formula > 5) {
      errors.push(
        `Invalid multiplier for ${entry.name}: ${entry.formula} (should be between 0 and 5)`
      );
    }
  });

  // Check for empty names
  const emptyNames = multiplierDB.filter((entry) => !entry.name.trim());
  if (emptyNames.length > 0) {
    errors.push(`${emptyNames.length} entries have empty names`);
  }

  return errors;
};

/**
 * Generate sample multiplier data for testing
 */
export const generateSampleMultipliers = (): MultiplierEntry[] => {
  return [
    { name: "Alice Johnson", position: "FE", formula: 1.2 },
    { name: "Bob Smith", position: "BE", formula: 1.0 },
    { name: "Charlie Brown", position: "QA", formula: 0.8 },
    { name: "Diana Prince", position: "DESIGNER", formula: 0.6 },
    { name: "Eve Martinez", position: "PRODUCT", formula: 1.0 },
    { name: "Frank Castle", position: "BE", formula: 0.8 },
    { name: "Grace Hopper", position: "FE", formula: 1.0 },
    { name: "Henry Ford", position: "INFRA", formula: 1.2 },
    { name: "Irene Adler", position: "OPERATION", formula: 0.9 },
    { name: "Jack Ryan", position: "APPS", formula: 1.1 },
  ];
};

