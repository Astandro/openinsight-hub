import { ParsedTicket, Filters, Thresholds } from '@/types/openproject';
import { getAuthToken } from './serverAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.110.11.37:3001/api';

export interface ApiResponse {
  tickets: ParsedTicket[];
  filters: Filters | null;
  thresholds: Thresholds | null;
  count: number;
}

export interface ApiError {
  error: string;
}

// Fetch data from server
export const fetchData = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/data`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // No data found, return empty state
        return {
          tickets: [],
          filters: null,
          thresholds: null,
          count: 0
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    // Return empty state if server is not available
    return {
      tickets: [],
      filters: null,
      thresholds: null,
      count: 0
    };
  }
};

// Save data to server
export const saveData = async (data: {
  tickets: ParsedTicket[];
  filters?: Filters;
  thresholds?: Thresholds;
}): Promise<{ success: boolean; message: string; count: number }> => {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/data`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      message: result.message,
      count: result.count
    };
  } catch (error) {
    console.error('Failed to save data:', error);
    return {
      success: false,
      message: `Failed to save data: ${error.message}`,
      count: 0
    };
  }
};

// Clear data from server
export const clearData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/data`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return {
      success: true,
      message: result.message
    };
  } catch (error) {
    console.error('Failed to clear data:', error);
    return {
      success: false,
      message: `Failed to clear data: ${error.message}`
    };
  }
};

// Check if server is available
export const checkServerHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
};
