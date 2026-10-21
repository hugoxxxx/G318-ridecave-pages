export type BasemapId = "tianditu" | "osm" | "none";
const STORAGE_KEY = "g318-basemap";
export class BasemapState {
  version = 0;
  constructor(public provider: BasemapId) {}
  select(provider: BasemapId) {
    this.provider = provider;
    this.version++;
  }
  fallback(version: number) {
    if (version !== this.version || this.provider !== "tianditu") return false;
    this.select("osm");
    return true;
  }
}
export function readBasemapPreference(
  storage: Pick<Storage, "getItem"> | undefined,
  hasKey: boolean,
): BasemapId {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    if (value === "osm" || value === "none" || (value === "tianditu" && hasKey))
      return value;
  } catch {
    /* Storage is optional. */
  }
  return hasKey ? "tianditu" : "osm";
}
export function writeBasemapPreference(
  storage: Pick<Storage, "setItem"> | undefined,
  provider: BasemapId,
) {
  try {
    storage?.setItem(STORAGE_KEY, provider);
  } catch {
    /* Storage is optional. */
  }
}
