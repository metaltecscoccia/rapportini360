import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Users, Clock, XCircle, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, AttendanceRecord, AttendanceStatus, DailyReport } from "@shared/schema";

interface AttendanceCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

interface AttendanceStatus extends AttendanceRecord {
  employeeName: string;
  hasReport: boolean;
  displayStatus: "Presente" | "Ferie" | "Assente" | "Permesso" | "Non registrato";
}

interface AttendanceDay {
  date: Date;
  dateStr: string;
  statuses: AttendanceStatus[];
}

interface EditAttendanceDialogProps {
  employee: User;
  date: string;
  currentStatus?: AttendanceRecord;
  onClose: () => void;
}

function EditAttendanceDialog({ employee, date, currentStatus, onClose }: EditAttendanceDialogProps) {
  const [status, setStatus] = useState<AttendanceStatus | "">(currentStatus?.status || "");
  const [notes, setNotes] = useState(currentStatus?.notes || "");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: { employeeId: string; date: string; status: string; notes?: string }) => {
      return apiRequest(`/api/attendance`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
      toast({
        title: "Presenza aggiornata",
        description: `Stato presenza per ${employee.fullName} aggiornato con successo.`
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Errore nell'aggiornamento della presenza",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/attendance/${employee.id}/${date}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
      toast({
        title: "Presenza rimossa",
        description: `Stato presenza per ${employee.fullName} rimosso.`
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Errore nella rimozione della presenza",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (!status) {
      toast({
        title: "Errore",
        description: "Seleziona uno stato",
        variant: "destructive"
      });
      return;
    }

    mutation.mutate({
      employeeId: employee.id,
      date,
      status: status as string,
      notes: notes || undefined
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <DialogContent data-testid="dialog-edit-attendance">
      <DialogHeader>
        <DialogTitle>Gestisci Presenza</DialogTitle>
        <DialogDescription>
          {employee.fullName} - {format(new Date(date), "dd MMMM yyyy", { locale: it })}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="status">Stato Presenza</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger data-testid="select-attendance-status">
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ferie">🏖️ Ferie</SelectItem>
              <SelectItem value="Assente">❌ Assente</SelectItem>
              <SelectItem value="Permesso">🕐 Permesso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Note (opzionali)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note aggiuntive..."
            data-testid="textarea-attendance-notes"
          />
        </div>
      </div>

      <DialogFooter className="flex gap-2">
        {currentStatus && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            data-testid="button-delete-attendance"
          >
            {deleteMutation.isPending ? "Rimozione..." : "Rimuovi"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onClose}
          data-testid="button-cancel-attendance"
        >
          Annulla
        </Button>
        <Button
          onClick={handleSave}
          disabled={mutation.isPending}
          data-testid="button-save-attendance"
        >
          {mutation.isPending ? "Salvataggio..." : "Salva"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function getStatusBadge(displayStatus: AttendanceStatus["displayStatus"]) {
  switch (displayStatus) {
    case "Presente":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">✅ Presente</Badge>;
    case "Ferie":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">🏖️ Ferie</Badge>;
    case "Assente":
      return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">❌ Assente</Badge>;
    case "Permesso":
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">🕐 Permesso</Badge>;
    case "Non registrato":
      return <Badge variant="destructive">⚠️ Non registrato</Badge>;
    default:
      return <Badge variant="outline">Sconosciuto</Badge>;
  }
}

export default function AttendanceCalendar({ currentMonth, onMonthChange }: AttendanceCalendarProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calculate date range for current month
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/users"],
    select: (data: User[]) => data.filter(user => user.role === "employee")
  });

  // Fetch attendance records for current month
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: () => apiRequest(`/api/attendance?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`),
  });

  // Fetch daily reports for current month
  const { data: dailyReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/daily-reports", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    select: (data: DailyReport[]) => data.filter(report => {
      const reportDate = new Date(report.date);
      return reportDate >= startDate && reportDate <= endDate;
    })
  });

  // Build attendance data structure
  const attendanceData: AttendanceDay[] = daysInMonth.map(date => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayReports = dailyReports.filter(report => report.date === dateStr);
    const dayAttendance = attendanceRecords.filter((record: AttendanceRecord) => record.date === dateStr);
    
    const statuses: AttendanceStatus[] = employees.map(employee => {
      const hasReport = dayReports.some(report => report.employeeId === employee.id);
      const attendanceRecord = dayAttendance.find((record: AttendanceRecord) => record.employeeId === employee.id);
      
      let displayStatus: AttendanceStatus["displayStatus"];
      if (hasReport) {
        displayStatus = "Presente";
      } else if (attendanceRecord) {
        displayStatus = attendanceRecord.status as AttendanceStatus["displayStatus"];
      } else {
        displayStatus = "Non registrato";
      }

      return {
        ...attendanceRecord,
        employeeName: employee.fullName,
        hasReport,
        displayStatus,
        employeeId: employee.id,
        date: dateStr,
        status: attendanceRecord?.status || "",
        notes: attendanceRecord?.notes || "",
        id: attendanceRecord?.id || "",
        createdAt: attendanceRecord?.createdAt || new Date(),
        updatedAt: attendanceRecord?.updatedAt || new Date()
      };
    });

    return {
      date,
      dateStr,
      statuses
    };
  });

  const handleEditAttendance = (employee: User, date: string) => {
    const attendance = attendanceRecords.find((record: AttendanceRecord) => 
      record.employeeId === employee.id && record.date === date
    );
    
    setSelectedEmployee(employee);
    setSelectedDate(date);
    setSelectedAttendance(attendance || null);
    setIsDialogOpen(true);
  };

  if (employeesLoading || attendanceLoading || reportsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-pulse">Caricamento registro presenze...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Registro Presenze
          </CardTitle>
          <CardDescription>
            Gestisci le presenze dei dipendenti per {format(currentMonth, "MMMM yyyy", { locale: it })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              data-testid="button-previous-month"
            >
              ← Mese Precedente
            </Button>
            <h3 className="text-lg font-semibold" data-testid="text-current-month">
              {format(currentMonth, "MMMM yyyy", { locale: it })}
            </h3>
            <Button 
              variant="outline" 
              onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              data-testid="button-next-month"
            >
              Mese Successivo →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Dipendente</th>
                  {daysInMonth.map(date => (
                    <th key={date.toISOString()} className="text-center p-2 min-w-[80px] text-sm">
                      <div>{format(date, "d")}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(date, "EEE", { locale: it })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="border-b hover-elevate">
                    <td className="p-3 font-medium" data-testid={`row-employee-${employee.id}`}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {employee.fullName}
                      </div>
                    </td>
                    {attendanceData.map(day => {
                      const employeeStatus = day.statuses.find(s => s.employeeName === employee.fullName);
                      return (
                        <td key={`${employee.id}-${day.dateStr}`} className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 w-full"
                            onClick={() => handleEditAttendance(employee, day.dateStr)}
                            data-testid={`button-edit-attendance-${employee.id}-${day.dateStr}`}
                          >
                            {employeeStatus && getStatusBadge(employeeStatus.displayStatus)}
                          </Button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            {getStatusBadge("Presente")}
            {getStatusBadge("Ferie")}
            {getStatusBadge("Assente")}
            {getStatusBadge("Permesso")}
            {getStatusBadge("Non registrato")}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedEmployee && selectedDate && (
          <EditAttendanceDialog
            employee={selectedEmployee}
            date={selectedDate}
            currentStatus={selectedAttendance}
            onClose={() => setIsDialogOpen(false)}
          />
        )}
      </Dialog>
    </div>
  );
}