import SectionTitle from "@/components/landing/section-title"
import {
  ClipboardCheckIcon,
  FileSearchIcon,
  GitBranchIcon,
  UsersIcon,
} from "lucide-react"

const features = [
  {
    icon: <ClipboardCheckIcon className="size-6 text-brand" />,
    title: "Requirements Collection",
    description:
      "Capture and organize stakeholder requirements in a centralized web-based workspace.",
  },
  {
    icon: <FileSearchIcon className="size-6 text-brand" />,
    title: "Requirements Analysis",
    description:
      "Review, validate, and refine requirements to improve clarity, completeness, and consistency.",
  },
  {
    icon: <GitBranchIcon className="size-6 text-brand" />,
    title: "Traceability Support",
    description:
      "Track requirements across the project lifecycle from initial submission to implementation reference.",
  },
  {
    icon: <UsersIcon className="size-6 text-brand" />,
    title: "Team Collaboration",
    description:
      "Support communication between project members when reviewing, updating, and managing requirements.",
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="scroll-m-48 px-4 md:px-16 lg:px-24 xl:px-32">
      <SectionTitle
        icon={<ClipboardCheckIcon className="size-4 text-brand" />}
        badge="Core Features"
        title="Professional support for requirements engineering"
        description="WRESS provides the essential tools for collecting, analyzing, tracing, and managing software requirements in one organized platform."
      />

      <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-md"
          >
            <div
              className="mb-5 flex size-12 items-center justify-center rounded-xl border"
              style={{
                borderColor: "color-mix(in oklab, var(--brand) 25%, transparent)",
                backgroundColor: "color-mix(in oklab, var(--brand) 10%, transparent)",
              }}
            >
              {feature.icon}
            </div>

            <h3 className="text-base font-semibold text-foreground">
              {feature.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}