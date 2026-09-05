import { DAILY_PRAYERS, minutesSinceMidnight, parseTime } from "./prayer";

/** Strips case, punctuation and spacing so "Fatima Block-I" ≈ "fatimablocki". */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Standard edit distance, capped early — inputs here are short. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

const ROMAN: Record<string, string> = {
  i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8",
};

/** Folds Roman numerals to digits so "Block 3" reaches "Block-III". */
function foldNumerals(word: string): string {
  return ROMAN[word] ?? word;
}

function wordsOf(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(foldNumerals);
}

/** Closeness of a single query word to a single name word. */
function wordScore(token: string, word: string): number {
  if (token === word) return 1;
  // Numbers identify a specific block, so "5" must never soft-match "2".
  // Without this, the time "5:20" scores against "Fatima Block-II".
  if (/^\d+$/.test(token) || /^\d+$/.test(word)) return 0;
  if (word.startsWith(token)) return 0.9;
  if (word.includes(token) && token.length >= 3) return 0.8;
  const distance = levenshtein(token, word);
  const tolerance = token.length <= 4 ? 1 : token.length <= 7 ? 2 : 3;
  if (distance <= tolerance) return Math.max(0.5, 0.85 - distance * 0.1);
  return 0;
}

/**
 * How well a query matches a name, from 0 (no match) to 1 (exact).
 *
 * Deliberately forgiving about spelling: students type "Zakaria" for
 * "Zakariya Hostel" and "Hazali" for "Ghazali". A multi-word query is
 * scored word by word and every word must land somewhere in the name, so
 * "main mosque" reaches "Main University Mosque" without "mosque hostel"
 * matching anything.
 */
export function fuzzyScore(query: string, name: string): number {
  const q = normalise(query);
  const n = normalise(name);
  if (!q) return 0;
  if (n === q) return 1;
  if (n.startsWith(q)) return 0.95;
  if (n.includes(q)) return 0.85;

  const nameWords = wordsOf(name);
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(foldNumerals);

  if (tokens.length > 1) {
    let total = 0;
    for (const token of tokens) {
      const best = Math.max(0, ...nameWords.map((w) => wordScore(token, w)));
      if (best === 0) return 0; // every word of the query must land
      total += best;
    }
    return Math.min(0.94, total / tokens.length);
  }

  const single = tokens[0] ?? q;
  let best = Math.max(0, ...nameWords.map((w) => wordScore(single, w)));

  const whole = levenshtein(q, n);
  if (whole <= Math.max(2, Math.floor(n.length * 0.3))) {
    best = Math.max(best, 0.6 - whole * 0.05);
  }
  return best;
}

export const PRAYER_ALIASES: Record<string, string> = {
  fajr: "fajr", fajar: "fajr", subh: "fajr", subah: "fajr",
  zuhr: "zuhr", zohar: "zuhr", zohr: "zuhr", duhr: "zuhr", dhuhr: "zuhr", zuhur: "zuhr",
  asr: "asr", asar: "asr",
  maghrib: "maghrib", magrib: "maghrib", magribh: "maghrib", maghreb: "maghrib",
  isha: "isha", esha: "isha", ishaa: "isha", isya: "isha",
  jumma: "jumma", jumah: "jumma", juma: "jumma", jummah: "jumma", friday: "jumma",
};

/** Resolves a typed prayer name, tolerating the usual spellings. */
export function matchPrayer(query: string): string | null {
  const q = normalise(query);
  if (!q) return null;
  if (PRAYER_ALIASES[q]) return PRAYER_ALIASES[q];

  let best: { key: string; distance: number } | null = null;
  for (const [alias, key] of Object.entries(PRAYER_ALIASES)) {
    const distance = levenshtein(q, alias);
    if (distance <= (q.length <= 4 ? 1 : 2) && (!best || distance < best.distance)) {
      best = { key, distance };
    }
  }
  return best?.key ?? null;
}

/**
 * Reads a typed time. Accepts "2:30", "2:30 pm", "230", "14:30" and "2 pm".
 * Bare hours below 12 with no meridiem are treated as afternoon, since
 * that is overwhelmingly what a student means on a prayer board.
 */
export function parseTimeQuery(query: string): number | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, "");
  const match = /^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/.exec(q);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3];
  if (hours > 23 || minutes > 59) return null;
  if (!match[2] && !meridiem && String(match[1]).length > 2) return null;

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (!meridiem && hours >= 1 && hours <= 8) hours += 12;

  return hours * 60 + minutes;
}

export const PRAYER_LABELS: Record<string, string> = {
  ...Object.fromEntries(DAILY_PRAYERS.map((p) => [p.key, p.label])),
  jumma: "Jumma",
};

/** Distance in minutes between a stored time and a searched-for time. */
export function timeDistance(value: string | null, targetMinutes: number): number | null {
  const minutes = minutesSinceMidnight(value);
  if (minutes === null) return null;
  return Math.abs(minutes - targetMinutes);
}

export { parseTime };
