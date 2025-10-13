const Art = require("../models/Art");
const BiddingSession = require("../models/BiddingSession");

exports.getPendingArtsForBidding = async (req, res) => {
  try {
    // Find all arts with "Bid" status
    const bidArts = await Art.find({ status: "Bid" });

    // Find only ACTIVE bidding sessions (not cancelled)
    const activeBiddingSessions = await BiddingSession.find({ 
      status: { $in: ["Open", "Closed", "Completed"] }
    }, "art");

    // Get array of art IDs that already have ACTIVE sessions
    const artIdsWithActiveBidding = activeBiddingSessions.map(session => 
      session.art.toString()
    );

    // Filter to find arts that need NEW sessions (don't have an active one)
    const artsNeedingSessions = bidArts.filter(
      art => !artIdsWithActiveBidding.includes(art._id.toString())
    );

    // Optional: Log summary
    console.log(`Pending Arts Check: ${bidArts.length} with 'Bid' status, ${activeBiddingSessions.length} active sessions, ${artsNeedingSessions.length} pending`);

    res.json(artsNeedingSessions);
  } catch (err) {
    console.error("Error in getPendingArtsForBidding:", err);
    res.status(500).json({ msg: err.message });
  }
};