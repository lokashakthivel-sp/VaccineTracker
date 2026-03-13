import type { VaccinationStatus } from "../types";

interface Props {
  status: "completed" | "upcoming" | "overdue" | VaccinationStatus;
  daysUntilDue?: number;
  className?: string;
}

const CONFIG = {
  completed: {
    bg: "#DCFCE7",
    color: "#15803D",
    label: "Completed",
    dot: "#16A34A",
  },

  issued: { bg: "#DBEAFE", color: "#1D4ED8", label: "Issued", dot: "#2563EB" },
  upcoming: {
    bg: "#FEF9C3",
    color: "#854D0E",
    label: "Upcoming",
    dot: "#CA8A04",
  },
  overdue: {
    bg: "#FEE2E2",
    color: "#B91C1C",
    label: "Overdue",
    dot: "#DC2626",
  },
  pending: {
    bg: "#F3F4F6",
    color: "#6B7280",
    label: "Pending",
    dot: "#9CA3AF",
  },
};

export function VaccineStatusBadge({
  status,
  daysUntilDue,
  className = "",
}: Props) {
  const cfg = CONFIG[status] || CONFIG.pending;

  let label = cfg.label;
  if (status === "upcoming" && daysUntilDue !== undefined) {
    if (daysUntilDue === 0) label = "Due Today";
    else if (daysUntilDue <= 7) label = `Due in ${daysUntilDue}d`;
    else label = "Upcoming";
  }
  if (status === "overdue" && daysUntilDue !== undefined) {
    const overdueDays = Math.abs(daysUntilDue);
    label = `${overdueDays}d Overdue`;
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.03em",
        backgroundColor: cfg.bg,
        color: cfg.color,
        fontFamily: "Poppins, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: cfg.dot,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
