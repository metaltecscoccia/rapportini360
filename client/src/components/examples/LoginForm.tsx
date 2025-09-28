import LoginForm from "../LoginForm";

export default function LoginFormExample() {
  const handleLogin = (username: string, password: string, role: string) => {
    console.log("Login example - User:", username, "Role:", role);
    alert(`Login simulato: ${username} come ${role === 'employee' ? 'Dipendente' : 'Amministratore'}`);
  };

  return <LoginForm onLogin={handleLogin} />;
}