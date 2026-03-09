import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChildren } from "../hooks/useChildren";
import { ChildCard } from "../components/ChildCard";
import { Modal } from "../components/Modal";
import { ChildForm } from "../components/ChildForm";
import { WhatsAppSettings } from "../components/WhatsAppSettings";
import { ChildDetailView } from "./ChildDetailView";
import type { Child, ChildFormData } from "../types";

export function ParentDashboard() {
  const { profile } = useAuth();
  const { children, loading, createChild, updateChild, deleteChild } =
    useChildren(profile?.id ?? null);
  const [showAdd, setShowAdd] = useState(false);
  const [editChild, setEdit] = useState<Child | null>(null);
  const [delChild, setDel] = useState<Child | null>(null);
  const [selected, setSelected] = useState<Child | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState("");

  if (selected) {
    return (
      <ChildDetailView
        child={selected}
        onBack={() => setSelected(null)}
        isDoctor={false}
      />
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 32,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "DM Serif Display, serif",
              fontSize: "2rem",
              color: "#0F172A",
            }}
          >
            My Children
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "#64748B",
              fontFamily: "DM Sans, sans-serif",
              fontSize: "0.9rem",
            }}
          >
            Track immunisation schedules for all your children
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: "linear-gradient(135deg,#06B6D4,#0891B2)",
            border: "none",
            borderRadius: 12,
            padding: "11px 22px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "#fff",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 4px 16px rgba(6,182,212,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16 }}>+</span> Add Child
        </button>
      </div>

      {/* Stats bar */}
      {children.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
            background: "#F8FAFC",
            borderRadius: 14,
            padding: 16,
            marginBottom: 28,
          }}
        >
          <StatCard
            value={children.length}
            label="Children Registered"
            color="#0891B2"
            bg="#E0F2FE"
          />
          <StatCard
            value={
              children.filter(
                (c) =>
                  Math.floor(
                    (Date.now() - new Date(c.dob).getTime()) /
                      (7 * 24 * 60 * 60 * 1000),
                  ) <= 208,
              ).length
            }
            label="In Active Schedule"
            color="#15803D"
            bg="#DCFCE7"
          />
          <StatCard
            value={children.length}
            label="Profiles Complete"
            color="#7C3AED"
            bg="#EDE9FE"
          />
        </div>
      )}

      {/* Children list */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#94A3B8",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>Loading
          children...
        </div>
      ) : children.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            border: "2px dashed #E2E8F0",
            borderRadius: 16,
            background: "#FAFAFA",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>👶</div>
          <div
            style={{
              fontFamily: "DM Serif Display, serif",
              fontSize: "1.3rem",
              color: "#0F172A",
              marginBottom: 8,
            }}
          >
            No children added yet
          </div>
          <p
            style={{
              color: "#64748B",
              fontSize: "0.875rem",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 20,
            }}
          >
            Add your child's profile to start tracking their immunisation
            schedule.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: "linear-gradient(135deg,#06B6D4,#0891B2)",
              border: "none",
              borderRadius: 12,
              padding: "11px 24px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#fff",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            + Add First Child
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {children.map((child) => (
            <ChildCard
              key={child.id}
              child={child}
              onClick={() => setSelected(child)}
              onEdit={() => setEdit(child)}
              onDelete={() => {
                setDel(child);
                setDelError("");
              }}
              isDoctor={false}
            />
          ))}
        </div>
      )}

      {/* WhatsApp settings panel */}
      <div style={{ marginTop: 36 }}>
        <h2
          style={{
            margin: "0 0 14px",
            fontFamily: "DM Serif Display, serif",
            fontSize: "1.2rem",
            color: "#0F172A",
          }}
        >
          Notification Settings
        </h2>
        <WhatsAppSettings />
      </div>

      {/* Modals */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Child Profile"
      >
        <ChildForm
          onSubmit={async (data) => {
            const r = await createChild(data);
            if (!r.error) setShowAdd(false);
            return r;
          }}
          onCancel={() => setShowAdd(false)}
          submitLabel="Add Child"
          isEdit={false}
        />
      </Modal>

      <Modal
        isOpen={!!editChild}
        onClose={() => setEdit(null)}
        title="Edit Child Profile"
      >
        {editChild && (
          <ChildForm
            initialData={editChild}
            onSubmit={async (data) => {
              const r = await updateChild(editChild.id, data);
              if (!r.error) setEdit(null);
              return r;
            }}
            onCancel={() => setEdit(null)}
            submitLabel="Save Changes"
            isEdit={true}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!delChild}
        onClose={() => setDel(null)}
        title="Delete Child Profile"
        width={400}
      >
        {delChild && (
          <div>
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: "#DC2626",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.9rem",
                }}
              >
                ⚠️ This cannot be undone
              </div>
              <div
                style={{
                  color: "#7F1D1D",
                  fontSize: "0.82rem",
                  marginTop: 4,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                All vaccination records for{" "}
                <strong>{delChild.full_name}</strong> will be permanently
                deleted.
              </div>
            </div>
            {delError && (
              <div
                style={{
                  color: "#DC2626",
                  fontSize: "0.82rem",
                  marginBottom: 12,
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {delError}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDel(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                  color: "#475569",
                }}
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  const { error } = await deleteChild(delChild.id);
                  if (error) setDelError(error);
                  else setDel(null);
                  setDeleting(false);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#DC2626",
                  border: "none",
                  borderRadius: 10,
                  cursor: deleting ? "default" : "pointer",
                  fontWeight: 700,
                  fontFamily: "DM Sans, sans-serif",
                  color: "#fff",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
  bg,
}: {
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        background: bg,
        borderRadius: 10,
        padding: "12px 8px",
      }}
    >
      <div
        style={{
          fontFamily: "DM Serif Display, serif",
          fontSize: "1.8rem",
          color,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.72rem",
          color,
          opacity: 0.8,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}
