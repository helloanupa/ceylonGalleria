import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSlidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  "https://usqyksnfpxftkpqkkguo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcXlrc25mcHhmdGtwcWtrZ3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTkwNTgsImV4cCI6MjA3NTkzNTA1OH0.q5VI7dITm8wyVkYj0dw-kvoc48cVWkbHKk-isSmlZuc"
);

const STATUS_OPTIONS = ["Direct Sale", "Bid", "Not Listed"];
const COLLECTION_OPTIONS = [
  "Mixed Media",
  "Canvas",
  "Oil",
  "Acrylic",
  "Watercolor",
  "Pen",
  "Abstract",
  "Nature",
  "Urban",
];
const CATEGORY_OPTIONS = [
  "Painting",
  "Sculpture",
  "Photography",
  "Digital",
  "Other",
];

const API_BASE = "http://localhost:5000/api/arts";

function AdminArtManagement() {
  const [artworks, setArtworks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [descriptionModal, setDescriptionModal] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });

  // Set document title on mount
  useEffect(() => {
    document.title = "Admin | Art Management";
  }, []);

  const generateArtCode = () => {
    const lastCode =
      artworks.length > 0
        ? Math.max(
            ...artworks.map((art) => parseInt(art.artCode.replace("ART", "")))
          )
        : 0;
    return `ART${String(lastCode + 1).padStart(3, "0")}`;
  };

  useEffect(() => {
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setArtworks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load artworks error:", error);
      alert("Failed to load artworks: " + error.message);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedArtworks = (artworksToSort) => {
    if (!sortConfig.key) return artworksToSort;

    return [...artworksToSort].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'artCode') {
        aValue = parseInt(a.artCode.replace('ART', '')) || 0;
        bValue = parseInt(b.artCode.replace('ART', '')) || 0;
      }
      
      if (sortConfig.key === 'price') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' 
      ? <span className="text-black">↑</span> 
      : <span className="text-black">↓</span>;
  };

  const validateArtData = (data) => {
    const errors = {};

    if (!data.artCode?.trim()) errors.artCode = "Art Code is required";
    if (!data.title?.trim()) errors.title = "Title is required";
    if (!data.artist?.trim()) errors.artist = "Artist is required";
    
    if (data.price !== undefined && data.price !== "") {
      const priceNum = parseFloat(data.price);
      if (isNaN(priceNum) || priceNum < 0) {
        errors.price = "Price must be a valid positive number";
      }
    }

    if (data.dimensions && data.dimensions.trim()) {
      const dimensionPattern = /^\d+(\.\d+)?\s*[x×]\s*\d+(\.\d+)?\s*(inches|cm|mm|feet|in)$/i;
      if (!dimensionPattern.test(data.dimensions.trim())) {
        errors.dimensions = "Dimensions should be in format like '24x36 inches' or '30.5x40.2 cm'";
      }
    }

    if (!data.image) errors.image = "Image is required";

    if (!STATUS_OPTIONS.includes(data.status)) {
      errors.status = "Invalid status";
    }

    if (!CATEGORY_OPTIONS.includes(data.category)) {
      errors.category = "Invalid category";
    }

    if (data.status === "Bid") {
      if (!data.bidEndDate) errors.bidEndDate = "Bid end date is required for bidding items";
      if (!data.bidEndTime) errors.bidEndTime = "Bid end time is required for bidding items";
      
      if (data.bidEndDate && data.bidEndTime) {
        const bidEndDateTime = new Date(`${data.bidEndDate}T${data.bidEndTime}`);
        if (bidEndDateTime <= new Date()) {
          errors.bidEndDate = "Bid end date and time must be in the future";
        }
      }
    } else {
      data.bidEndDate = "";
      data.bidEndTime = "";
    }

    return errors;
  };

  const filteredArts = artworks.filter((art) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = art.title.toLowerCase().startsWith(query);
    const codeMatch = art.artCode.toLowerCase().includes(query);
    return titleMatch || codeMatch;
  });

  const sortedAndFilteredArts = getSortedArtworks(filteredArts);

  const handleDelete = (art) => {
    if (art.status === "Not Listed") setDeleteTarget(art);
    else alert("Cannot delete artwork that is listed for sale or bidding.");
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      setArtworks((prev) => prev.filter((a) => a._id !== deleteTarget._id));
      setDeleteTarget(null);
      alert("Artwork deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete artwork: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => setDeleteTarget(null);

  const handleAddClick = () => {
    setEditData({
      artCode: generateArtCode(),
      title: "",
      artist: "",
      medium: "",
      dimensions: "",
      price: "",
      category: "Painting",
      collections: [],
      status: "Not Listed",
      date: new Date().toISOString(),
      image: "",
      description: "",
      bidEndDate: "",
      bidEndTime: "",
    });
    setAddModal(true);
  };

  // Helper to upload image to Supabase
  const uploadImageToSupabase = async (file) => {
    if (!file) return null;

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const { data, error } = await supabase.storage
      .from("images") // Your bucket name
      .upload(`public/${fileName}`, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(
        error.message.includes("row-level security")
          ? "Upload blocked by Supabase storage policy. Contact admin."
          : `Upload failed: ${error.message}`
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(`public/${fileName}`);
    return publicUrl;
  };

  const handleEditClick = (art) => {
    setEditData({ ...art });
    setEditModal(true);
  };

  const saveAdd = async (data, file) => {
    try {
      setLoading(true);

      let finalData = { ...data };

      if (file) {
        const imageUrl = await uploadImageToSupabase(file);
        finalData.image = imageUrl;
      }

      const errors = validateArtData(finalData);
      if (Object.keys(errors).length > 0) {
        const errorMessages = Object.values(errors).join('\n');
        alert("Please fix the following errors:\n\n" + errorMessages);
        setLoading(false);
        return;
      }

      const processedData = {
        ...finalData,
        price: data.price ? parseFloat(data.price) : undefined,
        collections: data.collections || []
      };

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }

      // Reload to get the latest state, which is more reliable with sorting.
      await loadArtworks();

      setAddModal(false);
      alert("Artwork added successfully!");
    } catch (error) {
      console.error("Add artwork error:", error);
      alert("Failed to add artwork: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async (data, file) => {
    try {
      setLoading(true);

      let finalData = { ...data };

      // If a new file is provided, upload it and get the new URL
      if (file) {
        const imageUrl = await uploadImageToSupabase(file);
        finalData.image = imageUrl;
      }

      const errors = validateArtData(finalData);
      if (Object.keys(errors).length > 0) {
        const errorMessages = Object.values(errors).join('\n');
        alert("Please fix the following errors:\n\n" + errorMessages);
        setLoading(false);
        return;
      }

      const processedData = {
        ...finalData,
        price: finalData.price ? parseFloat(finalData.price) : undefined,
        collections: finalData.collections || []
      };

      const res = await fetch(`${API_BASE}/${data._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }

      setEditModal(false);
      alert("Artwork updated successfully!");
      
      await loadArtworks();
    } catch (error) {
      console.error("Update artwork error:", error);
      alert("Failed to update artwork: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const now = new Date();
    
    doc.setFontSize(16);
    doc.text("SFG Gallery - Art Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [
        [
          "Art Code",
          "Title",
          "Artist",
          "Medium",
          "Dimensions",
          "Price (Rs.)",
          "Category",
          "Collections",
          "Status",
          "Date",
          "Description",
        ],
      ],
      body: artworks.map((a) => [
        a.artCode || "-",
        a.title || "-",
        a.artist || "-",
        a.medium || "-",
        a.dimensions || "-",
        a.price || "-",
        a.category || "-",
        (a.collections || []).join(", ") || "-",
        a.status || "-",
        a.date ? new Date(a.date).toLocaleDateString() : "-",
        a.description || "-",
      ]),
      styles: { 
        cellWidth: 'auto', 
        fontSize: 8, 
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: {
        fontSize: 9,
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255]
      }
    });
    
    doc.save("Art_Report.pdf");
  };

  const ArtModal = ({ isAdd = false, initialData, onSave, onClose }) => {
    const [modalData, setModalData] = useState(() => ({
      artCode: "",
      title: "",
      artist: "",
      medium: "",
      dimensions: "",
      price: "",
      category: "Painting",
      collections: [],
      status: "Not Listed",
      image: "",
      description: "",
      bidEndDate: "",
      bidEndTime: "",
      ...initialData
    }));
    const [errors, setErrors] = useState({});
    // File handling state
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(initialData?.image || null);

    const toggleModalCollection = (collection) => {
      setModalData((prev) => ({
        ...prev,
        collections: prev.collections?.includes(collection)
          ? prev.collections.filter((c) => c !== collection)
          : [...(prev.collections || []), collection],
      }));
    };

    const handleFileChange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, image: "Only JPEG, PNG, GIF, or WebP files are allowed." }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5 MB limit
        setErrors(prev => ({ ...prev, image: "File size must be ≤ 5 MB." }));
        return;
      }

      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setErrors(prev => ({ ...prev, image: "" })); // Clear image error
    };

    const handleSave = () => {
      const dataToValidate = { ...modalData };
      if (selectedFile) {
        // If a new file is selected, satisfy the image requirement for validation.
        dataToValidate.image = "file-present"; // Use a placeholder to pass validation
      }

      const validationErrors = validateArtData(dataToValidate);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
      onSave(modalData, selectedFile);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[95vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800">
              {isAdd ? "Add New Artwork" : "Edit Artwork"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors duration-200"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Art Code *
                </label>
                <input
                  type="text"
                  value={modalData.artCode || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                {errors.artCode && (
                  <p className="text-red-500 text-sm mt-1">{errors.artCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={modalData.title || ""}
                  onChange={(e) => {
                    setModalData(prev => ({ ...prev, title: e.target.value }));
                    if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                    errors.title ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter artwork title"
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Artist *
                </label>
                <input
                  type="text"
                  value={modalData.artist || ""}
                  onChange={(e) => {
                    setModalData(prev => ({ ...prev, artist: e.target.value }));
                    if (errors.artist) setErrors(prev => ({ ...prev, artist: "" }));
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                    errors.artist ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter artist name"
                />
                {errors.artist && (
                  <p className="text-red-500 text-sm mt-1">{errors.artist}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Medium
                  </label>
                  <input
                    type="text"
                    value={modalData.medium || ""}
                    onChange={(e) => {
                      setModalData(prev => ({ ...prev, medium: e.target.value }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="e.g., Oil on Canvas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Dimensions
                  </label>
                  <input
                    type="text"
                    value={modalData.dimensions || ""}
                    onChange={(e) => {
                      setModalData(prev => ({ ...prev, dimensions: e.target.value }));
                      if (errors.dimensions) setErrors(prev => ({ ...prev, dimensions: "" }));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                      errors.dimensions ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g., 24x36 inches"
                  />
                  {errors.dimensions && (
                    <p className="text-red-500 text-sm mt-1">{errors.dimensions}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={modalData.price || ""}
                    onChange={(e) => {
                      setModalData(prev => ({ ...prev, price: e.target.value }));
                      if (errors.price) setErrors(prev => ({ ...prev, price: "" }));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                      errors.price ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter price (numbers only)"
                  />
                  {errors.price && (
                    <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={modalData.category || "Painting"}
                    onChange={(e) => {
                      setModalData(prev => ({ ...prev, category: e.target.value }));
                      if (errors.category) setErrors(prev => ({ ...prev, category: "" }));
                    }}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                      errors.category ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Collections
                </label>
                <div className="grid grid-cols-3 gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                  {COLLECTION_OPTIONS.map((col) => (
                    <label
                      key={col}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors duration-200"
                    >
                      <input
                        type="checkbox"
                        checked={modalData.collections?.includes(col) || false}
                        onChange={() => toggleModalCollection(col)}
                        className="form-checkbox h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status * (Current: {modalData.status})
                </label>
                <select
                  key={`status-${modalData._id || 'new'}`}
                  value={modalData.status || "Not Listed"}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    
                    setModalData(prev => {
                      const updated = { ...prev, status: newStatus };
                      if (newStatus !== "Bid") {
                        updated.bidEndDate = "";
                        updated.bidEndTime = "";
                      }
                      return updated;
                    });
                    
                    setErrors(prev => ({
                      ...prev,
                      status: "",
                      ...(newStatus !== "Bid" && { bidEndDate: "", bidEndTime: "" })
                    }));
                  }}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black cursor-pointer ${
                    errors.status ? "border-red-500" : "border-gray-300"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Available options: {STATUS_OPTIONS.join(", ")}
                </p>
                {errors.status && (
                  <p className="text-red-500 text-sm mt-1">{errors.status}</p>
                )}
              </div>

              {modalData.status === "Bid" && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">
                    Bidding Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bid End Date *
                      </label>
                      <input
                        type="date"
                        value={
                          modalData.bidEndDate
                            ? new Date(modalData.bidEndDate).toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          setModalData(prev => ({ ...prev, bidEndDate: e.target.value }));
                          if (errors.bidEndDate) setErrors(prev => ({ ...prev, bidEndDate: "" }));
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                          errors.bidEndDate ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {errors.bidEndDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.bidEndDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Bid End Time *
                      </label>
                      <input
                        type="time"
                        value={modalData.bidEndTime ? modalData.bidEndTime.slice(0, 5) : ""}
                        onChange={(e) => {
                          setModalData(prev => ({ ...prev, bidEndTime: e.target.value }));
                          if (errors.bidEndTime) setErrors(prev => ({ ...prev, bidEndTime: "" }));
                        }}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                          errors.bidEndTime ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      {errors.bidEndTime && (
                        <p className="text-red-500 text-sm mt-1">{errors.bidEndTime}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Artwork Image *
                </label>
                {filePreview && (
                  <div className="mt-3 mb-3">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-md border border-gray-300 shadow-sm"
                      onError={() => setFilePreview(null)} // Hide if URL is broken
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-black focus:border-black ${
                    errors.image ? "border-red-500" : "border-gray-300"
                  } file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800`}
                />
                {errors.image && (
                  <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Recommended: JPG, PNG, WebP.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={modalData.description || ""}
                  onChange={(e) => {
                    setModalData(prev => ({ ...prev, description: e.target.value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black"
                  rows={4}
                  placeholder="Enter artwork description..."
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="Art Management" />
      <main className="flex-grow p-6 bg-gray-50 transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Art Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Current User's Login: admin
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleAddClick}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
            >
              Add Art
            </button>
            <button
              onClick={generatePDF}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
            >
              Generate PDF
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by any column..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/2 mb-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />

        {sortConfig.key && (
          <div className="mb-4 text-sm text-gray-600">
            Sorted by: <strong>{sortConfig.key}</strong> ({sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'})
            <button 
              onClick={() => setSortConfig({ key: null, direction: 'asc' })}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Clear Sort
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        )}

        <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <th className="px-4 py-2 text-left">Image</th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('artCode')}
                >
                  <div className="flex items-center gap-2">
                    Art Code
                    {getSortIcon('artCode')}
                  </div>
                </th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Artist</th>
                <th className="px-4 py-2 text-left">Medium</th>
                <th className="px-4 py-2 text-left">Dimensions</th>
                <th 
                  className="px-4 py-2 text-left cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-2">
                    Price(Rs.)
                    {getSortIcon('price')}
                  </div>
                </th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Collections</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedAndFilteredArts.map((art) => (
                <tr key={art._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <img
                      src={art.image || "https://via.placeholder.com/150"}
                      alt={art.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  </td>
                  <td className="px-4 py-2 font-mono">{art.artCode}</td>
                  <td className="px-4 py-2">{art.title}</td>
                  <td className="px-4 py-2">{art.artist}</td>
                  <td className="px-4 py-2">{art.medium}</td>
                  <td className="px-4 py-2">{art.dimensions}</td>
                  <td className="px-4 py-2">{art.price}</td>
                  <td className="px-4 py-2">{art.category}</td>
                  <td className="px-4 py-2">
                    {(art.collections || []).join(", ")}
                  </td>
                  <td className="px-4 py-2">
                    {art.status}
                    {art.status === "Bid" && art.bidEndDate && (
                      <div className="text-xs text-gray-500">
                        Ends: {new Date(art.bidEndDate).toLocaleDateString()} {art.bidEndTime}
                      </div>
                    )}
                  </td>
                  <td
                    className="px-4 py-2 cursor-pointer underline text-black"
                    onClick={() => setDescriptionModal(art.description)}
                  >
                    {art.description && art.description.length > 30
                      ? art.description.slice(0, 30) + "..."
                      : art.description || "No description"}
                  </td>
                  <td className="px-4 py-2 flex justify-center gap-2">
                    <button
                      onClick={() => handleEditClick(art)}
                      className="px-2 py-1 bg-black text-white rounded hover:bg-gray-800 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(art)}
                      className={`px-2 py-1 text-white rounded transition ${
                        art.status === "Not Listed"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {sortedAndFilteredArts.length === 0 && !loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery
                      ? "No results found for your search."
                      : "No artworks found."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
              <p className="mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold">"{deleteTarget.title}"</span>?
                <br />
                <span className="text-sm text-red-600">This action cannot be undone.</span>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {descriptionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Description</h2>
              <p className="mb-4 whitespace-pre-wrap leading-relaxed">
                {descriptionModal || "No description available."}
              </p>
              <button
                onClick={() => setDescriptionModal(null)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {addModal && (
          <ArtModal
            isAdd
            initialData={editData}
            onSave={saveAdd}
            onClose={() => setAddModal(false)}
          />
        )}
        {editModal && (
          <ArtModal
            initialData={editData}
            onSave={saveEdit}
            onClose={() => setEditModal(false)}
          />
        )}
      </main>
    </div>
  );
}

export default AdminArtManagement;