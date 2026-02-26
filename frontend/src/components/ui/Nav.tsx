"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/sessions", label: "Sessions" },
  { href: "/live", label: "Live" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <span className="text-lg font-bold text-amber-400">⛽ Gasometer</span>
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              active
                ? "text-white font-medium"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
