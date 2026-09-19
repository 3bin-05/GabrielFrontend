"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { ROLE_REDIRECT_MAP } from "@/lib/constants";
import { Menu, X, User, LogOut } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pages with self-contained dashboard/auth layout
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/citizen") ||
    pathname.startsWith("/hospital")
  ) {
    return null;
  }

  const isHome = pathname === "/";

  return (
    <header
      className={`w-full z-50 transition-all ${
        isHome
          ? "absolute top-0 inset-x-0 bg-transparent border-none"
          : "sticky top-0 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-neutral-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-20 sm:h-24 flex items-center justify-between">
        {/* Left: Brand + Divider + Nav Links */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[#141414] font-black text-xl tracking-[0.32em] uppercase group hover:opacity-80 transition-opacity"
          >
            <span>G</span>
            <span className="inline-block font-sans font-normal scale-y-110">Λ</span>
            <span>B</span>
            <span>R</span>
            <span>I</span>
            <span>E</span>
            <span>L</span>
          </Link>

          {/* Vertical Separator */}
          <div className="hidden md:block w-[1px] h-5 bg-neutral-300" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-neutral-600">
            <a href="#about" className="hover:text-black transition-colors">
              About
            </a>
            <a href="#how-it-works" className="hover:text-black transition-colors">
              How it works
            </a>
            <a href="#impact" className="hover:text-black transition-colors">
              Impact
            </a>
            <a href="#contact" className="hover:text-black transition-colors">
              Contact
            </a>
          </nav>
        </div>

        {/* Right: Auth / Dashboard CTA Buttons (floating over night sky on right) */}
        <div className="hidden md:flex items-center gap-3">
          {!isLoading && user ? (
            <div className="flex items-center gap-3">
              <Link
                href={ROLE_REDIRECT_MAP[user.role] || "/"}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md shadow-sm hover:bg-white transition-colors text-xs font-semibold text-[#141414]"
              >
                <User className="w-3.5 h-3.5 text-[#141414]" />
                <span>{user.name}</span>
                <span className="text-[10px] uppercase font-bold bg-black text-white px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              </Link>
              <button
                onClick={() => logout()}
                className="text-white hover:text-neutral-200 transition-colors text-xs font-semibold p-2"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : !isLoading ? (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-full bg-white hover:bg-neutral-100 text-xs font-bold text-[#111111] shadow-sm transition-all border border-transparent"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 rounded-full bg-[#111111] hover:bg-[#222222] border border-white/20 text-xs font-bold text-white shadow-sm transition-all"
              >
                Create Account
              </Link>
            </div>
          ) : null}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/emergency-report"
            className="text-[11px] font-bold bg-black text-white px-3.5 py-1.5 rounded-full"
          >
            SOS
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full hover:bg-white/80 text-black focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white/95 backdrop-blur-md px-6 py-4 flex flex-col gap-3 animate-fade-in">
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-neutral-700 py-1"
          >
            About
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-neutral-700 py-1"
          >
            How it works
          </a>
          <a
            href="#impact"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-neutral-700 py-1"
          >
            Impact
          </a>
          <a
            href="#contact"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-semibold text-neutral-700 py-1"
          >
            Contact
          </a>

          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
            {!isLoading && user ? (
              <>
                <Link
                  href={ROLE_REDIRECT_MAP[user.role] || "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-full bg-neutral-100 text-xs font-bold text-black"
                >
                  Open Dashboard ({user.role})
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-red-600"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-full border border-neutral-300 text-xs font-bold text-black"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center rounded-full bg-black text-xs font-bold text-white"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
