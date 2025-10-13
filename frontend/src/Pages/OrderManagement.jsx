// src/pages/OrderManagement.jsx
import React, { useState, useEffect, useRef } from "react";
import AdminSidebar from "../components/AdminSlidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client - REPLACE WITH YOUR ACTUAL URL AND ANON KEY
const supabase = createClient('https://usqyksnfpxftkpqkkguo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcXlrc25mcHhmdGtwcWtrZ3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzNTkwNTgsImV4cCI6MjA3NTkzNTA1OH0.q5VI7dITm8wyVkYj0dw-kvoc48cVWkbHKk-isSmlZuc');

const API_BASE = "http://localhost:5000/api/orders";

const STATUS_OPTIONS = [
  "Payment Pending",
  "Payment Verifying",
  "Payment Confirmed",
  "Processing",
  "Ready for Pickup",
  "Out for Delivery",
  "Delivered",
  "Picked Up",
  "Cancelled",
];

const SELL_TYPES = ["Direct", "Bid"];

const statusColors = {
  "Payment Pending": "bg-red-500",
  "Payment Verifying": "bg-yellow-500",
  "Payment Confirmed": "bg-blue-500",
  Processing: "bg-purple-500",
  "Ready for Pickup": "bg-indigo-500",
  "Out for Delivery": "bg",
  Delivered: "bg-green-500",
  "Picked Up": "bg-green-600",
  Cancelled: "bg-gray-500",
};

/* Stable presentational components */
const Th = ({ children }) => (
  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-r">
    {children}
  </th>
);

const Td = ({ children, className = "" }) => (
  <td className={`px-4 py-2 border-r ${className}`}>{children}</td>
);

function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [loading, setLoading] = useState(false);

  // New: Ref for file input
  const fileInputRef = useRef(null);

  // Set document title on mount
  useEffect(() => {
    document.title = "Admin | Order & Tracking Management";
  }, []);

  // Separate state object for form data to prevent re-renders
  const [formData, setFormData] = useState({
    artCode: "",
    artTitle: "",
    sellType: "Bid",
    fullName: "",
    deliveryAddress: "",
    phoneNumber: "",
    paymentReceipt: "",  // Will hold the uploaded URL after upload
    status: "Payment Confirmed",
    orderDate: "",
    totalAmount: "",
  });

  // New: State for selected file and preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);  // FLO For local preview

  // New: Validation errors state
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const normalized = data.map((o) => ({
        ...o,
        orderDate: o.orderDate ? o.orderDate.toString().slice(0, 10) : "",
        totalAmount: o.totalAmount ?? "",
      }));
      const sorted = normalized.sort(
        (a, b) => new Date(b.orderDate) - new Date(a.orderDate)
      );
      setOrders(sorted);
    } catch (err) {
      console.error("Error loading orders:", err);
      alert("Error loading orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) =>
    Object.values(order).some((val) =>
      (val ?? "").toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleStatusChange = (order) => setStatusModal({ ...order });

  const updateStatus = async (newStatus) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/${statusModal._id || statusModal.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const updated = await res.json();
      setOrders((prev) =>
        prev.map((o) =>
          (o._id || o.id) === (updated._id || updated.id)
            ? { ...o, status: updated.status }
            : o
        )
      );
      setStatusModal(null);
      alert("Order status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setFormData({
      artCode: "",
      artTitle: "",
      sellType: "Bid",
      fullName: "",
      deliveryAddress: "",
      phoneNumber: "",
      paymentReceipt: "",
      status: "Payment Confirmed",
      orderDate: new Date().toISOString().split("T")[0],
      totalAmount: "",
    });
    setSelectedFile(null);
    setFilePreview(null);
    setValidationErrors({});
    setAddModal(true);
  };

  const validateForm = () => {
    const errors = {};

    // Art Code: Required, alphanumeric with optional dash/underscore

    if (!formData.artCode.trim()) {
      errors.artCode = "Art Code is required.";
    } else if (!/^[A-Za-z0-9\-_]+$/.test(formData.artCode.trim())) {
      errors.artCode = "Art Code must be alphanumeric (letters, numbers, -, _ only).";
    }

    // Art Title: Required, letters/spaces min 3 chars
    if (!formData.artTitle.trim()) {
      errors.artTitle = "Art Title is required.";
    } else if (formData.artTitle.trim().length < 3) {
      errors.artTitle = "Art Title must be at least 3 characters.";
    }

    // Sell Type: Required (though defaulted)
    if (!formData.sellType) errors.sellType = "Sell Type is required.";

    // Full Name: Required, letters/spaces min 2 chars
    if (!formData.fullName.trim()) {
      errors.fullName = "Full Name is required.";
    } else if (!/^[A-Za-z\s]+$/.test(formData.fullName.trim())) {
      errors.fullName = "Full Name must contain letters and spaces only.";
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = "Full Name must be at least 2 characters.";
    }

    // Delivery Address: Required, min 10 chars
    if (!formData.deliveryAddress.trim()) {
      errors.deliveryAddress = "Delivery Address is required.";
    } else if (formData.deliveryAddress.trim().length < 10) {
      errors.deliveryAddress = "Delivery Address must be at least 10 characters.";
    }

    // Phone Number: Required, exactly 10 digits starting with 07
    const phone = formData.phoneNumber.trim();
    if (!phone) {
      errors.phoneNumber = "Phone Number is required.";
    } else if (!/^\d+$/.test(phone)) {
      errors.phoneNumber = "Phone Number must contain numbers only.";
    } else if (phone.length !== 10) {
      errors.phoneNumber = "Phone Number must be exactly 10 digits.";
    } else if (!phone.startsWith("07")) {
      errors.phoneNumber = "Phone Number must start with '07'.";
    }

    // Total Amount: Required, positive number (allow commas/decimals)
    const amountStr = formData.totalAmount.trim();
    if (!amountStr) {
      errors.totalAmount = "Total Amount is required.";
    } else {
      const cleanedAmount = amountStr.replace(/,/g, '');
      const amountNum = parseFloat(cleanedAmount);
      if (isNaN(amountNum) || amountNum <= 0) {
        errors.totalAmount = "Total Amount must be a positive number (e.g., 10000 or 10,000.50).";
      }
    }

    // Payment Receipt File: Required
    if (!selectedFile) errors.paymentReceipt = "Payment Receipt file is required.";

    // Status: Required (though defaulted)
    if (!formData.status) errors.status = "Initial Status is required.";

    // Order Date: Required and valid date (future or today not allowed? Assuming past/present ok)
    if (!formData.orderDate) {
      errors.orderDate = "Order Date is required.";
    } else {
      const selectedDate = new Date(formData.orderDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(selectedDate.getTime()) || selectedDate > today) {
        errors.orderDate = "Order Date must be today or in the past.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveAdd = async () => {
    if (!validateForm()) {
      alert("Please fix the validation errors before submitting.");
      return;
    }

    try {
      setLoading(true);

      let receiptUrl = formData.paymentReceipt;

      if (selectedFile) {
        // Upload to Supabase
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { data, error } = await supabase.storage
          .from('images')  // Bucket name: create this in Supabase
          .upload(`public/${fileName}`, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public VMware URL
        const { publicUrl } = supabase.storage
          .from('images')
          .getPublicUrl(`public/${fileName}`).data;

        receiptUrl = publicUrl;
      }

      const payload = {
        ...formData,
        paymentReceipt: receiptUrl,
        totalAmount: String(formData.totalAmount ?? "").trim(),
      };
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      const created = await res.json();
      const normalized = {
        ...created,
        orderDate: created.orderDate
          ? created.orderDate.toString().slice(0, 10)
          : "",
      };
      setOrders((prev) => [normalized, ...prev]);
      setAddModal(false);
      alert("Order added successfully");
    } catch (error) {
      console.error("Error adding order:", error);
      alert(error.message || "Error adding order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (order) => setDeleteTarget(order);

  const confirmDelete = async () => {
    try {
      setLoading(true);
      const id = deleteTarget._id || deleteTarget.id;
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `HTTP ${res.status}`);
      }
      setOrders((prev) => prev.filter((o) => (o._id || o.id) !== id));
      setDeleteTarget(null);
      alert("Order deleted successfully");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error deleting order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SFG Gallery - Order Report", 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Art Code",
          "Art Title",
          "Customer",
          "Sell Type",
          "Status",
          "Order Date",
          "Amount",
        ],
      ],
      body: orders.map((o) => [
        o.artCode,
        o.artTitle,
        o.fullName,
        o.sellType,
        o.status,
        o.orderDate,
        o.totalAmount,
      ]),
    });

    doc.save("Order_Report.pdf");
  };

  const isPdfUrl = (url = "") =>
    /\.pdf(\?.*)?$/i.test(url.trim());

  // Handle file selection and local preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({ ...prev, paymentReceipt: '' }));  // Clear old URL

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="Order & Tracking Management" />
      <main className="flex-grow p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Order & Tracking Management</h1>
          <div className="space-x-2">
            <button
              onClick={handleAddClick}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
              disabled={loading}
            >
              Add Manual Order
            </button>
            <button
              onClick={generatePDF}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
            >
              Generate PDF
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by art code, customer name, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-4/5 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {loading && <div className="text-center py-4">Loading...</div>}

        <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-300 border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300">
              <tr>
                <Th>Art Code</Th>
                <Th>Art Title</Th>
                <Th>Sell Type</Th>
                <Th>Customer</Th>
                <Th>Phone</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Order Date</Th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 w-48">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr
                  key={order._id || order.id}
                  className="hover:bg-gray-50 transition"
                >
                  <Td className="font-medium font-mono text-blue-600">{order.artCode}</Td>
                  <Td>{order.artTitle}</Td>
                  <Td>
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${
                        order.sellType === "Direct"
                          ? "bg-green-500"
                          : "bg-purple-500"
                      }`}
                    >
                      {order.sellType}
                    </span>
                  </Td>
                  <Td>{order.fullName}</Td>
                  <Td>{order.phoneNumber}</Td>
                  <Td className="font-medium">{order.totalAmount}</Td>
                  <Td>
                    <span
                      className={`px-2 py-1 rounded text-white text-xs ${
                        statusColors[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                  </Td>
                  <Td>{order.orderDate}</Td>
                  <td className="px-4 py-2 flex justify-center gap-2">
                    <button
                      onClick={() => setViewModal(order)}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition text-xs"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleStatusChange(order)}
                      className="px-2 py-1 bg-black text-white rounded hover:bg-gray-800 transition text-xs"
                      disabled={loading}
                    >
                      Status
                    </button>
                    <button
                      onClick={() => handleDelete(order)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-gray-500">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Order Modal */}
        {addModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-11/12 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">
                Add Manual Order (Bid Winner)
              </h2>
              <div className="space-y-4">
                
                <div key="artCode-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Art Code *
                  </label>
                  <input
                    key="artCode-input"
                    type="text"
                    value={formData.artCode}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, artCode: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.artCode ? 'border-red-500' : ''}`}
                    placeholder="e.g. ART001"
                  />
                  {validationErrors.artCode && <p className="text-red-500 text-xs mt-1">{validationErrors.artCode}</p>}
                </div>

                <div key="artTitle-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Art Title *
                  </label>
                  <input
                    key="artTitle-input"
                    type="text"
                    value={formData.artTitle}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, artTitle: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.artTitle ? 'border-red-500' : ''}`}
                    placeholder="Artwork Title"
                  />
                  {validationErrors.artTitle && <p className="text-red-500 text-xs mt-1">{validationErrors.artTitle}</p>}
                </div>

                <div key="sellType-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sell Type *
                  </label>
                  <select
                    key="sellType-select"
                    value={formData.sellType}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, sellType: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.sellType ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Sell Type</option>
                    {SELL_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {validationErrors.sellType && <p className="text-red-500 text-xs mt-1">{validationErrors.sellType}</p>}
                </div>

                <div key="fullName-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    key="fullName-input"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, fullName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.fullName ? 'border-red-500' : ''}`}
                    placeholder="Customer Full Name"
                  />
                  {validationErrors.fullName && <p className="text-red-500 text-xs mt-1">{validationErrors.fullName}</p>}
                </div>

                <div key="deliveryAddress-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address *
                  </label>
                  <textarea
                    key="deliveryAddress-textarea"
                    value={formData.deliveryAddress}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.deliveryAddress ? 'border-red-500' : ''}`}
                    rows={3}
                    placeholder="Full Delivery Address"
                  />
                  {validationErrors.deliveryAddress && <p className="text-red-500 text-xs mt-1">{validationErrors.deliveryAddress}</p>}
                </div>

                <div key="phoneNumber-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    key="phoneNumber-input"
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only digits
                      if (/^\d*$/.test(value)) {
                        setFormData(prev => ({ ...prev, phoneNumber: value }));
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.phoneNumber ? 'border-red-500' : ''}`}
                    placeholder="07XXXXXXXX (10 digits)"
                  />
                  {validationErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{validationErrors.phoneNumber}</p>}
                </div>

                <div key="totalAmount-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount *
                  </label>
                  <input
                    key="totalAmount-input"
                    type="text"
                    value={formData.totalAmount}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, totalAmount: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.totalAmount ? 'border-red-500' : ''}`}
                    placeholder="LKR 00,000"
                  />
                  {validationErrors.totalAmount && <p className="text-red-500 text-xs mt-1">{validationErrors.totalAmount}</p>}
                </div>

                <div key="orderDate-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, orderDate: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.orderDate ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.orderDate && <p className="text-red-500 text-xs mt-1">{validationErrors.orderDate}</p>}
                </div>

               <div key="paymentReceipt-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Receipt (Image or PDF) *
                  </label>

                  {/* Local preview if selected */}
                  {selectedFile && filePreview && (
                    <img
                      src={filePreview}
                      alt="Receipt Preview"
                      className="w-32 h-40 object-cover rounded mb-2"
                    />
                  )}

                  {selectedFile && !filePreview && (
                    <p className="mb-2 text-sm text-gray-600">
                      Selected: {selectedFile.name} (PDF)
                    </p>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.paymentReceipt ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.paymentReceipt && <p className="text-red-500 text-xs mt-1">{validationErrors.paymentReceipt}</p>}

                  <p className="mt-1 text-xs text-gray-500">
                    Upload an image or PDF receipt. It will be stored securely in Supabase.
                  </p>
                </div>

                <div key="status-field">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Status *
                  </label>
                  <select
                    key="status-select"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, status: e.target.value }))
                    }
                    className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black ${validationErrors.status ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Status</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {validationErrors.status && <p className="text-red-500 text-xs mt-1">{validationErrors.status}</p>}
                </div>
              </div>

              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={() => setAddModal(false)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={saveAdd}
                  className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition"
                  disabled={loading}
                >
                  {loading ? "Adding..." : "Add Order"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Modal */}
        {statusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-lg font-bold mb-4">Update Order Status</h2>
              <p className="mb-4">
                <strong>Order:</strong> {statusModal.artCode} -{" "}
                {statusModal.fullName}
              </p>
              <p className="mb-4">
                <strong>Current Status:</strong>
                <span
                  className={`ml-2 px-2 py-1 rounded text-white text-xs ${
                    statusColors[statusModal.status]
                  }`}
                >
                  {statusModal.status}
                </span>
              </p>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    className={`w-full text-left px-3 py-2 rounded transition ${
                      status === statusModal.status
                        ? "bg-black text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                    disabled={loading}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setStatusModal(null)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-11/12 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Order Details</h2>
              <div className="space-y-3">
                <div>
                  <strong>Art Code:</strong>{" "}
                  <span className="text-blue-600 font-mono">
                    {viewModal.artCode}
                  </span>
                </div>
                <div>
                  <strong>Art Title:</strong> {viewModal.artTitle}
                </div>
                <div>
                  <strong>Sell Type:</strong> {viewModal.sellType}
                </div>
                <div>
                  <strong>Customer:</strong> {viewModal.fullName}
                </div>
                <div>
                  <strong>Phone:</strong> {viewModal.phoneNumber}
                </div>
                <div>
                  <strong>Address:</strong> {viewModal.deliveryAddress}
                </div>
                <div>
                  <strong>Amount:</strong> {viewModal.totalAmount}
                </div>
                <div>
                  <strong>Status:</strong>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-white text-xs ${
                      statusColors[viewModal.status]
                    }`}
                  >
                    {viewModal.status}
                  </span>
                </div>
                <div>
                  <strong>Order Date:</strong> {viewModal.orderDate}
                </div>
                {viewModal.paymentReceipt && (
                  <div>
                    <strong>Payment Receipt:</strong>
                    {isPdfUrl(viewModal.paymentReceipt) ? (
                      <a
                        href={viewModal.paymentReceipt}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-blue-600 hover:underline"
                      >
                        View PDF Receipt
                      </a>
                    ) : (
                      <img
                        src={viewModal.paymentReceipt}
                        alt="Payment Receipt"
                        className="mt-2 max-w-full h-auto rounded"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setViewModal(null)}
                  className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition"
                >
                  Close
                </button>

              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-lg font-bold mb-4">Confirm Delete</h2>
              <p className="mb-4">
                Are you sure you want to delete order{" "}
                <strong>{deleteTarget.artCode}</strong> for{" "}
                <strong>{deleteTarget.fullName}</strong>?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 transition"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrderManagement;