import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

interface PageScaffoldProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function PageScaffold({ title, description, children }: PageScaffoldProps) {
  return (
    <div className="min-h-screen bg-white text-[#1a1b1d]">
      <Header />
      <main className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <h1 className="mb-2 text-3xl font-bold">{title}</h1>
        {description ? <p className="mb-8 text-gray-600">{description}</p> : null}
        {children}
      </main>
      <Footer />
    </div>
  );
}
