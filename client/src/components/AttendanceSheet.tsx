import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Download, Plus, X } from "lucide-react";
import { formatDateToItalian } from "@/lib/dateUtils";

// Absence type labels - AGGIUNTO "A: Assente"
const ABSENCE_LABELS: Record<string, string> = {
  A: "Assente",
  F: "Ferie",
  P: "Permessi",
  M: "Malattia",
  CP: "Congedo Parentale",
  L104: "Legge 104"
};

// Helper to determine if a date is Saturday (6) or Sunday (0)
function getDayOfWeek(year: string, month: string, day: number): number {
  const date = new Date(parseInt(year), parseInt(month) - 1, day);
  return date.getDay();
}

// Simple check for Italian holidays (basic implementation)
function isItalianHoliday(year: string, month: string, day: number): boolean {
  const monthNum = parseInt(month);
  const fixedHolidays = [
    { month: 1, day: 1 },   // Capodanno
    { month: 1, day: 6 },   // Epifania
    { month: 4, day: 25 },  // Liberazione
    { month: 5, day: 1 },   // Festa del Lavoro
    { month: 6, day: 2 },   // Festa della Repubblica
    { month: 8, day: 15 },  // Ferragosto
    { month: 11, day: 1 },  // Tutti i Santi
    { month: 12, day: 8 },  // Immacolata
    { month: 12, day: 25 }, // Natale
    { month: 12, day: 26 }, // Santo Stefano
  ];

  return fixedHolidays.some(h => h.month === monthNum && h.day === day);
}

// Get cell background color based on day type
function getCellBgColor(year: string, month: string, day: number): string {
  if (isItalianHoliday(year, month, day)) {
    return 'bg-yellow-50 dark:bg-yellow-950/20';
  }

  const dayOfWeek = getDayOfWeek(year, month, day);
  if (dayOfWeek === 0) { // Sunday
    return 'bg-red-50 dark:bg-red-950/20';
  }
  if (dayOfWeek === 6) { // Saturday
    return 'bg-blue-50 dark:bg-blue-950/20';
  }

  return '';
}

// Get header background color
function getHeaderBgColor(year: string, month: string, day: number): string {
  if (isItalianHoliday(year, month, day)) {
    return 'bg-yellow-200 dark:bg-yellow-900/40';
  }

  const dayOfWeek = getDayOfWeek(year, month, day);
  if (dayOfWeek === 0) { // Sunday
    return 'bg-red-200 dark:bg-red-900/40';
  }
  if (dayOfWeek === 6) { // Saturday
    return 'bg-blue-200 dark:bg-blue-900/40';
  }

  return 'bg-muted';
}

export default function AttendanceSheet() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString());
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    userId: string;
    userName: string;
    date: string;
    day: number;
  } | null>(null);
  const [selectedAbsenceType, setSelectedAbsenceType] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get attendance data
  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ["/api/attendance/monthly", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(
        `/api/attendance/monthly?year=${selectedYear}&month=${selectedMonth}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      return res.json();
    }
  });

  // Get attendance entries for the month
  const { data: absenceEntries = [] } = useQuery({
    queryKey: ["/api/attendance-entries", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(
        `/api/attendance-entries?year=${selectedYear}&month=${selectedMonth}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch attendance entries");
      return res.json();
    }
  });

  // Create absence mutation
  const createAbsenceMutation = useMutation({
    mutationFn: async (data: { userId: string; date: string; absenceType: string }) => {
      return apiRequest("POST", "/api/attendance-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/monthly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-entries"] });
      toast({
        title: "Assenza aggiunta",
        description: "L'assenza è stata registrata con successo",
      });
      setAbsenceDialogOpen(false);
      setSelectedCell(null);
      setSelectedAbsenceType("");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la registrazione dell'assenza",
        variant: "destructive",
      });
    },
  });

  // Delete absence mutation
  const deleteAbsenceMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/attendance-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/monthly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance-entries"] });
      toast({
        title: "Assenza eliminata",
        description: "L'assenza è stata rimossa con successo",
      });
    },
  });

  const daysInMonth = new Date(
    parseInt(selectedYear),
    parseInt(selectedMonth),
    0
  ).getDate();

  const handleCellClick = (userId: string, userName: string, day: number) => {
    const date = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedCell({ userId, userName, date, day });
    setAbsenceDialogOpen(true);
  };

  const handleAddAbsence = () => {
    if (!selectedCell || !selectedAbsenceType) return;

    createAbsenceMutation.mutate({
      userId: selectedCell.userId,
      date: selectedCell.date,
      absenceType: selectedAbsenceType,
    });
  };

  const handleDeleteAbsence = (entryId: string) => {
    deleteAbsenceMutation.mutate(entryId);
  };

  const handleExportExcel = () => {
    window.open(
      `/api/attendance/export-excel?year=${selectedYear}&month=${selectedMonth}`,
      "_blank"
    );
  };

  const getMonthName = (month: string) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return months[parseInt(month) - 1];
  };

  // Find absence entry for a specific user and date
  const findAbsenceEntry = (userId: string, date: string) => {
    return absenceEntries.find((e: any) => e.userId === userId && e.date === date);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Foglio Presenze</CardTitle>
            <div className="flex gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {getMonthName((i + 1).toString())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => (
                    <SelectItem key={i} value={(currentDate.getFullYear() - 2 + i).toString()}>
                      {currentDate.getFullYear() - 2 + i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleExportExcel}
                data-testid="button-export-excel"
              >
                <Download className="mr-2 h-4 w-4" />
                Esporta Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend - AGGIORNATA con "A=Assente" */}
          <div className="mb-4 p-3 bg-muted rounded-md text-sm">
            <strong>Legenda:</strong> A=Assente | F=Ferie | P=Permessi | M=Malattia | CP=Congedo Parentale | L104=Legge 104
          </div>

          {isLoading ? (
            <div className="text-center py-8">Caricamento...</div>
          ) : attendanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun dipendente trovato
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Nome</TableHead>
                    <TableHead className="text-center w-12 bg-muted">T</TableHead>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <TableHead 
                        key={i + 1} 
                        className={`text-center w-8 p-1 ${getHeaderBgColor(selectedYear, selectedMonth, i + 1)}`}
                      >
                        {i + 1}
                      </TableHead>
                    ))}
                    <TableHead className="text-center w-16 bg-muted">TOT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((employee: any) => {
                    let totalOrdinary = 0;
                    let totalOvertime = 0;

                    return (
                      <>
                        {/* Row 1: Ordinarie */}
                        <TableRow key={`${employee.userId}-ordinary`}>
                          <TableCell rowSpan={2} className="sticky left-0 bg-background z-10 font-medium align-middle">
                            {employee.fullName}
                          </TableCell>
                          <TableCell className="text-center text-xs bg-muted/50">O</TableCell>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const dayData = employee.dailyData[date];
                            const ordinary = dayData?.ordinary || 0;
                            totalOrdinary += ordinary;

                            return (
                              <TableCell 
                                key={day} 
                                className={`text-center p-0.5 text-xs ${getCellBgColor(selectedYear, selectedMonth, day)}`}
                              >
                                {ordinary > 0 ? (ordinary === Math.floor(ordinary) ? ordinary : ordinary.toFixed(1)) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-xs font-medium bg-muted/50">
                            {totalOrdinary === Math.floor(totalOrdinary) ? totalOrdinary : totalOrdinary.toFixed(1)}
                          </TableCell>
                        </TableRow>

                        {/* Row 2: Straordinari/Assenze */}
                        <TableRow key={`${employee.userId}-overtime`} className="border-b-2">
                          <TableCell className="text-center text-xs bg-muted/30">S</TableCell>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const dayData = employee.dailyData[date];
                            const overtime = dayData?.overtime || 0;
                            const absence = dayData?.absence;
                            const absenceEntry = findAbsenceEntry(employee.userId, date);
                            totalOvertime += overtime;

                            return (
                              <TableCell 
                                key={day} 
                                className={`text-center p-0.5 text-xs ${!absence ? 'cursor-pointer hover-elevate' : ''} relative group ${getCellBgColor(selectedYear, selectedMonth, day)}`}
                                onClick={() => !absence && !dayData?.ordinary && !overtime && handleCellClick(employee.userId, employee.fullName, day)}
                                data-testid={`cell-absence-${employee.userId}-${day}`}
                              >
                                {absence ? (
                                  <div className="flex items-center justify-center gap-0.5">
                                    <span className="font-medium">{absence}</span>
                                    {absenceEntry && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAbsence(absenceEntry.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        data-testid={`button-delete-absence-${absenceEntry.id}`}
                                      >
                                        <X className="h-3 w-3 text-destructive" />
                                      </button>
                                    )}
                                  </div>
                                ) : overtime > 0 ? (
                                  overtime === Math.floor(overtime) ? overtime : overtime.toFixed(1)
                                ) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center text-xs font-medium bg-muted/30">
                            {totalOvertime === Math.floor(totalOvertime) ? totalOvertime : totalOvertime.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Absence Dialog */}
      <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
        <DialogContent data-testid="dialog-add-absence">
          <DialogHeader>
            <DialogTitle>Aggiungi Assenza</DialogTitle>
            <DialogDescription>
              {selectedCell && `${selectedCell.userName} - ${formatDateToItalian(selectedCell.date)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo Assenza</Label>
              <Select value={selectedAbsenceType} onValueChange={setSelectedAbsenceType}>
                <SelectTrigger data-testid="select-absence-type">
                  <SelectValue placeholder="Seleziona tipo assenza" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ABSENCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {key} - {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAbsenceDialogOpen(false)}
              data-testid="button-cancel-absence"
            >
              Annulla
            </Button>
            <Button
              onClick={handleAddAbsence}
              disabled={!selectedAbsenceType || createAbsenceMutation.isPending}
              data-testid="button-save-absence"
            >
              {createAbsenceMutation.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}