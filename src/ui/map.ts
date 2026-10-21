import L from "leaflet";
import type { Track, Candidate } from "../core/types";
export class RouteMap {
  private map: L.Map;
  private full = L.featureGroup();
  private next = L.featureGroup();
  private pin = L.featureGroup();
  constructor(element: HTMLElement, onTilesError: (failed: boolean) => void) {
    this.map = L.map(element, {
      zoomControl: false,
      preferCanvas: true,
      attributionControl: true,
    }).setView([30.6, 116.7], 9);
    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    const key = import.meta.env.VITE_TIANDITU_KEY?.trim();
    const options = key
      ? [
          {
            url: `https://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(key)}`,
            attribution:
              '&copy; <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noopener">天地图</a> · 国家地理信息公共服务平台',
          },
          {
            url: `https://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(key)}`,
            attribution: "",
          },
        ]
      : [
          {
            url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
          },
        ];
    const failures = new Map<L.TileLayer, boolean>();
    for (const source of options) {
      const tiles = L.tileLayer(source.url, {
        maxZoom: 18,
        minZoom: key ? 1 : 0,
        subdomains: key ? "01234567" : "abc",
        attribution: source.attribution,
      });
      const report = (failed: boolean) => {
        failures.set(tiles, failed);
        onTilesError([...failures.values()].some(Boolean));
      };
      tiles.on("tileerror", () => report(true));
      // Re-evaluate the current batch so a recovered request or a new viewport
      // does not leave a permanent warning after a single transient tile error.
      tiles.on("load", () => {
        const images = tiles.getContainer()?.querySelectorAll("img");
        report(!!images && [...images].some((img) => img.naturalWidth === 0));
      });
      tiles.addTo(this.map);
    }
    this.full.addTo(this.map);
    this.next.addTo(this.map);
    this.pin.addTo(this.map);
  }
  showFull(track: Track) {
    this.full.clearLayers();
    for (const pts of track.segments)
      L.polyline(
        pts.map((p) => [p.lat, p.lon] as L.LatLngTuple),
        { color: "#497b62", weight: 3, opacity: 0.9, smoothFactor: 0.5 },
      ).addTo(this.full);
    this.fitFull();
  }
  fitFull() {
    if (this.full.getLayers().length)
      this.map.fitBounds(this.full.getBounds(), { padding: [35, 35] });
  }
  showSection(track: Track | null) {
    this.next.clearLayers();
    if (!track) return;
    for (const pts of track.segments)
      L.polyline(
        pts.map((p) => [p.lat, p.lon] as L.LatLngTuple),
        { color: "#db562e", weight: 5, opacity: 1, smoothFactor: 0.5 },
      ).addTo(this.next);
    this.map.fitBounds(this.next.getBounds(), {
      padding: [50, 50],
      maxZoom: 13,
    });
  }
  showCandidates(candidates: Candidate[]) {
    this.pin.clearLayers();
    for (const [i, c] of candidates.entries())
      L.circleMarker([c.lat, c.lon], {
        radius: 7,
        color: "#fff",
        weight: 3,
        fillColor: i === 0 ? "#234e43" : "#d19b49",
        fillOpacity: 1,
      })
        .bindTooltip(`候选起点 ${(c.routeM / 1000).toFixed(3)} km`)
        .addTo(this.pin);
  }
}
