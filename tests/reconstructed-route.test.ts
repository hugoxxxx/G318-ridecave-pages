import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseGpx, parseFit } from "../src/io/parse";
import { buildRouteIndex } from "../src/core/route-index";
import { matchRide } from "../src/core/match";
import { sliceNext } from "../src/core/slice";
import { exportGpx } from "../src/io/export";
const route = parseGpx(readFileSync("public/routes/g318.gpx", "utf8"));
const original = parseGpx(
  readFileSync("public/routes/g318-original.gpx", "utf8"),
);
const index = buildRouteIndex(route);
const prefixM = 537062.759315;
describe("reconstructed Shanghai route", () => {
  it("starts at the Shanghai zero marker and preserves the supplied coordinates and heights", () => {
    expect(route.segments[0][0]).toMatchObject({
      lon: 121.4698104,
      lat: 31.2315498,
    });
    expect(
      route.segments[0]
        .slice(-original.segments[0].length)
        .map(({ lon, lat, ele }) => ({ lon, lat, ele })),
    ).toEqual(
      original.segments[0].map(({ lon, lat, ele }) => ({ lon, lat, ele })),
    );
    expect(index.totalM).toBeCloseTo(5230396.55, 0);
  });
  for (const startM of [0, prefixM - 39000, prefixM + 20000])
    it(`exports a continuous sub-80km section at ${startM}`, () => {
      const section = sliceNext(index, startM, 79000)!;
      expect(section.distanceM).toBeCloseTo(79000, 1);
      const parsed = parseGpx(exportGpx(section));
      const roundtrip = buildRouteIndex(parsed);
      expect(roundtrip.totalM).toBeGreaterThan(78999);
      expect(roundtrip.totalM).toBeLessThan(80000);
    });
  it.skipIf(!process.env.RIDE_FIXTURE_PATH)(
    "keeps the real FIT endpoint while shifting only the route chainage",
    async () => {
      const b = readFileSync(process.env.RIDE_FIXTURE_PATH!);
      const ride = await parseFit(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      );
      const old = matchRide(buildRouteIndex(original), ride);
      const updated = matchRide(index, ride);
      expect(updated.status).toBe("matched");
      expect(updated.candidates[0].lon).toBeCloseTo(old.candidates[0].lon, 7);
      expect(updated.candidates[0].lat).toBeCloseTo(old.candidates[0].lat, 7);
      expect(
        updated.candidates[0].routeM - old.candidates[0].routeM,
      ).toBeCloseTo(prefixM, 1);
    },
  );
});
