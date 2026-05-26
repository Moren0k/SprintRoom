import { redirect } from "next/navigation";
import { getPublicDocList } from "@/lib/docs/content-reader";

export default async function DocumentacionPage() {
  const docs = await getPublicDocList();

  if (docs.length > 0) {
    redirect(`/documentacion/${docs[0].slug}`);
  }

  return (
    <div className="grid min-h-60 place-items-center">
      <p className="text-sm text-[var(--muted)]">
        No hay documentos disponibles.
      </p>
    </div>
  );
}
