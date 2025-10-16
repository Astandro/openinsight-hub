const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.110.11.37:3001/api';

export interface LoginResponse {
  success: boolean;
  token?: string;
  role?: string;
  username?: string;
  error?: string;
}

export interface AuthSession {
  valid: boolean;
  username?: string;
  role?: string;
  error?: string;
}

// Login with server-side authentication
export const login = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Store session token in localStorage
      localStorage.setItem('teamlight_token', data.token);
      localStorage.setItem('teamlight_role', data.role);
      localStorage.setItem('teamlight_username', data.username);
    }
    
    return data;
  } catch (error) {
    return {
      success: false,
      error: 'Network error during login'
    };
  }
};

// Logout from server
export const logout = async (): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const token = localStorage.getItem('teamlight_token');
    
    if (token) {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      
      const data = await response.json();
      
      // Clear local storage regardless of server response
      localStorage.removeItem('teamlight_token');
      localStorage.removeItem('teamlight_role');
      localStorage.removeItem('teamlight_username');
      
      return data;
    }
    
    return { success: true, message: 'Already logged out' };
  } catch (error) {
    // Clear local storage even if server request fails
    localStorage.removeItem('teamlight_token');
    localStorage.removeItem('teamlight_role');
    localStorage.removeItem('teamlight_username');
    
    return {
      success: false,
      error: 'Network error during logout'
    };
  }
};

// Verify current session with server
export const verifySession = async (): Promise<AuthSession> => {
  try {
    const token = localStorage.getItem('teamlight_token');
    
    if (!token) {
      return { valid: false, error: 'No session token found' };
    }
    
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const data = await response.json();
    
    if (data.valid) {
      return {
        valid: true,
        username: data.username,
        role: data.role
      };
    } else {
      // Clear invalid session
      localStorage.removeItem('teamlight_token');
      localStorage.removeItem('teamlight_role');
      localStorage.removeItem('teamlight_username');
      
      return { valid: false, error: data.error || 'Invalid session' };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Network error during session verification'
    };
  }
};

// Check if user is authenticated (client-side check)
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('teamlight_token');
};

// Get current user role
export const getUserRole = (): string | null => {
  return localStorage.getItem('teamlight_role');
};

// Get current username
export const getUsername = (): string | null => {
  return localStorage.getItem('teamlight_username');
};

// Get session token for API requests
export const getAuthToken = (): string | null => {
  return localStorage.getItem('teamlight_token');
};
