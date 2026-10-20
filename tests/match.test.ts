import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseGpx, parseFit } from "../src/io/parse";
import { buildRouteIndex } from "../src/core/route-index";
import { matchRide } from "../src/core/match";
import type { Track } from "../src/core/types";
const track = (coords: number[][]): Track => ({
  segments: [coords.map(([lon, lat]) => ({ lon, lat }))],
});
describe("route matching", () => {
  it("matches forward progression independently of activity distance", () => {
    const r = buildRouteIndex(
      track([
        [0, 0],
        [0.1, 0],
        [0.2, 0],
      ]),
    );
    const m = matchRide(
      r,
      track([
        [0.01, 0],
        [0.02, 0],
        [0.03, 0],
      ]),
    );
    expect(m.status).toBe("matched");
    expect(m.candidates[0].routeM).toBeCloseTo(3335.852, 0);
  });
  it("ignores leading off-route points", () => {
    const m = matchRide(
      buildRouteIndex(
        track([
          [0, 0],
          [0.1, 0],
        ]),
      ),
      track([
        [-0.01, 0.02],
        [0.01, 0],
        [0.02, 0],
      ]),
    );
    expect(m.status).toBe("matched");
  });
  it("flags reverse riding", () => {
    expect(
      matchRide(
        buildRouteIndex(
          track([
            [0, 0],
            [0.1, 0],
          ]),
        ),
        track([
          [0.04, 0],
          [0.03, 0],
          [0.02, 0],
        ]),
      ).status,
    ).toBe("reverse");
  });
  it("flags slow reverse riding despite sub-30m sample steps", () => {
    const ride = track(
      Array.from({ length: 120 }, (_, i) => [0.05 - i * 0.00002, 0]),
    );
    expect(
      matchRide(
        buildRouteIndex(
          track([
            [0, 0],
            [0.1, 0],
          ]),
        ),
        ride,
      ).status,
    ).toBe("reverse");
  });
  it("requires confirmation when a stationary tail gives no direction evidence", () => {
    const ride = track(Array.from({ length: 120 }, () => [0.05, 0]));
    expect(
      matchRide(
        buildRouteIndex(
          track([
            [0, 0],
            [0.1, 0],
          ]),
        ),
        ride,
      ).status,
    ).toBe("ambiguous");
  });
  it("does not match an earlier segment when the last segment is a lone off-route point", () => {
    const ride = parseGpx(
      '<gpx><trk><trkseg><trkpt lat="0" lon=".01"/><trkpt lat="0" lon=".02"/></trkseg><trkseg><trkpt lat="1" lon="1"/></trkseg></trk></gpx>',
    );
    expect(
      matchRide(
        buildRouteIndex(
          track([
            [0, 0],
            [0.1, 0],
          ]),
        ),
        ride,
      ).status,
    ).toBe("off-route");
  });
  it("rejects an off-route endpoint", () => {
    expect(
      matchRide(
        buildRouteIndex(
          track([
            [0, 0],
            [0.1, 0],
          ]),
        ),
        track([
          [0.01, 0],
          [0.02, 0],
          [0.02, 0.01],
        ]),
      ).status,
    ).toBe("off-route");
  });
  it("requires confirmation on repeated sections even with a history hint", () => {
    const route = track([
      [0, 0],
      [0.1, 0],
      [0.1, 0.01],
      [0, 0.01],
      [0, 0],
      [0.1, 0],
    ]);
    const m = matchRide(
      buildRouteIndex(route),
      track([
        [0.02, 0],
        [0.03, 0],
        [0.04, 0],
      ]),
      4000,
    );
    expect(m.status).toBe("ambiguous");
    expect(m.candidates.length).toBeGreaterThanOrEqual(2);
  });
  it("uses approach direction to resolve a crossing", () => {
    const route = track([
      [-0.02, -0.02],
      [0.02, 0.02],
      [0.02, -0.02],
      [-0.02, 0.02],
    ]);
    expect(
      matchRide(
        buildRouteIndex(route),
        track([
          [-0.01, -0.01],
          [-0.005, -0.005],
          [0, 0],
        ]),
      ).status,
    ).toBe("matched");
  });
  it.skipIf(!process.env.RIDE_FIXTURE_PATH)(
    "matches an opt-in local route fixture",
    async () => {
      const index = buildRouteIndex(
        parseGpx(readFileSync("public/routes/g318-original.gpx", "utf8")),
      );
      expect(index.totalM).toBeCloseTo(4693334, -1);
      const b = readFileSync(process.env.RIDE_FIXTURE_PATH!);
      const result = matchRide(
        index,
        await parseFit(
          b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
        ),
      );
      expect(result.status).toBe("matched");
      expect(result.candidates[0].offsetM).toBeLessThan(100);
    },
  );
});
