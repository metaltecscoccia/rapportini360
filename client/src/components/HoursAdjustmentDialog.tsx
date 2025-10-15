import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

const adjustmentSchema = z.object({
  adjustment: z.string()
    .min(1, "L'aggiustamento è richiesto")
    .refine((val) => !isNaN(parseFloat(val)), "Deve essere un numero valido")
    .refine((val) => parseFloat(val) !== 0, "L'aggiustamento non può essere zero"),
  reason: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface HoursAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyReportId: string;
  currentAdjustment?: {
    id: string;
    adjustment: string;
    reason?: string | null;
  } | null;
}

export function HoursAdjustmentDialog({
  open,
  onOpenChange,
  dailyReportId,
  currentAdjustment,
}: HoursAdjustmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustment: currentAdjustment?.adjustment || "",
      reason: currentAdjustment?.reason || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      return await apiRequest("POST", "/api/hours-adjustment", {
        dailyReportId,
        adjustment: data.adjustment,
        reason: data.reason || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Aggiustamento creato",
        description: "L'aggiustamento ore è stato creato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hours-adjustment", dailyReportId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare l'aggiustamento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      return await apiRequest("PATCH", `/api/hours-adjustment/${currentAdjustment?.id}`, {
        adjustment: data.adjustment,
        reason: data.reason || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Aggiustamento aggiornato",
        description: "L'aggiustamento ore è stato aggiornato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hours-adjustment", dailyReportId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare l'aggiustamento",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/hours-adjustment/${currentAdjustment?.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Aggiustamento eliminato",
        description: "L'aggiustamento ore è stato eliminato con successo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hours-adjustment", dailyReportId] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'aggiustamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdjustmentFormData) => {
    if (currentAdjustment) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (confirm("Sei sicuro di voler eliminare questo aggiustamento?")) {
      setIsDeleting(true);
      deleteMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {currentAdjustment ? "Modifica Aggiustamento Ore" : "Aggiungi Aggiustamento Ore"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="adjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Aggiustamento Ore
                    <span className="text-xs text-muted-foreground ml-2">
                      (usa + o - per aggiungere/sottrarre ore, es: +0.5 o -1.5)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="+0.5 o -1.5"
                      data-testid="input-adjustment"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Es: Pausa pranzo non retribuita, straordinari approvati, ecc."
                      rows={3}
                      data-testid="input-reason"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              {currentAdjustment && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  data-testid="button-delete-adjustment"
                >
                  Elimina
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-adjustment"
              >
                {isPending ? "Salvataggio..." : currentAdjustment ? "Aggiorna" : "Crea"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
