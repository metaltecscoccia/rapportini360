import StatusBadge from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="p-4 space-y-4 bg-background">
      <div className="space-y-2">
        <h3 className="font-medium">Status Badge Examples</h3>
        <div className="flex gap-4">
          <StatusBadge status="In attesa" />
          <StatusBadge status="Approvato" />
        </div>
      </div>
    </div>
  );
}