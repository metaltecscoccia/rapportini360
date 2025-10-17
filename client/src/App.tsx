import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import NotFound from "@/pages/not-found";
import LoginForm from "@/components/LoginForm";
import DailyReportForm from "@/components/DailyReportForm";
import AdminDashboard from "@/components/AdminDashboard";
import ThemeToggle from "@/components/ThemeToggle";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDateToItalian } from "@/lib/dateUtils";

type User = {
  username: string;
  role: "employee" | "admin";
  fullName: string;
};

function Router() {
  return (
    <Switch>
      <Route component={NotFound} />
    </Switch>
  );
}

// Component for authenticated users that uses React Query
function AuthenticatedApp({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Call logout API to destroy session
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always clear frontend state regardless of API call result
      onLogout();
      console.log("User logged out");
    }
  };

  // Carica il rapportino di oggi se esiste (solo per dipendenti)
  const { data: todayReport, isLoading: loadingTodayReport } = useQuery<any>({
    queryKey: ['/api/daily-reports/today'],
    enabled: currentUser.role === 'employee',
    retry: false,
    staleTime: 0
  });

  // Mutation per creare nuovo rapportino
  const createReportMutation = useMutation({
    mutationFn: async (operations: any[]) => {
      if (!currentUser) throw new Error("User not logged in");
      
      // Il backend prenderà employeeId dalla sessione
      const response = await apiRequest('POST', '/api/daily-reports', {
        operations
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/today'] });
      toast({
        title: "Rapportino creato",
        description: "Il rapportino è stato inviato con successo e è in attesa di approvazione.",
      });
      console.log("Report created successfully:", data);
    },
    onError: (error: any) => {
      console.error("Error creating report:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare il rapportino. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  // Mutation per aggiornare rapportino esistente
  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, operations }: { reportId: string; operations: any[] }) => {
      const response = await apiRequest('PUT', `/api/daily-reports/${reportId}`, {
        operations
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-reports/today'] });
      toast({
        title: "Rapportino aggiornato",
        description: "Le lavorazioni sono state aggiunte con successo.",
      });
      console.log("Report updated successfully:", data);
    },
    onError: (error: any) => {
      console.error("Error updating report:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il rapportino. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  const handleReportSubmit = (operations: any[]) => {
    if (todayReport) {
      // Aggiorna rapportino esistente
      updateReportMutation.mutate({ reportId: todayReport.id, operations });
    } else {
      // Crea nuovo rapportino
      createReportMutation.mutate(operations);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {currentUser.role === "admin" ? "Dashboard Amministratore" : "Rapportini Giornalieri"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Benvenuto, {currentUser.fullName}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {currentUser.role === "employee" && <PushNotificationToggle />}
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Esci
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto">
        {currentUser.role === "admin" ? (
          <AdminDashboard />
        ) : (
          <div className="py-6">
            {loadingTodayReport ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : (
              <DailyReportForm
                employeeName={currentUser.fullName}
                date={formatDateToItalian(new Date().toISOString().split('T')[0])}
                onSubmit={handleReportSubmit}
                initialOperations={todayReport?.operations}
                isEditing={!!todayReport}
                isSubmitting={createReportMutation.isPending || updateReportMutation.isPending}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`Login attempt: ${username}`);
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',  // Include session cookies
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setCurrentUser(data.user);
        console.log("User logged in:", data.user);
        return { success: true };
      } else {
        console.log("Login failed:", data.error);
        return { success: false, error: data.error || "Login fallito" };
      }
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, error: "Errore di connessione" };
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ThemeProvider>
            <LoginForm onLogin={handleLogin} />
            <Toaster />
          </ThemeProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthenticatedApp currentUser={currentUser} onLogout={handleLogout} />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
