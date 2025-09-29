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
  Calendar,
  Wrench,
  Eye
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import AttendanceCalendar from "./AttendanceCalendar";
import WorkOrderReport from "./WorkOrderReport";

// Schema per form aggiunta dipendente
const addEmployeeSchema = z.object({
  fullName: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  username: z.string().min(3, "L'username deve essere di almeno 3 caratteri"),
  password: z.string().min(4, "La password deve essere di almeno 4 caratteri"),
});

type AddEmployeeForm = z.infer<typeof addEmployeeSchema>;

// Mock data for demonstration
const mockReports = [
  {
    id: "1",
    employee: "Marco Rossi",
    date: "2024-03-15",
    status: "In attesa" as const,
    operations: 3,
    totalHours: 8,
  },
  {
    id: "2", 
    employee: "Laura Bianchi",
    date: "2024-03-15",
    status: "Approvato" as const,
    operations: 2,
    totalHours: 7.5,
  },
  {
    id: "3",
    employee: "Giuseppe Verde",
    date: "2024-03-14",
    status: "In attesa" as const,
    operations: 4,
    totalHours: 8.5,
  },
];

const mockClients = [
  { id: "1", name: "Acme Corporation", workOrders: 5 },
  { id: "2", name: "TechFlow Solutions", workOrders: 3 },
  { id: "3", name: "Industrial Works", workOrders: 7 },
];

// Mock work orders organized by client
const mockWorkOrdersByClient = {
  "1": [ // Acme Corporation
    {
      id: "ACM-2024-001",
      number: "ACM-2024-001",
      description: "Realizzazione cancello automatico",
      status: "In Corso",
      totalOperations: 8,
      totalHours: 45.5,
      lastActivity: "2024-03-15"
    },
    {
      id: "ACM-2024-002",
      number: "ACM-2024-002",
      description: "Riparazione ringhiera balcone",
      status: "Completato",
      totalOperations: 4,
      totalHours: 12.0,
      lastActivity: "2024-03-14"
    }
  ],
  "2": [ // TechFlow Solutions
    {
      id: "TFS-2024-012",
      number: "TFS-2024-012",
      description: "Manutenzione ordinaria impianto",
      status: "In Corso",
      totalOperations: 6,
      totalHours: 28.0,
      lastActivity: "2024-03-15"
    }
  ],
  "3": [ // Industrial Works
    {
      id: "IW-2024-045",
      number: "IW-2024-045",
      description: "Prototipo struttura metallica",
      status: "In Corso",
      totalOperations: 12,
      totalHours: 76.0,
      lastActivity: "2024-03-14"
    }
  ]
};

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedClient, setSelectedClient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<{
    id: string;
    number: string;
    description: string;
    clientName: string;
  } | null>(null);
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);

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

  // Query per recuperare tutti i dipendenti
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['/api/users'],
  });

  // Mutation per creare nuovo dipendente
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: AddEmployeeForm) => {
      return apiRequest(`/api/users`, {
        method: 'POST',
        body: JSON.stringify({
          fullName: data.fullName,
          username: data.username,
          password: data.password,
          role: 'employee'
        }),
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

  const handleAddEmployee = (data: AddEmployeeForm) => {
    createEmployeeMutation.mutate(data);
  };

  const filteredReports = mockReports.filter(report => {
    const matchesSearch = report.employee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApproveReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/daily-reports/${reportId}/approve`, {
        method: 'PATCH',
      });
      
      if (response.ok) {
        console.log("Report approved successfully");
        // TODO: Refresh the reports list
        alert("Rapportino approvato con successo!");
      } else {
        throw new Error("Failed to approve report");
      }
    } catch (error) {
      console.error("Error approving report:", error);
      alert("Errore nell'approvazione del rapportino");
    }
  };

  const handleEditReport = (reportId: string) => {
    console.log("Editing report", reportId);
    // TODO: Implement report editing modal
    alert("Modifica rapportino - funzionalità in sviluppo");
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
    const selectedDate = prompt("Inserisci la data per l'export (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
    if (selectedDate) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
        alert("Formato data non valido. Usa YYYY-MM-DD");
        return;
      }
      handleExportReports(selectedDate);
    }
  };

  const totalPendingReports = mockReports.filter(r => r.status === "In attesa").length;
  const totalApprovedReports = mockReports.filter(r => r.status === "Approvato").length;

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

  const handleSelectClient = (client: { id: string; name: string }) => {
    setSelectedClient(client);
    setSelectedWorkOrder(null); // Reset work order when selecting new client
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setSelectedWorkOrder(null);
  };

  const handleSelectWorkOrderFromClient = (workOrder: any) => {
    setSelectedWorkOrder({
      id: workOrder.id,
      number: workOrder.number,
      description: workOrder.description,
      clientName: selectedClient?.name || ""
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard Amministratore</h1>
          <p className="text-muted-foreground">
            Gestisci rapportini, clienti e commesse
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
                <p className="text-2xl font-bold">12</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clienti Attivi</p>
                <p className="text-2xl font-bold">{mockClients.length}</p>
              </div>
              <Building className="h-8 w-8 text-primary" />
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
          <TabsTrigger value="clients" data-testid="tab-clients">
            <Building className="h-4 w-4 mr-2" />
            Clienti
          </TabsTrigger>
          <TabsTrigger value="work-orders" data-testid="tab-work-orders">
            <Wrench className="h-4 w-4 mr-2" />
            Commesse
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">
            <Calendar className="h-4 w-4 mr-2" />
            Presenze
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
              <CardTitle>Rapportini Giornalieri</CardTitle>
              
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Operazioni</TableHead>
                    <TableHead>Ore Totali</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.employee}</TableCell>
                      <TableCell>{report.date}</TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>
                      <TableCell>{report.operations}</TableCell>
                      <TableCell>{report.totalHours}h</TableCell>
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
                              data-testid={`button-approve-report-${report.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestione Clienti</CardTitle>
              <Button data-testid="button-add-client">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Cliente
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Cliente</TableHead>
                    <TableHead>Commesse Attive</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{client.workOrders} commesse</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" data-testid={`button-edit-client-${client.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Orders Tab - HIERARCHICAL NAVIGATION */}
        <TabsContent value="work-orders" className="space-y-4">
          {selectedWorkOrder ? (
            // Level 3: Show work order report
            <WorkOrderReport
              workOrderId={selectedWorkOrder.id}
              workOrderNumber={selectedWorkOrder.number}
              workOrderDescription={selectedWorkOrder.description}
              clientName={selectedWorkOrder.clientName}
              onBack={handleBackToWorkOrders}
            />
          ) : selectedClient ? (
            // Level 2: Show work orders for selected client
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Commesse - {selectedClient.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Seleziona una commessa per visualizzare il report dettagliato
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleBackToClients}
                  data-testid="button-back-to-clients"
                >
                  ← Torna ai Clienti
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero Commessa</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Operazioni</TableHead>
                      <TableHead>Ore Totali</TableHead>
                      <TableHead>Ultima Attività</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(mockWorkOrdersByClient[selectedClient.id] || []).map((workOrder) => (
                      <TableRow key={workOrder.id}>
                        <TableCell className="font-medium">{workOrder.number}</TableCell>
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
                            onClick={() => handleSelectWorkOrderFromClient(workOrder)}
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
          ) : (
            // Level 1: Show client list
            <Card>
              <CardHeader>
                <CardTitle>Commesse per Cliente</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Seleziona un cliente per visualizzare le sue commesse
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome Cliente</TableHead>
                      <TableHead>Commesse Attive</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{client.workOrders} commesse</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectClient(client)}
                            data-testid={`button-select-client-${client.id}`}
                          >
                            <Briefcase className="h-4 w-4 mr-2" />
                            Visualizza Commesse
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

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <AttendanceCalendar 
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
          />
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
                                placeholder="Password temporanea" 
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
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.filter((emp: any) => emp.role === 'employee').map((employee: any) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.fullName}</TableCell>
                        <TableCell>{employee.username}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Dipendente</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            data-testid={`button-edit-employee-${employee.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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
    </div>
  );
}