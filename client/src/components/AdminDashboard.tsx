import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  FileText, 
  Building, 
  Briefcase, 
  Search, 
  Filter,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash,
  Calendar,
  Wrench,
  Eye,
  Key
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import WorkOrderReport from "./WorkOrderReport";
import DailyReportForm from "./DailyReportForm";

// Schema per form aggiunta dipendente
const addEmployeeSchema = z.object({
  fullName: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  username: z.string().min(3, "L'username deve essere di almeno 3 caratteri"),
  password: z.string().min(1, "Password è richiesta"),
});

// Schema per modifica dipendente (password opzionale)
const editEmployeeSchema = z.object({
  fullName: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  username: z.string().min(3, "L'username deve essere di almeno 3 caratteri"),
  password: z.string().min(1, "Password è richiesta").optional().or(z.literal("")),
});

type AddEmployeeForm = z.infer<typeof addEmployeeSchema>;
type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;


// Mock data removed - now using real data from API

// Mock work orders with client name included
const mockAllWorkOrders = [
  {
    id: "ACM-2024-001",
    number: "ACM-2024-001",
    clientName: "Acme Corporation",
    description: "Realizzazione cancello automatico",
    status: "In Corso",
    totalOperations: 8,
    totalHours: 45.5,
    lastActivity: "2024-03-15"
  },
  {
    id: "ACM-2024-002",
    number: "ACM-2024-002",
    clientName: "Acme Corporation",
    description: "Riparazione ringhiera balcone",
    status: "Completato",
    totalOperations: 4,
    totalHours: 12.0,
    lastActivity: "2024-03-14"
  },
  {
    id: "TFS-2024-012",
    number: "TFS-2024-012",
    clientName: "TechFlow Solutions",
    description: "Manutenzione ordinaria impianto",
    status: "In Corso",
    totalOperations: 6,
    totalHours: 28.0,
    lastActivity: "2024-03-15"
  },
  {
    id: "IW-2024-045",
    number: "IW-2024-045",
    clientName: "Industrial Works",
    description: "Prototipo struttura metallica",
    status: "In Corso",
    totalOperations: 12,
    totalHours: 76.0,
    lastActivity: "2024-03-14"
  }
];

// Mock data for work orders with multiple work types
const mockOperations = [
  {
    id: "1",
    workOrderId: "ACM-2024-001",
    clientName: "Acme Corporation",
    workOrderNumber: "ACM-2024-001", 
    workOrderDescription: "Realizzazione cancello automatico",
    workTypes: ["Taglio", "Saldatura", "Montaggio"],
    employee: "Marco Rossi",
    date: "2024-03-15",
    hours: 6.5,
    startTime: "08:00",
    endTime: "14:30",
    notes: "Completato taglio lamiere e inizio saldatura"
  },
  {
    id: "2",
    workOrderId: "TFS-2024-012",
    clientName: "TechFlow Solutions",
    workOrderNumber: "TFS-2024-012",
    workOrderDescription: "Manutenzione ordinaria impianto", 
    workTypes: ["Manutenzione", "Verniciatura"],
    employee: "Laura Bianchi",
    date: "2024-03-15",
    hours: 4.0,
    startTime: "09:00", 
    endTime: "13:00",
    notes: "Controllo generale e ritocchi verniciatura"
  },
  {
    id: "3",
    workOrderId: "IW-2024-045",
    clientName: "Industrial Works",
    workOrderNumber: "IW-2024-045",
    workOrderDescription: "Prototipo struttura metallica",
    workTypes: ["Taglio", "Foratura", "Montaggio", "Stuccatura"],
    employee: "Giuseppe Verde",
    date: "2024-03-14", 
    hours: 8.0,
    startTime: "08:00",
    endTime: "16:00",
    notes: "Prima fase prototipo completata"
  },
  {
    id: "4",
    workOrderId: "ACM-2024-002",
    clientName: "Acme Corporation",
    workOrderNumber: "ACM-2024-002",
    workOrderDescription: "Riparazione ringhiera balcone",
    workTypes: ["Saldatura", "Verniciatura"],
    employee: "Anna Neri",
    date: "2024-03-14",
    hours: 3.5,
    startTime: "14:00",
    endTime: "17:30",
    notes: "Saldatura completata, verniciatura in corso"
  }
];

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTab, setSelectedTab] = useState("reports");
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<{
    id: string;
    number: string;
    description: string;
    clientName: string;
  } | null>(null);
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [deleteEmployeeDialogOpen, setDeleteEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [editReportDialogOpen, setEditReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportOperations, setReportOperations] = useState<any[]>([]);
  const [createReportDialogOpen, setCreateReportDialogOpen] = useState(false);
  const [selectedEmployeeForReport, setSelectedEmployeeForReport] = useState<any>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form per aggiunta dipendente
  const form = useForm<AddEmployeeForm>({
    resolver: zodResolver(addEmployeeSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
    },
  });

  // Form per modifica dipendente
  const editForm = useForm<EditEmployeeForm>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      fullName: "",
      username: "",
      password: "",
    },
  });

  // Query per recuperare tutti i dipendenti
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/users'],
  });

  // Query per recuperare tutti i rapportini
  const { data: reports = [], isLoading: isLoadingReports } = useQuery<any[]>({
    queryKey: ['/api/daily-reports'],
  });

  // Mutation per creare nuovo dipendente
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: AddEmployeeForm) => {
      return apiRequest('POST', '/api/users', {
        fullName: data.fullName,
        username: data.username,
        password: data.password,
        role: 'employee'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Dipendente aggiunto",
        description: "Il nuovo dipendente è stato aggiunto con successo.",
      });
      form.reset();
      setAddEmployeeDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiunta del dipendente.",
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare dipendente
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: EditEmployeeForm & { id: string }) => {
      const updateData: any = {
        fullName: data.fullName,
        username: data.username,
      };
      
      // Include password only if provided
      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }
      
      return apiRequest('PUT', `/api/users/${data.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Dipendente aggiornato",
        description: "Il dipendente è stato aggiornato con successo.",
      });
      editForm.reset();
      setEditEmployeeDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento del dipendente.",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare dipendente
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return apiRequest('DELETE', `/api/users/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Dipendente eliminato",
        description: "Il dipendente è stato eliminato con successo.",
      });
      setDeleteEmployeeDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del dipendente.",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ employeeId, newPassword }: { employeeId: string; newPassword: string }) => {
      const response = await apiRequest('POST', `/api/users/${employeeId}/reset-password`, { newPassword });
      return response.json(); // Parse JSON response
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] }); // Refresh user list
      setResetPasswordDialogOpen(false);
      setSelectedEmployee(null);
      toast({
        title: "Password aggiornata",
        description: "La password del dipendente è stata aggiornata con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento della password.",
        variant: "destructive",
      });
    },
  });

  const handleAddEmployee = (data: AddEmployeeForm) => {
    createEmployeeMutation.mutate(data);
  };

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    editForm.reset({
      fullName: employee.fullName,
      username: employee.username,
      password: "", // Password vuota per default
    });
    setEditEmployeeDialogOpen(true);
  };

  const handleUpdateEmployee = (data: EditEmployeeForm) => {
    if (selectedEmployee) {
      updateEmployeeMutation.mutate({ ...data, id: selectedEmployee.id });
    }
  };

  const handleDeleteEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setDeleteEmployeeDialogOpen(true);
  };

  const confirmDeleteEmployee = () => {
    if (selectedEmployee) {
      deleteEmployeeMutation.mutate(selectedEmployee.id);
    }
  };

  const handleResetPassword = (employee: any) => {
    setSelectedEmployee(employee);
    setNewPassword("");
    setResetPasswordDialogOpen(true);
  };
  
  const confirmResetPassword = () => {
    if (selectedEmployee && newPassword.trim().length >= 6) {
      resetPasswordMutation.mutate({
        employeeId: selectedEmployee.id,
        newPassword: newPassword.trim()
      });
    }
  };

  const filteredReports = (reports as any[]).filter((report: any) => {
    const employeeName = report.employeeName || report.employee || "";
    const matchesSearch = employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Mutation per approvare rapportino
  const approveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return apiRequest('PATCH', `/api/daily-reports/${reportId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      toast({
        title: "Rapportino approvato",
        description: "Il rapportino è stato approvato con successo."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'approvazione del rapportino",
        variant: "destructive"
      });
    }
  });

  const handleApproveReport = (reportId: string) => {
    approveReportMutation.mutate(reportId);
  };

  // Mutation per recuperare singolo rapportino con operazioni
  const fetchReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await apiRequest('GET', `/api/daily-reports/${reportId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedReport(data);
      setReportOperations(data.operations || []);
      setEditReportDialogOpen(true);
    },
    onError: (error: any) => {
      console.error("Error fetching report:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il rapportino",
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare rapportino
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, operations }: { reportId: string; operations: any[] }) => {
      const response = await apiRequest('PUT', `/api/daily-reports/${reportId}`, {
        operations
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      setEditReportDialogOpen(false);
      setSelectedReport(null);
      setReportOperations([]);
      toast({
        title: "Rapportino aggiornato",
        description: "Il rapportino è stato aggiornato con successo.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating report:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il rapportino",
        variant: "destructive",
      });
    },
  });

  const handleEditReport = (reportId: string) => {
    fetchReportMutation.mutate(reportId);
  };

  const handleUpdateReport = (operations: any[]) => {
    if (selectedReport) {
      updateReportMutation.mutate({
        reportId: selectedReport.id,
        operations
      });
    }
  };

  const handleExportReports = async (selectedDate?: string) => {
    try {
      const exportDate = selectedDate || new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const response = await fetch(`/api/export/daily-reports/${exportDate}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rapportini_${exportDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log("PDF export completed");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to export PDF");
      }
    } catch (error) {
      console.error("Error exporting PDF:", error);
      if (error instanceof Error) {
        alert(`Errore nell'esportazione: ${error.message}`);
      } else {
        alert("Errore nell'esportazione del PDF");
      }
    }
  };

  const handleExportWithDateSelection = () => {
    const selectedDate = prompt("Inserisci la data per l'export (DD/MM/YYYY):", new Date().toLocaleDateString("it-IT"));
    if (selectedDate) {
      // Validate date format DD/MM/YYYY
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(selectedDate)) {
        alert("Formato data non valido. Usa DD/MM/YYYY");
        return;
      }
      
      // Convert DD/MM/YYYY to YYYY-MM-DD for API
      const [day, month, year] = selectedDate.split('/');
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      handleExportReports(isoDate);
    }
  };

  const totalPendingReports = (reports as any[]).filter((r: any) => r.status === "In attesa").length;
  const totalApprovedReports = (reports as any[]).filter((r: any) => r.status === "Approvato").length;

  const handleViewWorkOrderReport = (operation: any) => {
    setSelectedWorkOrder({
      id: operation.workOrderId,
      number: operation.workOrderNumber,
      description: operation.workOrderDescription,
      clientName: operation.clientName
    });
    setSelectedTab("work-orders");
  };

  const handleBackToWorkOrders = () => {
    setSelectedWorkOrder(null);
  };

  const handleSelectWorkOrder = (workOrder: any) => {
    setSelectedWorkOrder({
      id: workOrder.id,
      number: workOrder.number,
      description: workOrder.description,
      clientName: workOrder.clientName
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard Amministratore</h1>
          <p className="text-muted-foreground">
            Gestisci rapportini e commesse
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => handleExportReports()}
            data-testid="button-export-reports"
          >
            <FileText className="h-4 w-4 mr-2" />
            Esporta PDF Oggi
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportWithDateSelection}
            data-testid="button-export-reports-date"
          >
            <FileText className="h-4 w-4 mr-2" />
            Esporta PDF Data Specifica
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Attesa</p>
                <p className="text-2xl font-bold">{totalPendingReports}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approvati</p>
                <p className="text-2xl font-bold">{totalApprovedReports}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dipendenti Attivi</p>
                <p className="text-2xl font-bold">
                  {employees ? (employees as any[]).filter((emp: any) => emp.role === 'employee').length : 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="reports" data-testid="tab-reports">
            <FileText className="h-4 w-4 mr-2" />
            Rapportini
          </TabsTrigger>
          <TabsTrigger value="work-orders" data-testid="tab-work-orders">
            <Wrench className="h-4 w-4 mr-2" />
            Commesse
          </TabsTrigger>
          <TabsTrigger value="employees" data-testid="tab-employees">
            <Users className="h-4 w-4 mr-2" />
            Dipendenti
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Rapportini Giornalieri</CardTitle>
                <Button 
                  onClick={() => setCreateReportDialogOpen(true)}
                  data-testid="button-create-report"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Rapportino
                </Button>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca dipendente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-employee"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="In attesa">In attesa</SelectItem>
                    <SelectItem value="Approvato">Approvato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            
            <CardContent>
              {isLoadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Caricamento rapportini...</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dipendente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ora Creazione</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Operazioni</TableHead>
                      <TableHead>Ore Totali</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-muted-foreground">
                            {searchTerm || statusFilter !== "all" 
                              ? "Nessun rapportino trovato con i filtri applicati" 
                              : "Nessun rapportino disponibile"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReports.map((report: any) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {report.employeeName || report.employee || "Sconosciuto"}
                          </TableCell>
                          <TableCell>
                            {new Date(report.date).toLocaleDateString("it-IT")}
                          </TableCell>
                          <TableCell>
                            {report.createdAt ? new Date(report.createdAt).toLocaleTimeString("it-IT", { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={report.status} />
                          </TableCell>
                          <TableCell>{report.operations || 0}</TableCell>
                          <TableCell>{report.totalHours || 0}h</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditReport(report.id)}
                                data-testid={`button-edit-report-${report.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {report.status === "In attesa" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApproveReport(report.id)}
                                  disabled={approveReportMutation.isPending}
                                  data-testid={`button-approve-report-${report.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="space-y-4">
          {selectedWorkOrder ? (
            // Show work order report
            <WorkOrderReport
              workOrderId={selectedWorkOrder.id}
              workOrderNumber={selectedWorkOrder.number}
              workOrderDescription={selectedWorkOrder.description}
              clientName={selectedWorkOrder.clientName}
              onBack={handleBackToWorkOrders}
            />
          ) : (
            // Show all work orders
            <Card>
              <CardHeader>
                <CardTitle>Gestione Commesse</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Seleziona una commessa per visualizzare il report dettagliato
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero Commessa</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Operazioni</TableHead>
                      <TableHead>Ore Totali</TableHead>
                      <TableHead>Ultima Attività</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAllWorkOrders.map((workOrder) => (
                      <TableRow key={workOrder.id}>
                        <TableCell className="font-medium">{workOrder.number}</TableCell>
                        <TableCell>{workOrder.clientName}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {workOrder.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={workOrder.status === "Completato" ? "default" : "secondary"}
                          >
                            {workOrder.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{workOrder.totalOperations} operazioni</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{workOrder.totalHours}h</TableCell>
                        <TableCell>{workOrder.lastActivity}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectWorkOrder(workOrder)}
                            data-testid={`button-view-workorder-${workOrder.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizza Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestione Dipendenti</CardTitle>
              <Dialog open={addEmployeeDialogOpen} onOpenChange={setAddEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-employee">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Dipendente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Aggiungi Nuovo Dipendente</DialogTitle>
                    <DialogDescription>
                      Inserisci i dati del nuovo dipendente.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddEmployee)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome e Cognome</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Es. Mario Rossi" 
                                {...field} 
                                data-testid="input-full-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Username unico" 
                                {...field} 
                                data-testid="input-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Password sicura" 
                                {...field} 
                                data-testid="input-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createEmployeeMutation.isPending}
                          data-testid="button-submit-employee"
                        >
                          {createEmployeeMutation.isPending ? "Aggiungendo..." : "Aggiungi Dipendente"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Dialog modifica dipendente */}
              <Dialog open={editEmployeeDialogOpen} onOpenChange={setEditEmployeeDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Modifica Dipendente</DialogTitle>
                    <DialogDescription>
                      Modifica i dati del dipendente. Lascia la password vuota se non vuoi cambiarla.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleUpdateEmployee)} className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome e Cognome</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Es. Mario Rossi" 
                                {...field} 
                                data-testid="input-edit-full-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Username unico" 
                                {...field} 
                                data-testid="input-edit-username"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password (opzionale)</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Lascia vuoto per non modificare" 
                                {...field} 
                                data-testid="input-edit-password"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setEditEmployeeDialogOpen(false)}
                        >
                          Annulla
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={updateEmployeeMutation.isPending}
                          data-testid="button-update-employee"
                        >
                          {updateEmployeeMutation.isPending ? "Aggiornando..." : "Aggiorna Dipendente"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Dialog conferma eliminazione dipendente */}
              <AlertDialog open={deleteEmployeeDialogOpen} onOpenChange={setDeleteEmployeeDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Elimina Dipendente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sei sicuro di voler eliminare il dipendente "{selectedEmployee?.fullName}"? 
                      Questa azione non può essere annullata e tutti i dati associati verranno rimossi permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={confirmDeleteEmployee}
                      disabled={deleteEmployeeMutation.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete-employee"
                    >
                      {deleteEmployeeMutation.isPending ? "Eliminando..." : "Elimina"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              {isLoadingEmployees ? (
                <div className="text-center py-8 text-muted-foreground">
                  Caricamento dipendenti...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Password Attuale</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(employees as any[]).filter((emp: any) => emp.role === 'employee').map((employee: any) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.fullName}</TableCell>
                        <TableCell>{employee.username}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                            {employee.plainPassword || "Non disponibile"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Dipendente</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditEmployee(employee)}
                              data-testid={`button-edit-employee-${employee.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleResetPassword(employee)}
                              data-testid={`button-reset-password-${employee.id}`}
                              className="text-blue-600 hover:text-blue-700"
                              disabled={resetPasswordMutation.isPending}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteEmployee(employee)}
                              data-testid={`button-delete-employee-${employee.id}`}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog per impostare nuova password */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Imposta Nuova Password</DialogTitle>
            <DialogDescription>
              Inserisci la nuova password per il dipendente.
            </DialogDescription>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Dipendente:</Label>
                    <p className="text-sm">{selectedEmployee.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Username:</Label>
                    <p className="text-sm font-mono">{selectedEmployee.username}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova Password</Label>
                <Input
                  id="newPassword"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Inserisci la nuova password (min. 6 caratteri)"
                  data-testid="input-new-password"
                />
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-sm text-destructive">Password deve essere di almeno 6 caratteri</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setResetPasswordDialogOpen(false)}
              data-testid="button-cancel-password"
            >
              Annulla
            </Button>
            <Button 
              onClick={confirmResetPassword}
              disabled={resetPasswordMutation.isPending || newPassword.trim().length < 6}
              data-testid="button-confirm-password"
            >
              {resetPasswordMutation.isPending ? "Aggiornando..." : "Aggiorna Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per modifica rapportino */}
      <Dialog open={editReportDialogOpen} onOpenChange={setEditReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Rapportino</DialogTitle>
            <DialogDescription>
              Modifica le operazioni del rapportino giornaliero.
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="mt-4">
              <DailyReportForm
                employeeName={selectedReport.employeeName || "Dipendente"}
                date={selectedReport.date}
                onSubmit={handleUpdateReport}
                initialOperations={reportOperations}
                isEditing={true}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditReportDialogOpen(false)}
              data-testid="button-cancel-edit-report"
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per creazione rapportino da amministratore */}
      <Dialog 
        open={createReportDialogOpen} 
        onOpenChange={(open) => {
          setCreateReportDialogOpen(open);
          if (!open) {
            setSelectedEmployeeForReport(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Rapportino per Dipendente</DialogTitle>
            <DialogDescription>
              Seleziona un dipendente e compila il rapportino giornaliero.
            </DialogDescription>
          </DialogHeader>
          
          {!selectedEmployeeForReport ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Dipendente</Label>
                <Select
                  onValueChange={(value) => {
                    const emp = (employees as any[]).find((e: any) => e.id === value);
                    setSelectedEmployeeForReport(emp);
                  }}
                >
                  <SelectTrigger data-testid="select-employee-for-report">
                    <SelectValue placeholder="Seleziona dipendente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees as any[])
                      .filter((emp: any) => emp.role === 'employee')
                      .map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.fullName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-4 p-4 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Creazione rapportino per: <span className="text-primary">{selectedEmployeeForReport.fullName}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Data: {new Date().toLocaleDateString("it-IT")}
                </p>
              </div>
              <DailyReportForm
                employeeName={selectedEmployeeForReport.fullName}
                date={new Date().toISOString().split('T')[0]}
                onSubmit={async (operations) => {
                  try {
                    const response = await apiRequest('POST', '/api/daily-reports', {
                      employeeId: selectedEmployeeForReport.id,
                      date: new Date().toISOString().split('T')[0],
                      status: 'In attesa'
                    });
                    
                    const report = await response.json();
                    
                    // Crea le operazioni
                    for (const operation of operations) {
                      await apiRequest('POST', '/api/operations', {
                        dailyReportId: report.id,
                        clientId: operation.clientId,
                        workOrderId: operation.workOrderId,
                        workTypes: operation.workTypes,
                        hours: operation.hours,
                        notes: operation.notes
                      });
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
                    toast({
                      title: "Rapportino creato",
                      description: `Rapportino per ${selectedEmployeeForReport.fullName} creato con successo.`
                    });
                    setCreateReportDialogOpen(false);
                    setSelectedEmployeeForReport(null);
                  } catch (error: any) {
                    toast({
                      title: "Errore",
                      description: error.message || "Errore nella creazione del rapportino",
                      variant: "destructive"
                    });
                  }
                }}
                isEditing={false}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateReportDialogOpen(false);
                setSelectedEmployeeForReport(null);
              }}
              data-testid="button-cancel-create-report"
            >
              {selectedEmployeeForReport ? "Indietro" : "Annulla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}