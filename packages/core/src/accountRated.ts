import type { TmdbAccountStates } from "./types";

/** TMDB account_states.rated: `false`, or `{ value }` on the API’s 10-point scale. */
export function parseTmdbRatedTenPoint(rated: TmdbAccountStates["rated"] | undefined | null): number | null {
  if (rated === undefined || rated === null || rated === false) return null;
  if (typeof rated === "object" && rated !== null && "value" in rated && typeof rated.value === "number") {
    return rated.value;
  }
  return null;
}
