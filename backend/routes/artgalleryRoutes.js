const express = require("express");
const router = express.Router();
const Art = require("../models/Art");
const BiddingSession = require("../models/BiddingSession");

// Test route
router.get("/test", (req, res) => res.send("Art routes working"));

// POST: Add new artwork
router.post("/", (req, res) => {
  Art.create(req.body)
    .then(() => res.json({ msg: "Art added successfully" }))
    .catch(() => res.status(400).json({ msg: "Failed to add art" }));
});

// GET: All artworks
router.get("/", (req, res) => {
  Art.find()
    .then((arts) => res.json(arts))
    .catch(() => res.status(400).json({ msg: "No art found" }));
});

// GET: Single artwork by ID
router.get("/:id", (req, res) => {
  Art.findById(req.params.id)
    .then((art) => res.json(art))
    .catch(() => res.status(400).json({ msg: "Cannot find this art" }));
});

// PUT: Update artwork (with proper bidding session handling)
router.put("/:id", async (req, res) => {
  try {
    // Get current art status before update
    const currentArt = await Art.findById(req.params.id);
    const oldStatus = currentArt ? currentArt.status : null;
    const newStatus = req.body.status;

    console.log(`Art ${req.params.id} status change: ${oldStatus} -> ${newStatus}`);

    // Update the art first
    const updatedArt = await Art.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Only handle bidding session changes if status is changing
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      
      // If changing away from "Bid", cancel any open sessions
      if (oldStatus === "Bid" && newStatus !== "Bid") {
        const result = await BiddingSession.updateMany(
          { art: req.params.id, status: { $in: ["Open", "Closed"] } },
          { status: "Cancelled" }
        );
        console.log(`✅ Cancelled ${result.modifiedCount} sessions for art ${req.params.id} (${oldStatus} -> ${newStatus})`);
      }

      // If changing TO "Bid" status, make the art available for new session creation
      // but DON'T automatically create a session here - let the bidding management handle it
      if (newStatus === "Bid" && oldStatus !== "Bid") {
        console.log(`✅ Art ${req.params.id} is now available for new bidding session creation (${oldStatus} -> ${newStatus})`);
        // The art will appear in pending arts in bidding management
      }
    }

    res.json({ msg: "Update successful", art: updatedArt });
  } catch (error) {
    console.error("Error updating art:", error);
    res.status(400).json({ msg: "Update failed" });
  }
});

// DELETE: Remove artwork
router.delete("/:id", async (req, res) => {
  try {
    // Cancel any active bidding sessions for this art before deletion
    await BiddingSession.updateMany(
      { art: req.params.id, status: { $in: ["Open", "Closed"] } },
      { status: "Cancelled" }
    );

    // Then delete the art
    await Art.findByIdAndDelete(req.params.id);
    
    res.json({ msg: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting art:", error);
    res.status(400).json({ msg: "Delete failed" });
  }
});

module.exports = router;