// Data persistence without backend using localStorage
export const saveData = (key: string, data: any): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`teamlight_${key}`, JSON.stringify(data));
};

export const loadData = (key: string): any => {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(`teamlight_${key}`);
  return data ? JSON.parse(data) : null;
};

export const clearData = (key: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`teamlight_${key}`);
};

// Specific data keys
export const DATA_KEYS = {
  TICKETS: 'tickets',
  SETTINGS: 'settings',
  FILTERS: 'filters',
  THRESHOLDS: 'thresholds'
} as const;
