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
          status: "Open",
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newSession.save();
        await newSession.populate('art');
        
        createdSessions.push(newSession);
        
      } catch (artError) {
        errors.push(`Error processing art ${artId}: ${artError.message}`);
      }
    }
    
    res.json({
      message: `Created ${createdSessions.length} bidding sessions${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      sessions: createdSessions,
      errors: errors
    });
    
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

router.get("/check-status-changes", async (req, res) => {
  try {
    const sessions = await BiddingSession.find({ 
      status: { $in: ["Open", "Closed", "Completed"] }
    }).populate("art");
    
    const changedStatusSessions = sessions.filter(
      (session) => session.art && session.art.status !== "Bid"
    );
    
    const changedArts = changedStatusSessions.map((session) => ({
      sessionId: session._id,
      artId: session.art._id,
      artCode: session.art.artCode || "Unknown",
      title: session.art.title || "Untitled",
      currentStatus: session.art.status,
      bidCount: session.bids?.length || 0,
      sessionStatus: session.status
    }));
    
    res.json(changedArts);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

router.get('/check-bid-date-changes', async (req, res) => {
  try {
    const sessions = await BiddingSession.find({ 
      status: { $ne: 'Cancelled' } 
    }).populate('art');
    
    const dateChanges = [];
    
    for (const session of sessions) {
      if (session.art) {
        const sessionEndDate = session.bidEndDate ? new Date(session.bidEndDate).toISOString().split('T')[0] : '';
        const artEndDate = session.art.bidEndDate ? new Date(session.art.bidEndDate).toISOString().split('T')[0] : '';
        
        const sessionEndTime = session.bidEndTime || '';
        const artEndTime = session.art.bidEndTime || '';
        
        if (sessionEndDate !== artEndDate || sessionEndTime !== artEndTime) {
          dateChanges.push({
            sessionId: session._id,
            artId: session.art._id,
            artCode: session.art.artCode,
            title: session.art.title,
            oldBidEndDate: sessionEndDate,
            oldBidEndTime: sessionEndTime,
            newBidEndDate: artEndDate,
            newBidEndTime: artEndTime
          });
        }
      }
    }
    
    res.json(dateChanges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/sync-dates', async (req, res) => {
  try {
    const { sessionIds } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds)) {
      return res.status(400).json({ error: 'sessionIds array is required' });
    }
    
    const updatedSessions = [];
    const errors = [];
    
    for (const sessionId of sessionIds) {
      try {
        const session = await BiddingSession.findById(sessionId).populate('art');
        
        if (!session) {
          errors.push(`Session ${sessionId} not found`);
          continue;
        }
        
        if (!session.art) {
          errors.push(`Art data not found for session ${sessionId}`);
          continue;
        }
        
        session.bidEndDate = session.art.bidEndDate;
        session.bidEndTime = session.art.bidEndTime;
        session.updatedAt = new Date();
        await session.save();
        
        updatedSessions.push({
          sessionId: session._id,
          artCode: session.art.artCode,
          newBidEndDate: session.bidEndDate,
          newBidEndTime: session.bidEndTime
        });
        
      } catch (error) {
        errors.push(`Error updating session ${sessionId}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Synchronized ${updatedSessions.length} sessions`,
      updatedSessions,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:sessionId/sync-dates', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { bidEndDate, bidEndTime } = req.body;
    
    const session = await BiddingSession.findById(sessionId).populate('art');
    if (!session) {
      return res.status(404).json({ error: 'Bidding session not found' });
    }
    
    session.bidEndDate = bidEndDate;
    session.bidEndTime = bidEndTime;
    session.updatedAt = new Date();
    await session.save();
    
    res.json({ 
      success: true, 
      message: 'Session dates synchronized successfully',
      session: {
        id: session._id,
        artCode: session.art?.artCode,
        bidEndDate: session.bidEndDate,
        bidEndTime: session.bidEndTime
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;