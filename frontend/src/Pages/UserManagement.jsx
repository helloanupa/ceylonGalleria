import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSlidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmText, setConfirmText] = useState(""); // for admin role confirmation

  // This is the new code to change the tab title
  useEffect(() => {
    document.title = "Admin | User Management";
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users/all");
      const sortedUsers = response.data.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`http://localhost:5000/api/users/admin/${id}`);
        alert("User deleted successfully!");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
        alert("Failed to delete user.");
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setErrors({});
    setConfirmText("");
    setModalOpen(true);
  };

  const handleModalChange = (e) => {
    setEditingUser({ ...editingUser, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!editingUser.name?.trim()) newErrors.name = "Name is required";

    // Stricter email validation
    if (!editingUser.gmail?.trim()) newErrors.gmail = "Email is required";
    else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(editingUser.gmail)
    )
      newErrors.gmail = "Enter a valid email";

    if (!editingUser.phone?.trim()) newErrors.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(editingUser.phone))
      newErrors.phone = "Phone must be 10 digits";

    if (!editingUser.country?.trim()) newErrors.country = "Country is required";

    if (
      editingUser.role === "admin" &&
      confirmText !== "Grant Admin permission"
    ) {
      newErrors.role = "You must type 'Grant Admin permission' to confirm.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingUser.role === "admin") {
        const proceed = window.confirm(
          "⚠️ Warning: Granting Admin permission will give this user full access to the system. Do you want to continue?"
        );
        if (!proceed) return;
      }

      await axios.put(
        `http://localhost:5000/api/users/admin/${editingUser._id}`,
        editingUser
      );
      alert("User updated successfully!");
      setModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(query);
    const emailMatch = user.gmail?.toLowerCase().includes(query);
    return nameMatch || emailMatch;
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();

    // Sort by most recently created for the report
    const sortedForReport = [...filteredUsers].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    doc.setFontSize(20);
    doc.text("CEYLON GALLERIA", 14, 20);
    doc.setFontSize(12);
    doc.text("by Janith Weerasinghe", 14, 28);

    doc.setFontSize(14);
    doc.text(`User Report`, 14, 38);
    doc.setFontSize(10);
    doc.text(`Report Generated On: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 44);

    const tableColumn = [
      "#",
      "Name",
      "Email",
      "Country",
      "Phone",
      "Created At",
      "Last Updated",
      "Role",
    ];
    const tableRows = sortedForReport.map((u, index) => [
      sortedForReport.length - index,
      u.name || "N/A",
      u.gmail || "N/A",
      u.country || "N/A",
      u.phone || "N/A",
      u.createdAt ? new Date(u.createdAt).toLocaleString() : "N/A",
      u.updatedAt ? new Date(u.updatedAt).toLocaleString() : "N/A",
      u.role || "user",
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      columnStyles: {
        0: { cellWidth: 8 }, // #
        1: { cellWidth: 25 }, // Name
        2: { cellWidth: 40 }, // Email
        3: { cellWidth: 20 }, // Country
        4: { cellWidth: 22 }, // Phone
        5: { cellWidth: 25 }, // Created At
        6: { cellWidth: 25 }, // Last Updated
        7: { cellWidth: 15 }, // Role
      },
      didParseCell: function (data) {
        if (data.row.raw[7] === "admin") {
          data.cell.styles.fillColor = [255, 200, 200]; // soft red for admin
        }
      },
    });

    doc.save(`User_Report_${now.toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="User Management" />

      <main className="flex-grow p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <button
            onClick={generatePDF}
            className="bg-black text-white px-4 py-2 rounded transition-transform transform hover:scale-105 hover:bg-gray-800 active:scale-95"
          >
            Generate PDF
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-4/5 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black transition"
          />
        </div>

        {loading ? (
          <p className="text-center">Loading users...</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-300 border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">#</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Email</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Country</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Phone</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Created At</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Last Updated</th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">Role</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <tr
                    key={user._id}
                    className={`hover:bg-gray-50 transition ${
                      user.role === "admin" ? "bg-red-100 font-semibold" : ""
                    }`}
                  >
                    <td className="px-4 py-2 border-r">{users.length - index}</td>
                    <td className="px-4 py-2 border-r">{user.name}</td>
                    <td className="px-4 py-2 border-r">{user.gmail}</td>
                    <td className="px-4 py-2 border-r">{user.country}</td>
                    <td className="px-4 py-2 border-r">{user.phone}</td>
                    <td className="px-4 py-2 border-r">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
                    </td>
                    <td className="px-4 py-2 border-r">
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "N/A"}
                    </td>
                    <td className="px-4 py-2 border-r">{user.role}</td>
                    <td className="px-4 py-2 flex space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1 bg-black text-white rounded transition-transform transform hover:scale-105 active:scale-95"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="px-3 py-1 bg-red-600 text-white rounded transition-transform transform hover:scale-105 active:scale-95"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-4 text-gray-500">
                      {searchQuery
                        ? "No search results found. Try searching by name or email."
                        : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {modalOpen && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md transform transition-all duration-300 scale-100">
              <h2 className="text-xl font-bold mb-4">Edit User</h2>
              <form onSubmit={handleModalSubmit} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editingUser.name}
                    onChange={handleModalChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
                </div>
                <div>
                  <label className="block mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    name="gmail"
                    value={editingUser.gmail}
                    onChange={handleModalChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.gmail && <p className="text-red-500 text-sm">{errors.gmail}</p>}
                </div>
                <div>
                  <label className="block mb-1 font-medium">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={editingUser.phone}
                    onChange={handleModalChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block mb-1 font-medium">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={editingUser.country}
                    onChange={handleModalChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  {errors.country && <p className="text-red-500 text-sm">{errors.country}</p>}
                </div>
                <div>
                  <label className="block mb-1 font-medium">Role</label>
                  <select
                    name="role"
                    value={editingUser.role}
                    onChange={handleModalChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  {editingUser.role === "admin" && (
                    <div className="mt-2">
                      <p className="text-yellow-600 text-sm mb-1">
                        ⚠️ Changing role to Admin will grant full system permissions.  
                        Type <b>'Grant Admin permission'</b> below to confirm:
                      </p>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Grant Admin permission"
                      />
                      {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded border transition-transform transform hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black text-white rounded transition-transform transform hover:scale-105 active:scale-95"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default UserManagement;