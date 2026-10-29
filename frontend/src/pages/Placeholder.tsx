import { Card } from "../components/ui/Card";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <Card>
        <p className="text-muted">Not implemented yet — planned for Phase 2.</p>
      </Card>
    </div>
  );
}
