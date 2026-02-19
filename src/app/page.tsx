export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-12">
      <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-sky-100">
        <p className="inline-flex rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
          Kids AI MVP
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900">
          Grade 4 Math learning that feels like play.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-700">
          Next step is wiring the student missions, AI question flow, and parent
          dashboard endpoints from the API contracts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-xl bg-skyfun/30 px-4 py-2 text-sm font-semibold">
            Next.js + Bun
          </span>
          <span className="rounded-xl bg-mango/20 px-4 py-2 text-sm font-semibold">
            Tailwind CSS
          </span>
          <span className="rounded-xl bg-mint px-4 py-2 text-sm font-semibold">
            Prisma + Postgres
          </span>
        </div>
      </section>
    </main>
  );
}
