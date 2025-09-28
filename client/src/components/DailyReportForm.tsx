import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Send } from "lucide-react";
import { WorkType } from "@shared/schema";
import StatusBadge from "./StatusBadge";

interface Operation {
  id: string;
  clientId: string;
  workOrderId: string;
  workType: WorkType;
  hours: number;
  notes: string;
}

interface DailyReportFormProps {
  employeeName: string;
  date: string;
  onSubmit: (operations: Operation[]) => void;
}

// Mock data for demonstration
const mockClients = [
  { id: "1", name: "Acme Corporation" },
  { id: "2", name: "TechFlow Solutions" },
  { id: "3", name: "Industrial Works" },
];

const mockWorkOrders = {
  "1": [
    { id: "1", name: "Progetto Alpha" },
    { id: "2", name: "Manutenzione Impianti" },
  ],
  "2": [
    { id: "3", name: "Sistema Automazione" },
    { id: "4", name: "Controllo Qualità" },
  ],
  "3": [
    { id: "5", name: "Linea Produzione A" },
    { id: "6", name: "Retrofit Macchinari" },
  ],
};

const workTypes: WorkType[] = ["Taglio", "Saldatura", "Montaggio", "Verniciatura", "Stuccatura", "Manutenzione", "Generico"];

export default function DailyReportForm({ employeeName, date, onSubmit }: DailyReportFormProps) {
  const [operations, setOperations] = useState<Operation[]>([{
    id: "1",
    clientId: "",
    workOrderId: "",
    workType: "Taglio",
    hours: 0,
    notes: "",
  }]);

  const [showHoursDialog, setShowHoursDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const addOperation = () => {
    const newOperation: Operation = {
      id: Date.now().toString(),
      clientId: "",
      workOrderId: "",
      workType: "Taglio",
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
    setOperations(operations.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ));
    console.log("Updated operation", id, field, value);
  };

  // Funzione per validare tutti i campi obbligatori
  const validateRequiredFields = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    operations.forEach((operation, index) => {
      if (!operation.clientId) missingFields.push(`Operazione ${index + 1}: Cliente`);
      if (!operation.workOrderId) missingFields.push(`Operazione ${index + 1}: Commessa`);
      if (!operation.workType) missingFields.push(`Operazione ${index + 1}: Tipo Lavorazione`);
      if (!operation.hours || operation.hours <= 0) missingFields.push(`Operazione ${index + 1}: Ore`);
    });

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // Funzione per calcolare ore totali
  const getTotalHours = (): number => {
    return operations.reduce((total, operation) => total + operation.hours, 0);
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

  const getWorkOrdersForClient = (clientId: string) => {
    return mockWorkOrders[clientId as keyof typeof mockWorkOrders] || [];
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select
                        value={operation.clientId}
                        onValueChange={(value) => {
                          updateOperation(operation.id, "clientId", value);
                          updateOperation(operation.id, "workOrderId", "");
                        }}
                      >
                        <SelectTrigger data-testid={`select-client-${operation.id}`}>
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockClients.map(client => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Commessa</Label>
                      <Select
                        value={operation.workOrderId}
                        onValueChange={(value) => updateOperation(operation.id, "workOrderId", value)}
                        disabled={!operation.clientId}
                      >
                        <SelectTrigger data-testid={`select-workorder-${operation.id}`}>
                          <SelectValue placeholder="Seleziona commessa" />
                        </SelectTrigger>
                        <SelectContent>
                          {getWorkOrdersForClient(operation.clientId).map(workOrder => (
                            <SelectItem key={workOrder.id} value={workOrder.id}>
                              {workOrder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Lavorazione</Label>
                      <Select
                        value={operation.workType}
                        onValueChange={(value: WorkType) => updateOperation(operation.id, "workType", value)}
                      >
                        <SelectTrigger data-testid={`select-worktype-${operation.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {workTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ore</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={operation.hours || ""}
                        onChange={(e) => updateOperation(operation.id, "hours", parseFloat(e.target.value) || 0)}
                        data-testid={`input-hours-${operation.id}`}
                      />
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
                Invia Rapportino
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