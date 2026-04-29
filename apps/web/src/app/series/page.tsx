import { redirect } from "next/navigation";

export default function SeriesPage() {
  redirect("/browse?type=tv");
}
