import PageScaffold from "@/components/PageScaffold";

interface StaticContentPageProps {
  title: string;
  description: string;
  body: string;
}

export default function StaticContentPage({ title, description, body }: StaticContentPageProps) {
  return (
    <PageScaffold title={title} description={description}>
      <article className="prose max-w-none rounded-xl border border-gray-200 bg-white p-6">
        <p>{body}</p>
      </article>
    </PageScaffold>
  );
}
