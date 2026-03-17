import FeedbackForm from "@/components/FeedbackForm";
import PageScaffold from "@/components/PageScaffold";

export default function HelpPage() {
  return (
    <PageScaffold
      title="Help Center"
      description="Support resources for planning and booking your Turkey travel."
    >
      <div className="mb-6 rounded-xl border border-border-default bg-surface-subtle p-5 text-sm text-text-body">
        <p>
          For itinerary issues, account access, or API-related travel data problems, contact{" "}
          <a href="mailto:support@smarttripai.com" className="font-medium text-brand hover:underline">
            support@smarttripai.com
          </a>{" "}
          and include your itinerary ID.
        </p>
      </div>
      <FeedbackForm />
    </PageScaffold>
  );
}
