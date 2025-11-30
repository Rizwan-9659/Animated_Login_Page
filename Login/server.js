require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors()); // adjust origin in production

// Simple persistence files
const DB_FOLDER = path.join(__dirname, 'db');
if (!fs.existsSync(DB_FOLDER)) fs.mkdirSync(DB_FOLDER);
const USERS_FILE = path.join(DB_FOLDER, 'users.json');
const PENDING_FILE = path.join(DB_FOLDER, 'pending.json');

// Helper functions for JSON file read/write
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); }
  catch { return []; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ensure files exist
if (!fs.existsSync(USERS_FILE)) writeJSON(USERS_FILE, []);
if (!fs.existsSync(PENDING_FILE)) writeJSON(PENDING_FILE, []);

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: (process.env.SMTP_SECURE === 'true'), // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// send test route (optional)
// app.get('/ping', (req,res)=>res.json({ok:true}));

// Register route - creates pending registration and emails OTP
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    // check if user exists
    const users = readJSON(USERS_FILE);
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // create OTP and pending record
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const token = uuidv4(); // client uses token to verify
    const expiresAt = Date.now() + 1000 * 60 * 10; // 10 minutes

    const pending = readJSON(PENDING_FILE);
    // remove previous pending for same email
    const filtered = pending.filter(p => p.email.toLowerCase() !== email.toLowerCase());
    filtered.push({
      id: token,
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10), // store hashed password in pending
      otp,
      expiresAt
    });
    writeJSON(PENDING_FILE, filtered);

    // send email
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: 'Your verification code',
      text: `Your OTP code is ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP code is <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
    });

    console.log('OTP sent for', email, info.messageId);
    return res.json({ ok: true, id: token, message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Verify OTP route - finalize registration
app.post('/api/verify-otp', (req, res) => {
  try {
    const { id, otp } = req.body;
    if (!id || !otp) return res.status(400).json({ error: 'Missing fields' });

    let pending = readJSON(PENDING_FILE);
    const p = pending.find(x => x.id === id);
    if (!p) return res.status(404).json({ error: 'No pending registration' });
    if (Date.now() > p.expiresAt) {
      // remove expired
      pending = pending.filter(x => x.id !== id);
      writeJSON(PENDING_FILE, pending);
      return res.status(410).json({ error: 'OTP expired' });
    }
    if (p.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });

    // move to users
    const users = readJSON(USERS_FILE);
    users.push({
      id: uuidv4(),
      name: p.name,
      email: p.email,
      passwordHash: p.passwordHash,
      createdAt: new Date().toISOString()
    });
    writeJSON(USERS_FILE, users);

    // remove pending
    pending = pending.filter(x => x.id !== id);
    writeJSON(PENDING_FILE, pending);

    return res.json({ ok: true, message: 'Registered successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Simple login endpoint (demo) - checks hashed password
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    // For demo we return a simple message. In production return JWT or session cookie.
    return res.json({ ok: true, message: 'Logged in', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
