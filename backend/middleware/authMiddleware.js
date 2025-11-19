const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * @desc Middleware to check if a user is logged in via a valid JWT.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (e.g., "Bearer eyJhbGci...")
      token = req.headers.authorization.split(" ")[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Your JWT payload is { user: { id: '...' } }, so we use decoded.user.id
      // Fetch the user and attach it to the request object, but exclude the password
      req.user = await User.findById(decoded.user.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // Proceed to the next middleware or the route handler
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

/**
 * @desc Middleware to check if the logged-in user has an 'admin' role.
 */
const admin = (req, res, next) => {
  // This middleware should run *after* the 'protect' middleware
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
};

module.exports = { protect, admin };
