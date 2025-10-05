import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Send } from "lucide-react";
import { Client, WorkOrder } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import { useQuery } from "@tanstack/react-query";

interface Operation {
  id: string;
  clientId: string;
  workOrderId: string;
  workTypes: string[];
  materials: string[];
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

// OperationCard component to handle each operation independently
interface OperationCardProps {
  operation: Operation;
  index: number;
  operationsLength: number;
  clients: Client[];
  clientsLoading: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof Operation, value: any) => void;
  onToggleWorkType: (operationId: string, workType: string) => void;
  onToggleMaterial: (operationId: string, material: string) => void;
}

function OperationCard({
  operation,
  index,
  operationsLength,
  clients,
  clientsLoading,
  onRemove,
  onUpdate,
  onToggleWorkType,
  onToggleMaterial
}: OperationCardProps) {
  const { data: workOrders = [], isLoading: workOrdersLoading } = useWorkOrdersByClient(operation.clientId);
  
  const selectedWorkOrder = workOrders.find(wo => wo.id === operation.workOrderId);
  const availableWorkTypes = selectedWorkOrder?.availableWorkTypes || [];
  const availableMaterials = selectedWorkOrder?.availableMaterials || [];
  
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4">
        <h4 className="font-medium">Operazione {index + 1}</h4>
        {operationsLength > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(operation.id)}
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
              onUpdate(operation.id, 'clientId', value);
              onUpdate(operation.id, 'workOrderId', '');
              onUpdate(operation.id, 'workTypes', []);
              onUpdate(operation.id, 'materials', []);
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
        
        <div className="space-y-2">
          <Label>Commessa</Label>
          <Select
            value={operation.workOrderId}
            onValueChange={(value) => {
              onUpdate(operation.id, 'workOrderId', value);
              onUpdate(operation.id, 'workTypes', []);
              onUpdate(operation.id, 'materials', []);
            }}
            disabled={!operation.clientId}
          >
            <SelectTrigger data-testid={`select-workorder-${operation.id}`}>
              <SelectValue placeholder="Seleziona commessa" />
            </SelectTrigger>
            <SelectContent>
              {workOrdersLoading ? (
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
        
        <div className="space-y-2">
          <Label>Lavorazioni</Label>
          {!operation.workOrderId ? (
            <div className="p-3 border rounded-md text-sm text-muted-foreground" data-testid={`worktype-empty-${operation.id}`}>
              Seleziona prima una commessa
            </div>
          ) : availableWorkTypes.length === 0 ? (
            <div className="p-3 border rounded-md text-sm text-muted-foreground" data-testid={`worktype-no-data-${operation.id}`}>
              Nessuna lavorazione disponibile
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-md" data-testid={`worktype-container-${operation.id}`}>
              {availableWorkTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`worktype-${operation.id}-${type}`}
                    checked={operation.workTypes?.includes(type) || false}
                    onCheckedChange={() => onToggleWorkType(operation.id, type)}
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
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <Label>Materiali (opzionale)</Label>
          {!operation.workOrderId ? (
            <div className="p-3 border rounded-md text-sm text-muted-foreground" data-testid={`material-empty-${operation.id}`}>
              Seleziona prima una commessa
            </div>
          ) : availableMaterials.length === 0 ? (
            <div className="p-3 border rounded-md text-sm text-muted-foreground" data-testid={`material-no-data-${operation.id}`}>
              Nessun materiale disponibile
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-md" data-testid={`material-container-${operation.id}`}>
              {availableMaterials.map(material => (
                <div key={material} className="flex items-center space-x-2">
                  <Checkbox
                    id={`material-${operation.id}-${material}`}
                    checked={operation.materials?.includes(material) || false}
                    onCheckedChange={() => onToggleMaterial(operation.id, material)}
                    data-testid={`checkbox-material-${operation.id}-${material}`}
                  />
                  <Label 
                    htmlFor={`material-${operation.id}-${material}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {material}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Ore lavorate</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={operation.hours || ''}
            onChange={(e) => onUpdate(operation.id, 'hours', e.target.value)}
            placeholder="Es. 8"
            data-testid={`input-hours-${operation.id}`}
          />
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <Label>Note</Label>
        <Textarea
          value={operation.notes}
          onChange={(e) => onUpdate(operation.id, 'notes', e.target.value)}
          placeholder="Aggiungi note sull'operazione..."
          rows={3}
          data-testid={`textarea-notes-${operation.id}`}
        />
      </div>
    </Card>
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
          materials: op.materials || [], // Ensure materials array exists
          hours: typeof op.hours === 'string' ? parseFloat(op.hours) || 0 : op.hours // Ensure numeric
        }))
      : [{
          id: "1",
          clientId: "",
          workOrderId: "",
          workTypes: [],
          materials: [],
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
      materials: [],
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

  const toggleWorkType = (operationId: string, workType: string) => {
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

  const toggleMaterial = (operationId: string, material: string) => {
    setOperations(operations.map(op => {
      if (op.id === operationId) {
        const currentMaterials = op.materials || [];
        const isSelected = currentMaterials.includes(material);
        const newMaterials = isSelected
          ? currentMaterials.filter(m => m !== material)
          : [...currentMaterials, material];
        return { ...op, materials: newMaterials };
      }
      return op;
    }));
    console.log("Toggled material", operationId, material);
  };


  // Funzione per validare tutti i campi obbligatori
  const validateRequiredFields = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    operations.forEach((operation, index) => {
      if (!operation.clientId) missingFields.push(`Operazione ${index + 1}: Cliente`);
      if (!operation.workOrderId) missingFields.push(`Operazione ${index + 1}: Commessa`);
      if (!operation.workTypes || operation.workTypes.length === 0) missingFields.push(`Operazione ${index + 1}: Seleziona almeno una Lavorazione`);
      if (!operation.hours || operation.hours <= 0) missingFields.push(`Operazione ${index + 1}: Inserire ore valide (maggiori di 0)`);
      // NOTE: materials are optional, so no validation required
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
    // Rimuovi il campo 'id' dalle operazioni prima di inviare (serve solo per il form)
    const operationsToSubmit = operations.map(({ id, ...operation }) => operation) as Operation[];
    console.log("Submitting daily report with operations:", operationsToSubmit);
    onSubmit(operationsToSubmit);
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
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-6">
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
              <h3 className="text-lg font-medium">Operazioni</h3>
              
              {operations.map((operation, index) => (
                <OperationCard
                  key={operation.id}
                  operation={operation}
                  index={index}
                  operationsLength={operations.length}
                  clients={clients}
                  clientsLoading={clientsLoading}
                  onRemove={removeOperation}
                  onUpdate={updateOperation}
                  onToggleWorkType={toggleWorkType}
                  onToggleMaterial={toggleMaterial}
                />
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="text-sm text-muted-foreground">
                <strong>Ore totali: {getTotalHours()}h</strong>
                <span className="ml-2 text-xs">
                  {getTotalHours() === 8 ? "(✓ Standard)" : getTotalHours() < 8 ? "(⚠ Sotto standard)" : "(⚠ Sopra standard)"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addOperation}
                  data-testid="button-add-operation"
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Operazione
                </Button>
                <Button type="submit" data-testid="button-submit-report" className="w-full sm:w-auto">
                  <Send className="h-4 w-4 mr-2" />
                  {isEditing ? "Aggiorna Rapportino" : "Invia Rapportino"}
                </Button>
              </div>
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
