import type { LucideIcon } from "lucide-react";

export function Empty({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center">
      {Icon && (
        <Icon
          className="mx-auto mb-3 h-6 w-6 text-muted"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <p className="font-medium text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p>
    </div>
  );
}
