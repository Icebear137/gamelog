/**
 * Shared GX "Steel & Amber" Tailwind class recipes.
 *
 * Single source of truth for design-system patterns that repeat across pages
 * (buttons, cards, pills, labels). Compose with clsx at call sites:
 *
 *   import { gx } from "@/lib/gx-styles";
 *   <button className={clsx(gx.btnPrimary, "w-full")}>Save</button>
 */
export const gx = {
  /* ── Typography ── */
  eyebrow:
    "text-[10px] font-bold tracking-[0.14em] uppercase text-gx-amber",
  sectionLabel:
    "font-bebas text-lg tracking-[0.05em] text-gx-text-1",
  link:
    "text-xs text-gx-text-2 transition-colors hover:text-gx-amber",

  /* ── Surfaces ── */
  card:
    "bg-gx-surface border border-gx-border rounded-[14px]",
  sectionCard:
    "bg-gx-surface border border-gx-border rounded-[14px] px-5 py-[18px]",
  sectionCardTitle:
    "text-[10px] font-bold tracking-[0.13em] uppercase text-gx-text-3 mb-3.5",

  /* ── Buttons ── */
  btnPrimary:
    "inline-flex items-center gap-[7px] bg-gx-amber text-gx-ink text-[13px] font-bold " +
    "px-[18px] py-[9px] rounded-lg border-none cursor-pointer " +
    "transition-colors hover:bg-[#f5a33a]",
  btnGhost:
    "inline-flex items-center gap-[7px] bg-transparent text-gx-text-2 text-[13px] " +
    "px-4 py-[9px] rounded-lg border border-gx-border-md cursor-pointer " +
    "transition-colors hover:border-gx-amber/30 hover:text-gx-text-1",
  backBtn:
    "inline-flex items-center gap-1.5 text-xs text-gx-text-2 cursor-pointer " +
    "transition-colors hover:text-gx-amber bg-transparent border-none p-0",

  /* ── Pills ── */
  genrePill:
    "inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full " +
    "bg-white/5 border border-gx-border text-gx-text-2 text-[11px] " +
    "transition-colors hover:border-gx-amber/30 hover:text-gx-amber",
  tagPill:
    "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-3xl " +
    "bg-white/[0.04] border border-gx-border text-gx-text-2 text-xs " +
    "transition-colors hover:bg-gx-amber/13 hover:border-gx-amber/30 hover:text-gx-amber",
  tagPillCount:
    "text-[10px] text-gx-text-3",
} as const;
