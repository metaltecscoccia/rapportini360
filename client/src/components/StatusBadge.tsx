import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle } from "lucide-react";
import { Status } from "@shared/schema";

interface StatusBadgeProps {
  status: Status;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isPending = status === "In attesa";
  
  return (
    <Badge 
      variant={isPending ? "secondary" : "default"}
      className={`flex items-center gap-1 ${isPending ? 'bg-warning/10 text-warning-foreground border-warning/20' : 'bg-success/10 text-success-foreground border-success/20'}`}
      data-testid={`badge-status-${status.toLowerCase().replace(' ', '-')}`}
    >
      {isPending ? (
        <>
          <Clock className="h-3 w-3" />
          In attesa
        </>
      ) : (
        <>
          <CheckCircle className="h-3 w-3" />
          Approvato
        </>
      )}
    </Badge>
  );
}