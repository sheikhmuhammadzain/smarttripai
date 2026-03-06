
import { Facebook, Twitter, Instagram, Youtube, Linkedin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SMARTTRIPAI_LOGO_DATA_URI } from '@/components/branding/logo';

export default function Footer() {
   return (
      <footer className="bg-surface-base border-t border-border-soft pt-10 pb-6 text-sm">
         <div className="max-w-300 mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-8">

               <div>
                  <Link href="/" aria-label="Smart Trip AI Home">
                     <Image
                        src={SMARTTRIPAI_LOGO_DATA_URI}
                        alt="Smart Trip AI"
                        width={80}
                        height={96}
                        className="h-12 w-auto mb-2"
                        unoptimized
                     />
                  </Link>
                  <p className="text-text-muted text-xs max-w-56">Discover Turkey's best tours, experiences, and attractions.</p>
               </div>

               <div className="flex gap-12">
                  <div>
                     <h4 className="font-semibold text-text-primary mb-3 text-xs uppercase tracking-wider">Explore</h4>
                     <ul className="space-y-2 text-text-muted">
                        <li><Link href="/products" className="hover:text-text-primary transition-colors">Tours & Activities</Link></li>
                        <li><Link href="/(app)/attractions" className="hover:text-text-primary transition-colors">Attractions</Link></li>
                        <li><Link href="/about" className="hover:text-text-primary transition-colors">About Us</Link></li>
                     </ul>
                  </div>

                  <div>
                     <h4 className="font-semibold text-text-primary mb-3 text-xs uppercase tracking-wider">Legal</h4>
                     <ul className="space-y-2 text-text-muted">
                        <li><Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy Policy</Link></li>
                        <li><Link href="/terms" className="hover:text-text-primary transition-colors">Terms of Service</Link></li>
                     </ul>
                  </div>
               </div>
            </div>

            <div className="border-t border-border-soft pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
               <p className="text-text-muted text-xs">&copy; 2025 Smart Trip AI. All rights reserved.</p>

               <div className="flex items-center gap-1">
                  <a href="https://www.facebook.com/smarttripai" target="_blank" rel="noreferrer" className="p-2 rounded-full text-text-muted hover:text-brand hover:bg-brand/10 transition-colors" aria-label="Facebook"><Facebook className="w-4 h-4" /></a>
                  <a href="https://x.com/smarttripai" target="_blank" rel="noreferrer" className="p-2 rounded-full text-text-muted hover:text-brand hover:bg-brand/10 transition-colors" aria-label="X / Twitter"><Twitter className="w-4 h-4" /></a>
                  <a href="https://www.instagram.com/smarttripai" target="_blank" rel="noreferrer" className="p-2 rounded-full text-text-muted hover:text-brand hover:bg-brand/10 transition-colors" aria-label="Instagram"><Instagram className="w-4 h-4" /></a>
                  <a href="https://www.youtube.com/smarttripai" target="_blank" rel="noreferrer" className="p-2 rounded-full text-text-muted hover:text-brand hover:bg-brand/10 transition-colors" aria-label="YouTube"><Youtube className="w-4 h-4" /></a>
                  <a href="https://www.linkedin.com/company/smarttripai" target="_blank" rel="noreferrer" className="p-2 rounded-full text-text-muted hover:text-brand hover:bg-brand/10 transition-colors" aria-label="LinkedIn"><Linkedin className="w-4 h-4" /></a>
               </div>
            </div>
         </div>
      </footer>
   );
}

