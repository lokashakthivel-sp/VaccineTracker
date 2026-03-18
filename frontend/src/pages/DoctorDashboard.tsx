import React, { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Child } from "../types";
import { ChildDetailView } from "./ChildDetailView";
import { formatAge } from "../lib/vaccineSchedule";
import { DoctorLocationSetup } from "../components/DoctorLocationSetup";
import { DNA } from "react-loader-spinner";

export function DoctorDashboard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);

    // Search by name or partial ID
    const q = query.trim();
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);

    const { data, error } = await supabase
      .from("children")
      .select("*")
      .or(
        isUUID
          ? `full_name.ilike.%${q}%,id.eq.${q}` // exact UUID match
          : `full_name.ilike.%${q}%`, // name search only
      )
      .limit(20);

    if (error) setError(error.message);
    else setResults((data as Child[]) || []);
    setLoading(false);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  if (selectedChild) {
    return (
      <ChildDetailView
        child={selectedChild}
        onBack={() => setSelectedChild(null)}
        isDoctor={true}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "Poppins",
            fontSize: "2rem",
            color: "#0F172A",
          }}
        >
          Doctor Dashboard
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            color: "#64748B",
            fontFamily: "Poppins, sans-serif",
            fontSize: "0.9rem",
          }}
        >
          Search for a child to view and record vaccinations
        </p>
      </div>

      {/* Info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 32,
          background: "#f8feff",
          borderRadius: 14,
          padding: 16,
          border: "1.5px solid #99ecff",
        }}
      >
        {[
          {
            icon: "🔍",
            title: "Search",
            desc: "Find patients by name or ID",
            bg: "#EFF6FF",
            color: "#1D4ED8",
          },
          {
            icon: "💉",
            title: "Record",
            desc: "Mark vaccines as issued or authorized",
            bg: "#F0FDF4",
            color: "#15803D",
          },
          {
            icon: "📋",
            title: "Notes",
            desc: "Add batch numbers & clinical notes",
            bg: "#FFFBEB",
            color: "#92400E",
          },
        ].map((card) => (
          <div
            key={card.title}
            style={{
              background: card.bg,
              borderRadius: 12,
              padding: "16px",
              border: `1.5px solid ${card.color}22`,
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = card.color + "21";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.background = card.bg;
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>{card.icon}</div>
            <div
              style={{
                fontWeight: 700,
                fontFamily: "Poppins",
                color: card.color,
                fontSize: "0.95rem",
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748B",
                fontFamily: "Poppins, sans-serif",
                marginTop: 4,
              }}
            >
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div
        style={{
          background: "#f8feff",
          borderRadius: 16,
          padding: "20px",
          border: "1.5px solid #99ecff",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          marginBottom: 24,
        }}
      >
        <label
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#374151",
            fontFamily: "Poppins, sans-serif",
            display: "block",
            marginBottom: 10,
          }}
        >
          Search Patient
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter child's name or ID..."
            style={{
              flex: 1,
              padding: "11px 16px",
              border: "1.5px solid #E2E8F0",
              borderRadius: 12,
              fontSize: "0.9rem",
              fontFamily: "Poppins, sans-serif",
              outline: "none",
              color: "#0F172A",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          />
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            style={{
              padding: "11px 24px",
              background: loading
                ? "#94A3B8"
                : "linear-gradient(135deg, #06B6D4, #0891B2)",
              border: "none",
              borderRadius: 12,
              cursor: loading || !query.trim() ? "default" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#fff",
              fontFamily: "Poppins, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <div
          style={{
            fontSize: "0.72rem",
            color: "#94A3B8",
            marginTop: 8,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Search by full name (partial match) or exact patient ID
        </div>
      </div>

      {/* Results */}
      {error && (
        <div
          style={{
            color: "#DC2626",
            fontFamily: "Poppins, sans-serif",
            padding: "12px 16px",
            background: "#FEF2F2",
            borderRadius: 10,
            marginBottom: 16,
            border: "1px solid #FECACA",
          }}
        >
          {error}
        </div>
      )}

      {searched && !loading && (
        <>
          {results.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                border: "2px dashed #E2E8F0",
                borderRadius: 16,
                background: "#FAFAFA",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
              <div
                style={{
                  fontFamily: "Poppins",
                  fontSize: "1.1rem",
                  color: "#0F172A",
                  marginBottom: 6,
                }}
              >
                No patients found
              </div>
              <div
                style={{
                  color: "#64748B",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "0.85rem",
                }}
              >
                Try a different name or patient ID
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "#64748B",
                  fontFamily: "Poppins, sans-serif",
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                {results.length} patient{results.length !== 1 ? "s" : ""} found
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {results.map((child) => (
                  <div
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    style={{
                      background: "#f8feff",
                      borderRadius: 14,
                      padding: "16px 20px",
                      border: "1.5px solid #99ecff",
                      cursor: "pointer",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = "#06B6D4";
                      el.style.boxShadow = "0 4px 16px rgba(6,182,212,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = "#99ecff";
                      el.style.boxShadow = "0 1px 6px rgba(0,0,0,0.04)";
                    }}
                  >
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          child.gender === "male" ? "#DBEAFE" : "#FCE7F3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                      }}
                    >
                      {child.gender === "male"
                        ? "♂"
                        : child.gender === "female"
                          ? "♀"
                          : "⚧"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontFamily: "Poppins",
                          color: "#0F172A",
                          fontSize: "1rem",
                        }}
                      >
                        {child.full_name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#64748B",
                          fontFamily: "Poppins, sans-serif",
                          marginTop: 2,
                        }}
                      >
                        {formatAge(child.dob)} old • {child.gender}{" "}
                        {child.blood_group && child.blood_group !== "unknown"
                          ? `• ${child.blood_group}`
                          : ""}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#94A3B8",
                          fontFamily: "Poppins, sans-serif",
                          marginTop: 2,
                          fontStyle: "italic",
                        }}
                      >
                        ID: {child.id}
                      </div>
                    </div>
                    <div
                      style={{
                        color: "#94A3B8",
                        fontSize: "1.1rem",
                        flexShrink: 0,
                      }}
                    >
                      →
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!searched && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "2px dashed #99ecff",
            borderRadius: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 10 }}>👩‍⚕️</div>
          <div
            style={{
              fontFamily: "Poppins",
              fontSize: "1.2rem",
              color: "#0F172A",
              marginBottom: 6,
            }}
          >
            Search for a patient
          </div>
          <div
            style={{
              color: "#94A3B8",
              fontFamily: "Poppins, sans-serif",
              fontSize: "0.85rem",
            }}
          >
            Use the search bar above to find a child by name or ID
          </div>
        </div>
      )}

      {searched && loading && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            border: "2px dashed #99ecff",
            borderRadius: 16,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <DNA
            visible={true}
            height="80"
            width="80"
            ariaLabel="dna-loading"
            wrapperStyle={{}}
            wrapperClass="dna-wrapper"
          />
          <div style={{ color: "#94A3B8", fontSize: "0.875rem" }}>
            Loading...
          </div>
        </div>
      )}

      <DoctorLocationSetup />
    </div>
  );
}
