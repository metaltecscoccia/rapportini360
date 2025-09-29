import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import logoPath from "@assets/3F8AF681-7737-41D8-A852-3AEB802C183F_1759092829478.png";

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Carica credenziali salvate al mount del componente
  useEffect(() => {
    const savedCredentials = localStorage.getItem('metaltec_login_credentials');
    if (savedCredentials) {
      try {
        const { username: savedUsername } = JSON.parse(savedCredentials);
        setUsername(savedUsername || "");
        // Non carichiamo più password salvate per sicurezza
        setRememberMe(true);
      } catch (error) {
        console.warn("Error loading saved credentials:", error);
        localStorage.removeItem('metaltec_login_credentials');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const result = await onLogin(username, password);
      
      if (result.success) {
        // Salva solo username se login ha successo (MAI la password per sicurezza)
        if (rememberMe) {
          localStorage.setItem('metaltec_login_credentials', JSON.stringify({
            username
          }));
        } else {
          localStorage.removeItem('metaltec_login_credentials');
        }
      } else {
        setErrorMessage(result.error || "Login fallito");
      }
    } catch (error) {
      setErrorMessage("Errore di connessione");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logoPath} 
              alt="METALTEC Scoccia S.R.L." 
              className="h-20 w-auto object-contain"
            />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <LogIn className="h-5 w-5" />
            Gestione Rapportini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="input-username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                data-testid="checkbox-remember-me"
              />
              <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                Ricorda credenziali
              </Label>
            </div>
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}