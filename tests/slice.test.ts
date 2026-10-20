import { it, expect, describe } from "vitest";
import { readFileSync } from "node:fs";
import { buildRouteIndex } from "../src/core/route-index";
import { sliceNext } from "../src/core/slice";
import { exportGpx } from "../src/io/export";
import { parseGpx } from "../src/io/parse";
const line = buildRouteIndex({
  segments: [
    [
      { lon: 0, lat: 0, ele: 0, time: 1 },
      { lon: 1, lat: 0, ele: 1000, time: 2 },
      { lon: 2, lat: 0, ele: 2000, time: 3 },
    ],
  ],
});
describe("next section export", () => {
  it("exports 79km under 80km and does not invent timestamps", () => {
    const section = sliceNext(line, 20000)!;
    const xml = exportGpx(section);
    const parsed = parseGpx(xml);
    const index = buildRouteIndex(parsed);
    expect(index.totalM).toBeCloseTo(79000, 0);
    expect(index.totalM).toBeLessThan(80000);
    expect(xml).not.toContain("<time>");
    expect(parsed.segments[0][0].lon).toBeCloseTo(0.17986407, 6);
  });
  it("interpolates boundary elevation", () => {
    const points = sliceNext(line, 20000, 20000)!.track.segments[0];
    expect(points[0].ele).toBeCloseTo(179.864, 2);
    expect(points.at(-1)!.ele).toBeCloseTo(359.728, 2);
  });
  it("preserves interior original points", () => {
    const r = buildRouteIndex({
      segments: [
        [
          { lon: 0, lat: 0, ele: 10 },
          { lon: 0.1, lat: 0, ele: 90 },
          { lon: 0.2, lat: 0, ele: 20 },
        ],
      ],
    });
    expect(sliceNext(r, 1000, 15000)!.track.segments[0]).toContainEqual({
      lon: 0.1,
      lat: 0,
      ele: 90,
    });
  });
  it("handles a final short section and a completed route", () => {
    expect(sliceNext(line, line.totalM - 1000)!.distanceM).toBeCloseTo(1000, 0);
    expect(sliceNext(line, line.totalM)).toBeNull();
  });
  it.each([0, -1, 80000, NaN, Infinity])(
    "rejects invalid target distance %s",
    (m) => expect(() => sliceNext(line, 0, m)).toThrow(),
  );
  it.each([-1, NaN, Infinity, 300000])("rejects invalid start %s", (m) =>
    expect(() => sliceNext(line, m)).toThrow(),
  );
  it("stops at a discontinuity and permits starting in the following segment", () => {
    const r = buildRouteIndex({
      segments: [
        [
          { lon: 0, lat: 0 },
          { lon: 0.01, lat: 0 },
        ],
        [
          { lon: 1, lat: 0 },
          { lon: 1.01, lat: 0 },
        ],
      ],
    });
    const first = sliceNext(r, 0)!;
    expect(first.distanceM).toBeCloseTo(1111.951, 0);
    expect(first.atBreak).toBe(true);
    expect(sliceNext(r, first.endM)!.track.segments[0][0].lon).toBe(1);
  });
  it("real main route roundtrip preserves all elevations and 79km", () => {
    const r = buildRouteIndex(
      parseGpx(readFileSync("public/routes/g318.gpx", "utf8")),
    );
    const section = sliceNext(r, 20673.281)!;
    const parsed = parseGpx(exportGpx(section));
    expect(Math.abs(buildRouteIndex(parsed).totalM - 79000)).toBeLessThan(5);
    expect(parsed.segments.flat().every((p) => Number.isFinite(p.ele))).toBe(
      true,
    );
  });
});
