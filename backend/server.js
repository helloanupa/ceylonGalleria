const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

// Import Routes
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const artGalleryRoutes = require("./routes/artgalleryRoutes");
const exhibitionRoutes = require("./routes/exhibitionRoutes");
const biddingRoutes = require("./routes/biddingRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/arts", artGalleryRoutes);
app.use("/api/exhibitions", exhibitionRoutes);
app.use("/api/bidding", biddingRoutes);
app.use("/api/orders", orderRoutes);

// MongoDB Connection
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://visurawathsala1_db_user:sjRvVFHuhvbKPyrD@ceylongalleria.bp7t3qj.mongodb.net/?retryWrites=true&w=majority&appName=CeylonGalleria";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error(" DB Connection Error:", err.message);
    process.exit(1);
  });

// Serve static files for production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "client/build")));

  // 🔥 FIXED WILDCARD ROUTE
  app.get("(.*)", (req, res) => {
    res.sendFile(path.join(__dirname, "client/build", "index.html"));
  });
}
