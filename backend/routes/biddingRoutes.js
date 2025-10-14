const express = require("express");
const router = express.Router();
const biddingController = require("../controllers/biddingController");
const BiddingSession = require("../models/BiddingSession");
const Art = require("../models/Art");

router.get("/", async (req, res) => {
  try {
    const sessions = await BiddingSession.find()
      .populate("art")
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/pending-arts", biddingController.getPendingArtsForBidding);

router.post("/batch", async (req, res) => {
  try {
    const { artIds } = req.body;
    
    if (!artIds || !Array.isArray(artIds) || artIds.length === 0) {
      return res.status(400).json({ msg: "artIds array is required" });
    }

    const createdSessions = [];
    const errors = [];
    
    for (const artId of artIds) {
      try {
        const art = await Art.findById(artId);
        
        if (!art) {
          errors.push(`Art ${artId} not found`);
          continue;
        }

        if (art.status !== "Bid") {
          errors.push(`Art ${art.artCode} status is ${art.status}, not 'Bid'`);
          continue;
        }
        
        const existingActiveSession = await BiddingSession.findOne({ 
          art: artId,
          status: { $in: ["Open", "Closed", "Completed"] }
        });
        
        if (existingActiveSession) {
          errors.push(`Active session already exists for ${art.artCode}`);
          continue;
        }

        const newSession = new BiddingSession({
          art: artId,
          startingPrice: art.price || 0,
          bidEndDate: art.bidEndDate,
          bidEndTime: art.bidEndTime,
        });
        
        await newSession.save();
        await newSession.populate('art');
        
        createdSessions.push(newSession);
        
      } catch (artError) {
        errors.push(`Error processing art ${artId}: ${artError.message}`);
      }
    }
    
    res.json({ sessions: createdSessions, errors: errors });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get("/:sessionId/bids", async (req, res) => {
  try {
    const session = await BiddingSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }
    res.json(session.bids || []);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.post("/:sessionId/bids", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name, offerPrice, contact, note } = req.body;

    if (!name || !offerPrice || !contact) {
      return res.status(400).json({ 
        msg: "Name, offer price, and contact are required" 
      });
    }

    const session = await BiddingSession.findById(sessionId).populate("art");
    
    if (!session) {
      return res.status(404).json({ msg: "Bidding session not found" });
    }

    if (session.status !== "Open") {
      return res.status(400).json({ 
        msg: "This bidding session is no longer active" 
      });
    }

    if (offerPrice < session.startingPrice) {
      return res.status(400).json({ 
        msg: `Bid must be at least LKR ${session.startingPrice}` 
      });
    }

    const newBid = {
      name: name.trim(),
      offerPrice: Number(offerPrice),
      contact: contact.trim(),
      note: note ? note.trim() : "",
      bidTime: new Date()
    };

    if (!session.bids) {
      session.bids = [];
    }
    session.bids.push(newBid);
    
    await session.save();

    res.status(201).json({ 
      msg: "Bid submitted successfully", 
      bid: newBid,
      totalBids: session.bids.length
    });

  } catch (err) {
    res.status(500).json({ msg: err.message || "Server error" });
  }
});

router.put("/:id/cancel", async (req, res) => {
  try {
    const session = await BiddingSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }
    
    session.status = "Cancelled";
    session.updatedAt = new Date();
    await session.save();
    
    await Art.findByIdAndUpdate(session.art, { status: "Not Listed" });
    
    res.json(session);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const session = await BiddingSession.findByIdAndDelete(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: "Session not found" });
    }
    res.json({ msg: "Session deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;