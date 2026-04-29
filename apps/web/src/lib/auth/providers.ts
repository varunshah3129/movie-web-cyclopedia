export interface PlannedAuthProvider {
  id: "google";
  label: string;
  enabled: boolean;
}

export function getPlannedProviders(): PlannedAuthProvider[] {
  return [{ id: "google", label: "Google", enabled: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) }];
}
