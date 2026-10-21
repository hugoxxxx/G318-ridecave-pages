import L from "leaflet";
import type { Track, Candidate } from "../core/types";
import {
  BasemapState,
  readBasemapPreference,
  writeBasemapPreference,
  type BasemapId,
} from "./basemap";
export class RouteMap {
  private map: L.Map;
  private full = L.featureGroup();
  private next = L.featureGroup();
  private pin = L.featureGroup();
  private layers: L.TileLayer[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private storage?: Storage;
  private basemap: BasemapState;
  private key = import.meta.env.VITE_TIANDITU_KEY?.trim();
  constructor(
    element: HTMLElement,
    private onBasemap: (provider: BasemapId, message: string) => void,
  ) {
    this.map = L.map(element, {
      zoomControl: false,
      preferCanvas: true,
      attributionControl: true,
    }).setView([30.6, 116.7], 9);
    L.control.zoom({ position: "bottomright" }).addTo(this.map);
    try {
      this.storage = localStorage;
    } catch {
      /* Storage is optional. */
    }
    this.basemap = new BasemapState(
      readBasemapPreference(this.storage, !!this.key),
    );
    this.full.addTo(this.map);
    this.next.addTo(this.map);
    this.pin.addTo(this.map);
    this.mountBasemap();
  }
  setBasemap(provider: BasemapId) {
    if (provider === "tianditu" && !this.key) provider = "osm";
    this.basemap.select(provider);
    writeBasemapPreference(this.storage, provider);
    this.mountBasemap();
  }
  private mountBasemap(fallbackNotice = "") {
    clearTimeout(this.timer);
    for (const layer of this.layers) {
      this.map.removeLayer(layer);
      layer.off();
    }
    this.layers = [];
    const provider = this.basemap.provider,
      version = this.basemap.version;
    this.onBasemap(
      provider,
      provider === "none"
        ? "仅显示路线；路线计算和 GPX 下载可正常使用。"
        : fallbackNotice,
    );
    if (provider === "none") return;
    const sources =
      provider === "tianditu"
        ? ["vec", "cva"].map((layer) => ({
            url: `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(this.key!)}`,
            attribution:
              layer === "vec"
                ? '&copy; <a href="https://www.tianditu.gov.cn/" target="_blank" rel="noopener">天地图</a> · 国家地理信息公共服务平台'
                : "",
          }))
        : [
            {
              url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            },
          ];
    const check = (deadline = false) => {
      if (version !== this.basemap.version) return;
      const batches = this.layers.map((layer) => [
        ...(layer.getContainer()?.querySelectorAll("img") ?? []),
      ]);
      const images = batches.flat();
      if (!images.length) return;
      const healthy = images.some(
        (img) => img.complete && img.naturalWidth > 0,
      );
      const settled =
        batches.length === sources.length &&
        batches.every(
          (batch) => batch.length > 0 && batch.every((img) => img.complete),
        );
      if (!healthy && (settled || deadline)) {
        if (this.basemap.fallback(version)) {
          writeBasemapPreference(this.storage, "osm");
          this.mountBasemap(
            "天地图暂不可用，已切换为 OpenStreetMap 备用底图。",
          );
        } else
          this.onBasemap(
            provider,
            "底图暂不可用，可切换图源或选择仅路线。GPX 下载不受影响。",
          );
      } else if (settled) {
        const partial = images.some((img) => img.naturalWidth === 0);
        this.onBasemap(
          provider,
          partial
            ? "部分底图未加载，可切换图源；GPX 下载不受影响。"
            : fallbackNotice,
        );
      }
    };
    for (const source of sources) {
      const layer = L.tileLayer(source.url, {
        maxZoom: 18,
        minZoom: provider === "tianditu" ? 1 : 0,
        subdomains: "01234567",
        attribution: source.attribution,
      });
      this.layers.push(layer);
      layer.on("load", () => check());
      layer.on("loading", () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => check(true), 8000);
      });
      layer.addTo(this.map);
    }
    this.timer = setTimeout(() => check(true), 8000);
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
