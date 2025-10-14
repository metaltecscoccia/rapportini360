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
      variant="outline"
      className={`flex items-center gap-1 border-0 ${
        isPending 
          ? 'bg-orange-500 text-white dark:bg-orange-500 dark:text-white' 
          : 'bg-green-500 text-black dark:bg-green-500 dark:text-black'
      }`}
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