import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSlidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_OPTIONS = ["Open", "Closed", "Completed", "Cancelled"];

// API configuration
const API_BASE = "http://localhost:5000/api/bidding";

const biddingAPI = {
  fetchBiddingSessions: async () => {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch sessions");
    return await res.json();
  },
  fetchBidsForSession: async (sessionId) => {
    const res = await fetch(`${API_BASE}/${sessionId}/bids`);
    if (!res.ok) throw new Error("Failed to fetch bids");
    return await res.json();
  },
  cancelSession: async (id) => {
    const res = await fetch(`${API_BASE}/${id}/cancel`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to cancel session");
    return await res.json();
  },
  deleteSession: async (id) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete session");
    return await res.json();
  },
  fetchPendingArtsForBidding: async () => {
    const res = await fetch(`${API_BASE}/pending-arts`);
    if (!res.ok) throw new Error("Failed to fetch pending arts");
    return await res.json();
  },
  createBatchBiddingSessions: async (artIds) => {
    const res = await fetch(`${API_BASE}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artIds }),
    });
    if (!res.ok) throw new Error("Failed to create bidding sessions");
    return await res.json();
  },
  checkChangedArtsStatus: async () => {
    const res = await fetch(`${API_BASE}/check-status-changes`);
    if (!res.ok) throw new Error("Failed to check art status changes");
    return await res.json();
  },
  syncBidDates: async (sessionIds) => {
    const res = await fetch(`${API_BASE}/sync-dates`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionIds }),
    });
    if (!res.ok) throw new Error("Failed to sync bid dates");
    return await res.json();
  }
};

function BiddingManagement() {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [bids, setBids] = useState([]);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingArts, setPendingArts] = useState([]);
  const [showPendingArtsModal, setShowPendingArtsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [statusChangedArts, setStatusChangedArts] = useState([]);
  const [showStatusChangedModal, setShowStatusChangedModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showDateSyncModal, setShowDateSyncModal] = useState(false);

  const formatUTCDateTime = () => {
    const rightNow = new Date();
    const year = rightNow.getUTCFullYear();
    const month = String(rightNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(rightNow.getUTCDate()).padStart(2, '0');
    const hours = String(rightNow.getUTCHours()).padStart(2, '0');
    const minutes = String(rightNow.getUTCMinutes()).padStart(2, '0');
    const seconds = String(rightNow.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const isEndingSoon = (endDate, endTime) => {
    if (!endDate || !endTime) return false;
    
    try {
      const now = new Date();
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      if (isNaN(endDateTime.getTime())) return false;
      
      const timeDiff = endDateTime.getTime() - now.getTime();
      const hoursRemaining = timeDiff / (1000 * 60 * 60);
      
      return hoursRemaining > 0 && hoursRemaining <= 48;
    } catch (error) {
      return false;
    }
  };

  const getTimeRemaining = (endDate, endTime) => {
    if (!endDate || !endTime) return null;
    
    try {
      const now = new Date();
      const endDateTime = new Date(`${endDate}T${endTime}`);
      
      if (isNaN(endDateTime.getTime())) return null;
      
      const timeDiff = endDateTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) return "Ended";
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours < 24) {
        return `${hours}h ${minutes}m left`;
      } else {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h left`;
      }
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    loadSessions();
    checkForPendingArts();
    checkForStatusChanges();
    
    const intervalId = setInterval(() => {
      loadSessions();
      checkForPendingArts();
      checkForStatusChanges();
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger]);

  // Set document title on mount
  useEffect(() => {
    document.title = "Admin | Bidding Management";
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await biddingAPI.fetchBiddingSessions();
      
      const mapped = data.map((s) => ({
        id: s._id,
        artId: s.art?._id || "N/A",
        artCode: s.art?.artCode || "Unknown",
        artTitle: s.art?.title || "Untitled",
        artStatus: s.art?.status || "Unknown",
        startingPrice: s.startingPrice || 0,
        totalBids: s.bids?.length || 0,
        bidEndDate: s.bidEndDate ? new Date(s.bidEndDate).toISOString().split("T")[0] : "",
        bidEndTime: s.bidEndTime || "",
        status: s.status || "Open",
        highestBid:
          s.bids?.length > 0 
            ? Math.max(...s.bids.map((b) => b.offerPrice || 0)) 
            : 0,
        createdAt: s.createdAt || s.updatedAt || new Date(),
        isEndingSoon: s.bidEndDate && s.bidEndTime ? isEndingSoon(s.bidEndDate, s.bidEndTime) : false,
        timeRemaining: s.bidEndDate && s.bidEndTime ? getTimeRemaining(s.bidEndDate, s.bidEndTime) : null,
        artBidEndDate: s.art?.bidEndDate ? new Date(s.art.bidEndDate).toISOString().split("T")[0] : "",
        artBidEndTime: s.art?.bidEndTime || "",
        hasDateMismatch: false,
      }));

      const mappedWithMismatch = mapped.map(s => ({
        ...s,
        hasDateMismatch: s.status !== "Cancelled" && 
                          ((s.bidEndDate !== s.artBidEndDate) || (s.bidEndTime !== s.artBidEndTime))
      }));

      const sortedSessions = mappedWithMismatch.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      });

      setSessions(sortedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkForPendingArts = async () => {
    try {
      const responseData = await biddingAPI.fetchPendingArtsForBidding();
      
      if (responseData.length > 0 && 
          (pendingArts.length === 0 || 
           JSON.stringify(responseData) !== JSON.stringify(pendingArts))) {
        setPendingArts(responseData);
        setShowPendingArtsModal(true);
      } else if (responseData.length === 0) {
        setPendingArts([]);
        setShowPendingArtsModal(false);
      }
    } catch (error) {
      console.error("Error checking for pending arts:", error);
    }
  };

  const checkForStatusChanges = async () => {
    try {
      const changedArts = await biddingAPI.checkChangedArtsStatus();
      
      if (changedArts && changedArts.length > 0) {
        if (statusChangedArts.length === 0 || 
            JSON.stringify(changedArts) !== JSON.stringify(statusChangedArts)) {
          setStatusChangedArts(changedArts);
          setShowStatusChangedModal(true);
        }
      } else {
        setStatusChangedArts([]);
        setShowStatusChangedModal(false);
      }
    } catch (error) {
      console.error("Error checking for art status changes:", error);
    }
  };

  const handleSyncDates = async () => {
    const sessionsToSync = sessions.filter(s => s.hasDateMismatch && s.status !== "Cancelled");
    
    if (sessionsToSync.length === 0) {
      alert("No sessions need date synchronization.");
      return;
    }

    setLoading(true);
    try {
      const sessionIds = sessionsToSync.map(s => s.id);
      const result = await biddingAPI.syncBidDates(sessionIds);
      
      if (result.errors && result.errors.length > 0) {
        alert(`✅ Synced ${result.updatedSessions?.length || 0} sessions successfully!\n\n❌ Errors:\n${result.errors.join('\n')}`);
      } else {
        alert(`✅ Successfully synchronized ${result.updatedSessions?.length || sessionIds.length} session dates!`);
      }
      
      setShowDateSyncModal(false);
      await loadSessions();
      
    } catch (error) {
      alert("❌ Failed to sync dates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChangedArts = async (action) => {
    setLoading(true);
    try {
      if (action === 'delete') {
        for (const art of statusChangedArts) {
          try {
            await biddingAPI.deleteSession(art.sessionId);
          } catch (err) {
            console.error(`Error deleting session for ${art.artCode}:`, err);
          }
        }
        alert("Bidding sessions for status-changed arts have been removed.");
      } else if (action === 'cancel') {
        for (const art of statusChangedArts) {
          try {
            await biddingAPI.cancelSession(art.sessionId);
          } catch (err) {
            console.error(`Error cancelling session for ${art.artCode}:`, err);
          }
        }
        alert("Bidding sessions for status-changed arts have been cancelled.");
      }
      
      setStatusChangedArts([]);
      setShowStatusChangedModal(false);
      await loadSessions();
    } catch (error) {
      console.error("Error handling status changed arts:", error);
      alert("An error occurred while processing status changed arts.");
    } finally {
      setLoading(false);
    }
  };

  const createBiddingSessionsForPendingArts = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const artIds = pendingArts.map(art => art._id);
      const result = await biddingAPI.createBatchBiddingSessions(artIds);
      
      if (result.errors && result.errors.length > 0) {
        alert(`Created ${result.sessions?.length || 0} sessions successfully.\n\nErrors:\n${result.errors.join('\n')}`);
      } else {
        alert(`Successfully created ${result.sessions?.length || artIds.length} bidding sessions!`);
      }
      
      setPendingArts([]);
      setShowPendingArtsModal(false);
      setSessions([]);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadSessions();
      await loadSessions();
      
    } catch (error) {
      console.error("Error creating bidding sessions:", error);
      alert("Failed to create bidding sessions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshTrigger(prev => prev + 1);
    await loadSessions();
    await checkForPendingArts();
    await checkForStatusChanges();
  };

  const filteredSessions = sessions.filter((s) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = s.artTitle.toLowerCase().startsWith(query);
    const codeMatch = s.artCode.toLowerCase().includes(query);
    const matchesSearch = titleMatch || codeMatch;

    if (activeTab === 'active') {
      return matchesSearch && s.status !== "Cancelled";
    } else {
      return matchesSearch && s.status === "Cancelled";
    }
  });

  const activeSessions = sessions.filter(s => s.status !== "Cancelled");
  const cancelledSessions = sessions.filter(s => s.status === "Cancelled");
  const endingSoonSessions = activeSessions.filter(s => s.isEndingSoon);
  const dateMismatchSessions = activeSessions.filter(s => s.hasDateMismatch);
  
  const handleViewBids = async (session) => {
    setSelectedSession(session);
    try {
      const bidsData = await biddingAPI.fetchBidsForSession(session.id);
      
      const mappedBids = bidsData.map((b) => ({
        id: b._id,
        name: b.name || "Anonymous",
        offerPrice: b.offerPrice || 0,
        contact: b.contact || "-",
        note: b.note || "",
        bidTime: b.bidTime ? new Date(b.bidTime).toLocaleString() : new Date().toLocaleString(),
      }));
      setBids(mappedBids.sort((a, b) => b.offerPrice - a.offerPrice));
    } catch (error) {
      console.error("Error fetching bids:", error);
    }
  };

  const handleCancelClick = (session) => setCancelTarget(session);
  const cancelCancel = () => setCancelTarget(null);

  const generateReport = async () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Bidding Report", 14, 15);
    
    const dateTimeStr = formatUTCDateTime();
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on (UTC - YYYY-MM-DD HH:MM:SS formatted): ${dateTimeStr}`, 14, 22);
    doc.text(`Generated by: pasindu8`, 14, 26);
    doc.setTextColor(0, 0, 0);
    
    let currentY = 35;

    for (const session of filteredSessions) {
      try {
        const sessionBids = await biddingAPI.fetchBidsForSession(session.id);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${session.artTitle} (Art Code: ${session.artCode})`, 14, currentY);
        doc.setFont(undefined, 'normal');
        currentY += 5;
        
        doc.setFontSize(9);
        doc.text(`Status: ${session.status} | Starting Price: LKR ${session.startingPrice.toLocaleString()} | End Date: ${session.bidEndDate} ${session.bidEndTime}`, 14, currentY);
        currentY += 8;

        if (sessionBids.length === 0) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text("No bids for this artwork", 14, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 10;
        } else {
          autoTable(doc, {
            startY: currentY,
            margin: { left: 14 },
            head: [["Bidder", "Offer Price", "Contact", "Note", "Bid Time"]],
            body: sessionBids.map((b) => [
              b.name || "Anonymous",
              `LKR ${(b.offerPrice || 0).toLocaleString()}`,
              b.contact || "-",
              b.note || "-",
              b.bidTime ? new Date(b.bidTime).toLocaleString() : "-",
            ]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [50, 50, 50] },
          });
          
          currentY = doc.lastAutoTable.finalY + 10;
        }
        
        if (sessionBids.length > 0) {
          const highestBid = Math.max(...sessionBids.map(b => b.offerPrice || 0));
          doc.setFontSize(9);
          doc.setTextColor(0, 100, 0);
          doc.text(`Highest Bid: LKR ${highestBid.toLocaleString()}`, 14, currentY);
          doc.setTextColor(0, 0, 0);
          currentY += 10;
        }
        
        if (currentY > doc.internal.pageSize.height - 20) {
          doc.addPage();
          currentY = 20;
        }
      } catch (error) {
        console.error(`Error fetching bids for session ${session.id}:`, error);
      }
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text(`Art Gallery Bidding Report`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save("Bidding_Report.pdf");
  };

  const handleDeleteClick = (session) => setDeleteTarget(session);
  const cancelDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    try {
      setLoading(true);
      await biddingAPI.deleteSession(deleteTarget.id);
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      alert("Bidding session deleted successfully!");
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session.");
    } finally {
      setLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;

    try {
      setLoading(true);
      await biddingAPI.cancelSession(cancelTarget.id);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === cancelTarget.id ? { ...s, status: "Cancelled" } : s
        )
      );

      alert("Bidding session cancelled successfully!");
      setCancelTarget(null);
    } catch (error) {
      console.error("Error cancelling session:", error);
      alert("Failed to cancel session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="Bidding Management" />
      <main className="flex-grow p-6 bg-gray-50 transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bidding Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Current User's Login: visura
            </p>
          </div>
          <div className="flex gap-2">
            {pendingArts.length > 0 && (
              <button 
                onClick={() => setShowPendingArtsModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200 transform hover:scale-105 active:scale-95 animate-pulse"
              >
                New Arts Available ({pendingArts.length})
              </button>
            )}
            {statusChangedArts.length > 0 && (
              <button 
                onClick={() => setShowStatusChangedModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-all duration-200 transform hover:scale-105 active:scale-95 animate-pulse"
              >
                Status Changed ({statusChangedArts.length})
              </button>
            )}
            {dateMismatchSessions.length > 0 && (
              <button 
                onClick={() => setShowDateSyncModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-all duration-200 transform hover:scale-105 active:scale-95 animate-pulse"
                title="Click to sync outdated dates"
              >
                Sync Dates ({dateMismatchSessions.length})
              </button>
            )}
            {endingSoonSessions.length > 0 && (
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded animate-pulse cursor-help"
                title={`${endingSoonSessions.length} bidding session(s) ending within 2 days`}
              >
                Ending Soon ({endingSoonSessions.length})
              </button>
            )}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {dateMismatchSessions.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Notice:</strong> {dateMismatchSessions.length} active bidding session(s) have outdated bid end dates. 
                  The dates were changed in Art Management but not synced here. Check the highlighted rows.
                </p>
              </div>
            </div>
          </div>
        )}

        {endingSoonSessions.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Urgent:</strong> {endingSoonSessions.length} bidding session(s) are ending within 2 days. 
                  Check the highlighted rows for details.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'active'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Active Sessions ({activeSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'cancelled'
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Cancelled Sessions ({cancelledSessions.length})
          </button>
        </div>

        <div className="mb-4 flex gap-2 md:flex-row flex-col">
          <input
            type="text"
            placeholder={`Search ${activeTab} bidding sessions...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-4/5 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={generateReport}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Generate Report
          </button>
        </div>

        {loading && <div className="text-center py-4">Loading...</div>}

        {activeTab === 'active' && sessions.some(s => s.artStatus !== 'Bid' && s.status !== 'Cancelled') && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Some artworks have had their status changed in the Art Management system. 
                  These items are marked in yellow and may need attention.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-300 border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Art Code</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Art Title</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Art Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Starting Price</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Bids</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Bid End</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium border-r">Highest Bid</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSessions.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-50 transition ${
                    s.status === "Cancelled" ? "bg-gray-100 text-gray-500" : 
                    s.artStatus !== "Bid" ? "bg-yellow-50" : 
                    s.hasDateMismatch ? "bg-orange-50 border-l-4 border-orange-400" :
                    s.isEndingSoon ? "bg-red-50 border-l-4 border-red-400" : ""
                  }`}
                >
                  <td className="px-4 py-2 border-r">{s.artCode}</td>
                  <td className="px-4 py-2 border-r">{s.artTitle}</td>
                  <td className="px-4 py-2 border-r">
                    <span className={`px-2 py-1 rounded text-xs ${
                      s.artStatus === "Bid" ? "bg-green-100 text-green-800" : 
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {s.artStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r">LKR {s.startingPrice.toLocaleString()}</td>
                  <td className="px-4 py-2 border-r text-center">{s.totalBids}</td>
                  <td className="px-4 py-2 border-r">
                    <div className="flex flex-col">
                      <span>{s.bidEndDate} {s.bidEndTime}</span>
                      {s.isEndingSoon && s.timeRemaining && (
                        <span className="text-xs text-red-600 font-bold mt-1">
                          ⚠ {s.timeRemaining}
                        </span>
                      )}
                      {s.hasDateMismatch && s.status !== "Cancelled" && (
                        <span className="text-xs text-orange-600 font-bold mt-1">
                          📅 Date outdated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-r">
                    <span className={`px-2 py-1 rounded text-white text-xs ${
                      s.status === "Open" ? "bg-green-500" :
                      s.status === "Closed" ? "bg-blue-500" :
                      s.status === "Completed" ? "bg-purple-500" :
                      "bg-gray-500"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r">
                    {s.highestBid > 0 ? `LKR ${s.highestBid.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-2 flex justify-center gap-2">
                    <button
                      onClick={() => handleViewBids(s)}
                      className={`px-3 py-1 rounded transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                        s.status === "Cancelled"
                          ? "bg-gray-400 text-white cursor-not-allowed"
                          : "bg-black text-white hover:bg-gray-800"
                      }`}
                    >
                      View Bids
                    </button>

                    {activeTab === 'active' && (
                      <button
                        onClick={() => handleCancelClick(s)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteClick(s)}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500">
                    {searchQuery
                      ? `No search result found. Try searching by ART code.`
                      : `No ${activeTab} bidding sessions found.`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {showDateSyncModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-11/12 max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in">
              <style>{`
                @keyframes fade-scale-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-scale-in { animation: fade-scale-in 0.3s forwards; }
              `}</style>
              <h2 className="text-lg font-bold mb-4">Sync Bid End Dates</h2>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  <strong>Ready to sync!</strong> This will update the bidding session dates to match the current dates from Art Management.
                </p>
              </div>
              
              <p className="mb-4">
                The following active bidding sessions have outdated bid end dates:
              </p>
              
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Art Code</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Title</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Current (Outdated)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Will Update To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dateMismatchSessions.map(session => (
                      <tr key={session.id}>
                        <td className="px-4 py-2">{session.artCode}</td>
                        <td className="px-4 py-2">{session.artTitle}</td>
                        <td className="px-4 py-2 text-red-600 font-mono">
                          {session.bidEndDate} {session.bidEndTime}
                        </td>
                        <td className="px-4 py-2 text-green-600 font-bold font-mono">
                          {session.artBidEndDate} {session.artBidEndTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => setShowDateSyncModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSyncDates}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  disabled={loading}
                >
                  {loading ? "Syncing..." : "Sync All Dates"}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-11/12 max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in">
              <style>{`
                @keyframes fade-scale-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-scale-in { animation: fade-scale-in 0.3s forwards; }
              `}</style>
              <h2 className="text-lg font-bold mb-4">
                Bids for {selectedSession.artTitle}
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Art Code: {selectedSession.artCode}
              </p>
              
              {selectedSession.artStatus !== "Bid" && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  <p className="font-semibold">Warning:</p>
                  <p>This artwork's status has been changed to "{selectedSession.artStatus}" in the Art Management system. 
                     It's recommended to cancel or delete this bidding session.</p>
                </div>
              )}

              {selectedSession.hasDateMismatch && selectedSession.status !== "Cancelled" && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-800 text-sm">
                  <p className="font-semibold">Date Mismatch:</p>
                  <p>This bidding session has outdated bid end date/time. The dates were changed in Art Management. 
                     Current session: {selectedSession.bidEndDate} {selectedSession.bidEndTime} | 
                     Art Management: {selectedSession.artBidEndDate} {selectedSession.artBidEndTime}</p>
                </div>
              )}
              
              {bids.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No bids yet</p>
              ) : (
                <div className="space-y-3">
                  {bids.map((b, idx) => (
                    <div key={b.id || idx} className="border p-3 rounded shadow-sm">
                      <p className="font-bold">
                        #{idx + 1} - LKR {b.offerPrice.toLocaleString()}
                      </p>
                      <p className="text-gray-900 font-medium">{b.name}</p>
                      <p className="text-gray-600 text-sm">
                        Contact: {b.contact}
                      </p>
                      {b.note && (
                        <p className="italic text-gray-700 bg-gray-100 p-2 rounded mt-1">
                          Note: {b.note}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Bid Time: {b.bidTime}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in">
              <style>{`
                @keyframes fade-scale-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-scale-in { animation: fade-scale-in 0.3s forwards; }
              `}</style>
              <h2 className="text-lg font-bold mb-4">Confirm Cancel</h2>
              <p className="mb-4">
                Cancelling this bidding session will remove it from Bidding
                Management and set the art status to <strong>Not Listed</strong>.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelCancel}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in">
              <style>{`
                @keyframes fade-scale-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-scale-in { animation: fade-scale-in 0.3s forwards; }
              `}</style>
              <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
              <p className="mb-4">
                Are you sure you want to delete the bidding session for{" "}
                <strong>{deleteTarget.artTitle}</strong>?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {showPendingArtsModal && pendingArts.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-11/12 max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in">
              <style>{`
                @keyframes fade-scale-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-scale-in { animation: fade-scale-in 0.3s forwards; }
              `}</style>
              <h2 className="text-lg font-bold mb-4">
                New Arts Available for Bidding
              </h2>
              <p className="mb-4">
                {pendingArts.length} new art {pendingArts.length === 1 ? 'piece has' : 'pieces have'} been added with bidding status. 
                Would you like to create bidding sessions for them?
              </p>
              
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Art Code</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Title</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingArts.map(art => (
                      <tr key={art._id}>
                        <td className="px-4 py-2">{art.artCode}</td>
                        <td className="px-4 py-2">{art.title}</td>
                        <td className="px-4 py-2">LKR {typeof art.price === 'number' ? art.price.toLocaleString() : '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => setShowPendingArtsModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={createBiddingSessionsForPendingArts}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Bidding Sessions"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showStatusChangedModal && statusChangedArts.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-11/12 max-h-[80vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-scale-in">
              <style>{`
                @keyframes fade-scale-in {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-scale-in { animation: fade-scale-in 0.3s forwards; }
              `}</style>
              <h2 className="text-lg font-bold mb-4">
                Artworks with Changed Status
              </h2>
              <p className="mb-4">
                The following artworks have had their status changed from "Bid" to another status in the Art Management system.
                What would you like to do with their bidding sessions?
              </p>
              
              <div className="mt-4 border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">Art Code</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Title</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Current Status</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Bids</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statusChangedArts.map(art => (
                      <tr key={art.artId}>
                        <td className="px-4 py-2">{art.artCode}</td>
                        <td className="px-4 py-2">{art.title}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                            {art.currentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2">{art.bidCount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => setShowStatusChangedModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={loading}
                >
                  Ignore
                </button>
                <button
                  onClick={() => handleStatusChangedArts('cancel')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  disabled={loading}
                >
                  {loading ? "Cancelling..." : "Cancel Sessions"}
                </button>
                <button
                  onClick={() => handleStatusChangedArts('delete')}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? "Removing..." : "Remove Sessions"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default BiddingManagement;