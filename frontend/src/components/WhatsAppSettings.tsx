import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { savePhoneNumber, getSetupInfo } from "../lib/apiClient";
import { useAuth } from "../context/AuthContext";
import { SetupInfo } from "@/types";

export function WhatsAppSettings() {
  const { profile } = useAuth();
  const [phone, setPhone] = useState("");
  const [savedPhone, setSavedPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [setupInfo, setsetupInfo] = useState<SetupInfo | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("profiles")
      .select("phone_number")
      .eq("id", profile.id)
      .single()
      .then(({ data }) => {
        if (data?.phone_number) {
          setSavedPhone(data.phone_number);
          setPhone(data.phone_number);
        }
      });
    getSetupInfo().then(setsetupInfo);
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !phone.trim()) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    const result = await savePhoneNumber(profile.id, phone.trim());
    if (result.success && result.phone_e164) {
      setSavedPhone(result.phone_e164);
      setPhone(result.phone_e164);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } else {
      setError(result.error ?? "Failed to save");
    }
    setSaving(false);
  };

  const inp: React.CSSProperties = {
    flex: 1,
    padding: "10px 14px",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    fontSize: "0.9rem",
    fontFamily: "DM Sans, sans-serif",
    outline: "none",
    color: "#0F172A",
    transition: "border-color 0.15s",
  };

  const apiDown = setupInfo === null;

  return (
    <div
      style={{
        background: "#f8feff",
        borderRadius: 16,
        padding: "22px 24px",
        border: "1px solid #99ecff",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#DCFCE7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          📱
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
            WhatsApp Reminders
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#64748B",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Receive vaccine alerts directly on WhatsApp
          </div>
        </div>
        {savedPhone && (
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
            ✓ Active
          </span>
        )}
      </div>

      {/* API offline notice */}
      {apiDown && (
        <div
          style={{
            background: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.78rem",
            color: "#92400E",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 14,
          }}
        >
          ⚠️ Python API is not running — start it to enable WhatsApp features.
        </div>
      )}

      {/* Phone form */}
      <form
        onSubmit={handleSave}
        style={{ display: "flex", gap: 10, marginBottom: 10 }}
      >
        <input
          style={inp}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          type="tel"
          disabled={saving}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#25D366")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
        />
        <button
          type="submit"
          disabled={saving || !phone.trim()}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: 10,
            background: saving || !phone.trim() ? "#94A3B8" : "#25D366",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.85rem",
            fontFamily: "DM Sans, sans-serif",
            cursor: saving ? "default" : "pointer",
            whiteSpace: "nowrap",
            transition: "background 0.15s",
          }}
        >
          {saving ? "Saving..." : savedPhone ? "Update" : "Save"}
        </button>
      </form>

      <div
        style={{
          fontSize: "0.72rem",
          color: "#94A3B8",
          fontFamily: "DM Sans, sans-serif",
          marginBottom: 12,
        }}
      >
        Enter in international format, e.g. <strong>+919876543210</strong>.
        We'll normalise it automatically.
      </div>

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
            marginBottom: 12,
          }}
        >
          ✓ Saved! Reminders will be sent to <strong>{savedPhone}</strong> on
          WhatsApp.
        </div>
      )}

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
            marginBottom: 12,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {setupInfo && !setupInfo.green_api_configured && (
        <div
          style={{
            background: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.78rem",
            color: "#92400E",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ⚠️ Green API is not configured.
        </div>
      )}
    </div>
  );
}
