const express = require("express");
const mysql2 = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require('nodemailer');
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Main database connection (for users)
const db = mysql2.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "group_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Email logs database connection
const emailDb = mysql2.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "email_logs",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err) => {
  if (err) {
    console.log("Main database connection failed", err);
  } else {
    console.log("Connected to MySQL main database (group_db)");
  }
});

emailDb.getConnection((err) => {
  if (err) {
    console.log("Email database connection failed", err);
  } else {
    console.log("Connected to MySQL email database (email_logs)");
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to allow multiple roles to send emails
const requireAuthorizedRole = (req, res, next) => {
  const authorizedRoles = ['admin1', 'admin2', 'admin3', 'mayor', 'vice'];

  if (!authorizedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied. Authorized roles: ${authorizedRoles.join(', ')}`
    });
  }
  next();
};

// Middleware to check if user is admin3 (for logs access)
const requireAdmin3 = (req, res, next) => {
  if (req.user.role !== 'admin3') {
    return res.status(403).json({ message: 'Access denied. Admin3 role required.' });
  }
  next();
};

// Register
app.post("/register", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const checkUserSql = "SELECT * FROM users WHERE username = ?";
  db.query(checkUserSql, [username], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (results.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const insertUserSql = "INSERT INTO users (username, password, role) VALUES (?,?, ?)";
    db.query(insertUserSql, [username, hashedPassword, role], (err, result) => {
      if (err) return res.status(500).json({ message: "Registration Failed" });

      res.status(201).json({ message: "User registered Successfully" });
    });
  });
});

// Login User
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("Login response:", { token, username: user.username, role: user.role });

    res.json({
      message: "Login successful",
      token,
      username: user.username,
      role: user.role,
    });
  });
});

// Send Email endpoint (SMTP FIXED)
app.post('/api/send-email', authenticateToken, requireAuthorizedRole, async (req, res) => {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: to, subject, or message'
    });
  }

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: Missing email credentials'
      });
    }

    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('Testing email connection...');
    try {
      await transporter.verify();
      console.log('Email connection verified successfully');
    } catch (verifyError) {
      console.error('Email verification failed:', verifyError);
      return res.status(500).json({
        success: false,
        message: 'Email server connection failed. Please check your email credentials.',
        error: verifyError.message
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message
    };

    console.log('Sending email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    const insertQuery = 'INSERT INTO logs (recipient, subject, message, sender_username, sent_at) VALUES (?, ?, ?, ?, NOW())';

    const logEmail = () => {
      return new Promise((resolve, reject) => {
        emailDb.query(insertQuery, [to, subject, message, req.user.username], (err, result) => {
          if (err) {
            console.error('Database logging error:', err);
            reject(err);
          } else {
            console.log('Database log successful');
            resolve(result);
          }
        });
      });
    };

    try {
      await logEmail();
    } catch (logError) {
      console.error('Failed to log email to database:', logError);
    }

    res.json({
      success: true,
      message: 'Email sent successfully!',
      sentBy: req.user.username,
      senderRole: req.user.role,
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Detailed email error:', error);

    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your Gmail App Password.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Failed to connect to Gmail servers. Check your internet connection.';
    } else if (error.code === 'EENVELOPE') {
      errorMessage = 'Invalid email address format.';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get email logs endpoint
app.get('/api/email-logs', authenticateToken, requireAdmin3, (req, res) => {
  const query = 'SELECT * FROM logs ORDER BY sent_at DESC LIMIT 50';

  emailDb.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching email logs:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch email logs'
      });
    }

    res.json({
      success: true,
      logs: results
    });
  });
});

// Server status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  });
});

app.listen(5000, () => {
  console.log("Server is running on Port 5000");
  console.log("Email configured:", !!(process.env.EMAIL_USER && process.env.EMAIL_PASS));
});
