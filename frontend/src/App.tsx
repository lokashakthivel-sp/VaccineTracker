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
          background: "#F8FAFC",
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
            border: "3px solid #E2E8F0",
            borderTopColor: "#06B6D4",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
          Loading VaccineTrack...
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
          background: "#F8FAFC",
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
            border: "3px solid #E2E8F0",
            borderTopColor: "#06B6D4",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
          Loading VaccineTrack...
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
            <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
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
      {/* Find Doctors — parents only */}
      <Route
        path="/find-doctors"
        element={
          <ProtectedRoute requiredRole="parent">
            <Navbar />
            <FindDoctors />
            <VaccineChatbot />
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
