import React from "react";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import type { Child } from "../types";
import { formatAge } from "../lib/vaccineSchedule";

interface Props {
  child: Child;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  vaccineStats?: {
    completed: number;
    overdue: number;
    upcoming: number;
    total: number;
  };
  isDoctor?: boolean;
}

const GENDER_ICON: Record<string, string> = {
  male: "♂",
  female: "♀",
  other: "⚧",
};
const GENDER_COLOR: Record<string, string> = {
  male: "#3B82F6",
  female: "#EC4899",
  other: "#8B5CF6",
};

export function ChildCard({
  child,
  onClick,
  onEdit,
  onDelete,
  vaccineStats,
  isDoctor,
}: Props) {
  const age = formatAge(child.dob);
  const genderColor = GENDER_COLOR[child.gender] || "#6B7280";

  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "20px 22px",
        cursor: onClick ? "pointer" : "default",
        border: "1.5px solid #F1F5F9",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "all 0.18s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (onClick)
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 6px 24px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 2px 12px rgba(0,0,0,0.06)";
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${genderColor}, ${genderColor}88)`,
          borderRadius: "16px 16px 0 0",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: `${genderColor}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: genderColor,
              flexShrink: 0,
            }}
          >
            {GENDER_ICON[child.gender] || "👶"}
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "1rem",
                color: "#0F172A",
                fontFamily: "DM Serif Display, serif",
              }}
            >
              {child.full_name}
            </div>
            <div
              style={{ fontSize: "0.78rem", color: "#64748B", marginTop: 2 }}
            >
              {age} • Born {format(new Date(child.dob), "dd MMM yyyy")}
            </div>
          </div>
        </div>

        {!isDoctor && (onEdit || onDelete) && (
          <div
            style={{ display: "flex", gap: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <button
                onClick={onEdit}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "#475569",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                }}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                style={{
                  background: "#FEE2E2",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "#DC2626",
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div
        style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}
      >
        {child.blood_group && child.blood_group !== "unknown" && (
          <Chip
            label={`🩸 ${child.blood_group}`}
            bg="#FFF1F2"
            color="#BE185D"
          />
        )}
        <Chip
          label={`ID: ${child.id.slice(0, 8)}`}
          bg="#F8FAFC"
          color="#64748B"
        />
      </div>

      {vaccineStats && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid #F1F5F9",
          }}
        >
          <StatPill
            count={vaccineStats.completed}
            label="Done"
            color="#16A34A"
            bg="#DCFCE7"
          />
          <StatPill
            count={vaccineStats.overdue}
            label="Overdue"
            color="#DC2626"
            bg="#FEE2E2"
          />
          <StatPill
            count={vaccineStats.upcoming}
            label="Upcoming"
            color="#D97706"
            bg="#FEF3C7"
          />
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: "0.72rem",
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 999,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {label}
    </span>
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
        padding: "5px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          color,
          fontFamily: "DM Serif Display, serif",
        }}
      >
        {count}
      </span>
      <span
        style={{
          fontSize: "0.67rem",
          color,
          opacity: 0.8,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
  );
}
