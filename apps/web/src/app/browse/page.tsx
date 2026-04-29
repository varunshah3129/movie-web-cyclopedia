import { BrowseClient } from "@/components/BrowseClient";
import type { MediaType } from "@movie/core";

interface BrowsePageProps {
  searchParams: Promise<{ type?: string; q?: string }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const initialType: MediaType | "all" | "kids" = params.type === "tv" ? "tv" : params.type === "all" ? "all" : params.type === "kids" ? "kids" : "movie";
  const initialQuery = params.q ?? "";

  return <BrowseClient initialType={initialType} initialQuery={initialQuery} />;
}
