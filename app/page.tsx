import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import Footer from '@/components/Footer';
import LandingInteractiveSection from '@/components/LandingInteractiveSection';
import AiAssistantLazy from '@/components/AiAssistantLazy';

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans text-text-heading transition-colors">
      <Header />

      <main className="relative">
        <HeroSection />

        {/* Trust strip */}
        <div className="bg-surface-muted border-b border-border-subtle">
          <div className="max-w-[1320px] mx-auto px-3 sm:px-4 md:px-6 py-2.5 grid grid-cols-2 sm:flex sm:flex-row sm:justify-center gap-x-4 gap-y-2 sm:gap-x-10">
            <span className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              Free cancellation available
            </span>
            <span className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
              4.8 / 5 average rating
            </span>
            <span className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              Instant confirmation
            </span>
            <span className="flex items-center gap-2 text-[11px] md:text-xs font-medium text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
              500+ curated experiences
            </span>
          </div>
        </div>

        <div className="max-w-[1320px] mx-auto px-3 sm:px-4 md:px-6 pt-6 pb-20">
          <LandingInteractiveSection />
        </div>
      </main>

      <Footer />
      <AiAssistantLazy />
    </div>
  );
}
