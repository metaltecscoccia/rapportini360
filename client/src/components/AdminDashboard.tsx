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
  Building2, 
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

// Schema per creazione commessa
const addWorkOrderSchema = z.object({
  clientId: z.string().min(1, "Cliente è richiesto"),
  name: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Schema per creazione cliente
const addClientSchema = z.object({
  name: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
});

type AddEmployeeForm = z.infer<typeof addEmployeeSchema>;
type EditEmployeeForm = z.infer<typeof editEmployeeSchema>;
type AddWorkOrderForm = z.infer<typeof addWorkOrderSchema>;
type AddClientForm = z.infer<typeof addClientSchema>;


// Mock data removed - now using real data from API

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportDateFilter, setReportDateFilter] = useState("all"); // all, last7days, last30days, last90days, currentYear
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
  
  // Filtri per commesse
  const [workOrderStatusFilter, setWorkOrderStatusFilter] = useState("all");
  const [workOrderDateFilter, setWorkOrderDateFilter] = useState("all"); // all, last7days, last30days, last90days
  const [addWorkOrderDialogOpen, setAddWorkOrderDialogOpen] = useState(false);
  const [deleteWorkOrderDialogOpen, setDeleteWorkOrderDialogOpen] = useState(false);
  const [selectedWorkOrderToDelete, setSelectedWorkOrderToDelete] = useState<any>(null);
  const [deleteReportDialogOpen, setDeleteReportDialogOpen] = useState(false);
  const [selectedReportToDelete, setSelectedReportToDelete] = useState<any>(null);
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [deleteClientDialogOpen, setDeleteClientDialogOpen] = useState(false);
  const [selectedClientToDelete, setSelectedClientToDelete] = useState<any>(null);

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

  // Form per aggiunta commessa
  const workOrderForm = useForm<AddWorkOrderForm>({
    resolver: zodResolver(addWorkOrderSchema),
    defaultValues: {
      clientId: "",
      name: "",
      description: "",
      isActive: true,
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

  // Form per aggiunta cliente
  const clientForm = useForm<AddClientForm>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: "",
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

  // Query per recuperare tutti i clienti
  const { data: clients = [], isLoading: isLoadingClients } = useQuery<any[]>({
    queryKey: ['/api/clients'],
  });

  // Query per recuperare tutte le commesse
  const { data: workOrders = [], isLoading: isLoadingWorkOrders } = useQuery<any[]>({
    queryKey: ['/api/work-orders'],
  });

  // Query per recuperare le statistiche delle commesse
  const { data: workOrdersStats = [], isLoading: isLoadingWorkOrdersStats } = useQuery<any[]>({
    queryKey: ['/api/work-orders/stats'],
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

  // Mutation per creare nuovo cliente
  const createClientMutation = useMutation({
    mutationFn: async (data: AddClientForm) => {
      return apiRequest('POST', '/api/clients', {
        name: data.name,
        description: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Cliente aggiunto",
        description: "Il nuovo cliente è stato aggiunto con successo.",
      });
      clientForm.reset();
      setAddClientDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del cliente.",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return apiRequest('DELETE', `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Cliente eliminato",
        description: "Il cliente è stato eliminato con successo. Le commesse associate rimangono nel database.",
      });
      setDeleteClientDialogOpen(false);
      setSelectedClientToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione del cliente.",
        variant: "destructive",
      });
    },
  });

  // Mutation per creare nuova commessa
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: AddWorkOrderForm) => {
      return apiRequest('POST', `/api/clients/${data.clientId}/work-orders`, {
        name: data.name,
        description: data.description || "",
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Commessa creata",
        description: "La nuova commessa è stata creata con successo.",
      });
      workOrderForm.reset();
      setAddWorkOrderDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione della commessa.",
        variant: "destructive",
      });
    },
  });

  // Mutation per eliminare commessa
  const deleteWorkOrderMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      return apiRequest('DELETE', `/api/work-orders/${workOrderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Commessa eliminata",
        description: "La commessa è stata eliminata con successo.",
      });
      setDeleteWorkOrderDialogOpen(false);
      setSelectedWorkOrderToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione della commessa.",
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare stato commessa
  const updateWorkOrderStatusMutation = useMutation({
    mutationFn: async ({ workOrderId, isActive }: { workOrderId: string; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/work-orders/${workOrderId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Stato aggiornato",
        description: "Lo stato della commessa è stato aggiornato con successo."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento dello stato",
        variant: "destructive"
      });
    }
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

  const handleAddClient = (data: AddClientForm) => {
    createClientMutation.mutate(data);
  };

  const handleAddWorkOrder = (data: AddWorkOrderForm) => {
    createWorkOrderMutation.mutate(data);
  };

  const handleDeleteWorkOrder = (workOrder: any) => {
    setSelectedWorkOrderToDelete(workOrder);
    setDeleteWorkOrderDialogOpen(true);
  };

  const confirmDeleteWorkOrder = () => {
    if (selectedWorkOrderToDelete) {
      deleteWorkOrderMutation.mutate(selectedWorkOrderToDelete.id);
    }
  };

  const handleDeleteClient = (client: any) => {
    setSelectedClientToDelete(client);
    setDeleteClientDialogOpen(true);
  };

  const confirmDeleteClient = () => {
    if (selectedClientToDelete) {
      deleteClientMutation.mutate(selectedClientToDelete.id);
    }
  };

  const confirmDeleteReport = () => {
    if (selectedReportToDelete) {
      deleteReportMutation.mutate(selectedReportToDelete.id);
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
    
    // Filtro temporale
    let matchesDate = true;
    if (reportDateFilter !== "all") {
      const reportDate = new Date(report.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (reportDateFilter === "last7days") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        matchesDate = reportDate >= sevenDaysAgo;
      } else if (reportDateFilter === "last30days") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        matchesDate = reportDate >= thirtyDaysAgo;
      } else if (reportDateFilter === "last90days") {
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        matchesDate = reportDate >= ninetyDaysAgo;
      } else if (reportDateFilter === "currentYear") {
        const currentYear = today.getFullYear();
        matchesDate = reportDate.getFullYear() === currentYear;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Mutation per approvare rapportino
  const approveReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return apiRequest('PATCH', `/api/daily-reports/${reportId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders/stats'] });
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

  // Mutation per eliminare rapportino
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return apiRequest('DELETE', `/api/daily-reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders/stats'] });
      toast({
        title: "Rapportino eliminato",
        description: "Il rapportino è stato eliminato con successo."
      });
      setDeleteReportDialogOpen(false);
      setSelectedReportToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione del rapportino",
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
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders/stats'] });
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
        a.download = `Rapportini_${exportDate}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log("Word export completed");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to export Word document");
      }
    } catch (error) {
      console.error("Error exporting Word document:", error);
      if (error instanceof Error) {
        toast({
          title: "Esportazione non riuscita",
          description: error.message || "Errore nell'esportazione del documento Word",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Errore",
          description: "Errore nell'esportazione del documento Word",
          variant: "destructive"
        });
      }
    }
  };

  const handleExportWithDateSelection = () => {
    const selectedDate = prompt("Inserisci la data per l'export (DD/MM/YYYY):", new Date().toLocaleDateString("it-IT"));
    if (selectedDate) {
      // Validate date format DD/MM/YYYY
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(selectedDate)) {
        toast({
          title: "Formato data non valido",
          description: "Usa il formato DD/MM/YYYY (esempio: 03/10/2025)",
          variant: "destructive"
        });
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

  // Prepara dati commesse con statistiche aggregate
  const workOrdersWithStats = workOrders.map((wo: any) => {
    const client = clients.find((c: any) => c.id === wo.clientId);
    const stats = workOrdersStats.find((s: any) => s.workOrderId === wo.id);
    
    return {
      ...wo,
      clientName: client?.name || "Cliente eliminato",
      totalHours: stats?.totalHours || 0,
      totalOperations: stats?.totalOperations || 0,
      lastActivity: stats?.lastActivity || "Nessuna attività",
      status: wo.isActive ? "In Corso" : "Completato"
    };
  });

  // Filtraggio commesse
  const filteredWorkOrders = workOrdersWithStats.filter((workOrder: any) => {
    // Filtro per stato
    if (workOrderStatusFilter !== "all") {
      const status = workOrder.status.toLowerCase().replace(" ", "-");
      if (status !== workOrderStatusFilter) {
        return false;
      }
    }
    
    // Filtro per data
    if (workOrderDateFilter !== "all" && workOrder.lastActivity !== "Nessuna attività") {
      const lastActivityDate = new Date(workOrder.lastActivity);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (workOrderDateFilter === "last7days" && daysDiff > 7) {
        return false;
      }
      if (workOrderDateFilter === "last30days" && daysDiff > 30) {
        return false;
      }
      if (workOrderDateFilter === "last90days" && daysDiff > 90) {
        return false;
      }
    }
    
    return true;
  });

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
            Esporta Word Oggi
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportWithDateSelection}
            data-testid="button-export-reports-date"
          >
            <FileText className="h-4 w-4 mr-2" />
            Esporta Word Data Specifica
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
          <TabsTrigger value="clients" data-testid="tab-clients">
            <Building2 className="h-4 w-4 mr-2" />
            Clienti
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

                <Select value={reportDateFilter} onValueChange={setReportDateFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-date-filter">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i giorni</SelectItem>
                    <SelectItem value="last7days">Ultimi 7 giorni</SelectItem>
                    <SelectItem value="last30days">Ultimi 30 giorni</SelectItem>
                    <SelectItem value="last90days">Ultimi 90 giorni</SelectItem>
                    <SelectItem value="currentYear">Anno corrente</SelectItem>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReportToDelete(report);
                                  setDeleteReportDialogOpen(true);
                                }}
                                data-testid={`button-delete-report-${report.id}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gestione Commesse</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Seleziona una commessa per visualizzare il report dettagliato
                    </p>
                  </div>
                  <Button onClick={() => setAddWorkOrderDialogOpen(true)} data-testid="button-add-workorder">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Commessa
                  </Button>
                </div>
                
                {/* Filtri per commesse */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="flex-1">
                    <Label htmlFor="status-filter" className="text-sm mb-2 block">Stato</Label>
                    <Select
                      value={workOrderStatusFilter}
                      onValueChange={setWorkOrderStatusFilter}
                    >
                      <SelectTrigger id="status-filter" data-testid="select-workorder-status-filter">
                        <SelectValue placeholder="Tutti" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="in-corso">In Corso</SelectItem>
                        <SelectItem value="completato">Completato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label htmlFor="date-filter" className="text-sm mb-2 block">Periodo</Label>
                    <Select
                      value={workOrderDateFilter}
                      onValueChange={setWorkOrderDateFilter}
                    >
                      <SelectTrigger id="date-filter" data-testid="select-workorder-date-filter">
                        <SelectValue placeholder="Tutte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutte</SelectItem>
                        <SelectItem value="last7days">Ultimi 7 giorni</SelectItem>
                        <SelectItem value="last30days">Ultimi 30 giorni</SelectItem>
                        <SelectItem value="last90days">Ultimi 90 giorni</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                    {filteredWorkOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nessuna commessa trovata con i filtri selezionati
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkOrders.map((workOrder) => (
                      <TableRow key={workOrder.id}>
                        <TableCell className="font-medium">{workOrder.number}</TableCell>
                        <TableCell>{workOrder.clientName}</TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {workOrder.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={workOrder.isActive ? "in-corso" : "completato"}
                            onValueChange={(value) => {
                              const isActive = value === "in-corso";
                              updateWorkOrderStatusMutation.mutate({ workOrderId: workOrder.id, isActive });
                            }}
                            disabled={updateWorkOrderStatusMutation.isPending}
                          >
                            <SelectTrigger 
                              className="w-[140px]" 
                              data-testid={`select-workorder-status-${workOrder.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in-corso">In Corso</SelectItem>
                              <SelectItem value="completato">Completato</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{workOrder.totalOperations} operazioni</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{workOrder.totalHours}h</TableCell>
                        <TableCell>{workOrder.lastActivity}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectWorkOrder(workOrder)}
                              data-testid={`button-view-workorder-${workOrder.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizza Report
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteWorkOrder(workOrder)}
                              data-testid={`button-delete-workorder-${workOrder.id}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestione Clienti</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Visualizza e gestisci tutti i clienti. L'eliminazione di un cliente non eliminerà le commesse associate.
                  </p>
                </div>
                <Button onClick={() => setAddClientDialogOpen(true)} data-testid="button-add-client">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Cliente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Cliente</TableHead>
                    <TableHead>Commesse Attive</TableHead>
                    <TableHead>Commesse Totali</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingClients ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        Caricamento...
                      </TableCell>
                    </TableRow>
                  ) : (clients as any[]).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nessun cliente trovato. Aggiungi il primo cliente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (clients as any[]).map((client: any) => {
                      const clientWorkOrders = (workOrders as any[]).filter((wo: any) => wo.clientId === client.id);
                      const activeWorkOrders = clientWorkOrders.filter((wo: any) => wo.isActive);
                      
                      return (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium" data-testid={`text-client-name-${client.id}`}>
                            {client.name}
                          </TableCell>
                          <TableCell data-testid={`text-active-workorders-${client.id}`}>
                            {activeWorkOrders.length}
                          </TableCell>
                          <TableCell data-testid={`text-total-workorders-${client.id}`}>
                            {clientWorkOrders.length}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClient(client)}
                              data-testid={`button-delete-client-${client.id}`}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Elimina
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                    await apiRequest('POST', '/api/daily-reports', {
                      employeeId: selectedEmployeeForReport.id,
                      date: new Date().toISOString().split('T')[0],
                      status: 'In attesa',
                      operations: operations
                    });
                    
                    queryClient.invalidateQueries({ queryKey: ['/api/daily-reports'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/work-orders/stats'] });
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

      {/* Dialog per aggiungere nuova commessa */}
      <Dialog open={addWorkOrderDialogOpen} onOpenChange={setAddWorkOrderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aggiungi Nuova Commessa</DialogTitle>
            <DialogDescription>
              Inserisci i dati della nuova commessa.
            </DialogDescription>
          </DialogHeader>
          <Form {...workOrderForm}>
            <form onSubmit={workOrderForm.handleSubmit(handleAddWorkOrder)} className="space-y-4">
              <FormField
                control={workOrderForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-workorder-client">
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(clients as any[]).map((client: any) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                        <div className="p-2 border-t mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setAddClientDialogOpen(true);
                            }}
                            data-testid="button-add-new-client"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuovo Cliente
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={workOrderForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Commessa</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es. Cancello Automatico" 
                        {...field} 
                        data-testid="input-workorder-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={workOrderForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione (opzionale)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es. Realizzazione cancello industriale..." 
                        {...field} 
                        data-testid="input-workorder-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={workOrderForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Commessa Attiva</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        La commessa è in corso
                      </p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={field.value}
                        onChange={field.onChange}
                        data-testid="checkbox-workorder-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setAddWorkOrderDialogOpen(false)}
                  data-testid="button-cancel-add-workorder"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createWorkOrderMutation.isPending}
                  data-testid="button-submit-add-workorder"
                >
                  {createWorkOrderMutation.isPending ? "Creazione..." : "Crea Commessa"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog per aggiungere nuovo cliente */}
      <Dialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aggiungi Nuovo Cliente</DialogTitle>
            <DialogDescription>
              Inserisci il nome del nuovo cliente.
            </DialogDescription>
          </DialogHeader>
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleAddClient)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Cliente</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Es. Acme Corporation" 
                        {...field} 
                        data-testid="input-client-name"
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
                  onClick={() => setAddClientDialogOpen(false)}
                  data-testid="button-cancel-add-client"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createClientMutation.isPending}
                  data-testid="button-submit-add-client"
                >
                  {createClientMutation.isPending ? "Creazione..." : "Aggiungi Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog per eliminare commessa */}
      <Dialog open={deleteWorkOrderDialogOpen} onOpenChange={setDeleteWorkOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Commessa</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare la commessa "{selectedWorkOrderToDelete?.name}"? 
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteWorkOrderDialogOpen(false)}
              data-testid="button-cancel-delete-workorder"
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteWorkOrder}
              disabled={deleteWorkOrderMutation.isPending}
              data-testid="button-confirm-delete-workorder"
            >
              {deleteWorkOrderMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per eliminare cliente */}
      <Dialog open={deleteClientDialogOpen} onOpenChange={setDeleteClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Cliente</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il cliente "{selectedClientToDelete?.name}"?
              Le commesse associate al cliente rimarranno nel database.
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteClientDialogOpen(false)}
              data-testid="button-cancel-delete-client"
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteClient}
              disabled={deleteClientMutation.isPending}
              data-testid="button-confirm-delete-client"
            >
              {deleteClientMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per eliminare rapportino */}
      <Dialog open={deleteReportDialogOpen} onOpenChange={setDeleteReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Rapportino</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il rapportino di {selectedReportToDelete?.employeeName} del{" "}
              {selectedReportToDelete?.date ? new Date(selectedReportToDelete.date).toLocaleDateString("it-IT") : ""}? 
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteReportDialogOpen(false)}
              data-testid="button-cancel-delete-report"
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteReport}
              disabled={deleteReportMutation.isPending}
              data-testid="button-confirm-delete-report"
            >
              {deleteReportMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}