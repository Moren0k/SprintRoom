import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getPublicDocList, getPrivateDocList } from "@/lib/docs/content-reader";
import { INSFORGE_ACCESS_COOKIE } from "@/src/lib/insforge-cookies";
import Sidebar from "@/components/docs/sidebar";

export default async function DocumentacionLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const publicDocs = await getPublicDocList();

  const cookieStore = await cookies();
  const hasSession = cookieStore.has(INSFORGE_ACCESS_COOKIE);

  const allDocs = hasSession
    ? [...publicDocs, ...(await getPrivateDocList())]
    : publicDocs;

  return (
    <div className="flex flex-1">
      <Sidebar docs={allDocs} />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
