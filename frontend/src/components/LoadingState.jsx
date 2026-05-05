export default function LoadingState({ label = "Loading...", variant = "default" }) {
  if (variant === "dashboard") {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-56 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80" />
          ))}
        </div>
        <div className="h-72 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80" />
        <div className="h-56 rounded-2xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/80" />
      </div>
    );
  }

  if (variant === "split") {
    return (
      <div className="grid gap-6 animate-pulse lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-20 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 w-36 rounded bg-slate-200 dark:bg-slate-700" />
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-16 rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/80">
          <div className="h-6 w-52 rounded bg-slate-200 dark:bg-slate-700" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-14 rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "watch") {
    return (
      <div className="mx-auto grid max-w-[1600px] animate-pulse gap-5 xl:grid-cols-[minmax(0,860px)_minmax(340px,1fr)] 2xl:grid-cols-[minmax(0,920px)_420px]">
        <section className="space-y-4">
          <div className="aspect-video w-full rounded-2xl border border-slate-200 bg-slate-200/80 dark:border-slate-700 dark:bg-slate-800/80" />
          <div className="h-10 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="h-6 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-5 dark:border-slate-700 dark:bg-slate-900/80">
            <div className="h-5 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </section>

        <aside className="space-y-3">
          <div className="h-20 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </aside>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-slate-200 bg-white/80 p-2.5 dark:border-slate-700 dark:bg-slate-900/80">
              <div className="aspect-[16/9] rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[280px] w-full animate-pulse rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80">
      <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-700" />
      <div className="mt-4 h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-2 h-3 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
