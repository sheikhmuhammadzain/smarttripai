import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthCard from "@/components/auth/AuthCard";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-white text-[#1a1b1d]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 py-8 md:py-14 md:px-6">
        <AuthCard mode="signup" />
      </main>
      <Footer />
    </div>
  );
}
