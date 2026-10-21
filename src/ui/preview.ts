import type { Track } from "../core/types";
/** Keep the source geometry; Leaflet simplifies in screen pixels at each zoom. */
export function previewTrack(track: Track): Track {
  return {
    segments: track.segments.map((points) =>
      points.map(({ lon, lat }) => ({ lon, lat })),
    ),
  };
}
