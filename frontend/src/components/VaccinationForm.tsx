import React, { useState } from "react";
import type { VaccineScheduleEntry, VaccinationUpdateData } from "../types";
import { format } from "date-fns";

interface Props {
  entry: VaccineScheduleEntry;
  onSubmit: (data: VaccinationUpdateData) => Promise<{ error: string | null }>;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid #E2E8F0",
  borderRadius: 10,
  fontSize: "0.875rem",
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
  boxSizing: "border-box",
  color: "#0F172A",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#475569",
  fontFamily: "DM Sans, sans-serif",
  marginBottom: 5,
  display: "block",
};

export function VaccinationForm({ entry, onSubmit, onCancel }: Props) {
  const existing = entry.vaccination;
  const isEdit = existing ? true : false;
  const [form, setForm] = useState<VaccinationUpdateData>({
    status: "issued",
    administered_date:
      existing?.administered_date || format(new Date(), "yyyy-MM-dd"),
    batch_number: existing?.batch_number || "",
    notes: existing?.notes || "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.administered_date) {
      setError("Administered date is required");
      return;
    }
    setLoading(true);
    setError("");
    const result = await onSubmit(form);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {/* Vaccine info header */}
      <div
        style={{
          background: "#F8FAFC",
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.95rem",
            fontFamily: "DM Serif Display, serif",
            color: "#0F172A",
          }}
        >
          {entry.vaccine.name}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#64748B",
            marginTop: 2,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {entry.vaccine.full_name}
        </div>
        {entry.vaccine.diseases_prevented && (
          <div
            style={{
              fontSize: "0.7rem",
              color: "#94A3B8",
              marginTop: 4,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Prevents: {entry.vaccine.diseases_prevented.join(", ")}
          </div>
        )}
      </div>

      <div>
        <label style={labelStyle}>Status *</label>
        <p style={{ ...labelStyle, marginLeft: 10, fontSize: 14 }}>
          Issued (Vaccine given and authorized)
        </p>
      </div>

      <div>
        <label style={labelStyle}>Date Administered *</label>
        <input
          type="date"
          style={inputStyle}
          value={form.administered_date}
          onChange={(e) =>
            setForm((f) => ({ ...f, administered_date: e.target.value }))
          }
          max={new Date().toISOString().split("T")[0]}
          required
          onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          disabled={isEdit}
        />
      </div>

      <div>
        <label style={labelStyle}>Batch Number</label>
        <input
          style={inputStyle}
          value={form.batch_number}
          onChange={(e) =>
            setForm((f) => ({ ...f, batch_number: e.target.value }))
          }
          placeholder="e.g. BCG-2024-LOT-42A"
          onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          disabled={isEdit}
        />
      </div>

      <div>
        <label style={labelStyle}>Clinical Notes</label>
        <textarea
          style={
            {
              ...inputStyle,
              minHeight: 80,
              resize: "vertical",
            } as React.CSSProperties
          }
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Any observations, reactions, or notes..."
          onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
        />
      </div>

      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.8rem",
            color: "#DC2626",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "10px",
            background: "#F1F5F9",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#475569",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            flex: 2,
            padding: "10px",
            background: loading
              ? "#94A3B8"
              : "linear-gradient(135deg, #06B6D4, #0891B2)",
            border: "none",
            borderRadius: 10,
            cursor: loading ? "default" : "pointer",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "#fff",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {loading
            ? "Recording..."
            : existing
              ? "Update Record"
              : "Record Vaccination"}
        </button>
      </div>
    </form>
  );
}
