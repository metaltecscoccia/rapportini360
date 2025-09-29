import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Send } from "lucide-react";
import { WorkType, Client, WorkOrder } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import { useQuery } from "@tanstack/react-query";

interface Operation {
  id: string;
  clientId: string;
  workOrderId: string;
  workTypes: WorkType[];
  hours: number; // Ore lavorate per questa operazione (es. 2.5)
  notes: string;
}

interface DailyReportFormProps {
  employeeName: string;
  date: string;
  onSubmit: (operations: Operation[]) => void;
  initialOperations?: Operation[]; // For editing existing reports
  isEditing?: boolean; // To show different UI for editing
}

// Load data from backend
const useClients = () => {
  return useQuery<Client[]>({
    queryKey: ['/api/clients'],
    select: (data) => data || []
  });
};

const useWorkOrdersByClient = (clientId: string) => {
  return useQuery<WorkOrder[]>({
    queryKey: [`/api/clients/${clientId}/work-orders`],
    enabled: !!clientId,
    select: (data) => data || []
  });
};

const workTypes: WorkType[] = ["Taglio", "Saldatura", "Montaggio", "Foratura", "Verniciatura", "Stuccatura", "Manutenzione", "Generico"];

// WorkOrderSelect component to handle work order loading for each operation
interface WorkOrderSelectProps {
  clientId: string;
  value: string;
  onChange: (value: string) => void;
  operationId: string;
}

function WorkOrderSelect({ clientId, value, onChange, operationId }: WorkOrderSelectProps) {
  const { data: workOrders = [], isLoading } = useWorkOrdersByClient(clientId);
  
  return (
    <div className="space-y-2">
      <Label>Commessa</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={!clientId}
      >
        <SelectTrigger data-testid={`select-workorder-${operationId}`}>
          <SelectValue placeholder="Seleziona commessa" />
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <SelectItem value="loading" disabled>Caricamento...</SelectItem>
          ) : (
            workOrders.map((workOrder) => (
              <SelectItem key={workOrder.id} value={workOrder.id}>
                {workOrder.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function DailyReportForm({ 
  employeeName, 
  date, 
  onSubmit, 
  initialOperations, 
  isEditing = false 
}: DailyReportFormProps) {
  // Initialize with provided operations or default empty operation
  const [operations, setOperations] = useState<Operation[]>(
    initialOperations && initialOperations.length > 0 
      ? initialOperations.map((op, index) => ({
          ...op,
          id: `${index + 1}`, // Ensure unique IDs for form state
          hours: typeof op.hours === 'string' ? parseFloat(op.hours) || 0 : op.hours // Ensure numeric
        }))
      : [{
          id: "1",
          clientId: "",
          workOrderId: "",
          workTypes: ["Taglio"],
          hours: 0,
          notes: "",
        }]
  );

  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  // Load clients from backend
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const addOperation = () => {
    const newOperation: Operation = {
      id: Date.now().toString(),
      clientId: "",
      workOrderId: "",
      workTypes: [],
      hours: 0,
      notes: "",
    };
    setOperations([...operations, newOperation]);
    console.log("Added new operation");
  };

  const removeOperation = (id: string) => {
    setOperations(operations.filter(op => op.id !== id));
    console.log("Removed operation", id);
  };

  const updateOperation = (id: string, field: keyof Operation, value: any) => {
    // Convert hours to number to ensure proper calculation
    const processedValue = field === 'hours' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value;
    setOperations(operations.map(op => 
      op.id === id ? { ...op, [field]: processedValue } : op
    ));
  };

  const toggleWorkType = (operationId: string, workType: WorkType) => {
    setOperations(operations.map(op => {
      if (op.id === operationId) {
        const currentTypes = op.workTypes || [];
        const isSelected = currentTypes.includes(workType);
        const newTypes = isSelected
          ? currentTypes.filter(type => type !== workType)
          : [...currentTypes, workType];
        return { ...op, workTypes: newTypes };
      }
      return op;
    }));
    console.log("Toggled work type", operationId, workType);
  };


  // Funzione per validare tutti i campi obbligatori
  const validateRequiredFields = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    operations.forEach((operation, index) => {
      if (!operation.clientId) missingFields.push(`Operazione ${index + 1}: Cliente`);
      if (!operation.workOrderId) missingFields.push(`Operazione ${index + 1}: Commessa`);
      if (!operation.workTypes || operation.workTypes.length === 0) missingFields.push(`Operazione ${index + 1}: Seleziona almeno una Lavorazione`);
      if (!operation.hours || operation.hours <= 0) missingFields.push(`Operazione ${index + 1}: Inserire ore valide (maggiori di 0)`);
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // Funzione per calcolare ore totali
  const getTotalHours = (): number => {
    return operations.reduce((total, operation) => {
      const hours = typeof operation.hours === 'string' ? parseFloat(operation.hours) || 0 : operation.hours || 0;
      return total + hours;
    }, 0);
  };

  // Funzione per inviare il rapportino (chiamata finale)
  const submitReport = () => {
    console.log("Submitting daily report with operations:", operations);
    onSubmit(operations);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validazione campi obbligatori
    const validation = validateRequiredFields();
    if (!validation.isValid) {
      alert(`Compila tutti i campi obbligatori:\n\n${validation.missingFields.join('\n')}`);
      return;
    }

    // 2. Controllo ore totali (deve essere 8)
    const totalHours = getTotalHours();
    
    if (totalHours === 8) {
      // Ore corrette, invia subito
      submitReport();
    } else {
      // Ore diverse da 8, mostra dialog
      if (totalHours < 8) {
        setDialogMessage(`Le ore totali sono ${totalHours}, inferiori alle 8 ore standard.`);
      } else {
        setDialogMessage(`Le ore totali sono ${totalHours}, superiori alle 8 ore standard.`);
      }
      setShowHoursDialog(true);
    }
  };


  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Rapportino Giornaliero</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {employeeName} - {date}
            </p>
          </div>
          <StatusBadge status="In attesa" />
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Operazioni</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOperation}
                  data-testid="button-add-operation"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Operazione
                </Button>
              </div>
              
              {operations.map((operation, index) => (
                <Card key={operation.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Operazione {index + 1}</h4>
                    {operations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOperation(operation.id)}
                        data-testid={`button-remove-operation-${operation.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select
                        value={operation.clientId}
                        onValueChange={(value) => {
                          // Update both clientId and reset workOrderId in single operation
                          setOperations(prevOps => prevOps.map(op => 
                            op.id === operation.id 
                              ? { ...op, clientId: value, workOrderId: "" }
                              : op
                          ));
                        }}
                      >
                        <SelectTrigger data-testid={`select-client-${operation.id}`}>
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientsLoading ? (
                            <SelectItem value="loading" disabled>Caricamento...</SelectItem>
                          ) : (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <WorkOrderSelect
                      clientId={operation.clientId}
                      value={operation.workOrderId}
                      onChange={(value) => updateOperation(operation.id, "workOrderId", value)}
                      operationId={operation.id}
                    />
                    
                    <div className="space-y-2">
                      <Label>Lavorazioni</Label>
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                        {workTypes.map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`worktype-${operation.id}-${type}`}
                              checked={operation.workTypes?.includes(type) || false}
                              onCheckedChange={() => toggleWorkType(operation.id, type)}
                              data-testid={`checkbox-worktype-${operation.id}-${type}`}
                            />
                            <Label 
                              htmlFor={`worktype-${operation.id}-${type}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {type}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {operation.workTypes && operation.workTypes.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Selezionate: <strong>{operation.workTypes.join(", ")}</strong>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ore lavorate</Label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={operation.hours || ''}
                        onChange={(e) => {
                          updateOperation(operation.id, "hours", e.target.value);
                        }}
                        placeholder="Es. 2.5"
                        data-testid={`input-hours-${operation.id}`}
                      />
                      <div className="text-xs text-muted-foreground">
                        Inserire le ore in formato decimale (es. 2,5 per 2 ore e 30 minuti)
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <Label>Note (opzionale)</Label>
                    <Textarea
                      value={operation.notes}
                      onChange={(e) => updateOperation(operation.id, "notes", e.target.value)}
                      placeholder="Aggiungi note aggiuntive..."
                      rows={3}
                      data-testid={`textarea-notes-${operation.id}`}
                    />
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <strong>Ore totali: {getTotalHours()}h</strong>
                <span className="ml-2 text-xs">
                  {getTotalHours() === 8 ? "(✓ Standard)" : getTotalHours() < 8 ? "(⚠ Sotto standard)" : "(⚠ Sopra standard)"}
                </span>
              </div>
              <Button type="submit" data-testid="button-submit-report">
                <Send className="h-4 w-4 mr-2" />
                {isEditing ? "Aggiorna Rapportino" : "Invia Rapportino"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog conferma ore diverse da 8 */}
      <AlertDialog open={showHoursDialog} onOpenChange={setShowHoursDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Invio Rapportino</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogMessage}
              <br /><br />
              Vuoi inviare comunque il rapportino o preferisci modificarlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-hours-dialog">
              Modifica Rapportino
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowHoursDialog(false);
                submitReport();
              }}
              data-testid="button-confirm-hours-dialog"
            >
              Invia lo Stesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}