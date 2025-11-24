// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config(); // Load environment variables

// Import Routes
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const artGalleryRoutes = require("./routes/artgalleryRoutes");
const exhibitionRoutes = require("./routes/exhibitionRoutes");
const biddingRoutes = require("./routes/biddingRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Use PORT from .env or fallback
const PORT = process.env.PORT || 5000;

// Optional API base prefix
const API_BASE = process.env.API_BASE || "/api";

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// -------------------------
// Safe Route Mounting
// -------------------------
app.use(`${API_BASE}/users`, userRoutes);
app.use(`${API_BASE}/admin`, adminRoutes);
app.use(`${API_BASE}/arts`, artGalleryRoutes);
app.use(`${API_BASE}/exhibitions`, exhibitionRoutes);
app.use(`${API_BASE}/bidding`, biddingRoutes);
app.use(`${API_BASE}/orders`, orderRoutes);

// -------------------------
// MongoDB Connection
// -------------------------
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI is not defined in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    // Start the server after DB connection
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });

// -------------------------
// Serve static files for production
// -------------------------
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "client/build");
  app.use(express.static(clientBuildPath));

  // Send React index.html for any unmatched route
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}
