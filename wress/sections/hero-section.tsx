import Link from "next/link"
import { ArrowRightIcon, FileTextIcon } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="min-h-screen pb-20 pt-32 px-4 md:px-16 lg:px-24 xl:px-40">
      <div className="relative flex flex-col items-center justify-center text-center">
        <div
          className="absolute top-20 -z-50 left-1/4 size-72 sm:size-96 xl:size-120 blur-[100px] opacity-30"
          style={{ backgroundColor: "var(--brand)" }}
        />

        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-brand"
          style={{
            borderColor: "color-mix(in oklab, var(--brand) 35%, transparent)",
            backgroundColor: "color-mix(in oklab, var(--brand) 10%, transparent)",
          }}
        >
          <FileTextIcon className="size-4" />
          Web-based Requirements Engineering Support System
        </div>

        <h1 className="text-5xl md:text-6xl font-semibold max-w-5xl mt-6 md:leading-17.5">
           From requirements to project success — simplify the process with{" "}
          <span className="text-brand">WRESS.</span>
        </h1>

        <p className="max-w-2xl text-muted-foreground text-base md:text-lg my-7">
          WRESS helps teams manage requirements engineering activities through a
          web-based support system for collecting, organizing, analyzing, and
          tracking software requirements.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/signup"
            className="bg-brand text-white rounded-full px-9 h-12 m-1 ring-offset-2 ring-1 border-brand flex items-center justify-center transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRightIcon className="ml-1 size-5" />
          </Link>

          <Link
            href="#features"
            className="flex items-center justify-center border border-border hover:bg-muted transition rounded-full px-7 h-12"
          >
            Learn more
          </Link>
        </div>
      </div>
    </section>
  )
}