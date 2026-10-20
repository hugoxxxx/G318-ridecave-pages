import along from "@turf/along";
import { type RouteIndex, type Edge, coord, meters } from "./route-index";
import type { Section, Point } from "./types";
function boundary(e: Edge, m: number): Point {
  const fraction = Math.max(0, Math.min(1, (m - e.startM) / e.lengthM));
  if (fraction <= 1e-10)
    return {
      lon: e.a.lon,
      lat: e.a.lat,
      ...(e.a.ele === undefined ? {} : { ele: e.a.ele }),
    };
  if (fraction >= 1 - 1e-10)
    return {
      lon: e.b.lon,
      lat: e.b.lat,
      ...(e.b.ele === undefined ? {} : { ele: e.b.ele }),
    };
  const c = along(
    { type: "LineString", coordinates: [coord(e.a), coord(e.b)] },
    fraction * e.lengthM,
    { units: "meters" },
  ).geometry.coordinates;
  const p: Point = { lon: c[0], lat: c[1] };
  if (e.a.ele !== undefined && e.b.ele !== undefined)
    p.ele = e.a.ele + (e.b.ele - e.a.ele) * fraction;
  return p;
}
export function sliceNext(
  index: RouteIndex,
  startM: number,
  targetM = 79000,
): Section | null {
  if (!Number.isFinite(startM) || startM < 0 || startM > index.totalM)
    throw new Error("起点里程超出主路线范围。");
  if (!Number.isFinite(targetM) || targetM <= 0 || targetM > 79000)
    throw new Error("分段长度须大于 0 且不超过 79 km。");
  if (index.totalM - startM < 0.01) return null;
  const first = index.edges.find((e) => e.startM + e.lengthM > startM + 1e-7)!;
  const partEnd = index.parts[first.part].endM;
  const endM = Math.min(startM + targetM, partEnd, index.totalM);
  const edges = index.edges.filter(
    (e) =>
      e.part === first.part && e.startM < endM && e.startM + e.lengthM > startM,
  );
  const points = [boundary(first, startM)];
  for (const e of edges) {
    const p = boundary(e, Math.min(e.startM + e.lengthM, endM));
    if (meters(points.at(-1)!, p) > 0.0001) points.push(p);
  }
  let distanceM = 0,
    ascentM = 0;
  for (let i = 1; i < points.length; i++) {
    distanceM += meters(points[i - 1], points[i]);
    if (points[i - 1].ele !== undefined && points[i].ele !== undefined)
      ascentM += Math.max(0, points[i].ele! - points[i - 1].ele!);
  }
  if (distanceM >= 80000 || points.length < 2)
    throw new Error("导出路线长度不符合要求。");
  return {
    track: { segments: [points] },
    startM,
    endM,
    distanceM,
    ascentM,
    atBreak: endM === partEnd && endM < index.totalM,
  };
}
