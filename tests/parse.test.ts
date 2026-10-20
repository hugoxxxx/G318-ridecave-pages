import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseGpx, parseFit } from "../src/io/parse";
const gpx = (body: string, version = "1.1") =>
  `<gpx xmlns="http://www.topografix.com/GPX/${version === "1.1" ? "1/1" : "1/0"}" version="${version}"><trk>${body}</trk></gpx>`;
describe("file parsing", () => {
  for (const version of ["1.0", "1.1"])
    it(`reads GPX ${version} with elevation and time`, () => {
      const t = parseGpx(
        gpx(
          '<trkseg><trkpt lat="30" lon="116"><ele>42.5</ele><time>2026-10-15T14:00:00Z</time></trkpt><trkpt lat="30.1" lon="116.1"/></trkseg>',
          version,
        ),
      );
      expect(t.segments[0][0]).toEqual({
        lat: 30,
        lon: 116,
        ele: 42.5,
        time: 1792072800000,
      });
      expect(t.segments[0][1].ele).toBeUndefined();
    });
  it("preserves discontinuities", () => {
    const t = parseGpx(
      gpx(
        '<trkseg><trkpt lat="30" lon="116"/><trkpt lat="30.1" lon="116.1"/></trkseg><trkseg><trkpt lat="31" lon="117"/><trkpt lat="31.1" lon="117.1"/></trkseg>',
      ),
    );
    expect(t.segments.map((s) => s.length)).toEqual([2, 2]);
  });
  it("rejects an invalid terminal coordinate rather than silently matching an older point", () => {
    expect(() =>
      parseGpx(
        gpx(
          '<trkseg><trkpt lat="30" lon="116"/><trkpt lat="30.1" lon="116.1"/><trkpt lon="116.2"/></trkseg>',
        ),
      ),
    ).toThrow();
  });
  it.each([
    "<gpx><trk>",
    "<gpx/>",
    gpx('<trkseg><trkpt lat="95" lon="0"/></trkseg>'),
    "<html>oops</html>",
  ])("rejects malformed, empty and out-of-range GPX: %s", (xml) =>
    expect(() => parseGpx(xml)).toThrow(),
  );
  it("rejects broken FIT", async () =>
    expect(parseFit(new ArrayBuffer(5))).rejects.toThrow());
  it.skipIf(!process.env.RIDE_FIXTURE_PATH)(
    "reads real FIT coordinates in degrees",
    async () => {
      const b = readFileSync(process.env.RIDE_FIXTURE_PATH!);
      const t = await parseFit(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      );
      const pts = t.segments.flat();
      expect(pts.length).toBeGreaterThan(1);
      expect(
        pts.every((p) => Number.isFinite(p.lon) && Number.isFinite(p.lat)),
      ).toBe(true);
    },
  );
  it("reads the full built-in route without losing elevation", () => {
    const t = parseGpx(readFileSync("public/routes/g318.gpx", "utf8"));
    expect(t.segments).toHaveLength(1);
    expect(t.segments[0]).toHaveLength(123880);
    expect(t.segments[0].every((p) => Number.isFinite(p.ele))).toBe(true);
  });
});
