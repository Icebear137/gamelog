import ConversationList from "./_components/ConversationList";
import ConversationInfoPanel from "./_components/ConversationInfoPanel";

/**
 * 3-column chat layout — dùng `fixed` thay vì negative-margin hack.
 *
 * fixed inset-x-0 top-14 bottom-0:
 *   - Luôn khớp đúng viewport width (không bị ảnh hưởng bởi scrollbar)
 *   - top-14 = 56px = chiều cao navbar (h-14)
 *   - overflow-hidden ở mỗi cột ngăn scroll ngang tuyệt đối
 *
 * Columns:
 *   Left   (w-72)   — conversation list
 *   Middle (flex-1) — active chat / {children}
 *   Right  (w-60)   — conversation info panel
 */
export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 top-14 bottom-0 flex overflow-hidden">

      {/* ── Left panel: conversation list ─────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col overflow-hidden border-r border-white/8 bg-white/2">
        <ConversationList />
      </aside>

      {/* ── Middle panel: chat window ──────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>

      {/* ── Right panel: conversation info ────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col overflow-hidden border-l border-white/8 bg-white/2">
        <ConversationInfoPanel />
      </aside>

    </div>
  );
}
