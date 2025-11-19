import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import {
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
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

// ============================================
// AUTHENTICATED APP COMPONENT
// ============================================

function AuthenticatedApp({
  currentUser,
  onLogout,
}: {
  currentUser: User;
  onLogout: () => void;
}) {
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Call logout API to destroy session
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always clear frontend state regardless of API call result
      onLogout();
      toast({
        title: "Logout effettuato",
        description: "Sei stato disconnesso con successo.",
      });
    }
  };

  // Load today's report if exists (only for employees)
  const {
    data: todayReport,
    isLoading: loadingTodayReport,
    error: reportError,
    isError: hasReportError,
  } = useQuery<any>({
    queryKey: ["/api/daily-reports/today"],
    enabled: currentUser.role === "employee",
    retry: false,
    staleTime: 0,
  });

  // Determine if the error is a 404 (no report exists) or a real server error
  // The queryClient throws errors in format "404: error message"
  const isReportNotFound = hasReportError && (reportError as Error)?.message?.startsWith('404');
  const hasServerError = hasReportError && !isReportNotFound;

  // Mutation to create new daily report
  const createReportMutation = useMutation({
    mutationFn: async (operations: any[]) => {
      if (!currentUser) throw new Error("User not logged in");

      const response = await apiRequest("POST", "/api/daily-reports", {
        operations,
      });

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports/today"] });
      toast({
        title: "Rapportino creato",
        description:
          "Il rapportino è stato inviato con successo e è in attesa di approvazione.",
      });
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

  // Mutation to update existing daily report
  const updateReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      operations,
    }: {
      reportId: string;
      operations: any[];
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/daily-reports/${reportId}`,
        {
          operations,
        },
      );

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reports/today"] });
      toast({
        title: "Rapportino aggiornato",
        description: "Le lavorazioni sono state aggiunte con successo.",
      });
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
      // Update existing report
      updateReportMutation.mutate({ reportId: todayReport.id, operations });
    } else {
      // Create new report
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
                {currentUser.role === "admin"
                  ? "Dashboard Amministratore"
                  : "Rapportini Giornalieri"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Benvenuto, {currentUser.fullName}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  <p className="text-muted-foreground mt-2">Caricamento...</p>
                </div>
              </div>
            ) : hasServerError ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <p className="text-destructive mb-2">Errore di caricamento</p>
                  <p className="text-muted-foreground text-sm">
                    Si è verificato un errore durante il caricamento del rapportino. Riprova più tardi.
                  </p>
                </div>
              </div>
            ) : (
              <DailyReportForm
                employeeName={currentUser.fullName}
                date={formatDateToItalian(
                  new Date().toISOString().split("T")[0],
                )}
                onSubmit={handleReportSubmit}
                initialOperations={todayReport?.operations}
                isEditing={!!todayReport}
                isSubmitting={
                  createReportMutation.isPending ||
                  updateReportMutation.isPending
                }
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  const handleLogin = async (
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include session cookies
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCurrentUser(data.user);
        toast({
          title: "Login effettuato",
          description: `Benvenuto, ${data.user.fullName}!`,
        });
        return { success: true };
      } else {
        return { success: false, error: data.error || "Login fallito" };
      }
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, error: "Errore di connessione al server" };
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Show login form if not authenticated
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

  // Show authenticated app
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
