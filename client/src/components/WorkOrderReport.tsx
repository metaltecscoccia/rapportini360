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
  hours: number;
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
      const hoursWorked = Number(op.hours) || 0;
      
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

  const handleExportReport = async () => {
    try {
      const response = await fetch(`/api/export/work-order/${workOrderId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'export');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Commessa_${workOrderNumber}_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Work order export completed');
    } catch (error: any) {
      alert(error.message || 'Errore durante l\'export del report');
      console.error('Export error:', error);
    }
  };

  return (
    <div className="px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

      {/* Main Report Table - Compact Excel Style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            Report Giornaliero Commessa
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Aggregazione di tutti i rapportini approvati per questa commessa
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" data-testid="scroll-table-workorder">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="h-8 px-3 text-xs font-semibold w-[90px]">Data</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold w-[140px]">Dipendenti</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold w-[80px]">Ore</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold min-w-[180px]">Lavorazioni</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold min-w-[200px]">Note Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                      Nessuna operazione approvata per questa commessa
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row, index) => (
                    <TableRow key={row.date} className="hover-elevate">
                      <TableCell className="h-10 px-3 py-1 text-xs font-medium">
                        {new Date(row.date).toLocaleDateString('it-IT', { 
                          day: '2-digit', 
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="h-10 px-3 py-1">
                        <div className="text-xs space-y-0.5">
                          {row.employees.map((emp, empIndex) => (
                            <div key={empIndex} className="truncate" title={emp}>
                              {emp}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="h-10 px-3 py-1">
                        <div className="text-xs space-y-0.5">
                          {row.employees.map((emp, empIndex) => (
                            <div key={empIndex} className="font-medium">
                              {(row.hours as any)[emp]?.toFixed(1) || 0}h
                            </div>
                          ))}
                          <div className="font-semibold text-primary pt-0.5 border-t mt-0.5">
                            {row.totalHours.toFixed(1)}h
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="h-10 px-3 py-1">
                        <div className="flex flex-wrap gap-1">
                          {row.workTypes.map((type, typeIndex) => (
                            <Badge key={typeIndex} variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="h-10 px-3 py-1">
                        <Input
                          placeholder="Note..."
                          value={adminNotes[row.date] || row.adminNotes}
                          onChange={(e) => updateAdminNotes(row.date, e.target.value)}
                          className="text-xs h-7 px-2"
                          data-testid={`input-admin-notes-${index}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}