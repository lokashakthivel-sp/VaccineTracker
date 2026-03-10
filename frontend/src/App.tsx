import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { ParentDashboard } from "./pages/ParentDashboard";
import { DoctorDashboard } from "./pages/DoctorDashboard";
import { Navbar } from "./components/Navbar";
import { FindDoctors } from "./pages/FindLocation";
import { VaccineChatbot } from "./components/VaccineChatbot";

function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#caf4ff",
          fontFamily: "DM Sans, sans-serif",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "3px solid #9ff1ff",
            borderTopColor: "#0099b5",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <div style={{ color: "#23373c", fontSize: "0.9rem" }}>
          Loading VaccineTracker...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (requiredRole && profile?.role !== requiredRole)
    return <Navigate to="/" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#caf4ff",
          fontFamily: "DM Sans, sans-serif",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "3px solid #9ff1ff",
            borderTopColor: "#0099b5",
            animation: "spin 0.7s linear infinite",
          }}
        />
        <div style={{ color: "#23373c", fontSize: "0.9rem" }}>
          Loading VaccineTracker...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <div style={{ minHeight: "100vh", background: "#dbf7fe" }}>
              <Navbar />
              {profile?.role === "doctor" ? (
                <DoctorDashboard />
              ) : (
                <>
                  <ParentDashboard />
                  <VaccineChatbot />
                </>
              )}
            </div>
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/find-doctors"
        element={
          <ProtectedRoute requiredRole="parent">
            <div style={{ minHeight: "100vh", background: "#dbf7fe" }}>
              <Navbar />
              <FindDoctors />
              <VaccineChatbot />
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
