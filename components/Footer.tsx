
import { Facebook, Twitter, Instagram, Youtube, Linkedin, Globe, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#1a1b1d] text-white pt-16 pb-8 text-sm">
       <div className="max-w-[1320px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
             
             <div>
                <h4 className="font-bold text-gray-200 mb-4 uppercase tracking-wider text-xs">Support</h4>
                <ul className="space-y-2 text-gray-400">
                   <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                   <li><Link href="/legal" className="hover:text-white transition-colors">Legal Information</Link></li>
                   <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                   <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                   <li><a href="#" className="hover:text-white transition-colors">Cookie Preferences</a></li>
                </ul>
             </div>

             <div>
                <h4 className="font-bold text-gray-200 mb-4 uppercase tracking-wider text-xs">Company</h4>
                <ul className="space-y-2 text-gray-400">
                   <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                   <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                   <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                   <li><Link href="/press" className="hover:text-white transition-colors">Press</Link></li>
                   <li><a href="#" className="hover:text-white transition-colors">Gift Cards</a></li>
                </ul>
             </div>

             <div>
                <h4 className="font-bold text-gray-200 mb-4 uppercase tracking-wider text-xs">Work With Us</h4>
                <ul className="space-y-2 text-gray-400">
                   <li><Link href="/partners/supply" className="hover:text-white transition-colors">As a Supply Partner</Link></li>
                   <li><Link href="/partners/creator" className="hover:text-white transition-colors">As a Content Creator</Link></li>
                   <li><Link href="/partners/affiliate" className="hover:text-white transition-colors">As an Affiliate Partner</Link></li>
                 </ul>
              </div>

             <div>
                <h4 className="font-bold text-gray-200 mb-4 uppercase tracking-wider text-xs">Mobile</h4>
                <div className="flex flex-col gap-3">
                   <button className="flex items-center gap-3 bg-[#2d2e30] hover:bg-[#3d3e40] px-4 py-2 rounded-lg transition-colors border border-gray-700 w-fit">
                      <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                        alt="App Store"
                        width={102}
                        height={30}
                        className="h-6 w-auto"
                        unoptimized
                      />
                   </button>
                   <button className="flex items-center gap-3 bg-[#2d2e30] hover:bg-[#3d3e40] px-4 py-2 rounded-lg transition-colors border border-gray-700 w-fit">
                      <Image
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                        alt="Google Play"
                        width={101}
                        height={30}
                        className="h-6 w-auto"
                        unoptimized
                      />
                   </button>
                </div>
             </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex flex-col gap-2">
                <div className="text-gray-400 text-xs">
                   &copy; 2025 GetYourGuide. Made in Zurich & Berlin.
                </div>
                <div className="flex items-center gap-4 text-gray-400 text-xs">
                   <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> English (US)</span>
                   <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> USD</span>
                </div>
             </div>

             <div className="flex items-center gap-4">
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"><Facebook className="w-4 h-4" /></a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"><Twitter className="w-4 h-4" /></a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"><Instagram className="w-4 h-4" /></a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"><Youtube className="w-4 h-4" /></a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors text-white"><Linkedin className="w-4 h-4" /></a>
             </div>
          </div>
       </div>
    </footer>
  );
}
