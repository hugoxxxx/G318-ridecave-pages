export type Point = { lon: number; lat: number; ele?: number; time?: number };
export type Track = { segments: Point[][] };
export type Candidate = {
  routeM: number;
  offsetM: number;
  lon: number;
  lat: number;
};
export type MatchResult = {
  status: "matched" | "ambiguous" | "off-route" | "reverse";
  candidates: Candidate[];
  reason?: string;
};
export type Section = {
  track: Track;
  startM: number;
  endM: number;
  distanceM: number;
  ascentM: number;
  atBreak?: boolean;
};
