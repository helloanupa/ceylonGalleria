import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

function ArtProductDirect() {
  const { id } = useParams(); // get art ID from URL
  const navigate = useNavigate();

  const [art, setArt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);

  // Set document title on mount
  useEffect(() => {
    document.title = "Ceylon Galleria";
  }, []);

  // Content Protection Effect
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable text selection
    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable drag and drop
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+A, Ctrl+P, Ctrl+C
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || // Ctrl+Shift+I/J
        (e.ctrlKey && e.keyCode === 85) || // Ctrl+U
        (e.ctrlKey && e.keyCode === 83) || // Ctrl+S
        (e.ctrlKey && e.keyCode === 65) || // Ctrl+A
        (e.ctrlKey && e.keyCode === 80) || // Ctrl+P
        (e.ctrlKey && e.keyCode === 67) || // Ctrl+C
        (e.ctrlKey && e.keyCode === 86) || // Ctrl+V
        (e.ctrlKey && e.keyCode === 88) || // Ctrl+X
        e.keyCode === 44 // Print Screen
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Screenshot detection (limited effectiveness)
    const handleKeyUp = (e) => {
      if (e.keyCode === 44) { // Print Screen
        alert('Screenshots are not allowed for copyright protection.');
      }
    };

    // Dev tools detection
    let devtools = { open: false };
    const devToolsDetection = setInterval(() => {
      if (window.outerHeight - window.innerHeight > 160) {
        if (!devtools.open) {
          devtools.open = true;
          document.body.style.filter = 'blur(5px)';
          document.body.style.pointerEvents = 'none';
        }
      } else {
        if (devtools.open) {
          devtools.open = false;
          document.body.style.filter = 'none';
          document.body.style.pointerEvents = 'auto';
        }
      }
    }, 500);

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Clear console periodically to prevent inspection
    const clearConsole = setInterval(() => {
      console.clear();
    }, 2000);

    // Cleanup function
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      clearInterval(devToolsDetection);
      clearInterval(clearConsole);
      
      // Reset body styles when component unmounts
      document.body.style.filter = 'none';
      document.body.style.pointerEvents = 'auto';
    };
  }, []);

  useEffect(() => {
    const fetchArt = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/arts/${id}`);
        if (!res.ok) throw new Error("Failed to fetch artwork");
        const data = await res.json();

        if (data.status === "Not Listed") {
          navigate("/artshow"); // redirect if not available for purchase
          return;
        }

        setArt(data);
      } catch (error) {
        console.error(error);
        navigate("/artshow");
      } finally {
        setLoading(false);
      }
    };

    fetchArt();
  }, [id, navigate]);

  const handlePurchase = () => {
    setPurchased(true);
    navigate("/directbuypayment", { state: { art } });
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <p className="text-center mt-28 text-xl">Loading artwork...</p>
        <Footer />
      </div>
    );
  }

  if (!art) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <p className="text-center mt-28 text-xl">No artwork found.</p>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-6 mt-[100px] mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
          {/* Protected Artwork Image */}
          <div className="bg-white border border-gray-300 shadow-md p-4 protected-image-container">
            <img
              src={art.image || "https://via.placeholder.com/500"}
              alt={art.title}
              className="w-full object-cover protected-image"
              loading="lazy"
              draggable="false"
            />
          </div>

          {/* Artwork Details + Story */}
          <div className="bg-white border border-gray-300 shadow-md p-6 flex flex-col gap-6 protected-content">
            <div>
              <h1 className="text-3xl font-bold mb-2">{art.title}</h1>
              <p className="text-lg text-gray-600 mb-4">By {art.artist || "Unknown Artist"}</p>

              {/* Price */}
              <div className="mb-4">
                <p className="text-xl font-semibold text-black">LKR {art.price?.toLocaleString()}</p>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-gray-700 text-sm mb-4">
                {art.medium && (
                  <p>
                    <span className="font-semibold">Medium:</span> {art.medium}
                  </p>
                )}
                {art.dimensions && (
                  <p>
                    <span className="font-semibold">Dimensions:</span> {art.dimensions}
                  </p>
                )}
                {art.category && (
                  <p>
                    <span className="font-semibold">Category:</span> {art.category}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Status:</span> {art.status}
                </p>
                {art.collections && art.collections.length > 0 && (
                  <p>
                    <span className="font-semibold">Collections:</span> {art.collections.join(", ")}
                  </p>
                )}
              </div>

              {/* Purchase button */}
              {art.status === "Direct Sale" && (
                <button
                  onClick={handlePurchase}
                  className={`w-1/2 py-3 font-semibold uppercase tracking-wide transition ${
                    purchased
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                  disabled={purchased}
                >
                  {purchased ? "Purchased" : "Purchase"}
                </button>
              )}
            </div>

            {/* Artwork Story */}
            {art.description && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
                <h2 className="text-2xl font-bold mb-2">Artwork Story</h2>
                <p className="text-gray-700 leading-relaxed">{art.description}</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />

      {/* Protection Styles */}
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

        /* Disable image context menu globally */
        img {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* Hide selection highlighting */
        ::selection {
          background: transparent;
        }
        
        ::-moz-selection {
          background: transparent;
        }
      `}</style>
    </div>
  );
}

export default ArtProductDirect;