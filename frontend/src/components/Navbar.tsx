import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isParent = profile?.role === "parent";
  const onFind = location.pathname === "/find-doctors";

  return (
    <nav
      style={{
        background: "#b9f1ff",
        padding: "0 32px",
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #06B6D4, #0891B2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          💉
        </div>
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              color: "#0F172A",
              fontFamily: "Poppins",
              lineHeight: 1.1,
            }}
          >
            VaccineTracker
          </div>
          <div
            style={{
              fontSize: "0.65rem",
              color: "#64748B",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 500,
            }}
          >
            National Immunisation Schedule
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            background: "#ebfbff",
            color: profile?.role === "doctor" ? "#1D4ED8" : "#15803D",
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 999,
            fontFamily: "Poppins, sans-serif",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {profile?.role || "User"}
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#374151",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 500,
          }}
        >
          {profile?.full_name}
        </div>
        {isParent && (
          <button
            onClick={() => navigate(onFind ? "/" : "/find-doctors")}
            style={{
              background:
                "linear-gradient(135deg, rgb(6, 182, 212), rgb(8, 145, 178))",
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontSize: "0.8rem",
              color: "#fff",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 600,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {onFind ? "Back to Dashboard" : "Find Doctors"}
          </button>
        )}
        <button
          onClick={signOut}
          style={{
            background: "#ebfbff",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            cursor: "pointer",
            fontSize: "0.8rem",
            color: "#475569",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fff0f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#ebfbff")}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
