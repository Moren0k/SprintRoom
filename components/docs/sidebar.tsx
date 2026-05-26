import type { DocEntry } from "@/lib/docs/types";
import SidebarClient from "./sidebar-client";

export default function Sidebar({
  docs,
}: {
  readonly docs: DocEntry[];
}) {
  return <SidebarClient docs={docs} />;
}
