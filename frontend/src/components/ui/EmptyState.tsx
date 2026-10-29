import type { ReactNode } from "react";
import { FolderSearch } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-surface/50">
      <div className="mb-3 text-muted p-3 rounded-full bg-background">
        {icon || <FolderSearch className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
