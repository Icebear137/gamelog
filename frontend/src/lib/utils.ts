/** Returns the first HTTP(S) URL found in a text string, or null. */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match?.[0] ?? null;
}

export function formatDistanceToNow(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_FULL    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** HH:MM — used inside chat bubbles (date context provided by separator) */
export function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Label for the date separator between message groups */
export function formatDateSeparator(dateStr: string): string {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return `${DAYS_FULL[d.getDay()]}, ${MONTHS_FULL[d.getMonth()]} ${d.getDate()}`;
  if (d.getFullYear() === now.getFullYear())
    return `${MONTHS_FULL[d.getMonth()]} ${d.getDate()}`;
  return `${MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "Today 14:32", "Yesterday 14:32", "Mon 14:32", "Jun 2 14:32" — for tooltips/hover */
export function formatMessageFull(dateStr: string): string {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  const hm   = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diff === 0) return `Today at ${hm}`;
  if (diff === 1) return `Yesterday at ${hm}`;
  if (diff < 7)  return `${DAYS_FULL[d.getDay()]} at ${hm}`;
  if (d.getFullYear() === now.getFullYear())
    return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} at ${hm}`;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${hm}`;
}
