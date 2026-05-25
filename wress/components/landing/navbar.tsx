"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"
import { useState } from "react"

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-brand">
          WRESS
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-brand">Features</Link>
          <Link href="#team" className="hover:text-brand">About</Link>
          <Link href="#testimonials" className="hover:text-brand">Contact</Link>
          <Link href="#pricing" className="hover:text-brand">Plans</Link>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/signin" className="text-sm font-medium bg-brand text-white px-5 py-2 rounded-full">
            Sign in
          </Link>
          
        </div>

        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <MenuIcon />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-4 bg-background border-b border-border">
          <Link href="#features" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="#team" onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/signin" onClick={() => setMenuOpen(false)}>Sign in</Link>
        </div>
      )}
    </nav>
  )
}