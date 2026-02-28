import CartPageClient from "@/components/commerce/CartPageClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function CartPage() {
  return (
    <div className="min-h-screen bg-surface-muted text-text-heading">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <CartPageClient />
      </main>
      <Footer />
    </div>
  );
}
