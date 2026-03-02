"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const WalletButton = dynamic(() => import("@/components/wallet-button"), {
    ssr: false,
});

const NAV_ITEMS = [
    { href: "/", label: "Home" },
    { href: "/admin", label: "Admin" },
    { href: "/about", label: "About" },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <header className="border-b">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-lg font-bold">
                        Chain Vote
                    </Link>
                    <nav className="hidden items-center gap-1 sm:flex">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    pathname === item.href && "bg-accent text-accent-foreground"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <WalletButton />
                </div>
            </div>
        </header>
    );
}
