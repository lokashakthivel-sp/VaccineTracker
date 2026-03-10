import React, { useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = 480,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#f8feff",
          borderRadius: 18,
          width: "100%",
          maxWidth: width,
          boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
          animation: "modalIn 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1.5px solid #a4edff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "DM Serif Display, serif",
              fontSize: "1.15rem",
              color: "#0F172A",
            }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "#F1F5F9",
              border: "none",
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: "1.35rem",
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform: scale(0.3) translateY(700px); } to { opacity:1; transform: none; } }`}</style>
    </div>
  );
}
