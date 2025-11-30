import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Send, Camera, X } from "lucide-react";
import { Client, WorkOrder } from "@shared/schema";
import StatusBadge from "./StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { ObjectUploader } from "./ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { useToast } from "@/hooks/use-toast";

interface Operation {
  id: string;
  clientId: string;
  workOrderId: string;
  workTypes: string[];
  materials: string[];
  hours: number; // Ore lavorate per questa operazione (es. 2.5)
  notes: string;
  photos: string[]; // Photo paths from object storage
}

interface DailyReportFormProps {
  employeeName: string;
  date: string;
  onSubmit: (operations: Operation[]) => void;
  initialOperations?: Operation[]; // For editing existing reports
  isEditing?: boolean; // To show different UI for editing
  isSubmitting?: boolean; // To disable submit button during submission
}

// Load data from backend
const useClients = () => {
  return useQuery<Client[]>({
    queryKey: ['/api/clients'],
    select: (data) => data || []
  });
};

const useAllActiveWorkOrders = () => {
  return useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders/active'],
    select: (data) => data || []
  });
};

// Query per recuperare le lavorazioni globali
const useWorkTypes = () => {
  return useQuery<any[]>({
    queryKey: ['/api/work-types'],
    select: (data) => data || []
  });
};

// Query per recuperare i materiali globali
const useMaterials = () => {
  return useQuery<any[]>({
    queryKey: ['/api/materials'],
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
  allWorkOrders: WorkOrder[];
  workOrdersLoading: boolean;
  allWorkTypes: any[];
  allMaterials: any[];
  onRemove: (id: string) => void;
  setOperations: React.Dispatch<React.SetStateAction<Operation[]>>;
  onToggleWorkType: (operationId: string, workType: string) => void;
  onToggleMaterial: (operationId: string, material: string) => void;
}

function OperationCard({
  operation,
  index,
  operationsLength,
  clients,
  clientsLoading,
  allWorkOrders,
  workOrdersLoading,
  allWorkTypes,
  allMaterials,
  onRemove,
  setOperations,
  onToggleWorkType,
  onToggleMaterial
}: OperationCardProps) {
  const { toast } = useToast();
  
  // Filter work orders for the selected client
  const workOrders = allWorkOrders.filter(wo => wo.clientId === operation.clientId);
  
  const selectedWorkOrder = workOrders.find(wo => wo.id === operation.workOrderId);
  const availableWorkTypes = selectedWorkOrder?.availableWorkTypes || [];
  const availableMaterials = selectedWorkOrder?.availableMaterials || [];

  // Helper function to get work type name by ID
  const getWorkTypeName = (id: string) => {
    const workType = allWorkTypes.find(wt => wt.id === id);
    return workType?.name || id;
  };

  // Helper function to get material name by ID
  const getMaterialName = (id: string) => {
    const material = allMaterials.find(m => m.id === id);
    return material?.name || id;
  };
  
  return (
    <Card className={`p-4 ${index % 2 === 0 ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
      <div className="flex items-start justify-between mb-4">
        <h4 className="font-medium text-base">Operazione {index + 1}</h4>
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
          <Label className="font-semibold text-foreground">Cliente</Label>
          <Select
            value={operation.clientId}
            onValueChange={(value) => {
              setOperations(prevOps => prevOps.map(op => 
                op.id === operation.id 
                  ? { ...op, clientId: value, workOrderId: "", workTypes: [], materials: [] }
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
        
        <div className="space-y-2">
          <Label className="font-semibold text-foreground">Commessa</Label>
          <Select
            value={operation.workOrderId}
            onValueChange={(value) => {
              setOperations(prevOps => prevOps.map(op => 
                op.id === operation.id 
                  ? { ...op, workOrderId: value, workTypes: [], materials: [] }
                  : op
              ));
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
          <Label className="font-semibold text-foreground">Lavorazioni</Label>
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
                    {getWorkTypeName(type)}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="space-y-2">
          <Label className="font-semibold text-foreground">Materiali (opzionale)</Label>
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
                    {getMaterialName(material)}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="font-semibold text-foreground">Ore lavorate</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={operation.hours || ''}
            onChange={(e) => {
              const value = e.target.value;
              setOperations(prevOps => prevOps.map(op => 
                op.id === operation.id 
                  ? { ...op, hours: typeof value === 'string' ? parseFloat(value) || 0 : value }
                  : op
              ));
            }}
            placeholder="Es. 8"
            data-testid={`input-hours-${operation.id}`}
          />
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <Label className="font-semibold text-foreground">Note</Label>
        <Textarea
          value={operation.notes}
          onChange={(e) => {
            const value = e.target.value;
            setOperations(prevOps => prevOps.map(op => 
              op.id === operation.id 
                ? { ...op, notes: value }
                : op
            ));
          }}
          placeholder="Aggiungi note sull'operazione..."
          rows={3}
          data-testid={`textarea-notes-${operation.id}`}
        />
      </div>
      
      <div className="mt-4 space-y-2">
        <Label className="font-semibold text-foreground">Foto (max 5)</Label>
        <div className="flex flex-wrap gap-2">
          {operation.photos && operation.photos.map((photoPath, idx) => (
            <div key={idx} className="relative">
              <img 
                src={photoPath}
                alt={`Foto ${idx + 1}`} 
                className="w-20 h-20 object-cover rounded-md border bg-muted"
                data-testid={`photo-preview-${operation.id}-${idx}`}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80"%3E%3Crect width="80" height="80" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EFoto%3C/text%3E%3C/svg%3E';
                  e.currentTarget.onerror = null;
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => {
                  setOperations(prevOps => prevOps.map(op =>
                    op.id === operation.id
                      ? { ...op, photos: op.photos.filter((_, i) => i !== idx) }
                      : op
                  ));
                }}
                data-testid={`button-remove-photo-${operation.id}-${idx}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {(!operation.photos || operation.photos.length < 5) && (
            <ObjectUploader
              maxNumberOfFiles={1}
              maxFileSize={10485760}
              buttonVariant="outline"
              buttonClassName="w-20 h-20"
              onGetUploadParameters={async () => {
                const response = await fetch('/api/operations/photos/upload', {
                  method: 'POST',
                  credentials: 'include',
                });
                
                if (!response.ok) {
                  throw new Error(`Impossibile ottenere URL upload: ${response.status}`);
                }
                
                const data = await response.json();
                if (!data.uploadURL) {
                  throw new Error("URL upload non disponibile");
                }
                
                return {
                  method: 'PUT' as const,
                  url: data.uploadURL,
                };
              }}
              onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>, uppy) => {
                try {
                  if (result.failed && result.failed.length > 0) {
                    toast({
                      title: "Errore upload",
                      description: "Impossibile caricare la foto. Riprova.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (result.successful && result.successful.length > 0) {
                    const uploadURL = result.successful[0].response?.uploadURL;
                    
                    if (!uploadURL) {
                      throw new Error("Upload URL non disponibile");
                    }
                    
                    const metadataResponse = await fetch('/api/operations/photos', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ photoURL: uploadURL }),
                    });
                    
                    if (!metadataResponse.ok) {
                      const errorText = await metadataResponse.text();
                      throw new Error(`Impossibile salvare i metadati: ${errorText || metadataResponse.status}`);
                    }
                    
                    const metadataData = await metadataResponse.json();
                    if (!metadataData.objectPath) {
                      throw new Error("Object path non ricevuto dal server");
                    }
                    
                    setOperations(prevOps => prevOps.map(op =>
                      op.id === operation.id
                        ? { ...op, photos: [...(op.photos || []), metadataData.objectPath] }
                        : op
                    ));
                    
                    toast({
                      title: "Foto caricata",
                      description: "La foto è stata aggiunta con successo",
                    });
                  }
                } catch (error) {
                  console.error("Errore upload foto:", error);
                  toast({
                    title: "Errore",
                    description: error instanceof Error ? error.message : "Impossibile caricare la foto",
                    variant: "destructive",
                  });
                } finally {
                  uppy.cancelAll();
                }
              }}
            >
              <Camera className="h-5 w-5" />
            </ObjectUploader>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Carica foto per documentare il lavoro svolto
        </p>
      </div>
    </Card>
  );
}

export default function DailyReportForm({ 
  employeeName, 
  date, 
  onSubmit, 
  initialOperations, 
  isEditing = false,
  isSubmitting = false
}: DailyReportFormProps) {
  // Initialize with provided operations or default empty operation
  const [operations, setOperations] = useState<Operation[]>(
    initialOperations && initialOperations.length > 0 
      ? initialOperations.map((op, index) => ({
          ...op,
          id: `${index + 1}`, // Ensure unique IDs for form state
          materials: op.materials || [], // Ensure materials array exists
          hours: typeof op.hours === 'string' ? parseFloat(op.hours) || 0 : op.hours, // Ensure numeric
          photos: op.photos || [], // Ensure photos array exists
        }))
      : [{
          id: "1",
          clientId: "",
          workOrderId: "",
          workTypes: [],
          materials: [],
          hours: 0,
          notes: "",
          photos: [],
        }]
  );

  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  // Load clients and all active work orders from backend
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { data: allWorkOrders = [], isLoading: workOrdersLoading } = useAllActiveWorkOrders();
  const { data: allWorkTypes = [] } = useWorkTypes();
  const { data: allMaterials = [] } = useMaterials();

  // Filter clients to show only those with active work orders
  const clientsWithWorkOrders = clients.filter(client => 
    allWorkOrders.some(wo => wo.clientId === client.id)
  );

  const addOperation = () => {
    const newOperation: Operation = {
      id: Date.now().toString(),
      clientId: "",
      workOrderId: "",
      workTypes: [],
      materials: [],
      hours: 0,
      notes: "",
      photos: [],
    };
    setOperations(prevOps => [...prevOps, newOperation]);
    console.log("Added new operation");
  };

  const removeOperation = (id: string) => {
    setOperations(prevOps => prevOps.filter(op => op.id !== id));
    console.log("Removed operation", id);
  };

  const toggleWorkType = (operationId: string, workType: string) => {
    setOperations(prevOps => prevOps.map(op => {
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
    setOperations(prevOps => prevOps.map(op => {
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
          <StatusBadge status="In attesa" viewMode="employee" />
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
                  clients={clientsWithWorkOrders}
                  clientsLoading={clientsLoading}
                  allWorkOrders={allWorkOrders}
                  workOrdersLoading={workOrdersLoading}
                  allWorkTypes={allWorkTypes}
                  allMaterials={allMaterials}
                  onRemove={removeOperation}
                  setOperations={setOperations}
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
                <Button 
                  type="submit" 
                  data-testid="button-submit-report" 
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting 
                    ? "Invio in corso..." 
                    : isEditing ? "Aggiorna Rapportino" : "Invia Rapportino"
                  }
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
