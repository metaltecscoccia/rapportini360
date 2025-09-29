import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
      setCurrentUser(null);
      console.log("User logged out");
    }
  };

  const handleReportSubmit = (operations: any[]) => {
    console.log("Report submitted:", operations);
    alert("Rapportino inviato con successo!");
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
                  <DailyReportForm
                    employeeName={currentUser.fullName}
                    date={new Date().toLocaleDateString("it-IT")}
                    onSubmit={handleReportSubmit}
                  />
                </div>
              )}
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
