import CheckoutPageClient from "@/components/commerce/CheckoutPageClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-surface-muted text-text-heading">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <CheckoutPageClient />
      </main>
      <Footer />
    </div>
  );
}
