import React, { useState } from "react";
import type { Child, ChildFormData, Gender, BloodGroup } from "../types";

interface Props {
  initialData?: Partial<Child>;
  onSubmit: (data: ChildFormData) => Promise<{ error: string | null }>;
  onCancel: () => void;
  submitLabel?: string;
  isEdit: boolean;
}

const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
];

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
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#475569",
  fontFamily: "DM Sans, sans-serif",
  marginBottom: 5,
  display: "block",
};

export function ChildForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  isEdit,
}: Props) {
  const [form, setForm] = useState<ChildFormData>({
    full_name: initialData?.full_name || "",
    dob: initialData?.dob || "",
    gender: (initialData?.gender as Gender) || "male",
    blood_group: (initialData?.blood_group as BloodGroup) || "unknown",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!form.dob) {
      setError("Date of birth is required");
      return;
    }
    const dob = new Date(form.dob);
    if (dob > new Date()) {
      setError("Date of birth cannot be in the future");
      return;
    }

    setLoading(true);
    setError("");
    const result = await onSubmit(form);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  const set =
    (key: keyof ChildFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <label style={labelStyle}>Full Name *</label>
        <input
          style={inputStyle}
          value={form.full_name}
          onChange={set("full_name")}
          placeholder="Child's full name"
          required
          onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
        />
      </div>

      <div>
        <label style={labelStyle}>Date of Birth *</label>
        <input
          style={inputStyle}
          type="date"
          value={form.dob}
          onChange={set("dob")}
          max={new Date().toISOString().split("T")[0]}
          required
          onFocus={(e) => (e.currentTarget.style.borderColor = "#06B6D4")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
          disabled={isEdit}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Gender *</label>
          <select
            style={inputStyle}
            value={form.gender}
            onChange={set("gender")}
            disabled={isEdit}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Blood Group</label>
          <select
            style={inputStyle}
            value={form.blood_group}
            onChange={set("blood_group")}
            disabled={isEdit}
          >
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg === "unknown" ? "Unknown" : bg}
              </option>
            ))}
          </select>
        </div>
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

      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
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
            flex: 1,
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
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
