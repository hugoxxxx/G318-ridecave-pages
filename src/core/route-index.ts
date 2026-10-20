import Flatbush from "flatbush";
import distance from "@turf/distance";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import type { Track, Point, Candidate } from "./types";
export const coord = (p: Point) => [p.lon, p.lat];
export const meters = (a: Point, b: Point) =>
  distance(coord(a), coord(b), { units: "meters" });
export type Edge = {
  a: Point;
  b: Point;
  startM: number;
  lengthM: number;
  part: number;
};
export type RouteIndex = {
  track: Track;
  totalM: number;
  edges: Edge[];
  spatial: Flatbush;
  parts: { startM: number; endM: number }[];
};
export function buildRouteIndex(track: Track): RouteIndex {
  const edges: Edge[] = [];
  const parts: RouteIndex["parts"] = [];
  let totalM = 0;
  for (const [part, points] of track.segments.entries()) {
    const startM = totalM;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        lengthM = meters(a, b);
      if (lengthM > 0) edges.push({ a, b, startM: totalM, lengthM, part });
      totalM += lengthM;
    }
    parts.push({ startM, endM: totalM });
  }
  if (!edges.length) throw new Error("路线长度为零，无法生成下一段。");
  const spatial = new Flatbush(edges.length);
  for (const { a, b } of edges)
    spatial.add(
      Math.min(a.lon, b.lon),
      Math.min(a.lat, b.lat),
      Math.max(a.lon, b.lon),
      Math.max(a.lat, b.lat),
    );
  spatial.finish();
  return { track, totalM, edges, spatial, parts };
}
export function candidatesNear(
  index: RouteIndex,
  p: Point,
  radiusM = 100,
): Candidate[] {
  const dy = radiusM / 110000,
    dx = dy / Math.max(0.01, Math.cos((p.lat * Math.PI) / 180));
  const candidates = index.spatial
    .search(p.lon - dx, p.lat - dy, p.lon + dx, p.lat + dy)
    .map((i) => {
      const e = index.edges[i];
      const hit = nearestPointOnLine(
        { type: "LineString", coordinates: [coord(e.a), coord(e.b)] },
        coord(p),
        { units: "meters" },
      );
      return {
        routeM: e.startM + hit.properties.segmentDistance,
        offsetM: hit.properties.pointDistance,
        lon: hit.geometry.coordinates[0],
        lat: hit.geometry.coordinates[1],
      };
    })
    .filter((c) => c.offsetM <= radiusM)
    .sort((a, b) => a.offsetM - b.offsetM);
  const unique: Candidate[] = [];
  for (const c of candidates)
    if (!unique.some((u) => Math.abs(u.routeM - c.routeM) < 30)) unique.push(c);
  return unique.slice(0, 12);
}
