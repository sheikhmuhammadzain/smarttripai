import Link from "next/link";
import {
  CheckCircle2,
  Mail,
  ArrowRight,
  LayoutDashboard,
  MapPin,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  return (
    <div className="min-h-screen bg-surface-muted text-text-heading">
      <Header />

      <main className="mx-auto max-w-[640px] px-4 py-16 md:px-6">
        {/* Success Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-surface-success-soft">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-text-primary">
            Booking Confirmed!
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
            Your travel experience has been booked successfully. Get ready for an
            unforgettable adventure in Turkey!
          </p>
        </div>

        {/* Order Card */}
        <div className="mt-8 rounded-2xl border border-border-soft bg-white p-6">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Confirmation ID
            </span>
            <span className="rounded-lg bg-surface-subtle px-3 py-1 font-mono text-sm font-semibold text-text-primary">
              {orderId ?? "pending"}
            </span>
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Confirmation Email Sent
                </p>
                <p className="text-xs text-text-muted">
                  Check your inbox for traveler details, itinerary references,
                  and important information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  What&apos;s Next?
                </p>
                <p className="text-xs text-text-muted">
                  Head to your dashboard to view booking details, or continue
                  exploring more experiences.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <LayoutDashboard className="h-4 w-4" />
            Open Dashboard
          </Link>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-default px-5 py-3 text-sm font-medium text-text-body transition-colors hover:bg-surface-subtle"
          >
            Continue Exploring
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
