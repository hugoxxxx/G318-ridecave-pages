import type { Track, MatchResult, Candidate } from "./types";
import { type RouteIndex, candidatesNear, meters } from "./route-index";
export function matchRide(
  index: RouteIndex,
  ride: Track,
  hintM?: number,
): MatchResult {
  // Last segment only: never infer direction across a recording discontinuity.
  const tail = (ride.segments.at(-1) ?? []).slice(-120);
  const points = tail.filter(
    (_, i) =>
      i % Math.max(1, Math.ceil(tail.length / 30)) === 0 ||
      i === tail.length - 1,
  );
  if (!points.length)
    return {
      status: "off-route",
      candidates: [],
      reason: "没有可匹配的骑行坐标。",
    };
  const ends = candidatesNear(index, points.at(-1)!);
  if (!ends.length)
    return {
      status: "off-route",
      candidates: [],
      reason: "骑行终点距离主路线超过 100 米，请手动确认起点。",
    };
  const samples = points
    .map((p) => ({ point: p, candidates: candidatesNear(index, p) }))
    .filter((s) => s.candidates.length);
  if (samples.length < 2)
    return {
      status: "ambiguous",
      candidates: ends,
      reason: "有效末段坐标不足，无法判断骑行方向。",
    };
  const ranked = ends
    .map((end) => {
      let current = end,
        score = end.offsetM,
        backward = 0,
        forward = 0;
      for (let i = samples.length - 2; i >= 0; i--) {
        const traveled = meters(samples[i].point, samples[i + 1].point);
        const choices = samples[i].candidates
          .map((c) => {
            const delta = current.routeM - c.routeM;
            const mismatch = Math.abs(Math.abs(delta) - traveled);
            return {
              c,
              delta,
              cost:
                c.offsetM +
                mismatch * 0.25 +
                (Math.abs(delta) > traveled * 3 + 100 ? 10000 : 0),
            };
          })
          .sort((a, b) => a.cost - b.cost);
        const best = choices[0];
        score += best.cost;
        if (best.delta < 0) backward += Math.abs(best.delta);
        else forward += best.delta;
        current = best.c;
      }
      return {
        end,
        score: score / samples.length,
        netM: forward - backward,
        reverse: backward - forward > 30,
      };
    })
    .sort((a, b) => a.score - b.score);
  const best = ranked[0];
  const similar = ranked.filter((r) => r.score <= best.score + 20);
  const ordered = similar
    .map((r) => r.end)
    .sort((a, b) =>
      hintM === undefined
        ? 0
        : Math.abs(a.routeM - hintM) - Math.abs(b.routeM - hintM),
    );
  if (similar.some((r) => Math.abs(r.end.routeM - best.end.routeM) > 150))
    return {
      status: "ambiguous",
      candidates: ordered,
      reason: "末段可对应多个路段，请在地图上确认续骑起点。",
    };
  if (best.reverse)
    return {
      status: "reverse",
      candidates: [best.end],
      reason: "末段轨迹沿主路线反向移动，请确认续骑位置。",
    };
  if (Math.abs(best.netM) < 30)
    return {
      status: "ambiguous",
      candidates: [best.end],
      reason: "末段移动距离不足，无法可靠判断方向，请确认续骑位置。",
    };
  if (best.score > 150)
    return {
      status: "ambiguous",
      candidates: [best.end],
      reason: "轨迹连续性不足，请确认续骑位置。",
    };
  return { status: "matched", candidates: [best.end] };
}
