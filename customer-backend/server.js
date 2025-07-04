const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// Email transporter config
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Check transporter readiness
transporter.verify((err, success) => {
  if (err) console.error('❌ Email transporter error:', err.message);
  else console.log('📧 Email transporter is ready');
});

// Mongoose User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);

// JWT token generator
const generateToken = (user) => jwt.sign(
  { id: user._id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Signup Route
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });

    const token = generateToken(newUser);
    const verifyUrl = `http://localhost:${PORT}/verify?token=${token}`;

    const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
    <div style="text-align: center;">
      <img src="https://raw.githubusercontent.com/vivekOJ1129/ML_Model_Disease_Predictions/main/ChatGPT%20Image%20Jul%201%2C%202025%2C%2009_45_10%20PM.png" alt="MedPredict Logo" width="120" style="margin-bottom: 20px;" />
      <h2 style="color: #2c3e50;">Verify Your Email</h2>
    </div>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thanks for signing up at <strong>MedPredict</strong>! Click the button below to verify your email:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" style="background-color: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px;">
        Verify Email
      </a>
    </div>
    <p>If the button doesn't work, paste this link into your browser:</p>
    <p style="word-break: break-word; color: #555;">${verifyUrl}</p>
    <hr />
    <p style="font-size: 12px; color: #888;">If you didn’t request this email, you can safely ignore it.</p>
  </div>
`;


    await transporter.sendMail({
      from: `"MedPredict" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - MedPredict',
      html: htmlContent,
    });

    res.status(200).json({ message: 'Signup successful. Verification email sent.' });
  } catch (err) {
    console.error('❌ Signup Error:', err.message);
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.verified) {
      return res.status(401).json({ message: 'Please verify your email first.' });
    }

    const token = generateToken(user);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('❌ Login Error:', err.message);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// Email Verification Route
app.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).send('User not found');

    if (user.verified) {
      return res.send(`
        <html><body>
        <h2>Email already verified! Redirecting to login...</h2>
        <script>setTimeout(() => { window.location.href = 'http://localhost:3000/login'; }, 3000);</script>
        </body></html>
      `);
    }

    user.verified = true;
    await user.save();

    res.send(`
      <html><body>
      <h2>✅ Email verified! Redirecting to login...</h2>
      <script>setTimeout(() => { window.location.href = 'http://localhost:3000/login'; }, 3000);</script>
      </body></html>
    `);
  } catch (err) {
    console.error('❌ Verification Error:', err.message);
    res.status(400).send('❌ Invalid or expired token');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
