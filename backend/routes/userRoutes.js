const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.get("/profile/:id", userController.getProfile);
router.put("/profile/:id", userController.updateProfile);
router.delete("/profile/:id", userController.deleteProfile);
router.get("/all", userController.getAllUsers);

router.put("/admin/:id", userController.updateUserByAdmin);
router.delete("/admin/:id", userController.deleteUserByAdmin);

// userRoutes.js
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password/:token", userController.resetPassword);

 

module.exports = router;
