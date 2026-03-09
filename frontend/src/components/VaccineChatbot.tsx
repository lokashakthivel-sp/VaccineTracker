import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// ── Types ─────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Suggested questions ────────────────────────────────────────
const SUGGESTIONS = [
  "What vaccines does my newborn need?",
  "My child missed the 6-week DPT dose — what now?",
  "What are common side effects of MMR?",
  "Is the BCG vaccine safe?",
  "What is the NIS schedule for 9 months?",
  "Can vaccines be given if the child has a cold?",
];

// ── Markdown-lite renderer ─────────────────────────────────────
function renderMessage(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold
    line = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Bullet points
    if (line.match(/^[-•*]\s/)) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3 }}>
          <span style={{ color: "#0891B2", flexShrink: 0, marginTop: 1 }}>
            •
          </span>
          <span
            dangerouslySetInnerHTML={{ __html: line.replace(/^[-•*]\s/, "") }}
          />
        </div>
      );
    }
    if (line === "") return <div key={i} style={{ height: 6 }} />;
    return (
      <div
        key={i}
        style={{ marginBottom: 2 }}
        dangerouslySetInnerHTML={{ __html: line }}
      />
    );
  });
}

// ── Main component ─────────────────────────────────────────────
export function VaccineChatbot() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const response = await fetch(`${apiUrl}/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail ?? `Server error ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError("");
  };

  // Only show for parents
  if (profile?.role !== "parent") return null;

  return (
    <>
      {/* ── Floating button ─────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ask VaccineBot"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1000,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "none",
          background: open
            ? "#0F172A"
            : "linear-gradient(135deg, #0891B2, #0E7490)",
          color: "#fff",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(8,145,178,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
          transform: open ? "rotate(0deg)" : "rotate(0deg)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Unread dot when closed and messages exist */}
      {!open && messages.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 78,
            right: 28,
            zIndex: 1001,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#EF4444",
            border: "2px solid #fff",
          }}
        />
      )}

      {/* ── Chat window ─────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 28,
            zIndex: 999,
            width: 380,
            height: 560,
            background: "#fff",
            borderRadius: 20,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #E2E8F0",
            animation: "slideUp 0.2s ease-out",
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)    scale(1); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
            }
            .chat-input:focus { outline: none; border-color: #0891B2 !important; }
            .suggestion-btn:hover { background: #E0F2FE !important; color: #0E7490 !important; }
          `}</style>

          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0F172A, #0E7490)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.95rem",
                }}
              >
                VaccineBot
              </div>
              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "0.7rem",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                India NIS vaccine assistant • Powered by Gemini
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "#94A3B8",
                  fontSize: "0.7rem",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
            {/* Welcome state */}
            {messages.length === 0 && (
              <div>
                <div
                  style={{
                    background: "linear-gradient(135deg, #E0F2FE, #F0FDF4)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    marginBottom: 14,
                    border: "1px solid #BAE6FD",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontFamily: "DM Sans, sans-serif",
                      fontSize: "0.9rem",
                      color: "#0F172A",
                      marginBottom: 4,
                    }}
                  >
                    Hi
                    {profile?.full_name
                      ? ` ${profile.full_name.split(" ")[0]}`
                      : ""}
                    !
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#475569",
                      fontFamily: "DM Sans, sans-serif",
                      lineHeight: 1.5,
                    }}
                  >
                    I'm VaccineBot — ask me anything about vaccines, the India
                    NIS schedule, missed doses, or side effects.
                  </div>
                </div>

                {/* Suggestion chips */}
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#94A3B8",
                    fontFamily: "DM Sans, sans-serif",
                    marginBottom: 8,
                    fontWeight: 600,
                  }}
                >
                  SUGGESTED QUESTIONS
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 14,
                  }}
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className="suggestion-btn"
                      onClick={() => sendMessage(s)}
                      style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: 10,
                        padding: "8px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "0.78rem",
                        color: "#374151",
                        fontFamily: "DM Sans, sans-serif",
                        transition: "all 0.15s",
                        lineHeight: 1.4,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #0891B2, #0E7490)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      marginRight: 8,
                      alignSelf: "flex-end",
                      marginBottom: 2,
                    }}
                  >
                    🤖
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #0891B2, #0E7490)"
                        : "#F8FAFC",
                    color: msg.role === "user" ? "#fff" : "#1E293B",
                    borderRadius:
                      msg.role === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    padding: "10px 14px",
                    fontSize: "0.82rem",
                    fontFamily: "DM Sans, sans-serif",
                    lineHeight: 1.55,
                    border:
                      msg.role === "assistant" ? "1px solid #E2E8F0" : "none",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {msg.role === "assistant"
                    ? renderMessage(msg.content)
                    : msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0891B2, #0E7490)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "12px 16px",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#0891B2",
                        animation: "pulse 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: "0.78rem",
                  color: "#DC2626",
                  fontFamily: "DM Sans, sans-serif",
                  marginBottom: 10,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Disclaimer */}
          <div
            style={{
              padding: "6px 14px",
              fontSize: "0.65rem",
              color: "#CBD5E1",
              fontFamily: "DM Sans, sans-serif",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            For informational purposes only — always consult your doctor
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "10px 12px 14px",
              borderTop: "1px solid #F1F5F9",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about vaccines, side effects..."
              rows={1}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "1.5px solid #E2E8F0",
                borderRadius: 12,
                fontSize: "0.85rem",
                fontFamily: "DM Sans, sans-serif",
                color: "#0F172A",
                resize: "none",
                lineHeight: 1.4,
                maxHeight: 100,
                overflowY: "auto",
                transition: "border-color 0.15s",
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: "none",
                background:
                  loading || !input.trim()
                    ? "#E2E8F0"
                    : "linear-gradient(135deg, #0891B2, #0E7490)",
                color: loading || !input.trim() ? "#94A3B8" : "#fff",
                cursor: loading || !input.trim() ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
