import { describe, it, expect } from "vitest";
import { FlowState, readHint } from "../src/ui/state";
const match = {
  status: "matched" as const,
  candidates: [{ routeM: 20000, offsetM: 0, lon: 116, lat: 30 }],
};
describe("safe UI progression", () => {
  it("does not reuse the pre-Shanghai distance hint", () => {
    const keys: string[] = [];
    expect(
      readHint({
        getItem(key) {
          keys.push(key);
          return key === "g318-progress" ? "20000" : null;
        },
      }),
    ).toBeUndefined();
    expect(keys).toEqual(["g318-progress:shanghai-classic-west-v2"]);
  });
  it("ignores old results after a new user action", () => {
    const s = new FlowState();
    const old = s.begin();
    const latest = s.begin();
    expect(s.accept(old, match)).toBe(false);
    expect(s.canDownload).toBe(false);
    expect(s.accept(latest, match)).toBe(true);
    expect(s.startM).toBe(20000);
  });
  it("reimport does not accumulate progress", () => {
    const s = new FlowState();
    s.accept(s.begin(), match);
    s.accept(s.begin(), match);
    expect(s.startM).toBe(20000);
  });
  it("blocks ambiguous results until explicit confirmation", () => {
    const s = new FlowState();
    s.accept(s.begin(), { ...match, status: "ambiguous" });
    expect(s.canDownload).toBe(false);
    s.confirm(20000);
    expect(s.canDownload).toBe(true);
  });
  it("blocks reverse and off-route results", () => {
    for (const status of ["reverse", "off-route"] as const) {
      const s = new FlowState();
      s.accept(s.begin(), { ...match, status });
      expect(s.canDownload).toBe(false);
    }
  });
  it("operates when local storage is unavailable", () => {
    expect(
      readHint({
        getItem() {
          throw new Error("disabled");
        },
      }),
    ).toBeUndefined();
    const s = new FlowState();
    s.confirm(100);
    expect(s.canDownload).toBe(true);
  });
  it("can prepare a download independently of tile state", () => {
    const s = new FlowState();
    s.accept(s.begin(), match);
    expect(s.canDownload).toBe(true);
  });
});
