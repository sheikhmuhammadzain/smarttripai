import ItineraryGenerator from "@/components/ItineraryGenerator";
import PageScaffold from "@/components/PageScaffold";

export default function PlannerPage() {
  return (
    <PageScaffold
      title="Plan Your Turkey Trip"
      description="Generate a personalized itinerary, then save it to your account."
    >
      <ItineraryGenerator />
    </PageScaffold>
  );
}
