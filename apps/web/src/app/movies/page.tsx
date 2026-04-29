import { redirect } from "next/navigation";

export default function MoviesPage() {
  redirect("/browse?type=movie");
}
