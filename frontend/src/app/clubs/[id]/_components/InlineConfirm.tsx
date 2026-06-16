"use client";

export function InlineConfirm({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 12px" }}>
      <span style={{ color: "var(--gx-text-2)" }}>{message}</span>
      <button onClick={onConfirm} style={{ color: "var(--gx-red)", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Delete</button>
      <button onClick={onCancel} style={{ color: "var(--gx-text-3)", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
    </div>
  );
}
