import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Signup from "./pages/Signup.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MerchantDashboard from "./pages/MerchantDashboard.jsx";
import MerchantInvites from "./pages/MerchantInvites.jsx";
import MerchantStoreGraphs from "./pages/MerchantStoreGraphs.jsx";
import MerchantStores from "./pages/MerchantStores.jsx";
import Messages from "./pages/Messages.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import PurchaseOrders from "./pages/PurchaseOrders.jsx";
import Transfers from "./pages/Transfers.jsx";
import Returns from "./pages/Returns.jsx";
import Sales from "./pages/Sales.jsx";
import Expenses from "./pages/Expenses.jsx";
import Analytics from "./pages/Analytics.jsx";
import {
  authApi,
  clearAuthSession,
  getDashboardRoute,
  getStoredToken,
  getStoredUser,
  normalizeRole,
  saveAuthSession,
} from "./services/api";

function ProtectedRoute({ allowedRoles, children }) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(user.role);
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={getDashboardRoute(userRole)} replace />;
  }

  return children;
}

export default function App() {
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isActive = true;
    const token = getStoredToken();

    if (!token) {
      setIsRestoringSession(false);
      return undefined;
    }

    authApi
      .me()
      .then((response) => {
        if (!isActive) {
          return;
        }
        const user = response.data;
        saveAuthSession(token, user);
        if (location.pathname === "/" || location.pathname === "/login") {
          navigate(getDashboardRoute(user.role), { replace: true });
        }
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        clearAuthSession();
        if (location.pathname !== "/login") {
          navigate("/login", { replace: true });
        }
      })
      .finally(() => {
        if (isActive) {
          setIsRestoringSession(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [location.pathname, navigate]);

  if (isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0FDF4] text-[#064E3B]">
        Restoring session...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clerk"
        element={
          <ProtectedRoute allowedRoles={["clerk"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant"
        element={
          <ProtectedRoute allowedRoles={["merchant"]}>
            <MerchantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/invites"
        element={
          <ProtectedRoute allowedRoles={["merchant"]}>
            <MerchantInvites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/graphs"
        element={
          <ProtectedRoute allowedRoles={["merchant"]}>
            <MerchantStoreGraphs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/merchant/stores"
        element={
          <ProtectedRoute allowedRoles={["merchant"]}>
            <MerchantStores />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant", "clerk"]}>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <Suppliers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <PurchaseOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfers"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <Transfers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/returns"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <Returns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <Sales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={["admin", "merchant"]}>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
