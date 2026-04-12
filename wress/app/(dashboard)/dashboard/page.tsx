export default function Page() {
  return (
    <section className="w-full rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border md:p-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to WRESS. Monitor projects, manage templates, and keep track
          of requirements engineering activities in one place.
        </p>
      </div>
    </section>
  )
}