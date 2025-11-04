import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash, Truck, Search } from "lucide-react";
import type { Vehicle, InsertVehicle, UpdateVehicle } from "@shared/schema";

const vehicleSchema = z.object({
  name: z.string().min(2, "Il nome deve essere di almeno 2 caratteri"),
  licensePlate: z.string().min(2, "La targa è richiesta"),
  fuelType: z.enum(["benzina", "diesel", "gpl", "metano", "elettrico"], {
    required_error: "Tipo carburante è richiesto",
  }),
  isActive: z.boolean().default(true),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

export default function VehiclesManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const addForm = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: "",
      licensePlate: "",
      fuelType: "diesel",
      isActive: true,
    },
  });

  const editForm = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: "",
      licensePlate: "",
      fuelType: "diesel",
      isActive: true,
    },
  });

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["/api/vehicles"],
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (data: VehicleForm) => {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create vehicle");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Mezzo aggiunto",
        description: "Il mezzo è stato aggiunto con successo",
      });
      setAddDialogOpen(false);
      addForm.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il mezzo",
        variant: "destructive",
      });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateVehicle }) => {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update vehicle");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Mezzo aggiornato",
        description: "Il mezzo è stato aggiornato con successo",
      });
      setEditDialogOpen(false);
      editForm.reset();
      setSelectedVehicle(null);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il mezzo",
        variant: "destructive",
      });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete vehicle");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fuel-refills"] });
      toast({
        title: "Mezzo eliminato",
        description: "Il mezzo e i suoi rifornimenti sono stati eliminati",
      });
      setDeleteDialogOpen(false);
      setSelectedVehicle(null);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il mezzo",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    editForm.reset({
      name: vehicle.name,
      licensePlate: vehicle.licensePlate,
      fuelType: vehicle.fuelType as VehicleForm["fuelType"],
      isActive: vehicle.isActive,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setDeleteDialogOpen(true);
  };

  const filteredVehicles = (vehicles as any[]).filter((vehicle: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      vehicle.name.toLowerCase().includes(search) ||
      vehicle.licensePlate.toLowerCase().includes(search)
    );
  });

  const getFuelTypeLabel = (fuelType: string) => {
    const labels: Record<string, string> = {
      benzina: "Benzina",
      diesel: "Diesel",
      gpl: "GPL",
      metano: "Metano",
      elettrico: "Elettrico",
    };
    return labels[fuelType] || fuelType;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Gestione Mezzi
              </CardTitle>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-vehicle">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Mezzo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aggiungi Nuovo Mezzo</DialogTitle>
                  <DialogDescription>
                    Inserisci le informazioni del nuovo mezzo
                  </DialogDescription>
                </DialogHeader>
                <Form {...addForm}>
                  <form onSubmit={addForm.handleSubmit((data) => createVehicleMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome/Descrizione</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es: Furgone bianco" data-testid="input-vehicle-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="licensePlate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Targa</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es: AB123CD" data-testid="input-vehicle-plate" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="fuelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Carburante</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-vehicle-type">
                                <SelectValue placeholder="Seleziona tipo carburante" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="benzina">Benzina</SelectItem>
                              <SelectItem value="diesel">Diesel</SelectItem>
                              <SelectItem value="gpl">GPL</SelectItem>
                              <SelectItem value="metano">Metano</SelectItem>
                              <SelectItem value="elettrico">Elettrico</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>Mezzo Attivo</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-vehicle-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                        Annulla
                      </Button>
                      <Button type="submit" disabled={createVehicleMutation.isPending} data-testid="button-save-vehicle">
                        {createVehicleMutation.isPending ? "Salvataggio..." : "Salva"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o targa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                data-testid="input-search-vehicles"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Caricamento mezzi...</p>
              </div>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? "Nessun mezzo trovato" : "Nessun mezzo registrato"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome/Descrizione</TableHead>
                    <TableHead>Targa</TableHead>
                    <TableHead>Carburante</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                      <TableCell className="font-medium">{vehicle.name}</TableCell>
                      <TableCell>{vehicle.licensePlate}</TableCell>
                      <TableCell>{getFuelTypeLabel(vehicle.fuelType)}</TableCell>
                      <TableCell>
                        <Badge variant={vehicle.isActive ? "default" : "secondary"}>
                          {vehicle.isActive ? "Attivo" : "Inattivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(vehicle)}
                            data-testid={`button-edit-vehicle-${vehicle.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(vehicle)}
                            data-testid={`button-delete-vehicle-${vehicle.id}`}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Mezzo</DialogTitle>
            <DialogDescription>
              Modifica le informazioni del mezzo
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (selectedVehicle) {
                updateVehicleMutation.mutate({ id: selectedVehicle.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Descrizione</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es: Furgone bianco" data-testid="input-edit-vehicle-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Targa</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es: AB123CD" data-testid="input-edit-vehicle-plate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Carburante</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-vehicle-type">
                          <SelectValue placeholder="Seleziona tipo carburante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="benzina">Benzina</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="gpl">GPL</SelectItem>
                        <SelectItem value="metano">Metano</SelectItem>
                        <SelectItem value="elettrico">Elettrico</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Mezzo Attivo</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-edit-vehicle-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateVehicleMutation.isPending} data-testid="button-update-vehicle">
                  {updateVehicleMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
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
              Sei sicuro di voler eliminare il mezzo "{selectedVehicle?.name}"?
              Questa azione eliminerà anche tutti i rifornimenti associati e non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-vehicle">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedVehicle) {
                  deleteVehicleMutation.mutate(selectedVehicle.id);
                }
              }}
              disabled={deleteVehicleMutation.isPending}
              data-testid="button-confirm-delete-vehicle"
            >
              {deleteVehicleMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
