import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Loader2, AlertCircle, Shield } from "lucide-react";
import logoPath from "@assets/3F8AF681-7737-41D8-A852-3AEB802C183F_1759092829478.png";

interface LoginFormProps {
  onLogin: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load saved credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem("metaltec_login_credentials");
    if (savedCredentials) {
      try {
        const { username: savedUsername } = JSON.parse(savedCredentials);
        setUsername(savedUsername || "");
        setRememberMe(true);
      } catch (error) {
        console.warn("Error loading saved credentials:", error);
        localStorage.removeItem("metaltec_login_credentials");
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
        // Save only username if remember me is checked (NEVER save password)
        if (rememberMe) {
          localStorage.setItem(
            "metaltec_login_credentials",
            JSON.stringify({
              username,
            }),
          );
        } else {
          localStorage.removeItem("metaltec_login_credentials");
        }
      } else {
        setErrorMessage(result.error || "Login fallito");
      }
    } catch (error) {
      setErrorMessage("Errore di connessione al server");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img
              src={logoPath}
              alt="METALTEC Scoccia S.R.L."
              className="h-20 w-auto object-contain"
            />
          </div>
          <div>
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <LogIn className="h-5 w-5" />
              Gestione Rapportini
            </CardTitle>
            <CardDescription className="mt-2">
              Accedi per gestire i rapportini giornalieri
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Inserisci username"
                required
                disabled={isLoading}
                autoComplete="username"
                data-testid="input-username"
                className="transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="Inserisci password"
                required
                disabled={isLoading}
                autoComplete="current-password"
                data-testid="input-password"
                className="transition-all"
              />
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
                data-testid="checkbox-remember-me"
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-normal cursor-pointer select-none"
              >
                Ricorda username
              </Label>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <Alert
                variant="destructive"
                className="animate-in fade-in slide-in-from-top-2"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Security Notice */}
            {!errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Accesso sicuro con protezione contro accessi non autorizzati.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Accedi
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>METALTEC Scoccia S.R.L. © {new Date().getFullYear()}</p>
            <p className="mt-1">Sistema di gestione rapportini v2.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
