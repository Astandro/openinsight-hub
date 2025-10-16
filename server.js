import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// In-memory data storage
let storedData = [];
let storedFilters = null;
let storedThresholds = null;

// Authentication configuration
const AUTH_CONFIG = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'Admin124$',
    role: 'admin'
  },
  user: {
    username: process.env.USER_USERNAME || 'user',
    password: process.env.USER_PASSWORD || 'user',
    role: 'user'
  }
};

// Active sessions (in production, use Redis or database)
const activeSessions = new Map();

// Helper function to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Simple credential validation (direct string comparison)
const validateCredentials = (username, password) => {
  for (const [key, user] of Object.entries(AUTH_CONFIG)) {
    if (user.username === username && user.password === password) {
      return { valid: true, role: user.role };
    }
  }
  
  return { valid: false };
};

// Authentication Routes
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const result = validateCredentials(username, password);
    
    if (result.valid) {
      const sessionToken = generateSessionToken();
      const sessionData = {
        username,
        role: result.role,
        createdAt: new Date().toISOString()
      };
      
      activeSessions.set(sessionToken, sessionData);
      
      res.status(200).json({
        success: true,
        token: sessionToken,
        role: result.role,
        username
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  try {
    const { token } = req.body;
    
    if (token && activeSessions.has(token)) {
      activeSessions.delete(token);
    }
    
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.get('/api/auth/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !activeSessions.has(token)) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const sessionData = activeSessions.get(token);
    res.status(200).json({
      valid: true,
      username: sessionData.username,
      role: sessionData.role
    });
  } catch (error) {
    res.status(500).json({ error: 'Session verification failed' });
  }
});

// Middleware to check authentication for protected routes
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.session = activeSessions.get(token);
  next();
};

// API Routes
app.get('/api/data', (req, res) => {
  try {
    res.status(200).json({
      tickets: storedData,
      filters: storedFilters,
      thresholds: storedThresholds,
      count: storedData.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve data' });
  }
});

app.post('/api/data', requireAuth, (req, res) => {
  try {
    const { tickets, filters, thresholds } = req.body;
    
    if (tickets && Array.isArray(tickets)) {
      storedData = tickets;
    }
    
    if (filters) {
      storedFilters = filters;
    }
    
    if (thresholds) {
      storedThresholds = thresholds;
    }
    
    res.status(200).json({ 
      message: 'Data stored successfully', 
      count: storedData.length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store data' });
  }
});

app.delete('/api/data', requireAuth, (req, res) => {
  try {
    storedData = [];
    storedFilters = null;
    storedThresholds = null;
    res.status(200).json({ message: 'Data cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// Admin-only route to get auth configuration (for debugging)
app.get('/api/admin/config', requireAuth, (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.status(200).json({
    adminUsername: AUTH_CONFIG.admin.username,
    userUsername: AUTH_CONFIG.user.username,
    activeSessions: activeSessions.size
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Data endpoint: http://localhost:${PORT}/api/data`);
});
