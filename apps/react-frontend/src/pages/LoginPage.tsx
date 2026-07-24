import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { AuthApiError, authApi } from "../services/authApi";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // If the user was bounced here from a protected page, return them there after login.
  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await authApi.login(email, password);
      login(response.token, response.role);
      // Default landing depends on role: admins go to the overview, everyone else to the dashboard.
      const destination = from ?? (response.role === "Admin" ? "/admin" : "/dashboard");
      navigate(destination, { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof AuthApiError ? error.message : "Login failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <label htmlFor="login-email">Email</label>
      <input
        id="login-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <label htmlFor="login-password">Password</label>
      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>

      <p>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
