const express = require('express');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded authentication - CHANGE THIS PASSWORD!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'parent123';

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize SQLite database
const db = new Database('points.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS kids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    color TEXT NOT NULL,
    balance INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kid_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    tag TEXT NOT NULL,
    note TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kid_id) REFERENCES kids(id)
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    is_positive INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
  );
`);

// Initialize default kids if none exist
const existingKids = db.prepare('SELECT COUNT(*) as count FROM kids').get();
if (existingKids.count === 0) {
  db.prepare('INSERT INTO kids (name, initials, color, balance) VALUES (?, ?, ?, ?)').run('Kid 1', 'K1', '#FF6B6B', 0);
  db.prepare('INSERT INTO kids (name, initials, color, balance) VALUES (?, ?, ?, ?)').run('Kid 2', 'K2', '#4ECDC4', 0);
}

// Initialize default tags
const existingTags = db.prepare('SELECT COUNT(*) as count FROM tags').get();
if (existingTags.count === 0) {
  const defaultTags = [
    { name: 'TV', color: '#9B59B6', is_positive: 0 },
    { name: 'Snacks', color: '#E67E22', is_positive: 0 },
    { name: 'Chores', color: '#27AE60', is_positive: 1 },
    { name: 'Finish Food', color: '#3498DB', is_positive: 1 },
    { name: 'Clean Up', color: '#1ABC9C', is_positive: 1 }
  ];
  
  const insertTag = db.prepare('INSERT INTO tags (name, color, is_positive) VALUES (?, ?, ?)');
  defaultTags.forEach(tag => insertTag.run(tag.name, tag.color, tag.is_positive));
}

// Generate session token
function generateSessionToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

// Authentication middleware - checks both password and session token
function authenticate(req, res, next) {
  const password = req.headers['x-password'] || '';
  const sessionToken = req.headers['x-session-token'] || '';
  
  // Check session token first
  if (sessionToken) {
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')').get(sessionToken);
    if (session) {
      return next();
    }
  }
  
  // Fall back to password check
  const trimmedPassword = password.trim();
  if (trimmedPassword === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// API Routes

// Authentication endpoint
app.post('/api/auth', (req, res) => {
  const password = req.headers['x-password'] || '';
  const trimmedPassword = password.trim();
  
  // Debug logging (remove in production)
  console.log('Auth attempt:', {
    received: password ? `"${password}" (length: ${password.length})` : 'empty',
    expected: ADMIN_PASSWORD,
    match: trimmedPassword === ADMIN_PASSWORD
  });
  
  if (trimmedPassword === ADMIN_PASSWORD) {
    try {
      // Generate session token
      const token = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now
      
      // Store session in database
      const insertStmt = db.prepare('INSERT INTO sessions (token, expires_at) VALUES (?, ?)');
      insertStmt.run(token, expiresAt.toISOString());
      
      console.log('Session created:', { token: token.substring(0, 20) + '...', expiresAt: expiresAt.toISOString() });
      
      res.json({ 
        success: true, 
        sessionToken: token,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session', details: error.message });
    }
  } else {
    res.status(401).json({ error: 'Incorrect password' });
  }
});

// Validate session endpoint
app.get('/api/session/validate', (req, res) => {
  const sessionToken = req.headers['x-session-token'] || '';
  
  if (!sessionToken) {
    return res.status(401).json({ valid: false });
  }
  
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')').get(sessionToken);
  
  if (session) {
    res.json({ valid: true });
  } else {
    res.status(401).json({ valid: false });
  }
});

// Get all kids
app.get('/api/kids', (req, res) => {
  const kids = db.prepare('SELECT * FROM kids ORDER BY id').all();
  res.json(kids);
});

// Update kid details
app.put('/api/kids/:id', authenticate, (req, res) => {
  const { name, initials, color } = req.body;
  const stmt = db.prepare('UPDATE kids SET name = ?, initials = ?, color = ? WHERE id = ?');
  stmt.run(name, initials, color, req.params.id);
  res.json({ success: true });
});

// Add transaction
app.post('/api/transactions', authenticate, (req, res) => {
  const { kid_id, points, tag, note } = req.body;
  
  // Use default tag if not provided
  const transactionTag = tag || 'General';
  
  // Insert transaction
  const insertStmt = db.prepare('INSERT INTO transactions (kid_id, points, tag, note) VALUES (?, ?, ?, ?)');
  insertStmt.run(kid_id, points, transactionTag, note || '');
  
  // Update kid balance
  const updateStmt = db.prepare('UPDATE kids SET balance = balance + ? WHERE id = ?');
  updateStmt.run(points, kid_id);
  
  // Get updated kid data
  const kid = db.prepare('SELECT * FROM kids WHERE id = ?').get(kid_id);
  
  res.json({ success: true, kid });
});

// Get transactions (with optional kid_id filter)
app.get('/api/transactions', (req, res) => {
  const { kid_id, limit = 50 } = req.query;
  
  let query = 'SELECT t.*, k.name, k.initials, k.color FROM transactions t JOIN kids k ON t.kid_id = k.id';
  let params = [];
  
  if (kid_id) {
    query += ' WHERE t.kid_id = ?';
    params.push(kid_id);
  }
  
  query += ' ORDER BY t.timestamp DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const stmt = db.prepare(query);
  const transactions = stmt.all(...params);
  
  res.json(transactions);
});

// Get all tags
app.get('/api/tags', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(tags);
});

// Add new tag
app.post('/api/tags', authenticate, (req, res) => {
  const { name, color, is_positive } = req.body;
  
  try {
    const stmt = db.prepare('INSERT INTO tags (name, color, is_positive) VALUES (?, ?, ?)');
    stmt.run(name, color, is_positive ? 1 : 0);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Tag already exists' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Clean up expired sessions on startup
db.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')').run();

// Start server
app.listen(PORT, () => {
  console.log(`\n🎮 Kids Points Tracker is running!`);
  console.log(`📱 Open: http://localhost:${PORT}`);
  console.log(`🔐 Password: ${ADMIN_PASSWORD}`);
  console.log(`⏰ Sessions persist for 1 year\n`);
});
