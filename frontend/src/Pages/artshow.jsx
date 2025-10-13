import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";

const collectionTypes = [
  "Mixed Media",
  "Oil",
  "Watercolor",
  "Pen",
  "Acrylic",
  "Canvas",
  "Abstract",
  "Sculptures",
  "Masterpieces",
];

const statusTypes = ["All", "Bid", "Direct Sale"];

function Artshow() {
  const [artworks, setArtworks] = useState([]);
  const [selectedCollections, setSelectedCollections] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Set document title on mount
  useEffect(() => {
    document.title = "Ceylon galeria | showcase";
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
  });

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/arts");
        const data = await response.json();

        const mappedArts = data
          .filter((art) => art.status !== "Not Listed")
          .map((art) => ({
            id: art._id,
            title: art.title,
            medium: art.medium,
            size: art.dimensions,
            price: `LKR ${art.price?.toLocaleString()}`,
            image: art.image,
            collections: art.collections || [],
            status: art.status || "Direct Sale",
          }));

        setArtworks(mappedArts);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching artworks:", error);
        setLoading(false);
      }
    };

    fetchArtworks();
  }, []);

  const toggleCollection = (type) => {
    setSelectedCollections((prev) =>
      prev.includes(type) ? prev.filter((c) => c !== type) : [...prev, type]
    );
  };

  const clearCollections = () => setSelectedCollections([]);

  const filteredArtworks = artworks.filter((art) => {
    const collectionMatch =
      selectedCollections.length === 0 ||
      art.collections.some((col) => selectedCollections.includes(col));
    const statusMatch =
      selectedStatus === "All" || art.status === selectedStatus;
    return collectionMatch && statusMatch;
  });

  const handleMoreClick = (art) => {
    if (art.status === "Bid") {
      navigate(`/productPageBid/${art.id}`);
    } else if (art.status === "Direct Sale") {
      navigate(`/productPageDirect/${art.id}`);
    }
  };

  if (loading)
    return <p className="text-center mt-20">Loading artworks...</p>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 protected-content">
      <Header />

      {/* Heading Section */}
      <section className="mt-28 px-6 max-w-[1200px] mx-auto text-center mb-4 protected-content">
        <h1 className="text-3xl md:text-4xl font-bold uppercase mb-2 tracking-wide">
          Artist Stockroom
        </h1>
        <p className="text-gray-700 text-sm md:text-base max-w-3xl mx-auto">
          This catalogue format allows you to browse works from our inventory that
          will be updated monthly.
        </p>
      </section>

      {/* Collection Filter */}
      <div className="mb-4 flex justify-center gap-4 flex-wrap protected-content">
        {collectionTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleCollection(type)}
            className={`px-4 py-1 uppercase font-semibold tracking-wider transition-all duration-300 ${
              selectedCollections.includes(type)
                ? "bg-black text-white shadow-lg"
                : "bg-white text-black border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {type}
          </button>
        ))}
        {selectedCollections.length > 0 && (
          <button
            type="button"
            onClick={clearCollections}
            className="px-4 py-1 uppercase font-semibold tracking-wider bg-red-600 text-white shadow hover:bg-red-700 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="mb-8 flex justify-center gap-4 flex-wrap protected-content">
        {statusTypes.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-1 uppercase font-semibold tracking-wider transition-all duration-300 ${
              selectedStatus === status
                ? "bg-black text-white shadow-lg"
                : "bg-white text-black border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Protected Artworks Grid */}
      <main className="flex-grow max-w-[1200px] mx-auto px-6 py-4">
        <div className="grid grid-cols-2 md:grid-2 gap-6">
          <AnimatePresence>
            {filteredArtworks.map((art) => (
              <motion.div
                key={art.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative group overflow-hidden shadow-lg cursor-pointer protected-image-container"
              >
                {art.image ? (
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-[350px] object-cover protected-image"
                    draggable="false"
                  />
                ) : (
                  <div className="w-full h-[350px] bg-gray-200 flex items-center justify-center text-gray-500">
                    No Image
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 protected-content">
                  <h3 className="text-lg font-semibold">{art.title}</h3>
                  <p className="text-sm">{art.medium}</p>
                  <p className="text-sm">{art.size}</p>
                  <p className="text-sm font-bold">{art.price}</p>
                  <button
                    type="button"
                    onClick={() => handleMoreClick(art)}
                    className={`mt-2 px-3 py-1 text-xs transition-all duration-300 ${
                      art.status === "Bid" || art.status === "Direct Sale"
                        ? "bg-black text-white hover:bg-gray-800 cursor-pointer"
                        : "bg-gray-400 text-gray-200 cursor-not-allowed"
                    }`}
                    disabled={art.status === "Not Listed"}
                  >
                    MORE
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* No artworks message */}
        {filteredArtworks.length === 0 && !loading && (
          <div className="text-center py-12 protected-content">
            <p className="text-gray-500 text-lg">
              No artworks found matching your filters.
            </p>
          </div>
        )}
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

        /* Protect buttons and interactive elements */
        button {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
}

export default Artshow;