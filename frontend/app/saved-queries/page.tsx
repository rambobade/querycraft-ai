import { redirect } from "next/navigation";

export default function SavedQueriesRedirect() {
  redirect("/library?tab=saved");
}
