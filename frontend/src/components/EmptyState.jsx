export default function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center shadow-[0_6px_24px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900/75">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
