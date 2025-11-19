const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

//register
exports.register = async (req, res) => {
  const { name, gmail, password, phone, country, role, profileImage } = req.body;

  if (!name || !gmail || !password || !phone || !country) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const gmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!gmailRegex.test(gmail))
    return res.status(400).json({ error: "Invalid email format" });

  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone))
    return res.status(400).json({ error: "Invalid phone number" });

  try {
    // Check if user already exists
    let user = await User.findOne({ gmail });
    if (user) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      gmail,
      password: hashedPassword,
      phone,
      country,
      role: role || "user",
      profileImage: profileImage || "",
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
};

 // Login
 exports.login = async (req, res) => {
  const { gmail, password } = req.body;

  if (!gmail || !password)
    return res.status(400).json({ error: "Email and password are required." });

  if (password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const user = await User.findOne({ gmail });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    // Create and sign a JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: "Server error during login." });
  }
};

 // Get Current User Profile
 exports.getCurrentUserProfile = async (req, res) => {
  // The `protect` middleware already found the user from the token
  // and attached it to `req.user`. We just need to send it back.
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(404).json({ error: "User not found" });
  }
};

 // Get Profile
 exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: "User not found" });
  }
};

 // Update Profile
 exports.updateProfile = async (req, res) => {
    try {
      // Use req.user.id from the 'protect' middleware, not req.params.id
      const user = await User.findById(req.user.id);

      if (user) {
        // Update fields from req.body
        Object.assign(user, req.body);
        const updatedUser = await user.save();
        res.json(updatedUser);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  };

 // Delete Profile
 exports.deleteProfile = async (req, res) => {
  try {
    // Use req.user.id from the 'protect' middleware
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
};

 // Get all users (Admin)
 exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

 // Update user (Admin)
 exports.updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Admin update failed" });
  }
};

 // Delete user (Admin)
 exports.deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Admin delete failed" });
  }
};

 // Forgot Password
 exports.forgotPassword = async (req, res) => {
  try {
    const { gmail } = req.body;
    const user = await User.findOne({ gmail });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate secure reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and set to user
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Use environment variables
        pass: process.env.EMAIL_PASS, // Use environment variables
      },
    });

    const resetURL = `http://localhost:5173/reset-password/${resetToken}`;
    await transporter.sendMail({
      to: user.gmail,
      subject: "Password Reset",
      text: `Click here to reset your password: ${resetURL}`,
    });

    res.json({ message: "Password reset link sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Check fields
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password strength check
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Confirm match
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ message: "Password and confirm password do not match" });
    }

    // Hash the token from the URL to compare with the one in the DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
