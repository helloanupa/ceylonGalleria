import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import jsPDF from "jspdf";

const bidRules = [
  {
    title: "Confidentiality",
    description:
      "Your bid is strictly confidential and only visible to the gallery team.",
  },
  {
    title: "Binding Agreement",
    description:
      "If your bid is selected, you are required to complete payment within 24 hours.",
  },
  {
    title: "Contact Procedure",
    description:
      "The gallery team will contact you via the provided contact details if your bid is successful.",
  },
  {
    title: "Fair Bidding",
    description:
      "Attempting to game the bidding system may result in disqualification and legal action.",
  },
  {
    title: "Finality",
    description:
      "All bids are final; there is no negotiation after submission.",
  },
];

function BidProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [art, setArt] = useState(null);
  const [sessionID, setSessionID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    offerPrice: "",
    name: "",
    note: "",
    contact: "",
  });
  const [checkedRules, setCheckedRules] = useState(
    new Array(bidRules.length).fill(false)
  );
  const [submitting, setSubmitting] = useState(false);
  const [bidError, setBidError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(false);
  const [showBidSummary, setShowBidSummary] = useState(false);
  const [submittedBid, setSubmittedBid] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const allChecked = checkedRules.every(Boolean);

  // Set document title
  useEffect(() => {
    document.title = "Ceylon Galleria";
  }, []);

  // Content Protection Effect
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };
    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && e.keyCode === 85) ||
        (e.ctrlKey && e.keyCode === 83) ||
        (e.ctrlKey && e.keyCode === 65) ||
        (e.ctrlKey && e.keyCode === 80) ||
        (e.ctrlKey && e.keyCode === 67) ||
        (e.ctrlKey && e.keyCode === 86) ||
        (e.ctrlKey && e.keyCode === 88) ||
        e.keyCode === 44
      ) {
        e.preventDefault();
        return false;
      }
    };
    const handleKeyUp = (e) => {
      if (e.keyCode === 44) {
        alert("Screenshots are not allowed for copyright protection.");
      }
    };
    let devtools = { open: false };
    const devToolsDetection = setInterval(() => {
      if (window.outerHeight - window.innerHeight > 160) {
        if (!devtools.open) {
          devtools.open = true;
          document.body.style.filter = "blur(5px)";
          document.body.style.pointerEvents = "none";
        }
      } else {
        if (devtools.open) {
          devtools.open = false;
          document.body.style.filter = "none";
          document.body.style.pointerEvents = "auto";
        }
      }
    }, 500);

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    const clearConsole = setInterval(() => {
      console.clear();
    }, 2000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      clearInterval(devToolsDetection);
      clearInterval(clearConsole);

      document.body.style.filter = "none";
      document.body.style.pointerEvents = "auto";
    };
  }, []);

  useEffect(() => {
    const fetchArtById = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/api/arts/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch artwork");
        }

        const data = await response.json();

        if (data.status === "Not Listed") {
          navigate("/artshow");
          return;
        }

        setArt(data);
        fetchSession(data._id);
      } catch (error) {
        navigate("/artshow");
      }
    };

    const fetchSession = async (artId) => {
      if (!artId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/bidding`);

        if (!response.ok) {
          throw new Error("Failed to fetch bidding sessions");
        }

        const sessions = await response.json();
        const session = sessions.find((s) => s.art?._id === artId);

        if (session) {
          setSessionID(session._id);
        }
      } catch (error) {
        console.error("Error fetching bidding sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArtById();
    }
  }, [id, navigate]);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (bidError) setBidError(null);
  };

  const toggleRule = (idx) => {
    const updated = [...checkedRules];
    updated[idx] = !updated[idx];
    setCheckedRules(updated);
  };

  // Parse formatted price strings into numbers
  function getNumericPrice(price) {
    if (price == null) return NaN;
    if (typeof price === "number") return price;
    if (typeof price === "string") {
      // remove currency, spaces, commas
      const cleaned = price.replace(/[^\d.]/g, "");
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  }

  const handleOpenBidModal = () => {
    const startingPrice = getNumericPrice(art?.price);
    // Pre-fill form with minimum bid
    setForm(prev => ({
      ...prev,
      offerPrice: Number.isFinite(startingPrice) ? startingPrice : ''
    }));
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!form.name || form.name.trim() === "") {
      return "Please enter your name";
    }
    if (!form.contact || form.contact.trim() === "") {
      return "Please enter your contact information";
    }
    if (!form.offerPrice || isNaN(Number(form.offerPrice))) {
      return "Please enter a valid price";
    }
    const startingPrice = getNumericPrice(art?.price);
    if (art && Number(form.offerPrice) < startingPrice) {
      return `Your bid must be at least LKR ${startingPrice.toLocaleString()}`;
    }
    if (!allChecked) {
      return "Please agree to all bidding rules";
    }
    if (!sessionID) {
      return "No bidding session is available for this artwork";
    }
    return null;
  };

  const generateBidConfirmationPDF = async () => {
    try {
      setPdfGenerating(true);
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let currentY = 30;

      const addText = (text, x, y, options = {}) => {
        const { fontSize = 10, fontStyle = "normal", align = "left" } = options;
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.text(text, x, y, { align });
      };

      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, 40, "F");
      addText("CEYLON GALLERIA", pageWidth / 2, 20, {
        fontSize: 24,
        fontStyle: "bold",
        align: "center",
      });
      addText("by Janith Weerasinghe", pageWidth / 2, 28, {
        fontSize: 10,
        align: "center",
      });

      currentY = 55;
      addText("BID CONFIRMATION", pageWidth / 2, currentY, {
        fontSize: 18,
        fontStyle: "bold",
        align: "center",
      });

      currentY += 10;
      const currentDate = new Date();
      const formatUTCDateTime = () => {
        const rightNow = new Date();
        const year = rightNow.getUTCFullYear();
        const month = String(rightNow.getUTCMonth() + 1).padStart(2, "0");
        const day = String(rightNow.getUTCDate()).padStart(2, "0");
        const hours = String(rightNow.getUTCHours()).padStart(2, "0");
        const minutes = String(rightNow.getUTCMinutes()).padStart(2, "0");
        const seconds = String(rightNow.getUTCSeconds()).padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      };

      addText(`Generated: ${formatUTCDateTime()} UTC`, pageWidth / 2, currentY, {
        fontSize: 8,
        align: "center",
      });
      currentY += 6;
      addText(`Bid Reference: ${submittedBid.bidId}`, pageWidth / 2, currentY, {
        fontSize: 8,
        align: "center",
      });

      currentY += 20;
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, currentY - 5, contentWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      addText("ARTWORK INFORMATION", margin + 5, currentY, {
        fontSize: 12,
        fontStyle: "bold",
      });

      doc.setTextColor(0, 0, 0);
      currentY += 15;

      addText(`Title: ${art.title || "Untitled"}`, margin, currentY, {
        fontSize: 12,
        fontStyle: "bold",
      });
      currentY += 8;
      addText(`Artist: ${art.artist || "Unknown Artist"}`, margin, currentY);
      if (art.artCode) {
        currentY += 6;
        addText(`Art Code: ${art.artCode}`, margin, currentY);
      }
      if (art.medium) {
        currentY += 6;
        addText(`Medium: ${art.medium}`, margin, currentY);
      }
      if (art.dimensions) {
        currentY += 6;
        addText(`Dimensions: ${art.dimensions}`, margin, currentY);
      }
      currentY += 6;
      addText(`Starting Price: LKR ${art.price?.toLocaleString() || "N/A"}`, margin, currentY);

      currentY += 20;
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, currentY - 5, contentWidth, 8, "F");
      doc.setTextColor(255, 255, 255);
      addText("YOUR BID DETAILS", margin + 5, currentY, {
        fontSize: 12,
        fontStyle: "bold",
      });

      doc.setTextColor(0, 0, 0);
      currentY += 15;
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, currentY - 5, contentWidth, 12, "F");
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, currentY - 5, contentWidth, 12);
      addText(`YOUR BID AMOUNT: LKR ${Number(submittedBid.offerPrice).toLocaleString()}`, pageWidth / 2, currentY + 2, {
        fontSize: 16,
        fontStyle: "bold",
        align: "center",
      });

      currentY += 20;

      const bidDetails = [
        ["Bidder Name:", submittedBid.name],
        ["Contact Information:", submittedBid.contact],
        ["Bid Reference Number:", submittedBid.bidId],
        ["Submission Date & Time:", submittedBid.submittedAt.toLocaleString()],
        ["Status:", "Successfully Submitted"],
      ];
      bidDetails.forEach(([label, value]) => {
        addText(label, margin, currentY, {
          fontSize: 10,
          fontStyle: "bold",
        });
        addText(value, margin + 50, currentY, {
          fontSize: 10,
        });
        currentY += 8;
      });

      if (submittedBid.note && submittedBid.note.trim()) {
        currentY += 5;
        addText("Your Note:", margin, currentY, {
          fontSize: 10,
          fontStyle: "bold",
        });
        currentY += 6;
        const noteLines = doc.splitTextToSize(submittedBid.note, contentWidth - 10);
        doc.text(noteLines, margin, currentY);
        currentY += noteLines.length * 6;
      }

      currentY += 15;
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, currentY, contentWidth, 45, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, contentWidth, 45);

      addText("IMPORTANT - NEXT STEPS", margin + 5, currentY + 8, {
        fontSize: 11,
        fontStyle: "bold",
      });

      const importantPoints = [
        "• Your bid is confidential and has been recorded in our system",
        "• If your bid is successful, we will contact you within 24 hours",
        "• Payment must be completed within 24 hours of bid acceptance",
        "• Keep this confirmation for your records",
        "• Contact us if you have questions: +94 11 586 7974",
      ];
      let infoY = currentY + 15;
      importantPoints.forEach((point) => {
        addText(point, margin + 5, infoY, {
          fontSize: 9,
        });
        infoY += 6;
      });

      currentY += 60;
      addText("CEYLON GALLERIA", pageWidth / 2, currentY, {
        fontSize: 12,
        fontStyle: "bold",
        align: "center",
      });
      currentY += 8;
      addText(
        "Colombo, Sri Lanka | +94 11 586 7974 | info@ceylongalleria.com",
        pageWidth / 2,
        currentY,
        {
          fontSize: 9,
          align: "center",
        }
      );

      currentY += 15;
      addText(
        "Thank you for your interest in our artwork. This is your official bid confirmation.",
        pageWidth / 2,
        currentY,
        {
          fontSize: 8,
          align: "center",
        }
      );

      const cleanTitle = (art.title || "Artwork").replace(/[^a-zA-Z0-9]/g, "_");
      const timestamp = currentDate.toISOString().slice(0, 19).replace(/[-:T]/g, "");
      const fileName = `Ceylon_Galleria_Bid_Confirmation_${cleanTitle}_${timestamp}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isLoggedIn) {
        setBidError("You must be logged in to submit a bid.");
        return;
    }
    setBidError(null);
    const validationError = validateForm();
    if (validationError) {
      setBidError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/bidding/${sessionID}/bids`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            offerPrice: Number(form.offerPrice),
            contact: form.contact,
            note: form.note,
          }),
        }
      );
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server error: ${responseText.substring(0, 100)}`);
      }
      if (!response.ok) {
        throw new Error(result.msg || "Failed to submit bid");
      }
      setSubmittedBid({
        name: form.name,
        offerPrice: Number(form.offerPrice),
        contact: form.contact,
        note: form.note,
        bidId: result._id,
        submittedAt: new Date(),
      });
      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
        setShowBidSummary(true);
      }, 2000);
    } catch (error) {
      setBidError(error.message || "Failed to submit bid. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const closeBidSummary = () => {
    setShowBidSummary(false);
    setForm({ offerPrice: "", name: "", note: "", contact: "" });
    setCheckedRules(new Array(bidRules.length).fill(false));
    setIsModalOpen(false);
    setSubmittedBid(null);
  };

  if (loading)
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-xl text-gray-700">Loading artwork...</p>
          </div>
        </div>
        <Footer />
      </div>
    );

  if (!art) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-xl">No artwork found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow max-w-[1200px] mx-auto px-6 py-24 protected-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="overflow-hidden shadow-lg transition-transform duration-300 hover:scale-[1.02] protected-image-container">
            <img
              src={art.image || "https://via.placeholder.com/500"}
              alt={art.title}
              className="w-full h-[500px] object-cover transition-transform duration-500 protected-image"
              draggable="false"
            />
          </div>
          <div className="flex flex-col justify-between bg-white p-6 border border-gray-200 shadow-md transition-shadow duration-300 hover:shadow-xl protected-content">
            <div>
              <h1 className="text-3xl font-bold mb-2 transition-colors duration-300">{art.title}</h1>
              <p className="text-gray-700 mb-1">By {art.artist || "Unknown Artist"}</p>
              {art.medium && (
                <p className="text-gray-700 mb-1">
                  <span className="font-semibold">Medium:</span> {art.medium}
                </p>
              )}
              {art.dimensions && (
                <p className="text-gray-700 mb-1">
                  <span className="font-semibold">Dimensions:</span> {art.dimensions}
                </p>
              )}
              {art.category && (
                <p className="text-gray-700 mb-1">
                  <span className="font-semibold">Category:</span> {art.category}
                </p>
              )}
              <p className="text-xl font-bold mb-4 transition-colors duration-300">
                Starting Price: LKR {art.price?.toLocaleString()}
              </p>
              {art.bidEndDate && art.bidEndTime && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded transition-all duration-300 hover:bg-blue-100">
                  <p className="text-sm font-semibold text-blue-800">Bidding Ends:</p>
                  <p className="text-sm text-blue-700">
                    {new Date(art.bidEndDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    at {art.bidEndTime}
                  </p>
                </div>
              )}
              {art.description && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-1">Story Behind the Artwork</h3>
                  <p className="text-gray-700 text-sm">{art.description}</p>
                </div>
              )}
              {art.date && (
                <p className="text-gray-500 text-sm">Year Created: {new Date(art.date).getFullYear()}</p>
              )}
              {art.collections && art.collections.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {art.collections.map((col, index) => (
                    <span
                      key={index}
                      className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded transition-colors duration-300 hover:bg-gray-300"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {art.status === "Bid" && (
              <div>
                {isLoggedIn ? (
                  <button
                    onClick={handleOpenBidModal}
                    className="mt-4 w-full py-3 bg-black text-white font-semibold hover:bg-gray-800 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isModalOpen ? "Close Bid Form" : "Make Your Bid"}
                  </button>
                ) : (
                  <div className="mt-4 p-4 bg-white border border-gray-300 text-center rounded-lg shadow-md">
                    <p className="text-lg font-bold mb-3 text-gray-800">
                      <span role="img" aria-label="lock"></span> Please sign in to place a bid.
                    </p>
                    <button
                      onClick={() => navigate('/signin')}
                      className="w-full py-3 bg-black text-white font-semibold rounded-md hover:bg-gray-800 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoggedIn && (
            <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isModalOpen ? "max-h-[2000px] opacity-100 mt-6" : "max-h-0 opacity-0"
                }`}
            >
                <div className="bg-white border border-gray-300 shadow-lg flex flex-col md:flex-row gap-6 p-6 transform transition-transform duration-300 relative protected-content">
                    {successMessage && (
                        <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10 animate-fade-in">
                            <div className="text-center">
                                <div className="text-black text-6xl mb-4">✓</div>
                                <p className="text-2xl font-bold text-black">Bid Submitted Successfully!</p>
                                <p className="text-gray-600 mt-2">Preparing your confirmation...</p>
                            </div>
                        </div>
                    )}

                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-4 text-center md:text-left">
                            Submit Your Confidential Bid
                        </h2>
                        <p className="text-gray-700 mb-4 text-center md:text-left">
                            Starting Price: <strong>LKR {art.price?.toLocaleString()}</strong>
                            <br />
                            {art.bidEndDate && art.bidEndTime && (
                                <>
                                    Bid Ends:{" "}
                                    <strong>
                                        {new Date(art.bidEndDate).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}{" "}
                                        at {art.bidEndTime}
                                    </strong>
                                </>
                            )}
                        </p>
                        {bidError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded animate-shake">
                                {bidError}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                type="text"
                                min={art.price}
                                step="1000"
                                name="offerPrice"
                                placeholder="Your Offer Price (LKR)"
                                value={form.offerPrice}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all duration-300"
                                required
                            />
                            <input
                                type="text"
                                name="name"
                                placeholder="Your Full Name"
                                value={form.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all duration-300"
                                required
                            />
                            <textarea
                                name="note"
                                placeholder="Note (optional)"
                                value={form.note}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all duration-300"
                            />
                            <input
                                type="text"
                                name="contact"
                                placeholder="Contact Details (Phone / Email)"
                                value={form.contact}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all duration-300"
                                required
                            />
                            <div className="flex gap-4 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 border border-gray-400 text-gray-700 hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!allChecked || submitting}
                                    className={`px-6 py-2 bg-black text-white font-semibold hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                        !allChecked || submitting ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                            Submitting...
                                        </span>
                                    ) : (
                                        "Submit Bid"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="flex-1 bg-gray-50 p-4 border border-gray-300 overflow-y-auto max-h-[500px] protected-content">
                        <h3 className="text-xl font-bold mb-3">Bid Rules & Regulations</h3>
                        {bidRules.map((rule, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col border-b border-gray-200 last:border-b-0 p-2 mb-2 transition-colors duration-300 hover:bg-white"
                            >
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={checkedRules[idx]}
                                        onChange={() => toggleRule(idx)}
                                        className="mt-1 accent-black transition-transform duration-200 hover:scale-110"
                                    />
                                    <span className="font-semibold">{rule.title}</span>
                                </label>
                                <span className="text-gray-600 text-sm ml-7 mt-1">
                                    {rule.description}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {showBidSummary && submittedBid && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 protected-content">
              <div className="bg-black text-white p-6 rounded-t-lg">
                <div className="text-center">
                  <h2 className="text-2xl font-bold">Bid Successfully Submitted!</h2>
                  <p className="text-gray-300 mt-1">Your bid is now in our system</p>
                  <p className="text-xs text-gray-400 mt-2">CEYLON GALLERIA by Janith Weerasinghe</p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <img
                    src={art.image || "https://via.placeholder.com/200"}
                    alt={art.title}
                    className="w-full md:w-32 h-32 object-cover rounded border protected-image"
                    draggable="false"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">{art.title}</h3>
                    <p className="text-gray-600">by {art.artist || "Unknown Artist"}</p>
                    <p className="text-sm text-gray-500">Art Code: {art.artCode || "N/A"}</p>
                    <p className="text-sm text-gray-500">Starting Price: LKR {art.price?.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    <span>✓</span> Your Bid Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Your Bid Amount:</span>
                      <p className="font-bold text-lg text-green-700">LKR {submittedBid.offerPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Your Name:</span>
                      <p className="font-medium">{submittedBid.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Your Contact:</span>
                      <p className="font-medium">{submittedBid.contact}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Submitted At:</span>
                      <p className="font-medium">{submittedBid.submittedAt.toLocaleString()}</p>
                    </div>
                  </div>
                  {submittedBid.note && (
                    <div className="mt-3">
                      <span className="text-gray-600">Your Note:</span>
                      <p className="font-medium italic">{submittedBid.note}</p>
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                  <h4 className="font-bold text-blue-800 mb-3">What happens next?</h4>
                  <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">1.</span>
                      <span>Your bid is now confidentially recorded in our system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>We will review all bids when the bidding period ends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">3.</span>
                      <span>If your bid is successful, we will contact you within 24 hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">4.</span>
                      <span>Payment will need to be completed within 24 hours of contact</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3">Questions? Contact Us</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <strong>Phone:</strong> +94 11 586 7974
                    </p>
                    <p>
                      <strong>Email:</strong> info@ceylongalleria.com
                    </p>
                    <p>
                      <strong>Address:</strong> Ceylon Galleria, Colombo, Sri Lanka
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                  <button
                    onClick={generateBidConfirmationPDF}
                    disabled={pdfGenerating}
                    className="flex-1 bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pdfGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <span>📄</span>
                        Download Your Confirmation
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeBidSummary}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-all duration-300 font-medium"
                  >
                    Close
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Keep your PDF confirmation for your records. We'll be in touch soon! 🎨
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <style jsx>{`
        .protected-content {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }

        .protected-image-container {
          position: relative;
          overflow: hidden;
        }

        .protected-image {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
          pointer-events: none;
          -webkit-touch-callout: none;
        }

        img {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        ::selection {
          background: transparent;
        }

        ::-moz-selection {
          background: transparent;
        }

        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default BidProductPage;