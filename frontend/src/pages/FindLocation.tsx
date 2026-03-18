import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { DoctorProfile } from "../types";
import { DNA } from "react-loader-spinner";

declare global {
  interface Window {
    L: any;
  }
}

function loadLeaflet(): Promise<void> {
  if (window.L) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    // JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ── Haversine (client-side fallback for distance label)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function FindDoctors() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [radius, setRadius] = useState(25);
  const [parentPos, setParentPos] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selected, setSelected] = useState<DoctorProfile | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load Leaflet on mount
  useEffect(() => {
    loadLeaflet()
      .then(() => setMapReady(true))
      .catch(() =>
        setError("Could not load map library. Check your internet connection."),
      );
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMapRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [13, 80],
      10,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(map);
    leafletMapRef.current = map;
  }, [mapReady]);

  // Update map markers when doctors list changes
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const L = window.L;
    const map = leafletMapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (!doctors.length) return;

    const bounds: [number, number][] = [];

    // Parent marker (blue)
    if (parentPos) {
      const parentIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#3aeedc;border:3px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const pm = L.marker([parentPos.lat, parentPos.lng], { icon: parentIcon })
        .addTo(map)
        .bindPopup("<b>📍 Your Location</b>");
      markersRef.current.push(pm);
      bounds.push([parentPos.lat, parentPos.lng]);
    }

    // Doctor markers (teal pins)
    doctors.forEach((doc) => {
      if (!doc.lat || !doc.lng) return;

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:32px;height:32px;border-radius:50% 50% 50% 0;
          background:#0891B2;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:14px;">👨‍⚕️</span>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const popup = `
        <div style="font-family:'Poppins',sans-serif;min-width:180px;">
          <div style="font-weight:700;font-size:14px;color:#0F172A;margin-bottom:4px;">
            Dr. ${doc.full_name}
          </div>
          ${doc.clinic_name ? `<div style="font-size:12px;color:#0891B2;margin-bottom:3px;">🏥 ${doc.clinic_name}</div>` : ""}
          ${doc.clinic_address ? `<div style="font-size:11px;color:#64748B;margin-bottom:4px;">📍 ${doc.clinic_address}</div>` : ""}
          <div style="font-size:12px;font-weight:700;color:#16A34A;">
            ${doc.distance_km?.toFixed(1)} km away
          </div>
        </div>`;

      const marker = L.marker([doc.lat, doc.lng], { icon })
        .addTo(map)
        .bindPopup(popup);

      marker.on("click", () => setSelected(doc));
      markersRef.current.push(marker);
      bounds.push([doc.lat, doc.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    }
  }, [doctors, parentPos]);

  // ── Search handler ──────────────────────────────────────────
  const findDoctors = async () => {
    setLoading(true);
    setError("");
    setSearched(true);
    setSelected(null);

    // 1. Get parent's location
    const pos = await new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
        timeout: 10000,
        enableHighAccuracy: true,
      });
    });

    if (!pos) {
      setError(
        "Could not get your location. Please allow location access and try again.",
      );
      setLoading(false);
      return;
    }

    const { latitude: lat, longitude: lng } = pos.coords;
    setParentPos({ lat, lng });

    // 2. Query Supabase RPC
    const { data, error: rpcError } = await supabase.rpc(
      "find_nearest_doctors",
      {
        parent_lat: lat,
        parent_lng: lng,
        radius_km: radius,
        max_results: 20,
      },
    );

    if (rpcError) {
      setError(`Search failed: ${rpcError.message}`);
      setLoading(false);
      return;
    }

    const results: DoctorProfile[] = (data || []).map((d: any) => ({
      ...d,
      distance_km: d.distance_km ?? haversineKm(lat, lng, d.lat, d.lng),
    }));

    setDoctors(results);
    setLoading(false);

    // Centre map on parent location
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], 11);
    }
  };

  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 16px",
    border: "1.5px solid #E2E8F0",
    cursor: "pointer",
    transition: "all 0.15s",
    marginBottom: 10,
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "Poppins",
            fontSize: "2rem",
            color: "#0F172A",
          }}
        >
          Find Nearby Doctors
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            color: "#64748B",
            fontFamily: "Poppins, sans-serif",
            fontSize: "0.9rem",
          }}
        >
          Locate authorised doctors registered with VaccineTracker near you
        </p>
      </div>

      {/* Search controls */}
      <div
        style={{
          background: "#f8feff",
          borderRadius: 16,
          padding: "20px",
          border: "1.5px solid #99ecff",
          marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#374151",
              fontFamily: "Poppins, sans-serif",
              display: "block",
              marginBottom: 6,
            }}
          >
            Search Radius
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1.5px solid #E2E8F0",
              borderRadius: 10,
              fontSize: "0.875rem",
              fontFamily: "Poppins, sans-serif",
              outline: "none",
              color: "#0F172A",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {[5, 10, 25, 50, 100].map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={findDoctors}
          disabled={loading}
          style={{
            padding: "11px 28px",
            border: "none",
            borderRadius: 10,
            background: loading
              ? "#94A3B8"
              : "linear-gradient(135deg,#06B6D4,#0891B2)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            fontFamily: "Poppins, sans-serif",
            cursor: loading ? "default" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? " Searching..." : "Find Doctors Near Me"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: "0.875rem",
            color: "#DC2626",
            fontFamily: "Poppins, sans-serif",
            marginBottom: 16,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Main content — map + list side by side */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Map */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            border: "1.5px solid #99ecff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            height: 520,
            background: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          {!mapReady && (
            <div
              style={{
                position: "absolute",
                textAlign: "center",
                color: "#94A3B8",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🗺️</div>
              Loading map...
            </div>
          )}
        </div>

        {/* Results list */}
        <div style={{ height: 520, overflowY: "auto" }}>
          {!searched ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                border: "2px dashed #99ecff",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 12 }}>🔍</div>
              <div
                style={{
                  fontFamily: "Poppins",
                  fontSize: "1rem",
                  color: "#0F172A",
                  marginBottom: 6,
                }}
              >
                Ready to search
              </div>
              <div
                style={{
                  color: "#94A3B8",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "0.8rem",
                }}
              >
                Click "Find Doctors Near Me" to locate registered doctors around
                your location
              </div>
            </div>
          ) : loading ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94A3B8",
                fontFamily: "Poppins, sans-serif",
                border: "2px dashed #99ecff",
                borderRadius: 16,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  <DNA
                    visible={true}
                    height="80"
                    width="80"
                    ariaLabel="dna-loading"
                    wrapperStyle={{}}
                    wrapperClass="dna-wrapper"
                  />
                </div>
                Finding doctors...
              </div>
            </div>
          ) : doctors.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                border: "2px dashed #99ecff",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 12 }}>😔</div>
              <div
                style={{
                  fontFamily: "Poppins",
                  fontSize: "1rem",
                  color: "#0F172A",
                  marginBottom: 6,
                }}
              >
                No doctors found
              </div>
              <div
                style={{
                  color: "#94A3B8",
                  fontFamily: "Poppins, sans-serif",
                  fontSize: "0.8rem",
                }}
              >
                Try increasing the search radius
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#64748B",
                  fontFamily: "Poppins, sans-serif",
                  marginBottom: 10,
                  fontWeight: 600,
                }}
              >
                {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} found
                within {radius} km
              </div>
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelected(doc);
                    // Pan map to this doctor
                    if (leafletMapRef.current && doc.lat && doc.lng) {
                      leafletMapRef.current.setView([doc.lat, doc.lng], 14);
                      // Open popup for this marker
                      markersRef.current.forEach((m) => {
                        if (
                          m.getLatLng &&
                          Math.abs(m.getLatLng().lat - doc.lat!) < 0.0001 &&
                          Math.abs(m.getLatLng().lng - doc.lng!) < 0.0001
                        ) {
                          m.openPopup();
                        }
                      });
                    }
                  }}
                  style={{
                    ...card,
                    borderColor:
                      selected?.id === doc.id ? "#0891B2" : "#E2E8F0",
                    boxShadow:
                      selected?.id === doc.id
                        ? "0 4px 16px rgba(8,145,178,0.15)"
                        : "0 1px 4px rgba(0,0,0,0.04)",
                    background: "#f8feff",
                  }}
                  onMouseEnter={(e) => {
                    if (selected?.id !== doc.id)
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "#BAE6FD";
                  }}
                  onMouseLeave={(e) => {
                    if (selected?.id !== doc.id)
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "#E2E8F0";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "#E0F2FE",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      👨‍⚕️
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontFamily: "Poppins, sans-serif",
                          fontSize: "0.9rem",
                          color: "#0F172A",
                        }}
                      >
                        Dr. {doc.full_name}
                      </div>
                      {doc.clinic_name && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#0891B2",
                            marginTop: 2,
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          {doc.clinic_name}
                        </div>
                      )}
                      {doc.clinic_address && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "#64748B",
                            marginTop: 2,
                            fontFamily: "Poppins, sans-serif",
                          }}
                        >
                          📍 {doc.clinic_address}
                        </div>
                      )}
                      <div
                        style={{
                          display: "inline-block",
                          marginTop: 6,
                          background:
                            doc.distance_km! < 5
                              ? "#DCFCE7"
                              : doc.distance_km! < 15
                                ? "#FEF3C7"
                                : "#F1F5F9",
                          color:
                            doc.distance_km! < 5
                              ? "#16A34A"
                              : doc.distance_km! < 15
                                ? "#D97706"
                                : "#475569",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontFamily: "Poppins, sans-serif",
                        }}
                      >
                        {doc.distance_km?.toFixed(1)} km away
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}
      >
        {[
          { color: "#3aeedc", label: "Your location" },
          { color: "#0891B2", label: "Registered doctor" },
        ].map((l) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "Poppins, sans-serif",
              fontSize: "0.78rem",
              color: "#64748B",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: l.color,
              }}
            />
            {l.label}
          </div>
        ))}
        <div
          style={{
            fontSize: "0.6rem",
            color: "#94A3B8",
            fontFamily: "Poppins, sans-serif",
            marginLeft: "auto",
          }}
        >
          Map data © OpenStreetMap
        </div>
      </div>
    </div>
  );
}
