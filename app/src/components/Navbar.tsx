"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
];

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-liilend-400 to-liilend-600 flex items-center justify-center">
              <span className="text-black font-bold text-sm">L</span>
            </div>
            <span className="text-lg font-bold text-white">Liidia</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function MobileMenu({ pathname }: { pathname: string }) {
  return (
    <div className="md:hidden">
      <details className="relative group">
        <summary className="flex items-center justify-center w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 cursor-pointer list-none">
          <svg
            className="w-5 h-5 text-surface-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </summary>
        <div className="absolute right-0 top-12 w-48 py-2 bg-surface-900 border border-surface-800 rounded-xl shadow-2xl">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 text-sm ${
                pathname === item.href
                  ? "text-liilend-400 bg-liilend-500/5"
                  : "text-surface-400 hover:text-white hover:bg-surface-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
