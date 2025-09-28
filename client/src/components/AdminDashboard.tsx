import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Wrench
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import AttendanceCalendar from "./AttendanceCalendar";

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

// Mock data for work orders with multiple work types
const mockOperations = [
  {
    id: "1",
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

        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lavorazioni per Commessa</CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualizza nel dettaglio le lavorazioni eseguite per ogni commessa
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Commessa</TableHead>
                    <TableHead>Lavorazioni</TableHead>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ore</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockOperations.map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell className="font-medium">{operation.clientName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{operation.workOrderNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {operation.workOrderDescription}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {operation.workTypes.map((type, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{operation.employee}</TableCell>
                      <TableCell>{operation.date}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{operation.hours}h</div>
                          <div className="text-xs text-muted-foreground">
                            {operation.startTime} - {operation.endTime}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={operation.notes}>
                          {operation.notes}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
              <Button data-testid="button-add-employee">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Dipendente
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Gestione dipendenti in fase di sviluppo...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}