import { DOMImplementation, XMLSerializer } from "@xmldom/xmldom";
import type { Section } from "../core/types";
import { validPoint, parseGpx } from "./parse";
import { meters } from "../core/route-index";
export function exportGpx(section: Section): string {
  const ns = "http://www.topografix.com/GPX/1/1";
  const doc = new DOMImplementation().createDocument(ns, "gpx", null);
  const root = doc.documentElement!;
  root.setAttribute("version", "1.1");
  root.setAttribute("creator", "G318 RideCave");
  const metadata = doc.createElementNS(ns, "metadata");
  root.appendChild(metadata);
  const description = doc.createElementNS(ns, "desc");
  description.appendChild(
    doc.createTextNode(
      "G318 classic corridor reconstruction; new eastern section road data: OpenStreetMap contributors (ODbL), https://www.openstreetmap.org/copyright; terrain: Mapzen/Tilezen Skadi, https://registry.opendata.aws/terrain-tiles/. Includes Anqing ferry. Terrain elevations are estimates. SRTM/GMTED2010 courtesy of USGS; ETOPO1 courtesy of NOAA NCEI.",
    ),
  );
  metadata.appendChild(description);
  const trk = doc.createElementNS(ns, "trk");
  root.appendChild(trk);
  const name = doc.createElementNS(ns, "name");
  name.appendChild(
    doc.createTextNode(
      `G318 ${(section.startM / 1000).toFixed(3)}-${(section.endM / 1000).toFixed(3)}km`,
    ),
  );
  trk.appendChild(name);
  for (const pts of section.track.segments) {
    const seg = doc.createElementNS(ns, "trkseg");
    trk.appendChild(seg);
    for (const p of pts) {
      if (!validPoint(p)) throw new Error("导出含无效坐标。");
      const node = doc.createElementNS(ns, "trkpt");
      node.setAttribute("lat", p.lat.toFixed(9));
      node.setAttribute("lon", p.lon.toFixed(9));
      if (p.ele !== undefined) {
        const ele = doc.createElementNS(ns, "ele");
        ele.appendChild(doc.createTextNode(p.ele.toFixed(3)));
        node.appendChild(ele);
      }
      seg.appendChild(node);
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    new XMLSerializer().serializeToString(doc);
  const parsed = parseGpx(xml);
  let length = 0;
  for (const seg of parsed.segments)
    for (let i = 1; i < seg.length; i++) length += meters(seg[i - 1], seg[i]);
  if (length <= 0 || length >= 80000) throw new Error("导出文件重新计距失败。");
  return xml;
}
