/**
 * DoctorLocationSetup
 * Lets a doctor save their clinic name, address and GPS coordinates.
 * Shown at the bottom of the Doctor Dashboard.
 * Location is used by parents to find the nearest registered doctor.
 */
import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface LocationData {
  clinic_name: string;
  clinic_address: string;
  lat: number | null;
  lng: number | null;
}

export function DoctorLocationSetup() {
  const { profile } = useAuth();
  const [form, setForm] = useState<LocationData>({
    clinic_name: "",
    clinic_address: "",
    lat: null,
    lng: null,
  });
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [hasLocation, setHasLocation] = useState(false);

  // Load existing values from profiles
  useEffect(() => {
    if (!profile) return;
    supabase
      .from("profiles")
      .select("clinic_name, clinic_address, lat, lng")
      .eq("id", profile.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          clinic_name: data.clinic_name ?? "",
          clinic_address: data.clinic_address ?? "",
          lat: data.lat ?? null,
          lng: data.lng ?? null,
        });
        setHasLocation(!!(data.lat && data.lng));
      });
  }, [profile]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setDetecting(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }));
        setHasLocation(true);
        setDetecting(false);
      },
      (err) => {
        setError(
          `Could not get location: ${err.message}. Please allow location access and try again.`,
        );
        setDetecting(false);
      },
      { timeout: 25000, enableHighAccuracy: true },
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.lat || !form.lng) {
      setError("Please detect your location before saving.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess(false);

    const { error: err } = await supabase
      .from("profiles")
      .update({
        clinic_name: form.clinic_name || null,
        clinic_address: form.clinic_address || null,
        lat: form.lat,
        lng: form.lng,
      })
      .eq("id", profile.id);

    if (err) setError(err.message);
    else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  const inp: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: "0.875rem",
    fontFamily: "DM Sans, sans-serif",
    outline: "none",
    color: "#0F172A",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "22px 24px",
        border: "1.5px solid #E2E8F0",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          📍
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontFamily: "DM Serif Display, serif",
              fontSize: "1rem",
              color: "#0F172A",
            }}
          >
            Clinic Location
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#64748B",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Parents can find you when searching for nearby doctors
          </div>
        </div>
        {hasLocation && (
          <span
            style={{
              background: "#DCFCE7",
              color: "#16A34A",
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 999,
              fontFamily: "DM Sans, sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            ✓ Location saved
          </span>
        )}
      </div>

      <form onSubmit={handleSave}>
        {/* Clinic name */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#374151",
              fontFamily: "DM Sans, sans-serif",
              display: "block",
              marginBottom: 6,
            }}
          >
            Clinic / Hospital Name
          </label>
          <input
            style={inp}
            value={form.clinic_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, clinic_name: e.target.value }))
            }
            placeholder="e.g. City Children's Clinic"
            onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          />
        </div>

        {/* Clinic address */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#374151",
              fontFamily: "DM Sans, sans-serif",
              display: "block",
              marginBottom: 6,
            }}
          >
            Clinic Address
          </label>
          <input
            style={inp}
            value={form.clinic_address}
            onChange={(e) =>
              setForm((f) => ({ ...f, clinic_address: e.target.value }))
            }
            placeholder="e.g. 12, Gandhi Road, Chennai - 600001"
            onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          />
        </div>

        {/* GPS location */}
        <div
          style={{
            background: form.lat ? "#F0FDF4" : "#F8FAFC",
            border: `1px solid ${form.lat ? "#BBF7D0" : "#E2E8F0"}`,
            borderRadius: 10,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#374151",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                GPS Coordinates
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748B",
                  fontFamily: "DM Sans, sans-serif",
                  marginTop: 2,
                }}
              >
                {form.lat && form.lng
                  ? `${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`
                  : "Not set — click Detect to capture your current location"}
              </div>
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 8,
                cursor: detecting ? "default" : "pointer",
                background: detecting ? "#94A3B8" : "#0891B2",
                color: "#fff",
                fontSize: "0.8rem",
                fontWeight: 700,
                fontFamily: "DM Sans, sans-serif",
                whiteSpace: "nowrap",
              }}
            >
              {detecting ? "⏳ Detecting..." : "📍 Detect My Location"}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.82rem",
              color: "#DC2626",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 14,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.82rem",
              color: "#16A34A",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 14,
            }}
          >
            ✓ Location saved! Parents can now find you on the map.
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !form.lat}
          style={{
            width: "100%",
            padding: "11px",
            border: "none",
            borderRadius: 10,
            background:
              saving || !form.lat
                ? "#94A3B8"
                : "linear-gradient(135deg, #06B6D4, #0891B2)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.9rem",
            fontFamily: "DM Sans, sans-serif",
            cursor: saving || !form.lat ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Location"}
        </button>
      </form>
    </div>
  );
}
