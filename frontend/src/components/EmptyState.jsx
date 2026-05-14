export default function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-red-300 bg-white/95 px-6 py-12 text-center shadow-[0_8px_32px_rgba(220,38,38,0.06)] dark:border-slate-800 dark:bg-black/60 dark:shadow-none">
      <h3 className="text-lg font-bold text-red-700 dark:text-red-400">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
