import StaticContentPage from "@/components/StaticContentPage";

export default function PrivacyPage() {
  return (
    <StaticContentPage
      title="Privacy Policy"
      description="How we process account and itinerary data."
      body="We store user account identifiers, saved itinerary preferences, and chat context required to deliver personalized planning. You can request deletion of your itinerary records at any time."
    />
  );
}
