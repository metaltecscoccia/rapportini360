import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, User, Shield } from "lucide-react";
import logoPath from "@assets/3F8AF681-7737-41D8-A852-3AEB802C183F_1759092829478.png";

interface LoginFormProps {
  onLogin: (username: string, password: string, role: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [rememberMe, setRememberMe] = useState(false);

  // Carica credenziali salvate al mount del componente
  useEffect(() => {
    const savedCredentials = localStorage.getItem('metaltec_login_credentials');
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword, role: savedRole } = JSON.parse(savedCredentials);
        setUsername(savedUsername || "");
        setPassword(savedPassword || "");
        setRole(savedRole || "employee");
        setRememberMe(true);
      } catch (error) {
        console.warn("Error loading saved credentials:", error);
        localStorage.removeItem('metaltec_login_credentials');
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`Login attempt: ${username} as ${role}`);
    
    // Salva o rimuovi credenziali in base alla checkbox
    if (rememberMe) {
      localStorage.setItem('metaltec_login_credentials', JSON.stringify({
        username,
        password,
        role
      }));
    } else {
      localStorage.removeItem('metaltec_login_credentials');
    }
    
    onLogin(username, password, role);
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
              <Label htmlFor="role">Ruolo</Label>
              <Select value={role} onValueChange={(value: "employee" | "admin") => setRole(value)}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Dipendente
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Amministratore
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
            
            <Button type="submit" className="w-full" data-testid="button-login">
              <LogIn className="h-4 w-4 mr-2" />
              Accedi
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}