import { describe, it, expect } from "vitest";
import {
  BasemapState,
  readBasemapPreference,
  writeBasemapPreference,
} from "../src/ui/basemap";
describe("basemap recovery", () => {
  it("falls back from failed Tianditu exactly once", () => {
    const s = new BasemapState("tianditu");
    const v = s.version;
    expect(s.fallback(v)).toBe(true);
    expect(s.provider).toBe("osm");
    expect(s.fallback(v)).toBe(false);
    expect(s.fallback(s.version)).toBe(false);
  });
  it("does not let an old layer failure override a manual choice", () => {
    const s = new BasemapState("tianditu");
    const v = s.version;
    s.select("none");
    expect(s.fallback(v)).toBe(false);
    expect(s.provider).toBe("none");
  });
  it("allows an explicit later Tianditu selection without stale fallback", () => {
    const s = new BasemapState("tianditu");
    const v = s.version;
    s.fallback(v);
    s.select("tianditu");
    expect(s.fallback(v)).toBe(false);
    expect(s.provider).toBe("tianditu");
  });
  it("restores a working backup preference", () => {
    expect(readBasemapPreference({ getItem: () => "osm" }, true)).toBe("osm");
  });
  it("does not select Tianditu when no key exists", () => {
    expect(readBasemapPreference({ getItem: () => "tianditu" }, false)).toBe(
      "osm",
    );
  });
  it("rejects unknown stored providers", () => {
    expect(
      readBasemapPreference({ getItem: () => "external-url" }, false),
    ).toBe("osm");
  });
  it("works without browser storage", () => {
    expect(
      readBasemapPreference(
        {
          getItem() {
            throw new Error("disabled");
          },
        },
        true,
      ),
    ).toBe("tianditu");
    expect(() =>
      writeBasemapPreference(
        {
          setItem() {
            throw new Error("disabled");
          },
        },
        "osm",
      ),
    ).not.toThrow();
  });
});
