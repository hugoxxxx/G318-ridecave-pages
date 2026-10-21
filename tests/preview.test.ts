import { describe, it, expect } from "vitest";
import { previewTrack } from "../src/ui/preview";
import type { Track } from "../src/core/types";
describe("zoomable route geometry", () => {
  it("keeps road bends narrower than the former 200m tolerance", () => {
    const track: Track = {
      segments: [
        Array.from({ length: 41 }, (_, i) => ({
          lon: 116 + i * 0.00005,
          lat: 30 + Math.sin((i / 40) * Math.PI * 4) * 0.0003,
          ele: 20,
        })),
      ],
    };
    expect(previewTrack(track).segments[0].map((p) => [p.lon, p.lat])).toEqual(
      track.segments[0].map((p) => [p.lon, p.lat]),
    );
  });
  it("preserves segment boundaries and singleton segments", () => {
    const track: Track = {
      segments: [
        [{ lon: 116, lat: 30 }],
        [
          { lon: 117, lat: 31 },
          { lon: 117.1, lat: 31.1 },
        ],
      ],
    };
    expect(previewTrack(track)).toEqual(track);
  });
  it("does not expose the original point objects to display mutations", () => {
    const track: Track = {
      segments: [
        [
          { lon: 116, lat: 30, ele: 20 },
          { lon: 116.1, lat: 30.1, ele: 40 },
        ],
      ],
    };
    const shown = previewTrack(track);
    shown.segments[0][0].lon = 0;
    expect(track.segments[0][0].lon).toBe(116);
    expect(shown.segments[0][0].ele).toBeUndefined();
  });
});
