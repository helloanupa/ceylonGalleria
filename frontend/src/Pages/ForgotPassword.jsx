import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const ForgotPassword = () => {
  const [gmail, setGmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Ceylon Galleria | Forgot Password";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/api/users/forgot-password", { gmail });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex flex-col items-center justify-center flex-grow px-6 py-24">
        <div className="w-full max-w-md bg-white border border-gray-200 shadow-md p-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 uppercase mb-6">
            Forgot Password
          </h2>

          {message && <p className="text-green-500 text-center mb-4">{message}</p>}
          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Email Address"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white font-semibold transition-all duration-300 ease-in-out hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
          <p className="text-sm text-gray-600 text-center mt-4">
            Remember your password? <Link to="/signin" className="text-black font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;