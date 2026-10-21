import "./style.css";
import "leaflet/dist/leaflet.css";
import { RouteWorker } from "./worker/client";
import { RouteMap } from "./ui/map";
import { FlowState, readHint, PROGRESS_KEY } from "./ui/state";
import type { Track, MatchResult, Section } from "./core/types";

const icon = (name: string) =>
  ({
    mountain: '<path d="m3 18 6-12 5 9 3-5 4 8H3Z"/><path d="m7 10 2 2 2-2"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  })[name] ?? "";
const svg = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon(name)}</svg>`;
document.querySelector("#app")!.innerHTML = `
 <header class="topbar"><a class="brand" href="./">${svg("mountain")}<strong>RIDE THE <span>318</span></strong></a><div class="header-note"><span class="dot"></span> 一路向西，接着骑</div><a class="source-link" href="https://github.com/hugoxxxx/G318-ridecave-pages" target="_blank" rel="noopener">项目源码 ↗</a></header>
 <main><section class="intro"><div><p class="eyebrow">YOUR NEXT CHAPTER ON G318</p><h1>下一段，<em>接着骑。</em></h1><p class="intro-text">把上一次的终点，变成下一次的起点。<br class="mobile-break">导入骑行记录，生成你的下一段 G318 路线。</p></div><div class="route-stamp"><span>中国国家公路</span><strong>G318</strong><small>一段一段 · 骑向远方</small></div></section>
 <section class="workspace"><aside class="controls"><div class="panel-title"><span class="number">01</span><h2>接续你的旅程</h2></div>
 <label class="upload-box" id="drop-zone" for="ride-file">${svg("upload")}<strong id="file-label">选择骑行记录</strong><span>拖入文件，或点击选择</span><small>支持 .GPX / .FIT · 文件仅在本机处理</small><input id="ride-file" type="file" accept=".fit,.gpx" aria-label="选择骑行记录" disabled></label>
 <div class="or-line"><span>还没开始这条路线？</span></div><button id="first" class="button outline" disabled>从主路线起点出发 ${svg("arrow")}</button>
 <div class="divider"></div><div class="field-head"><label for="length">下一段距离</label><span>保留 1 km 上传余量</span></div><div class="distance-input"><input id="length" type="number" min="0.1" max="79" step="0.1" value="79" disabled><span>km</span></div>
 <details id="manual"><summary>手动调整起点 <span>＋</span></summary><p>匹配有歧义，或想从其他位置出发时，填写主路书上的累计里程。</p><label for="start">主路线起点里程（km）</label><div class="manual-row"><input id="start" type="number" min="0" step="0.001" value="0" disabled><button id="confirm" class="button small" disabled>确认起点</button></div><div id="candidates"></div></details>
 <div id="status" class="status" role="status" aria-live="polite">正在加载完整 G318 路线…</div><button id="download" class="button primary" disabled>${svg("download")} 下载下一段 GPX</button><p class="download-note">导入 RideCave，继续下一段旅程</p>
 </aside><section class="route-view"><div class="map-shell"><div id="map" aria-label="G318 路线地图"></div><div class="map-heading"><span class="map-tag">G318 · 路线预览</span><button id="full" aria-label="查看全程">查看全程 ↗</button></div><div class="map-legend"><span><i class="legend-full"></i>完整路书</span><span><i class="legend-next"></i>下一段</span><span><i class="legend-start"></i>续骑起点</span></div><div id="tile-warning" hidden>底图暂不可用，路线计算和下载仍可正常使用。</div></div>
 <div class="stats"><div><span>下一段距离</span><strong id="stat-distance">—<small> km</small></strong></div><div><span>预计爬升</span><strong id="stat-ascent">—<small> m</small></strong></div><div><span>路线已完成</span><strong id="stat-progress">—<small> %</small></strong></div></div>
 <div class="elevation"><div class="elevation-title"><h3>下一段海拔</h3><span id="section-range">选择骑行记录，查看接续路段</span></div><div id="profile" class="profile"><span class="profile-empty">每一次出发，都从这里接续。</span></div><div class="elevation-axis"><span id="elevation-start">起点</span><span id="elevation-end">终点</span></div></div></section></section>
 <footer><div>${svg("pin")}<span>内置 G318 路书 <b id="total-distance">加载中</b> · 保留坐标与海拔</span></div><div><span>无需登录 · 骑行文件不上传</span><button id="clear">清除本地进度</button></div></footer><p class="compatibility">上海至月山约 537 km 为经典老线重建，含安庆汽渡；新增段海拔来自公开地形数据。路线位置与累计已骑距离不同。<a href="./routes/PROVENANCE.md" target="_blank" rel="noopener">数据来源</a> · GPX 按路线坐标计算距离；RideCave 的距离算法可能略有差异。首次使用请核对导入结果。</p>
 </main>`;
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id)! as T;
const state = new FlowState();
const worker = new RouteWorker();
let totalM = 0,
  ready = false,
  downloadText: string | null = null,
  section: Section | null = null;
const file = el<HTMLInputElement>("ride-file"),
  start = el<HTMLInputElement>("start"),
  length = el<HTMLInputElement>("length");
const download = el<HTMLButtonElement>("download");
const routeMap = new RouteMap(el("map"), (failed) => {
  el("tile-warning").hidden = !failed;
});
function status(message: string, error = false) {
  el("status").textContent = message;
  el("status").classList.toggle("error", error);
}
function invalidate() {
  download.disabled = true;
  downloadText = null;
  section = null;
}
function hint() {
  try {
    return readHint(localStorage);
  } catch {
    return undefined;
  }
}
function remember(value: number) {
  try {
    localStorage.setItem(PROGRESS_KEY, String(value));
  } catch {
    /* optional storage */
  }
}
function drawProfile(s: Section) {
  const points = s.track.segments.flat().filter((p) => p.ele !== undefined);
  if (points.length < 2) {
    el("profile").textContent = "这段路线没有可用海拔数据。";
    return;
  }
  const lo = Math.min(...points.map((p) => p.ele!)),
    hi = Math.max(...points.map((p) => p.ele!));
  const selected = points.filter(
    (_, i) =>
      i % Math.max(1, Math.floor(points.length / 500)) === 0 ||
      i === points.length - 1,
  );
  const path = selected
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${((i / (selected.length - 1)) * 900).toFixed(1)},${(105 - ((p.ele! - lo) / Math.max(30, hi - lo)) * 80).toFixed(1)}`,
    )
    .join(" ");
  el("profile").innerHTML =
    `<svg viewBox="0 0 900 120" preserveAspectRatio="none" role="img" aria-label="下一段海拔剖面"><defs><linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#db562e" stop-opacity=".22"/><stop offset="1" stop-color="#db562e" stop-opacity=".02"/></linearGradient></defs><path d="${path} L900,120 L0,120 Z" fill="url(#hill)"/><path d="${path}" fill="none" stroke="#d66740" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><span class="elevation-max">${Math.round(hi)} m</span>`;
}
async function prepare(version: number) {
  invalidate();
  try {
    const targetM = Number(length.value) * 1000;
    if (!length.value || targetM <= 0 || targetM > 79000)
      throw new Error("请输入大于 0 且不超过 79 km 的分段距离。");
    status("正在生成接续路线…");
    const result = await worker.request<{
      section: Section | null;
      gpx: string | null;
    }>("slice", { startM: state.startM, targetM });
    if (version !== state.version) return;
    section = result.section;
    downloadText = result.gpx;
    if (!section) {
      status("已到达主路书终点，这段旅程完成了。");
      routeMap.showSection(null);
      return;
    }
    const s = section;
    routeMap.showSection(s.track);
    routeMap.showCandidates([
      { routeM: s.startM, offsetM: 0, ...s.track.segments[0][0] },
    ]);
    el("stat-distance").innerHTML =
      `${(s.distanceM / 1000).toFixed(2)}<small> km</small>`;
    el("stat-ascent").innerHTML =
      `${Math.round(s.ascentM).toLocaleString()}<small> m</small>`;
    el("stat-progress").innerHTML =
      `${((s.startM / totalM) * 100).toFixed(2)}<small> %</small>`;
    el("section-range").textContent =
      `主路线 ${(s.startM / 1000).toFixed(3)} → ${(s.endM / 1000).toFixed(3)} km`;
    el("elevation-start").textContent = `${(s.startM / 1000).toFixed(2)} km`;
    el("elevation-end").textContent = `${(s.endM / 1000).toFixed(2)} km`;
    drawProfile(s);
    download.disabled = !state.canDownload || !downloadText;
    status(
      s.atBreak
        ? "已生成至轨迹段末尾。原路线在此中断，下次请确认下一段起点。"
        : `路线已就绪，从主路线第 ${(s.startM / 1000).toFixed(3)} km 接着骑。`,
    );
    remember(state.startM);
  } catch (e) {
    if (version === state.version) {
      invalidate();
      status(e instanceof Error ? e.message : String(e), true);
    }
  }
}
async function importRide(f: File) {
  if (!ready) return;
  const version = state.begin();
  invalidate();
  status("正在读取骑行记录并匹配路线…");
  el("file-label").textContent = f.name;
  el("candidates").replaceChildren();
  try {
    const format = f.name.toLowerCase().split(".").at(-1);
    if (format !== "fit" && format !== "gpx")
      throw new Error("请选择 .FIT 或 .GPX 文件。");
    if (f.size > 50 * 1024 * 1024)
      throw new Error("请选择小于 50 MB 的单次骑行文件。");
    const buffer = await f.arrayBuffer();
    if (version !== state.version) return;
    const result = await worker.request<MatchResult>(
      "match",
      { format, buffer, hintM: hint() },
      [buffer],
    );
    if (!state.accept(version, result)) return;
    start.value = (state.startM / 1000).toFixed(3);
    routeMap.showCandidates(result.candidates);
    if (result.status === "matched") {
      await prepare(version);
      return;
    }
    status(result.reason ?? "请手动确认续骑起点。", true);
    el<HTMLDetailsElement>("manual").open = true;
    for (const [i, c] of result.candidates.entries()) {
      const button = document.createElement("button");
      button.className = "candidate";
      button.textContent = `候选 ${i + 1}：${(c.routeM / 1000).toFixed(3)} km`;
      button.onclick = () => {
        start.value = (c.routeM / 1000).toFixed(3);
      };
      el("candidates").append(button);
    }
  } catch (e) {
    if (version === state.version)
      status(e instanceof Error ? e.message : String(e), true);
  }
}
file.addEventListener("change", () => {
  if (file.files?.[0]) void importRide(file.files[0]);
  file.value = "";
});
el("first").onclick = () => {
  const v = state.begin();
  state.confirm(0);
  start.value = "0";
  el("file-label").textContent = "从主路线起点出发";
  void prepare(v);
};
el("confirm").onclick = () => {
  const v = state.begin();
  invalidate();
  const n = Number(start.value) * 1000;
  if (!start.value || !Number.isFinite(n) || n < 0 || n > totalM) {
    status("请输入主路线范围内的起点里程。", true);
    return;
  }
  state.confirm(n);
  void prepare(v);
};
start.addEventListener("input", () => {
  state.begin();
  invalidate();
  status("起点已修改，请点击“确认起点”。");
});
length.addEventListener("input", () => {
  const wasConfirmed = state.confirmed;
  const v = state.begin();
  invalidate();
  if (wasConfirmed) {
    state.confirm(state.startM);
    void prepare(v);
  } else status("请先导入骑行记录或确认起点。");
});
download.onclick = () => {
  if (!downloadText || !section || !state.canDownload) return;
  const url = URL.createObjectURL(
    new Blob([downloadText], { type: "application/gpx+xml;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `G318_${(section.startM / 1000).toFixed(3)}-${(section.endM / 1000).toFixed(3)}km.gpx`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};
el("full").onclick = () => routeMap.fitFull();
el("clear").onclick = () => {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem("g318-progress");
  } catch {}
  status("本地辅助进度已清除，当前路线不受影响。");
};
const drop = el("drop-zone");
drop.addEventListener("dragover", (e) => {
  e.preventDefault();
  drop.classList.add("drag");
});
drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
drop.addEventListener("drop", (e) => {
  e.preventDefault();
  drop.classList.remove("drag");
  if (e.dataTransfer?.files[0]) void importRide(e.dataTransfer.files[0]);
});
void (async () => {
  try {
    const data = await worker.request<{ totalM: number; track: Track }>(
      "load",
      {
        url: new URL(
          `${import.meta.env.BASE_URL}routes/g318.gpx?v=shanghai-classic-west-v2`,
          location.href,
        ).href,
      },
    );
    totalM = data.totalM;
    ready = true;
    routeMap.showFull(data.track);
    el("total-distance").textContent =
      `${(totalM / 1000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} km`;
    start.max = (totalM / 1000).toFixed(6);
    for (const id of ["ride-file", "first", "length", "start", "confirm"])
      (el(id) as HTMLInputElement).disabled = false;
    status("主路线已就绪，导入上次骑行记录即可接续。");
  } catch (e) {
    status(e instanceof Error ? e.message : String(e), true);
  }
})();
