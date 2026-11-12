// Browser-persisted state for the demo backend. Only runs client-side.
import { buildSeed, DEMO_VERSION, type DemoState } from "./seed";

const KEY = "haroni-dcms-demo-db";
let state: DemoState | null = null;

export function db(): DemoState {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        if (parsed.version === DEMO_VERSION) {
          state = parsed;
          return state;
        }
      }
    } catch {
      /* fall through to a fresh seed */
    }
  }
  state = buildSeed();
  persist();
  return state;
}

export function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full — keep in memory */
  }
}

export function replaceState(next: DemoState) {
  state = next;
  persist();
}

export function resetDemo() {
  state = buildSeed();
  persist();
}

/** Test helper: start from an in-memory seed without touching storage. */
export function setMemoryState(next: DemoState) {
  state = next;
}

export function nextId(prefix: string) {
  const s = db();
  s.counters.id += 1;
  return `${prefix}-${s.counters.id}`;
}
