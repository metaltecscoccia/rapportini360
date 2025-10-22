import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle } from "lucide-react";
import { Status } from "@shared/schema";

interface StatusBadgeProps {
  status: Status;
  viewMode?: 'employee' | 'admin';
}

export default function StatusBadge({ status, viewMode = 'admin' }: StatusBadgeProps) {
  const isPending = status === "In attesa";
  
  // Testi diversi per dipendente vs admin
  const pendingText = viewMode === 'employee' ? 'Non inviato' : 'In attesa';
  const approvedText = viewMode === 'employee' ? 'Inviato' : 'Confermato';
  
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
          {pendingText}
        </>
      ) : (
        <>
          <CheckCircle className="h-3 w-3" />
          {approvedText}
        </>
      )}
    </Badge>
  );
}