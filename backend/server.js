// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config(); // Load environment variables

// -------------------------
// Import Routes
// -------------------------
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const artGalleryRoutes = require("./routes/artgalleryRoutes");
const exhibitionRoutes = require("./routes/exhibitionRoutes");
const biddingRoutes = require("./routes/biddingRoutes");
const orderRoutes = require("./routes/orderRoutes");

// -------------------------
// App & Config
// -------------------------
const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------
// Safe API_BASE
// -------------------------
// Must start with '/' and not contain 'http'
let API_BASE = process.env.API_BASE;
if (!API_BASE || !API_BASE.startsWith("/") || API_BASE.includes("http")) {
  API_BASE = "/api";
}
console.log(`Using API_BASE: ${API_BASE}`);

// -------------------------
// Middleware
// -------------------------
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
if (!MONGO_URI || MONGO_URI.includes("http") && MONGO_URI.startsWith("https://git.new")) {
  console.error("❌ Invalid MONGO_URI in .env! Please fix it.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    // -------------------------
    // HTTP server + Socket.IO
    // -------------------------
    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin:
          process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN.startsWith("http")
            ? process.env.CLIENT_ORIGIN
            : "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    server.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT} with API base ${API_BASE}`)
    );
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  });

// -------------------------
// Serve React build in production
// -------------------------
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "client/build");
  app.use(express.static(clientBuildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}
