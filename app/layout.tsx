import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { BRAND_HEX } from "@/theme/colors";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://getyourguide.com'),
  title: {
    default: 'GetYourGuide | AI-Powered Turkey Travel Itineraries & Tours',
    template: '%s | GetYourGuide'
  },
  description: 'Discover Turkey with AI-powered travel itineraries. Explore Cappadocia hot air balloon rides, Istanbul tours, and personalized trip planning. Book unforgettable experiences with GetYourGuide.',
  keywords: ['Turkey tours', 'travel itinerary', 'Cappadocia', 'Istanbul tours', 'AI travel planner', 'Turkey travel', 'hot air balloon', 'travel experiences', 'vacation planning', 'guided tours'],
  authors: [{ name: 'GetYourGuide' }],
  creator: 'GetYourGuide',
  publisher: 'GetYourGuide',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://getyourguide.com',
    title: 'GetYourGuide | AI-Powered Turkey Travel Itineraries & Tours',
    description: 'Discover Turkey with AI-powered travel itineraries. Explore Cappadocia, Istanbul, and more with personalized trip planning.',
    siteName: 'GetYourGuide',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GetYourGuide - AI-Powered Travel Planning',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetYourGuide | AI-Powered Turkey Travel Itineraries',
    description: 'Discover Turkey with AI-powered travel itineraries. Explore Cappadocia, Istanbul, and personalized experiences.',
    creator: '@getyourguide',
    images: ['/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: 'GetYourGuide',
    description: 'AI-powered travel itinerary planning and tour booking platform',
    url: 'https://getyourguide.com',
    logo: 'https://getyourguide.com/logo.png',
    sameAs: [
      'https://www.facebook.com/getyourguide',
      'https://twitter.com/getyourguide',
      'https://www.instagram.com/getyourguide',
    ],
    serviceType: 'Travel & Tourism',
    areaServed: {
      '@type': 'Country',
      name: 'Turkey',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Tours and Experiences',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'TouristAttraction',
            name: 'Cappadocia Hot Air Balloon',
            description: 'Experience breathtaking hot air balloon rides over Cappadocia',
          },
        },
      ],
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://getyourguide.com" />
        <meta name="theme-color" content={BRAND_HEX} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
