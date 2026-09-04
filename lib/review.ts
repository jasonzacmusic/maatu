import type { Lang } from "./maatu-design";

// Spaced review, per device, no backend. Any line in the studio can be saved;
// it comes back on a Leitner schedule (same day, 1, 3, 7, 14 days) and moves
// up a box when you get it, back to box zero when you do not. No em dashes.

export type ReviewItem = { id: string; lang: Lang; en: string; target: string; box: number; due: number; added: number };

const KEY = "maatu-review";
const DAY = 86_400_000;
const GAP = [0, 1, 3, 7, 14];

export function reviewId(lang: Lang, target: string) {
  return `${lang}:${target.trim().toLowerCase()}`;
}

export function loadReview(): ReviewItem[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function persist(items: ReviewItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // review memory is a convenience only
  }
}

export function isSaved(lang: Lang, target: string) {
  const id = reviewId(lang, target);
  return loadReview().some((i) => i.id === id);
}

export function toggleSaved(lang: Lang, en: string, target: string): boolean {
  const id = reviewId(lang, target);
  const items = loadReview();
  const index = items.findIndex((i) => i.id === id);
  if (index >= 0) {
    items.splice(index, 1);
    persist(items);
    return false;
  }
  items.push({ id, lang, en, target: target.trim(), box: 0, due: Date.now(), added: Date.now() });
  persist(items);
  return true;
}

export function dueNow(lang: Lang): ReviewItem[] {
  const now = Date.now();
  return loadReview()
    .filter((i) => i.lang === lang && i.due <= now)
    .sort((a, b) => a.due - b.due);
}

export function countFor(lang: Lang) {
  const items = loadReview().filter((i) => i.lang === lang);
  return { saved: items.length, due: items.filter((i) => i.due <= Date.now()).length };
}

export function grade(id: string, ok: boolean) {
  const items = loadReview();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.box = ok ? Math.min(item.box + 1, GAP.length - 1) : 0;
  // A miss comes back in ten minutes; a hit waits its box's gap.
  item.due = Date.now() + (ok ? GAP[item.box] * DAY : 10 * 60_000);
  if (ok && item.box === 0) item.due = Date.now() + DAY;
  persist(items);
}
