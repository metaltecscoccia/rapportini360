import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";

interface WorkOrderReportProps {
  workOrderId: string;
  workOrderNumber: string;
  workOrderDescription: string;
  clientName: string;
  onBack: () => void;
}

// Interface for enriched operation data from API
interface EnrichedOperation {
  id: string;
  workTypes: string[];
  startTime: string;
  endTime: string;
  notes: string | null;
  employeeName: string;
  employeeId: string;
  date: string;
  clientName: string;
  workOrderName: string;
  reportStatus: string;
}

// Interface for aggregated data by date
interface DailyAggregatedData {
  date: string;
  employees: string[];
  workTypes: string[];
  hours: Record<string, number>;
  totalHours: number;
  adminNotes: string;
}

// Function to aggregate operations by date
function aggregateOperationsByDate(operations: EnrichedOperation[]): DailyAggregatedData[] {
  const groupedByDate = operations.reduce((acc, op) => {
    if (!acc[op.date]) {
      acc[op.date] = [];
    }
    acc[op.date].push(op);
    return acc;
  }, {} as Record<string, EnrichedOperation[]>);

  return Object.entries(groupedByDate).map(([date, ops]) => {
      const employees = Array.from(new Set(ops.map(op => op.employeeName)));
    const workTypes = Array.from(new Set(ops.flatMap(op => op.workTypes)));
    
    const hours: Record<string, number> = {};
    ops.forEach(op => {
      const startTime = new Date(`1970-01-01T${op.startTime}:00`);
      const endTime = new Date(`1970-01-01T${op.endTime}:00`);
      const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      if (!hours[op.employeeName]) {
        hours[op.employeeName] = 0;
      }
      hours[op.employeeName] += hoursWorked;
    });
    
    const totalHours = Object.values(hours).reduce((sum, h) => sum + h, 0);
    
    return {
      date,
      employees,
      workTypes,
      hours,
      totalHours,
      adminNotes: ""
    };
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function WorkOrderReport({ 
  workOrderId,
  workOrderNumber, 
  workOrderDescription, 
  clientName, 
  onBack 
}: WorkOrderReportProps) {
  // Fetch operations for this work order
  const { data: operations = [], isLoading, error } = useQuery<EnrichedOperation[]>({
    queryKey: ['/api/work-orders', workOrderId, 'operations'],
    enabled: !!workOrderId
  });

  // Aggregate operations by date
  const reportData = aggregateOperationsByDate(operations);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const updateAdminNotes = (date: string, notes: string) => {
    setAdminNotes(prev => ({
      ...prev,
      [date]: notes
    }));
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