import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateToItalian } from "@/lib/dateUtils";
import { Plus, Edit, Trash, Fuel, Filter, Download } from "lucide-react";
import type { FuelRefill, Vehicle } from "@shared/schema";

const fuelRefillSchema = z.object({
  vehicleId: z.string().min(1, "Mezzo è richiesto"),
  refillDate: z.string().min(1, "Data è richiesta"),
  refillTime: z.string().min(1, "Ora è richiesta"),
  litersBefore: z.string().min(1, "Litri prima è richiesto"),
  litersAfter: z.string().min(1, "Litri dopo è richiesto"),
  km: z.string().optional(),
  hours: z.string().optional(),
  notes: z.string().optional(),
});

const fuelTankLoadSchema = z.object({
  loadDate: z.string().min(1, "Data è richiesta"),
  loadTime: z.string().min(1, "Ora è richiesta"),
  liters: z.string().min(1, "Litri è richiesto"),
  totalCost: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type FuelRefillForm = z.infer<typeof fuelRefillSchema>;
type FuelTankLoadForm = z.infer<typeof fuelTankLoadSchema>;

export default function FuelRefillsManagement() {
  const { toast } = useToast();
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRefill, setSelectedRefill] = useState<any | null>(null);
  const [addLoadDialogOpen, setAddLoadDialogOpen] = useState(false);


  const addForm = useForm<FuelRefillForm>({
    resolver: zodResolver(fuelRefillSchema),
    defaultValues: {
      vehicleId: "",
      refillDate: new Date().toISOString().split('T')[0],
      refillTime: new Date().toTimeString().slice(0,5),
      litersBefore: "",
      litersAfter: "",
      km: "",
      hours: "",
      notes: "",
    },
  });

  const editForm = useForm<FuelRefillForm>({
    resolver: zodResolver(fuelRefillSchema),
    defaultValues: {
      vehicleId: "",
      refillDate: "",
      refillTime: "",
      litersBefore: "",
      litersAfter: "",
      km: "",
      hours: "",
      notes: "",
    },
  });

  const loadForm = useForm<FuelTankLoadForm>({
    resolver: zodResolver(fuelTankLoadSchema),
    defaultValues: {
      loadDate: new Date().toISOString().split('T')[0],
      loadTime: new Date().toTimeString().slice(0,5),
      liters: "",
      totalCost: "",
      supplier: "",
      notes: "",
    },
  });

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  const { data: refills = [], isLoading: isLoadingRefills } = useQuery({
    queryKey: ["/api/fuel-refills"],
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/me"],
  });

  const { data: fuelRemainingData } = useQuery({
    queryKey: ["/api/fuel-remaining"],
  });

  const { data: tankLoads = [], isLoading: isLoadingTankLoads } = useQuery({
    queryKey: ["/api/fuel-tank-loads"],
  });

  const remainingLiters = (fuelRemainingData as any)?.remaining || 0;

  // Effect to precompile "Litri Prima" when opening the add refill dialog
  useEffect(() => {
    if (addDialogOpen && refills && (refills as any[]).length > 0) {
      // Get the most recent refill by date
      const sortedRefills = [...(refills as any[])].sort((a, b) => 
        new Date(b.refillDate).getTime() - new Date(a.refillDate).getTime()
      );
      const lastRefill = sortedRefills[0];
      if (lastRefill?.litersAfter) {
        addForm.setValue('litersBefore', lastRefill.litersAfter.toString());
      }
    }
  }, [addDialogOpen, refills, addForm]);

  const createRefillMutation = useMutation({
    mutationFn: async (data: FuelRefillForm) => {
      const refillDateTime = `${data.refillDate}T${data.refillTime}:00`;
      const payload = {
        vehicleId: data.vehicleId,
        refillDate: refillDateTime,
        operatorId: (currentUser as any)?.id,
        litersBefore: parseFloat(data.litersBefore),
        litersAfter: parseFloat(data.litersAfter),
        litersRefilled: parseFloat(data.litersAfter) - parseFloat(data.litersBefore),
        kmReading: data.km ? parseFloat(data.km) : null,
        engineHoursReading: data.hours ? parseFloat(data.hours) : null,
        notes: data.notes || null,
      };
      const response = await fetch("/api/fuel-refills", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create fuel refill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-refills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-remaining"] });
      toast({
        title: "Rifornimento registrato",
        description: "Il rifornimento è stato registrato con successo",
      });
      setAddDialogOpen(false);
      addForm.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile registrare il rifornimento",
        variant: "destructive",
      });
    },
  });

  const updateRefillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FuelRefillForm }) => {
      const refillDateTime = `${data.refillDate}T${data.refillTime}:00`;
      const payload = {
        vehicleId: data.vehicleId,
        refillDate: refillDateTime,
        litersBefore: parseFloat(data.litersBefore),
        litersAfter: parseFloat(data.litersAfter),
        litersRefilled: parseFloat(data.litersAfter) - parseFloat(data.litersBefore),
        kmReading: data.km ? parseFloat(data.km) : null,
        engineHoursReading: data.hours ? parseFloat(data.hours) : null,
        notes: data.notes || null,
      };
      const response = await fetch(`/api/fuel-refills/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update fuel refill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-refills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-remaining"] });
      toast({
        title: "Rifornimento aggiornato",
        description: "Il rifornimento è stato aggiornato con successo",
      });
      setEditDialogOpen(false);
      editForm.reset();
      setSelectedRefill(null);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il rifornimento",
        variant: "destructive",
      });
    },
  });

  const deleteRefillMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fuel-refills/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete fuel refill");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-refills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-remaining"] });
      toast({
        title: "Rifornimento eliminato",
        description: "Il rifornimento è stato eliminato con successo",
      });
      setDeleteDialogOpen(false);
      setSelectedRefill(null);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il rifornimento",
        variant: "destructive",
      });
    },
  });

  const createTankLoadMutation = useMutation({
    mutationFn: async (data: FuelTankLoadForm) => {
      const loadDateTime = `${data.loadDate}T${data.loadTime}:00`;
      const payload = {
        loadDate: loadDateTime,
        liters: parseFloat(data.liters),
        totalCost: data.totalCost ? parseFloat(data.totalCost) : null,
        supplier: data.supplier || null,
        notes: data.notes || null,
      };
      const response = await fetch("/api/fuel-tank-loads", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create fuel tank load");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-tank-loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-remaining"] });
      toast({
        title: "Carico registrato",
        description: "Il carico della cisterna è stato registrato con successo",
      });
      setAddLoadDialogOpen(false);
      loadForm.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile registrare il carico",
        variant: "destructive",
      });
    },
  });

  const deleteTankLoadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/fuel-tank-loads/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete fuel tank load");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-tank-loads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-remaining"] });
      toast({
        title: "Carico eliminato",
        description: "Il carico è stato eliminato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il carico",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (refill: any) => {
    setSelectedRefill(refill);
    const refillDateTime = new Date(refill.refillDate);
    const date = refillDateTime.toISOString().split('T')[0];
    const time = refillDateTime.toTimeString().slice(0,5);
    editForm.reset({
      vehicleId: refill.vehicleId,
      refillDate: date,
      refillTime: time,
      litersBefore: refill.litersBefore?.toString() || "",
      litersAfter: refill.litersAfter?.toString() || "",
      km: refill.kmReading?.toString() || "",
      hours: refill.engineHoursReading?.toString() || "",
      notes: refill.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (refill: any) => {
    setSelectedRefill(refill);
    setDeleteDialogOpen(true);
  };

  const filteredRefills = (refills as any[]).filter((refill: any) => {
    const refillDate = new Date(refill.refillDate);
    const refillMonth = (refillDate.getMonth() + 1).toString();
    const refillYear = refillDate.getFullYear().toString();
    
    if (vehicleFilter !== "all" && refill.vehicleId !== vehicleFilter) return false;
    if (monthFilter !== "all" && refillMonth !== monthFilter) return false;
    if (yearFilter !== "all" && refillYear !== yearFilter) return false;
    
    return true;
  });

  const getVehicleName = (vehicleId: string) => {
    const vehicle = (vehicles as any[]).find((v: any) => v.id === vehicleId);
    return vehicle ? `${vehicle.name} (${vehicle.licensePlate})` : "Sconosciuto";
  };

  const litersBefore = addForm.watch("litersBefore");
  const litersAfter = addForm.watch("litersAfter");
  const editLitersBefore = editForm.watch("litersBefore");
  const editLitersAfter = editForm.watch("litersAfter");

  const calculateDispensed = (before: string, after: string) => {
    const b = parseFloat(before);
    const a = parseFloat(after);
    if (isNaN(b) || isNaN(a)) return "-";
    return (a - b).toFixed(2);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (vehicleFilter !== "all") params.append("vehicleId", vehicleFilter);
      if (monthFilter !== "all") params.append("month", monthFilter);
      if (yearFilter !== "all") params.append("year", yearFilter);

      const response = await fetch(`/api/fuel-refills/export?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "rifornimenti.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export completato",
        description: "Il file Excel è stato scaricato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile esportare i dati",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Litri Rimanenti Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Litri Rimanenti in Cisterna
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {remainingLiters.toFixed(2)} L
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Carburante disponibile per i mezzi
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Gestione Rifornimenti
              </CardTitle>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleExport} 
                data-testid="button-export-refills"
                title="Esporta Excel"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Dialog open={addLoadDialogOpen} onOpenChange={setAddLoadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" data-testid="button-add-load">
                    <Plus className="h-4 w-4 mr-2" />
                    Carico
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Registra Carico Cisterna</DialogTitle>
                    <DialogDescription>
                      Inserisci i dettagli del carico di carburante nella cisterna
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...loadForm}>
                    <form onSubmit={loadForm.handleSubmit((data) => createTankLoadMutation.mutate(data))} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={loadForm.control}
                          name="loadDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" data-testid="input-load-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loadForm.control}
                          name="loadTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ora</FormLabel>
                              <FormControl>
                                <Input {...field} type="time" data-testid="input-load-time" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={loadForm.control}
                        name="liters"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Litri Caricati</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-load-liters" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loadForm.control}
                        name="totalCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Costo Totale (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-load-cost" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loadForm.control}
                        name="supplier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fornitore</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Nome fornitore" data-testid="input-load-supplier" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loadForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Note aggiuntive" data-testid="textarea-load-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button type="submit" disabled={createTankLoadMutation.isPending} data-testid="button-submit-load">
                          {createTankLoadMutation.isPending ? "Salvataggio..." : "Registra Carico"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" data-testid="button-add-refill">
                  <Plus className="h-4 w-4 mr-2" />
                  Scarico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registra Nuovo Rifornimento</DialogTitle>
                  <DialogDescription>
                    Inserisci i dettagli del rifornimento
                  </DialogDescription>
                </DialogHeader>
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit((data) => createRefillMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={addForm.control}
                      name="vehicleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mezzo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-refill-vehicle">
                                <SelectValue placeholder="Seleziona mezzo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(vehicles as any[])
                                .filter((v: any) => v.isActive)
                                .map((vehicle: any) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.name} ({vehicle.licensePlate})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="refillDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" data-testid="input-refill-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="refillTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ora</FormLabel>
                            <FormControl>
                              <Input {...field} type="time" data-testid="input-refill-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="litersBefore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Litri Prima</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-refill-liters-before" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="litersAfter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Litri Dopo</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-refill-liters-after" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">Litri Erogati: {calculateDispensed(litersBefore, litersAfter)}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={addForm.control}
                        name="km"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Km (opzionale)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-refill-km" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={addForm.control}
                        name="hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ore Motore (opzionale)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-refill-hours" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={addForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note (opzionale)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Note aggiuntive..." rows={3} data-testid="input-refill-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Annulla
                      </Button>
                      <Button type="submit" disabled={createRefillMutation.isPending} data-testid="button-save-refill">
                        {createRefillMutation.isPending ? "Salvataggio..." : "Salva"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                  <SelectTrigger className="w-full md:w-64" data-testid="select-filter-vehicle">
                    <SelectValue placeholder="Tutti i mezzi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i mezzi</SelectItem>
                    {(vehicles as any[]).map((vehicle: any) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name} ({vehicle.licensePlate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-full md:w-40" data-testid="select-filter-month">
                    <SelectValue placeholder="Tutti i mesi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i mesi</SelectItem>
                    <SelectItem value="1">Gennaio</SelectItem>
                    <SelectItem value="2">Febbraio</SelectItem>
                    <SelectItem value="3">Marzo</SelectItem>
                    <SelectItem value="4">Aprile</SelectItem>
                    <SelectItem value="5">Maggio</SelectItem>
                    <SelectItem value="6">Giugno</SelectItem>
                    <SelectItem value="7">Luglio</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Settembre</SelectItem>
                    <SelectItem value="10">Ottobre</SelectItem>
                    <SelectItem value="11">Novembre</SelectItem>
                    <SelectItem value="12">Dicembre</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-full md:w-32" data-testid="select-filter-year">
                    <SelectValue placeholder="Anno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli anni</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoadingRefills || isLoadingVehicles ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Caricamento rifornimenti...</p>
              </div>
            </div>
          ) : filteredRefills.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {vehicleFilter !== "all" ? "Nessun rifornimento per questo mezzo" : "Nessun rifornimento registrato"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Ora</TableHead>
                    <TableHead>Mezzo</TableHead>
                    <TableHead className="text-right">Prima (L)</TableHead>
                    <TableHead className="text-right">Dopo (L)</TableHead>
                    <TableHead className="text-right">Erogati (L)</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRefills.map((refill: any) => (
                    <TableRow key={refill.id} data-testid={`row-refill-${refill.id}`}>
                      <TableCell>
                        {formatDateToItalian(refill.refillDate)} {new Date(refill.refillDate).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{getVehicleName(refill.vehicleId)}</TableCell>
                      <TableCell className="text-right">{refill.litersBefore?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{refill.litersAfter?.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">{refill.litersRefilled?.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{refill.kmReading?.toFixed(0) || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(refill)}
                            data-testid={`button-edit-refill-${refill.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(refill)}
                            data-testid={`button-delete-refill-${refill.id}`}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Rifornimento</DialogTitle>
            <DialogDescription>
              Modifica i dettagli del rifornimento
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (selectedRefill) {
                updateRefillMutation.mutate({ id: selectedRefill.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editForm.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mezzo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-refill-vehicle">
                          <SelectValue placeholder="Seleziona mezzo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(vehicles as any[])
                          .filter((v: any) => v.isActive)
                          .map((vehicle: any) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.name} ({vehicle.licensePlate})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="refillDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-refill-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="refillTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ora</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" data-testid="input-edit-refill-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="litersBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Litri Prima</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-edit-refill-liters-before" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="litersAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Litri Dopo</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-edit-refill-liters-after" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">Litri Erogati: {calculateDispensed(editLitersBefore, editLitersAfter)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Km (opzionale)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-edit-refill-km" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ore Motore (opzionale)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-edit-refill-hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Note aggiuntive..." rows={3} data-testid="input-edit-refill-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateRefillMutation.isPending} data-testid="button-update-refill">
                  {updateRefillMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo rifornimento?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-refill">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRefill) {
                  deleteRefillMutation.mutate(selectedRefill.id);
                }
              }}
              disabled={deleteRefillMutation.isPending}
              data-testid="button-confirm-delete-refill"
            >
              {deleteRefillMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Storico Carichi Cisterna */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Storico Carichi Cisterna
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTankLoads ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : (tankLoads as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun carico registrato
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data e Ora</TableHead>
                    <TableHead>Litri Caricati</TableHead>
                    <TableHead>Costo Totale</TableHead>
                    <TableHead>Fornitore</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tankLoads as any[]).map((load: any) => {
                    return (
                      <TableRow key={load.id} data-testid={`row-tank-load-${load.id}`}>
                        <TableCell>{formatDateToItalian(load.loadDate)}</TableCell>
                        <TableCell className="font-medium">{load.liters.toFixed(2)} L</TableCell>
                        <TableCell>{load.totalCost ? `€ ${load.totalCost.toFixed(2)}` : "-"}</TableCell>
                        <TableCell>{load.supplier || "-"}</TableCell>
                        <TableCell>{load.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Sei sicuro di voler eliminare questo carico?")) {
                                deleteTankLoadMutation.mutate(load.id);
                              }
                            }}
                            data-testid={`button-delete-tank-load-${load.id}`}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
