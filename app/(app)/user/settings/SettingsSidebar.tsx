"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCircle, Mail, CreditCard } from "lucide-react";

const NAV_ITEMS = [
    { href: "/user/settings", label: "Personal details", icon: UserCircle },
    { href: "/user/settings/notifications", label: "Notifications", icon: Mail },
    { href: "/user/settings/cards", label: "Saved cards", icon: CreditCard },
];

export default function SettingsSidebar({ firstName }: { firstName: string }) {
    const pathname = usePathname();

    return (
        <aside className="w-full shrink-0 overflow-hidden rounded-xl md:w-64">
            {/* User banner */}
            <div className="bg-[#1a2744] px-6 py-8 text-center text-white">
                <p className="text-xl font-bold leading-tight">{firstName}</p>
                <p className="mt-0.5 text-sm font-medium text-white/70">Account</p>
            </div>

            {/* Nav */}
            <nav className="border border-t-0 border-gray-200 bg-white">
                {NAV_ITEMS.map((item, idx) => {
                    const isActive =
                        item.href === "/user/settings"
                            ? pathname === "/user/settings"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex w-full items-center gap-3 px-5 py-4 text-sm font-medium transition-colors
                ${idx !== NAV_ITEMS.length - 1 ? "border-b border-gray-100" : ""}
                ${isActive
                                    ? "bg-gray-50 text-gray-900"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <item.icon className="h-4 w-4 text-gray-400" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
