import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download } from "lucide-react";

interface WorkOrderReportProps {
  workOrderNumber: string;
  workOrderDescription: string;
  clientName: string;
  onBack: () => void;
}

// Mock data aggregato per giornata per una specifica commessa
const mockWorkOrderData = [
  {
    date: "2024-03-15",
    employees: ["Marco Rossi", "Laura Bianchi"],
    workTypes: ["Taglio", "Saldatura", "Montaggio"],
    hours: {
      "Marco Rossi": 6.5,
      "Laura Bianchi": 4.0
    },
    totalHours: 10.5,
    adminNotes: ""
  },
  {
    date: "2024-03-16", 
    employees: ["Marco Rossi"],
    workTypes: ["Saldatura", "Verniciatura"],
    hours: {
      "Marco Rossi": 8.0
    },
    totalHours: 8.0,
    adminNotes: "Completata fase di saldatura"
  },
  {
    date: "2024-03-17",
    employees: ["Giuseppe Verde", "Anna Neri"],
    workTypes: ["Montaggio", "Verniciatura", "Stuccatura"],
    hours: {
      "Giuseppe Verde": 7.0,
      "Anna Neri": 5.5
    },
    totalHours: 12.5,
    adminNotes: ""
  }
];

export default function WorkOrderReport({ 
  workOrderNumber, 
  workOrderDescription, 
  clientName, 
  onBack 
}: WorkOrderReportProps) {
  const [reportData, setReportData] = useState(mockWorkOrderData);

  const updateAdminNotes = (date: string, notes: string) => {
    setReportData(prev => 
      prev.map(row => 
        row.date === date ? { ...row, adminNotes: notes } : row
      )
    );
  };

  const formatEmployeeHours = (employees: string[], hours: Record<string, number>) => {
    return employees.map(emp => `${emp} (${hours[emp] || 0}h)`).join(", ");
  };

  const totalProjectHours = reportData.reduce((sum, row) => sum + row.totalHours, 0);

  const handleExportReport = () => {
    // TODO: Implementare export PDF/Excel del report finale
    alert("Export report finale - funzionalità in sviluppo");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={onBack}
            data-testid="button-back-to-commesse"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alle Commesse
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Report Finale Commessa</h1>
            <p className="text-muted-foreground">
              {workOrderNumber} - {workOrderDescription}
            </p>
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{clientName}</strong>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleExportReport}
            data-testid="button-export-final-report"
          >
            <Download className="h-4 w-4 mr-2" />
            Esporta Report
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Giorni Lavorativi</p>
              <p className="text-2xl font-bold">{reportData.length}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ore Totali Progetto</p>
              <p className="text-2xl font-bold">{totalProjectHours}h</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dipendenti Coinvolti</p>
              <p className="text-2xl font-bold">
                {new Set(reportData.flatMap(row => row.employees)).size}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Giornaliero Commessa
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggregazione di tutti i rapportini approvati per questa commessa
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead className="w-[250px]">Dipendenti</TableHead>
                <TableHead className="w-[200px]">Lavorazioni</TableHead>
                <TableHead className="w-[150px]">Ore per Dipendente</TableHead>
                <TableHead className="w-[300px]">Note Amministratore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((row, index) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">
                    {new Date(row.date).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell>
                    {row.employees.join(", ")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.workTypes.map((type, typeIndex) => (
                        <Badge key={typeIndex} variant="secondary" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {row.employees.map((emp, empIndex) => (
                        <div key={empIndex}>
                          {emp} ({(row.hours as any)[emp] || 0}h)
                        </div>
                      ))}
                      <div className="font-medium mt-1">
                        Tot: {row.totalHours}h
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Aggiungi note..."
                      value={row.adminNotes}
                      onChange={(e) => updateAdminNotes(row.date, e.target.value)}
                      className="text-sm"
                      data-testid={`input-admin-notes-${index}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}