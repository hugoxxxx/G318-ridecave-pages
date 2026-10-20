/// <reference lib="webworker" />
import simplify from "@turf/simplify";
import { parseGpx, parseFit } from "../io/parse";
import { buildRouteIndex, type RouteIndex } from "../core/route-index";
import { matchRide } from "../core/match";
import { sliceNext } from "../core/slice";
import { exportGpx } from "../io/export";
import type { Track } from "../core/types";
let index: RouteIndex | undefined;
function preview(track: Track): Track {
  return {
    segments: track.segments.map((points) => {
      const line = simplify(
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: points.map((p) => [p.lon, p.lat]),
          },
        },
        { tolerance: 0.002, highQuality: true },
      );
      return line.geometry.coordinates.map((c) => ({ lon: c[0], lat: c[1] }));
    }),
  };
}
self.onmessage = async ({ data: { id, action, payload } }) => {
  try {
    let result: unknown;
    if (action === "load") {
      const response = await fetch(payload.url);
      if (!response.ok) throw new Error("主路线加载失败，请刷新重试。");
      index = buildRouteIndex(parseGpx(await response.text()));
      result = { totalM: index.totalM, track: preview(index.track) };
    } else {
      if (!index) throw new Error("请等待主路线加载完成。");
      if (action === "match") {
        const ride =
          payload.format === "fit"
            ? await parseFit(payload.buffer)
            : parseGpx(new TextDecoder().decode(payload.buffer));
        result = matchRide(index, ride, payload.hintM);
      } else if (action === "slice") {
        const section = sliceNext(index, payload.startM, payload.targetM);
        result = { section, gpx: section ? exportGpx(section) : null };
      } else throw new Error("未知操作。");
    }
    self.postMessage({ id, ok: true, result });
  } catch (e) {
    self.postMessage({
      id,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
};
