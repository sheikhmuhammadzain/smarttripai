import PageScaffold from "@/components/PageScaffold";

interface StaticContentPageProps {
  title: string;
  description: string;
  body: string;
}

export default function StaticContentPage({ title, description, body }: StaticContentPageProps) {
  return (
    <PageScaffold title={title} description={description}>
      <article className="prose prose-neutral dark:prose-invert max-w-none rounded-xl border border-border-default bg-surface-base p-6 text-text-body">
        <p>{body}</p>
      </article>
    </PageScaffold>
  );
}
