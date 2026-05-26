import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDocBySlug } from "@/lib/docs/content-reader";
import { INSFORGE_ACCESS_COOKIE } from "@/src/lib/insforge-cookies";
import MarkdownRenderer from "@/components/docs/markdown-renderer";

export default async function DocPage({
  params,
}: {
  readonly params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const doc = await getDocBySlug(slug, false);

  if (doc !== null) {
    return (
      <article className="py-4">
        <MarkdownRenderer content={doc.content} />
      </article>
    );
  }

  const cookieStore = await cookies();
  const hasSession = cookieStore.has(INSFORGE_ACCESS_COOKIE);

  if (hasSession) {
    const privateDoc = await getDocBySlug(slug, true);

    if (privateDoc !== null) {
      return (
        <article className="py-4">
          <MarkdownRenderer content={privateDoc.content} />
        </article>
      );
    }
  }

  const privateDoc = await getDocBySlug(slug, true);
  if (privateDoc !== null && !hasSession) {
    const encoded = encodeURIComponent(`/documentacion/${slug}`);
    redirect(`/login?next=${encoded}`);
  }

  notFound();
}
