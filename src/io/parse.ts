import { DOMParser } from "@xmldom/xmldom";
import { gpx } from "@tmcw/togeojson";
import FitParser from "fit-file-parser";
import type { Point, Track } from "../core/types";

export function validPoint(p: Point): boolean {
  return (
    Number.isFinite(p.lon) &&
    Number.isFinite(p.lat) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lon) <= 180
  );
}
export function parseGpx(xml: string): Track {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("GPX 不应包含外部实体或文档类型声明。");
  const doc = new DOMParser({
    onError: () => {
      throw new Error("GPX XML 格式损坏。");
    },
  }).parseFromString(xml, "application/xml");
  if (doc.documentElement?.localName !== "gpx")
    throw new Error("请选择有效的 GPX 路线文件。");
  // togeojson omits invalid points and singleton segments. Validate before
  // conversion, and retain singleton endpoints so matching never falls back.
  const rawParts = [
    ...Array.from(doc.getElementsByTagName("trkseg")).map((n) =>
      Array.from(n.getElementsByTagName("trkpt")),
    ),
    ...Array.from(doc.getElementsByTagName("rte")).map((n) =>
      Array.from(n.getElementsByTagName("rtept")),
    ),
  ];
  for (const part of rawParts)
    for (const node of part) {
      const lon = node.getAttribute("lon"),
        lat = node.getAttribute("lat");
      if (
        !lon?.trim() ||
        !lat?.trim() ||
        !validPoint({ lon: Number(lon), lat: Number(lat) })
      )
        throw new Error("GPX 含无效或缺失的经纬度。");
    }
  const segments: Point[][] = [];
  for (const f of gpx(doc as unknown as Document).features) {
    const geom = f.geometry;
    if (geom.type !== "LineString" && geom.type !== "MultiLineString") continue;
    const lines =
      geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;
    const rawTimes = f.properties?.coordinateProperties?.times as
      (string[] | string[][]) | undefined;
    lines.forEach((line, n) => {
      const times = geom.type === "LineString" ? rawTimes : rawTimes?.[n];
      const pts = line.map((c, i) => {
        const p: Point = { lon: c[0], lat: c[1] };
        if (Number.isFinite(c[2])) p.ele = c[2];
        const time = Array.isArray(times)
          ? Date.parse(times[i] as string)
          : NaN;
        if (Number.isFinite(time)) p.time = time;
        if (!validPoint(p)) throw new Error("GPX 含无效经纬度。");
        return p;
      });
      if (pts.length >= 2) segments.push(pts);
    });
  }
  if (!segments.length) throw new Error("文件中没有至少包含两个坐标的轨迹。");
  let lineIndex = 0;
  const preserved = rawParts
    .filter((p) => p.length)
    .map((part) => {
      if (part.length >= 2) return segments[lineIndex++];
      const node = part[0];
      const p: Point = {
        lon: Number(node.getAttribute("lon")),
        lat: Number(node.getAttribute("lat")),
      };
      const eleText = node.getElementsByTagName("ele")[0]?.textContent;
      if (eleText?.trim() && Number.isFinite(Number(eleText)))
        p.ele = Number(eleText);
      return [p];
    });
  if (preserved.some((p) => !p) || lineIndex !== segments.length)
    throw new Error("GPX 轨迹段结构无法可靠识别，请手动确认起点。");
  return { segments: preserved };
}
export async function parseFit(buffer: ArrayBuffer): Promise<Track> {
  try {
    const data = await new FitParser({
      mode: "list",
      force: false,
      strict: true,
      lengthUnit: "m",
    }).parseAsync(buffer);
    const segments: Point[][] = [];
    let part: Point[] = [];
    for (const row of data.records ?? []) {
      const p: Point = {
        lon: Number(row.position_long ?? NaN),
        lat: Number(row.position_lat ?? NaN),
      };
      if (!validPoint(p)) {
        if (part.length) segments.push(part);
        part = [];
        continue;
      }
      const ele = Number(row.enhanced_altitude ?? row.altitude ?? NaN);
      if (Number.isFinite(ele)) p.ele = ele;
      const time = row.timestamp?.getTime() ?? NaN;
      if (Number.isFinite(time)) p.time = time;
      part.push(p);
    }
    if (part.length) segments.push(part);
    if (!segments.length) throw new Error("文件没有有效的虚拟路线坐标。");
    return { segments };
  } catch (e) {
    throw new Error(
      `无法读取 FIT：${e instanceof Error ? e.message : String(e)}`,
    );
  }
}
