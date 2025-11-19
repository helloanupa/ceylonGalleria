const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getCurrentUserProfile,
  getProfile,
  updateProfile,
  deleteProfile,
  getAllUsers,
  updateUserByAdmin,
  deleteUserByAdmin,
  forgotPassword,
  resetPassword,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// Auth routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

// Secure routes for the logged-in user to manage their OWN profile
router.get("/profile", protect, getCurrentUserProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteProfile);

// Admin-specific routes for managing all users
router.get("/admin/all", getAllUsers);
router.put("/admin/:id", updateUserByAdmin);
router.delete("/admin/:id", deleteUserByAdmin);

module.exports = router;