import type { IHistoryEntry } from "../../models/CookItem";

export function extractPerformedBy(body: any): IHistoryEntry["performedBy"] {
  const p = body?.performedBy;
  return {
    userId: p?.userId || "unknown",
    userName: p?.userName || "Unknown",
    repType: p?.repType || "unknown",
  };
}

export function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${M}${d}${h}${m}${s}`;
}
