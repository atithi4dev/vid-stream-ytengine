import { getInitials } from "../utils/format";

export default function UserAvatar({ src, name = "User", size = "md" }) {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold dark:bg-slate-700 dark:text-slate-200`}>
      {getInitials(name)}
    </div>
  );
}
