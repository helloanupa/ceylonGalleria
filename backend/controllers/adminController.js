const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Admin
exports.register = async (req, res) => {
  const { name, gmail, password } = req.body;

  // Validate required fields
  if (!name || !gmail || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required." });
  }

  // Simple email check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(gmail)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  // Password length
  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  try {
    // Check if admin exists
    const existingAdmin = await Admin.findOne({ gmail });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save admin
    const newAdmin = new Admin({ name, gmail, password: hashedPassword });
    const savedAdmin = await newAdmin.save();

    res
      .status(201)
      .json({ message: "Admin registered successfully", admin: savedAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during admin registration." });
  }
};

exports.login = async (req, res) => {
  const { gmail, password } = req.body;

  if (!gmail || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const admin = await Admin.findOne({ gmail });

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Create and sign a JWT for the admin
    const payload = {
      admin: {
        id: admin.id,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" }); // Using JWT_SECRET from .env
    res.status(200).json({ message: "Admin login successful", token, admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during admin login." });
  }
};
