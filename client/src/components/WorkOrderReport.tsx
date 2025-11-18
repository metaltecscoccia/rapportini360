import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import { formatDateToItalian } from "@/lib/dateUtils";

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
  materials: string[];
  hours: number;
  notes: string | null;
  employeeName: string;
  employeeId: string;
  date: string;
  clientName: string;
  workOrderName: string;
  reportStatus: string;
}

// Interface for employee row data
interface EmployeeReportRow {
  date: string;
  employeeName: string;
  employeeId: string;
  hours: number;
  workTypes: string[];
  materials: string[];
  employeeNotes: string | null;
  adminNotes: string;
}

// Function to create employee rows grouped by date
function createEmployeeRows(operations: EnrichedOperation[]): EmployeeReportRow[] {
  const groupedByDate = operations.reduce((acc, op) => {
    if (!acc[op.date]) {
      acc[op.date] = [];
    }
    acc[op.date].push(op);
    return acc;
  }, {} as Record<string, EnrichedOperation[]>);

  const rows: EmployeeReportRow[] = [];
  
  Object.entries(groupedByDate)
    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
    .forEach(([date, ops]) => {
      const employeeOps = ops.reduce((acc, op) => {
        if (!acc[op.employeeId]) {
          acc[op.employeeId] = [];
        }
        acc[op.employeeId].push(op);
        return acc;
      }, {} as Record<string, EnrichedOperation[]>);

      Object.entries(employeeOps).forEach(([employeeId, empOps]) => {
        const totalHours = empOps.reduce((sum, op) => sum + (Number(op.hours) || 0), 0);
        const workTypes = Array.from(new Set(empOps.flatMap(op => op.workTypes)));
        const materials = Array.from(new Set(empOps.flatMap(op => op.materials || [])));
        const notes = empOps.map(op => op.notes).filter(n => n).join("; ") || null;
        
        rows.push({
          date,
          employeeName: empOps[0].employeeName,
          employeeId,
          hours: totalHours,
          workTypes,
          materials,
          employeeNotes: notes,
          adminNotes: ""
        });
      });
    });

  return rows;
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

  // Create employee rows grouped by date
  const reportData = createEmployeeRows(operations);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const updateAdminNotes = (rowKey: string, notes: string) => {
    setAdminNotes(prev => ({
      ...prev,
      [rowKey]: notes
    }));
  };

  const totalProjectHours = reportData.reduce((sum: number, row: EmployeeReportRow) => sum + row.hours, 0);

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
              <p className="text-2xl font-bold">
                {new Set(reportData.map(row => row.date)).size}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ore Totali Progetto</p>
              <p className="text-2xl font-bold">{totalProjectHours}h</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Dipendenti Coinvolti</p>
              <p className="text-2xl font-bold">
                {new Set(reportData.map(row => row.employeeId)).size}
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
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="h-8 px-3 text-xs font-semibold w-[90px]">Data</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold w-[140px]">Dipendente</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold w-[80px]">Ore</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold min-w-[160px]">Lavorazioni</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold min-w-[160px]">Materiali</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold min-w-[180px]">Note Dipendente</TableHead>
                  <TableHead className="h-8 px-3 text-xs font-semibold min-w-[180px]">Note Admin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                      Nessuna operazione approvata per questa commessa
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row: EmployeeReportRow, index: number) => {
                    const rowKey = `${row.date}-${row.employeeId}`;
                    const prevRow = index > 0 ? reportData[index - 1] : null;
                    const showDate = !prevRow || prevRow.date !== row.date;
                    
                    return (
                      <TableRow key={rowKey} className="hover-elevate">
                        <TableCell className="h-10 px-3 py-1 text-xs font-medium">
                          {showDate ? formatDateToItalian(row.date) : ''}
                        </TableCell>
                        <TableCell className="h-10 px-3 py-1 text-xs">
                          {row.employeeName}
                        </TableCell>
                        <TableCell className="h-10 px-3 py-1 text-xs font-medium">
                          {row.hours.toFixed(1)}h
                        </TableCell>
                        <TableCell className="h-10 px-3 py-1">
                          <div className="flex flex-wrap gap-1">
                            {row.workTypes.map((type: string, typeIndex: number) => (
                              <Badge key={typeIndex} variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="h-10 px-3 py-1">
                          <div className="flex flex-wrap gap-1">
                            {row.materials.length > 0 ? (
                              row.materials.map((material: string, matIndex: number) => (
                                <Badge key={matIndex} variant="outline" className="text-[10px] h-4 px-1.5 py-0">
                                  {material}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-10 px-3 py-1 text-xs text-muted-foreground">
                          {row.employeeNotes || '-'}
                        </TableCell>
                        <TableCell className="h-10 px-3 py-1">
                          <Input
                            placeholder="Note..."
                            value={adminNotes[rowKey] || row.adminNotes}
                            onChange={(e) => updateAdminNotes(rowKey, e.target.value)}
                            className="text-xs h-7 px-2"
                            data-testid={`input-admin-notes-${index}`}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}