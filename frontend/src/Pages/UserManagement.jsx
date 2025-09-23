import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSlidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/users/all");
        // Sort users by creation date (newest first)
        const sortedUsers = response.data.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setUsers(sortedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) =>
    Object.values(user)
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();

    // Title
    doc.setFontSize(18);
    doc.text("Gallery User Report", 14, 20);

    // Generated date & time
    doc.setFontSize(10);
    doc.text(
      `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
      14,
      28
    );

    // Table
    const tableColumn = ["#", "Name", "Email", "Country", "Phone"];
    // Create a copy of users array and reverse sort by creation date (oldest first)
    const sortedUsersForPDF = [...users].sort((a, b) => {
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    
    const tableRows = sortedUsersForPDF.map((u, index) => [
      index + 1, // This will now start from 1 for the oldest user
      u.name || "N/A",
      u.gmail || "N/A",
      u.country || "N/A",
      u.phone || "N/A",
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 36, // Start below header + generated date
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
    });

    doc.save("user_report.pdf");
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar active="User Management" />

      <main className="flex-grow p-6 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">User Management</h1>
          <button
            onClick={generatePDF}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
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
            className="w-full md:w-4/5 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {loading ? (
          <p className="text-center">Loading users...</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-300 border-collapse">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border-r">
                    Country
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium">
                    Phone Number
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-r">
                      {users.length - index}
                    </td>
                    <td className="px-4 py-2 border-r">{user.name}</td>
                    <td className="px-4 py-2 border-r">{user.gmail}</td>
                    <td className="px-4 py-2 border-r">{user.country}</td>
                    <td className="px-4 py-2">{user.phone}</td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-500">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default UserManagement;