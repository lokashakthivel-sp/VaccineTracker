import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("parent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      navigate("/");
    } else {
      if (!fullName.trim()) {
        setError("Full name is required");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      if (phone && !/^\+?[1-9]\d{6,14}$/.test(phone.replace(/[\s-]/g, ""))) {
        setError("Enter a valid phone number (e.g. +919876543210)");
        setLoading(false);
        return;
      }
      const { error } = await signUp(
        email,
        password,
        fullName,
        role,
        phone || undefined,
      );
      if (error) {
        setError(error);
        setLoading(false);
        return;
      }
      setSuccess(
        "Account created! Please check your email to confirm, then sign in.",
      );
      setMode("login");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: "0.9rem",
    fontFamily: "Poppins, sans-serif",
    outline: "none",
    boxSizing: "border-box",
    color: "#0F172A",
    background: "#FAFAFA",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background:
          "linear-gradient(135deg, #F0FDFA 0%, #E0F2FE 50%, #F0FDF4 100%)",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      {/* Left panel - branding */}
      <div
        style={{
          flex: 1,
          display: "none",
          background: "linear-gradient(160deg, #0F172A 0%, #0E7490 100%)",
          padding: 60,
          gap: 18,
          flexDirection: "column",
          justifyContent: "center",
          minWidth: 380,
        }}
        className="auth-panel-left"
      >
        <div>
          <div style={{ fontSize: 40 }}>💉</div>
          <div
            style={{
              fontFamily: "Poppins",
              fontSize: "2.2rem",
              color: "#fff",
              marginTop: 16,
              lineHeight: 1.2,
            }}
          >
            VaccineTracker
          </div>
          <div
            style={{
              color: "#94A3B8",
              marginTop: 8,
              lineHeight: 1.6,
              fontSize: "0.95rem",
            }}
          >
            National Immunisation Schedule tracker for India's Universal
            Immunisation Programme.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            {
              icon: "📋",
              title: "Complete NIS Schedule",
              desc: "30+ vaccines tracked automatically by age",
            },
            {
              icon: "🔔",
              title: "Never Miss a Vaccine",
              desc: "Visual overdue & upcoming alerts",
            },
            {
              icon: "👩‍⚕️",
              title: "Doctor Verified",
              desc: "Role-based access with doctor authorization",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <div
                  style={{
                    color: "#F1F5F9",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{ color: "#64748B", fontSize: "0.8rem", marginTop: 2 }}
                >
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f4fdff",
        }}
      >
        <div
          style={{
            background: "#eefdff",
            borderRadius: 20,
            padding: "40px 36px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
            width: "100%",
            maxWidth: 420,
          }}
        >
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💉</div>
            <h1
              style={{
                margin: 0,
                fontFamily: "Poppins",
                fontSize: "1.6rem",
                color: "#0F172A",
              }}
            >
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p
              style={{
                margin: "8px 0 0",
                color: "#64748B",
                fontSize: "0.85rem",
              }}
            >
              {mode === "login"
                ? "Sign in to your VaccineTracker account"
                : "Track your child's immunisation journey"}
            </p>
          </div>

          {success && (
            <div
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: "0.83rem",
                color: "#15803D",
              }}
            >
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {mode === "signup" && (
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 5,
                    display: "block",
                  }}
                >
                  Full Name *
                </label>
                <input
                  style={inputStyle}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#06B6D4")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#E2E8F0")
                  }
                />
              </div>
            )}

            <div>
              <label
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 5,
                  display: "block",
                }}
              >
                Email Address *
              </label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 5,
                  display: "block",
                }}
              >
                Password *
              </label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "signup" ? "Min. 6 characters" : "••••••••"
                }
                required
                onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              />
            </div>

            {mode === "signup" && role === "parent" && (
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 5,
                    display: "block",
                  }}
                >
                  WhatsApp Number
                  <span
                    style={{ fontWeight: 400, color: "#94A3B8", marginLeft: 6 }}
                  >
                    (for vaccine reminders)
                  </span>
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 16,
                      pointerEvents: "none",
                    }}
                  >
                    📱
                  </span>
                  <input
                    style={{ ...inputStyle, paddingLeft: 36 }}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#25D366")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#E2E8F0")
                    }
                  />
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#94A3B8",
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ color: "#25D366" }}>●</span>
                  Optional — enables WhatsApp reminders for overdue/upcoming
                  vaccines
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <label
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 8,
                    display: "block",
                  }}
                >
                  I am a *
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {(["parent", "doctor"] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        padding: "12px",
                        border: `2px solid ${role === r ? "#06B6D4" : "#E2E8F0"}`,
                        borderRadius: 12,
                        cursor: "pointer",
                        background: role === r ? "#F0FDFA" : "#FAFAFA",
                        fontFamily: "Poppins, sans-serif",
                        fontWeight: 700,
                        color: role === r ? "#0E7490" : "#64748B",
                        fontSize: "0.9rem",
                        transition: "all 0.15s",
                      }}
                    >
                      {r === "parent" ? "👨‍👧 Parent" : "👩‍⚕️ Doctor"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: "0.8rem",
                  color: "#DC2626",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: 4,
                background: loading
                  ? "#94A3B8"
                  : "linear-gradient(135deg, #06B6D4, #0891B2)",
                border: "none",
                borderRadius: 12,
                cursor: loading ? "default" : "pointer",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Poppins, sans-serif",
                letterSpacing: "0.02em",
                boxShadow: loading ? "none" : "0 4px 16px rgba(6,182,212,0.4)",
                transition: "all 0.2s",
              }}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div
            style={{
              marginTop: 20,
              textAlign: "center",
              fontSize: "0.83rem",
              color: "#64748B",
            }}
          >
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setSuccess("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#0891B2",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.83rem",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

//ipconfig /flushdns
