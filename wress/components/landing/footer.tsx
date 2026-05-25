"use client"

import Link from "next/link"

export default function Footer() {
  return (
    <footer
      className="flex flex-wrap justify-center lg:justify-between overflow-hidden gap-10 md:gap-20 py-16 px-6 md:px-16 lg:px-24 xl:px-32 text-muted-foreground mt-52"
      style={{
        background:
          "linear-gradient(to right, transparent, color-mix(in oklab, var(--brand) 12%, transparent), transparent)",
      }}
    >
      <div className="flex flex-wrap items-start gap-10 md:gap-15 xl:gap-35">
        <Link href="/" className="max-md:w-full max-md:mb-10 text-3xl font-bold text-brand">
          WRESS
        </Link>

        <div>
          <p className="font-semibold text-foreground">Product</p>
          <ul className="mt-2 space-y-2">
            <li><Link href="/" className="hover:text-brand transition">Home</Link></li>
            <li><Link href="#features" className="hover:text-brand transition">Features</Link></li>
            <li><Link href="/signin" className="hover:text-brand transition">Sign in</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-foreground">WRESS</p>
          <ul className="mt-2 space-y-2">
            <li><Link href="#team" className="hover:text-brand transition">About</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-foreground">Legal</p>
          <ul className="mt-2 space-y-2">
            <li><Link href="/" className="hover:text-brand transition">Privacy</Link></li>
            <li><Link href="/" className="hover:text-brand transition">Terms</Link></li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col max-md:items-center max-md:text-center gap-2 items-end max-md:mt-10">
        <p className="max-w-60">
          Helping teams manage software requirements more clearly, consistently, and efficiently.
        </p>

        <p className="mt-3 text-center">
          © 2026 WRESS
        </p>
      </div>
    </footer>
  )
}