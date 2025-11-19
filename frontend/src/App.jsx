// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

// Pages
import HomePage from "./Pages/home.jsx";
import SignUp from "./Pages/signup.jsx";
import SignIn from "./Pages/signin.jsx";
import ForgotPassword from "./Pages/ForgotPassword.jsx"; // Import ForgotPassword page
import ResetPassword from "./Pages/ResetPassword.jsx"; // Import ResetPassword page
import Dashboard from "./Pages/about.jsx";

import Exhibitions from "./Pages/exhibition.jsx";
import Artshow from "./Pages/artshow.jsx";
import UserProfile from "./Pages/userprofile.jsx";
import Payment from "./Pages/directbuypayment.jsx";
import Directbuy from "./Pages/productpageDirect.jsx";
import Bidbuy from "./Pages/productPageBid.jsx";
import AdminArtManagement from "./Pages/ArtManagement.jsx";
import ExhibitionsManagement from "./Pages/ExhibitionManagement.jsx";
import UserManagement from "./Pages/UserManagement.jsx";
import OrderManagement from "./Pages/OrderManagement.jsx";
import BiddingManagement from "./Pages/BiddingManagement.jsx";

// Page transition settings
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4 },
};

// AnimatedRoutes component
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route
          path="/"
          element={<motion.div {...pageTransition}><HomePage /></motion.div>}
        />
        <Route
          path="/signup"
          element={<motion.div {...pageTransition}><SignUp /></motion.div>}
        />
        <Route
          path="/signin"
          element={<motion.div {...pageTransition}><SignIn /></motion.div>}
        />
        <Route
          path="/forgot-password"
          element={<motion.div {...pageTransition}><ForgotPassword /></motion.div>}
        />
        <Route
          path="/reset-password/:token"
          element={<motion.div {...pageTransition}><ResetPassword /></motion.div>}
        />
        <Route
          path="/about"
          element={<motion.div {...pageTransition}><Dashboard /></motion.div>}
        />
        <Route
          path="/exhibitions"
          element={<motion.div {...pageTransition}><Exhibitions /></motion.div>}
        />
        <Route
          path="/artshow"
          element={<motion.div {...pageTransition}><Artshow /></motion.div>}
        />
        <Route
          path="/userprofile"
          element={<motion.div {...pageTransition}><UserProfile /></motion.div>}
        />
        <Route
          path="/directbuypayment"
          element={<motion.div {...pageTransition}><Payment /></motion.div>}
        />
        <Route
          path="/productPageDirect/:id"
          element={<motion.div {...pageTransition}><Directbuy /></motion.div>}
        />
        <Route
          path="/productPageBid/:id"
          element={<motion.div {...pageTransition}><Bidbuy /></motion.div>}
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={<motion.div {...pageTransition}><AdminArtManagement /></motion.div>}
        />
        <Route
          path="/admin/art-management"
          element={<motion.div {...pageTransition}><AdminArtManagement /></motion.div>}
        />
        <Route
          path="/admin/exhibition-management"
          element={<motion.div {...pageTransition}><ExhibitionsManagement /></motion.div>}
        />
        <Route
          path="/admin/user-management"
          element={<motion.div {...pageTransition}><UserManagement /></motion.div>}
        />
        <Route
          path="/admin/order-management"
          element={<motion.div {...pageTransition}><OrderManagement /></motion.div>}
        />
        <Route
          path="/admin/bidding-management"
          element={<motion.div {...pageTransition}><BiddingManagement /></motion.div>}
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <motion.div {...pageTransition}>
              <h1 className="text-center mt-20">404 – Page Not Found</h1>
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

// Main App component
function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
