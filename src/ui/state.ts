export const PROGRESS_KEY = "g318-progress:shanghai-classic-v1";
import type { MatchResult } from "../core/types";
export class FlowState {
  version = 0;
  startM = 0;
  confirmed = false;
  begin(): number {
    this.confirmed = false;
    return ++this.version;
  }
  accept(version: number, match: MatchResult): boolean {
    if (version !== this.version) return false;
    this.confirmed = match.status === "matched";
    if (match.candidates[0]) this.startM = match.candidates[0].routeM;
    return true;
  }
  confirm(startM: number): void {
    if (!Number.isFinite(startM) || startM < 0)
      throw new Error("起点里程无效。");
    this.startM = startM;
    this.confirmed = true;
  }
  get canDownload(): boolean {
    return this.confirmed;
  }
}
export function readHint(
  storage: Pick<Storage, "getItem">,
): number | undefined {
  try {
    const raw = storage.getItem(PROGRESS_KEY);
    if (raw === null) return;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  } catch {
    return;
  }
}
