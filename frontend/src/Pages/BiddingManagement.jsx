import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSlidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  deleteSession: async (id) => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete session");
    return await res.json();
  },
  cancelSession: async (id) => {
    const res = await fetch(`${API_BASE}/${id}/cancel`, {
      method: "PUT",
    });
    if (!res.ok) throw new Error("Failed to cancel session");
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
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadSessions();
    checkForPendingArts();
    const intervalId = setInterval(checkForPendingArts, 15000); // Check every 15 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Set document title on mount
  useEffect(() => {
    document.title = "Admin | Bidding Management";
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await biddingAPI.fetchBiddingSessions();

      const mappedSessions = data.map((s) => ({
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
      }));

      const sortedSessions = mappedSessions.sort((a, b) => {
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
      if (responseData.length > 0) {
        setPendingArts(responseData);
        setShowPendingArtsModal(true);
      } else {
        setPendingArts([]);
        setShowPendingArtsModal(false);
      }
    } catch (error) {
      console.error("Error checking for pending arts:", error);
    }
  };

  const createBiddingSessionsForPendingArts = async () => {
    if (loading || pendingArts.length === 0) return;

    setLoading(true);
    try {
      const artIds = pendingArts.map(art => art._id);
      const result = await biddingAPI.createBatchBiddingSessions(artIds);

      let alertMessage = ` Created ${result.sessions?.length || 0} sessions successfully.`;
      if (result.errors && result.errors.length > 0) {
        alertMessage += `\n\n❌ Errors:\n${result.errors.join('\n')}`;
      }
      alert(alertMessage);

      setPendingArts([]);
      setShowPendingArtsModal(false);

      // Refresh the sessions list
      await loadSessions();

    } catch (error) {
      alert("Failed to create bidding sessions: " + error.message);
    } finally {
      setLoading(false);
    }
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
    setLoading(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let currentY = 0;

    const addHeader = () => {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text("CEYLON GALLERIA", margin, 20);
      doc.setFontSize(12);
      doc.text("Bidding Sessions Report", margin, 28);
      doc.setFontSize(10);
      doc.text(`Report Generated On: ${new Date().toLocaleString()}`, margin, 34);
      currentY = 45;
    };

    const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    };

    addHeader();

    // Fetch all bid data first
    const sessionsWithBids = await Promise.all(
      filteredSessions.map(async (session) => {
        try {
          const bids = await biddingAPI.fetchBidsForSession(session.id);
          return { ...session, allBids: bids.sort((a, b) => b.offerPrice - a.offerPrice) };
        } catch (error) {
          console.error(`Failed to fetch bids for session ${session.id}`, error);
          return { ...session, allBids: [] };
        }
      })
    );

    sessionsWithBids.forEach((session, index) => {
      const sessionDetailContent = [
        { title: "Art Code:", value: session.artCode },
        { title: "Status:", value: session.status },
        { title: "Starting Price:", value: `LKR ${session.startingPrice.toLocaleString()}` },
        { title: "Bid End:", value: `${session.bidEndDate} ${session.bidEndTime}` },
        { title: "Total Bids:", value: String(session.allBids.length) },
        { title: "Highest Bid:", value: session.highestBid > 0 ? `LKR ${session.highestBid.toLocaleString()}` : "No bids" },
      ];

      const bidsTableBody = session.allBids.map((b, idx) => ([
        `#${idx + 1}`,
        b.name || "Anonymous",
        `LKR ${(b.offerPrice || 0).toLocaleString()}`,
        b.contact || "-",
        b.note || "-",
        b.bidTime ? new Date(b.bidTime).toLocaleString() : "-",
      ]));

      // Estimate height to check for page break
      const estimatedHeight = 25 + (session.allBids.length * 8) + 20;
      if (currentY + estimatedHeight > pageHeight - margin) {
        doc.addPage();
        addHeader();
      }

      // Separator line for all but the first entry on a page
      if (currentY > 50) {
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5);
      }

      // Session Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(session.artTitle, margin, currentY);
      currentY += 8;

      // Session Details Table
      doc.autoTable({
        body: sessionDetailContent,
        startY: currentY,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 1: { cellWidth: 'auto' } },
      });
      currentY = doc.autoTable.previous.finalY + 8;

      // Bids Table
      if (bidsTableBody.length > 0) {
        doc.autoTable({
          head: [['#', 'Bidder', 'Offer Price', 'Contact', 'Note', 'Bid Time']],
          body: bidsTableBody,
          startY: currentY,
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 30 },
            2: { cellWidth: 25 },
            3: { cellWidth: 25 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 30 },
          },
        });
        currentY = doc.autoTable.previous.finalY + 15;
      } else {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text("No bids have been placed for this item yet.", margin, currentY);
        currentY += 15;
      }
    });

    addFooter();
    setLoading(false);
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
              Current User's Login: Admin
            </p>
          </div>
          <div className="flex gap-2">
            {pendingArts.length > 0 && (
              <button
                onClick={() => setShowPendingArtsModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200 transform hover:scale-105 active:scale-95 animate-pulse"
              >
                New Arts for Bidding ({pendingArts.length})
              </button>
            )}
            <button
              onClick={loadSessions}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 active:scale-95"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

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
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {loading && <div className="text-center py-4">Loading...</div>}

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
                    s.isEndingSoon ? "bg-red-50 border-l-4 border-red-400" :
                    ""
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
                      {s.isEndingSoon && (
                        <span className="text-xs text-red-600 font-bold mt-1">⚠ Ending Soon</span>
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
                {pendingArts.length} new art {pendingArts.length === 1 ? 'piece has' : 'pieces have'} been marked for bidding.
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
      </main>
    </div>
  );
}

export default BiddingManagement;