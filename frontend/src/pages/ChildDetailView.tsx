import { useState } from "react";
import { format } from "date-fns";
import type { Child, VaccineScheduleEntry } from "../types";
import { useVaccinations } from "../hooks/useVaccinations";
import {
  groupScheduleByAge,
  getScheduleSummary,
  formatAge,
} from "../lib/vaccineSchedule";
import { VaccineTimeline } from "../components/VaccineTimeline";
import { Modal } from "../components/Modal";
import { VaccinationForm } from "../components/VaccinationForm";
import { useAuth } from "../context/AuthContext";
import { downloadCertificate } from "../lib/apiClient";

interface Props {
  child: Child;
  onBack: () => void;
  isDoctor: boolean;
}

type FilterType = "all" | "overdue" | "upcoming" | "completed";

export function ChildDetailView({ child, onBack, isDoctor }: Props) {
  const { profile } = useAuth();
  const { schedule, loading, error, upsertVaccination } = useVaccinations(
    child.id,
    child.dob,
  );
  const [selectedEntry, setSelectedEntry] =
    useState<VaccineScheduleEntry | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadCertificate = async () => {
    setPdfLoading(true);
    setPdfError(null);
    const { error } = await downloadCertificate(child.id, child.full_name, {
      generatedBy: profile?.full_name,
    });
    if (error) {
      console.log(error);
      setPdfError(error);
    }
    setPdfLoading(false);
  };

  const filteredSchedule =
    filter === "all" ? schedule : schedule.filter((e) => e.status === filter);
  const groups = groupScheduleByAge(filteredSchedule);
  const stats = getScheduleSummary(schedule);
  const completionPct =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleVaccineClick = (entry: VaccineScheduleEntry) => {
    if (isDoctor) setSelectedEntry(entry);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "#ffffff",
            border: "none",
            borderRadius: 10,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#475569",
            fontFamily: "Poppins, sans-serif",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <button
            onClick={handleDownloadCertificate}
            disabled={pdfLoading}
            title="Downloads a PDF certificate via the Python API"
            style={{
              background: pdfLoading
                ? "#94A3B8"
                : "linear-gradient(135deg, #7C3AED, #6D28D9)",
              border: "none",
              borderRadius: 10,
              padding: "8px 18px",
              cursor: pdfLoading ? "default" : "pointer",
              fontSize: "0.82rem",
              color: "#fff",
              fontFamily: "Poppins, sans-serif",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
              boxShadow: pdfLoading
                ? "none"
                : "0 4px 14px rgba(124,58,237,0.35)",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 14 }}>📄</span>
            {pdfLoading ? "Generating PDF..." : "Download Certificate"}
          </button>
          {pdfError && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#DC2626",
                fontFamily: "Poppins, sans-serif",
                maxWidth: 240,
                textAlign: "right",
              }}
            >
              {pdfError.includes("Failed to fetch")
                ? "⚠️ Python API not running"
                : `⚠️ ${pdfError}`}
            </span>
          )}
        </div>
      </div>

      {/* Child header */}
      <div
        style={{
          background: "#f8feff",
          borderRadius: 16,
          padding: "24px",
          marginBottom: 24,
          border: "1.5px solid #99ecff",
          boxShadow: "0 5px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: child.gender === "male" ? "#DBEAFE" : "#FCE7F3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            {child.gender === "male"
              ? "♂"
              : child.gender === "female"
                ? "♀"
                : "⚧"}
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "Poppins",
                fontSize: "1.5rem",
                color: "#0F172A",
              }}
            >
              {child.full_name}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 6,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#64748B",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                {formatAge(child.dob)} old
              </span>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#64748B",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Born {format(new Date(child.dob), "dd MMMM yyyy")}
              </span>
              {child.blood_group && child.blood_group !== "unknown" && (
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "#64748B",
                    fontFamily: "Poppins, sans-serif",
                  }}
                >
                  🩸 {child.blood_group}
                </span>
              )}
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#94A3B8",
                  fontFamily: "Poppins, sans-serif",
                  fontStyle: "italic",
                }}
              >
                ID: {child.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#475569",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Immunisation Progress
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#0891B2",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              {completionPct}%
            </span>
          </div>
          <div
            style={{
              background: "#E2E8F0",
              borderRadius: 999,
              height: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${completionPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #06B6D4, #0891B2)",
                borderRadius: 999,
                transition: "width 0.8s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <StatPill
              count={stats.completed}
              label="Completed"
              color="#16A34A"
              bg="#DCFCE7"
            />
            <StatPill
              count={stats.overdue}
              label="Overdue"
              color="#DC2626"
              bg="#FEE2E2"
            />
            <StatPill
              count={stats.upcoming}
              label="Upcoming"
              color="#D97706"
              bg="#FEF3C7"
            />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        {(
          [
            { key: "all", label: `All (${stats.total})` },
            { key: "overdue", label: `Overdue (${stats.overdue})` },
            { key: "upcoming", label: `Upcoming (${stats.upcoming})` },
            { key: "completed", label: `Completed (${stats.completed})` },
          ] as { key: FilterType; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border:
                filter === tab.key ? "2px solid #06B6D4" : "2px solid #E2E8F0",
              background: filter === tab.key ? "#F0FDFA" : "#fff",
              color: filter === tab.key ? "#0891B2" : "#64748B",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              fontFamily: "Poppins, sans-serif",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#94A3B8",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          Loading schedule...
        </div>
      ) : error ? (
        <div
          style={{
            color: "#DC2626",
            fontFamily: "Poppins, sans-serif",
            padding: 20,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      ) : groups.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#94A3B8",
            fontFamily: "Poppins, sans-serif",
            background: "#f8feff",
            borderRadius: 12,
          }}
        >
          No vaccines in this category
        </div>
      ) : (
        <>
          {isDoctor && (
            <div
              style={{
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: "0.8rem",
                color: "#1D4ED8",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              Click any vaccine to record or update vaccination details
            </div>
          )}
          <VaccineTimeline
            groups={groups}
            onVaccineClick={handleVaccineClick}
            isDoctor={isDoctor}
          />
        </>
      )}

      {/* Vaccination form modal (Doctor only) */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Record Vaccination"
        width={520}
      >
        {selectedEntry && profile && (
          <VaccinationForm
            entry={selectedEntry}
            onSubmit={async (data) => {
              const result = await upsertVaccination(
                selectedEntry.vaccine.id,
                data,
                profile.id,
              );
              if (!result.error) setSelectedEntry(null);
              return result;
            }}
            onCancel={() => setSelectedEntry(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function StatPill({
  count,
  label,
  color,
  bg,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 8,
        padding: "5px 12px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "0.95rem",
          color,
          fontFamily: "Poppins",
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: "0.72rem",
          color,
          opacity: 0.85,
          fontFamily: "Poppins, sans-serif",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}
