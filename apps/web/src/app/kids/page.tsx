import { redirect } from "next/navigation";

export default function KidsPage() {
  redirect("/browse?type=kids");
}
