import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthApiError, authApi } from '../services/authApi';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await authApi.register(email, password);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof AuthApiError ? error.message : 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div>
        <p>Account created. You can now log in.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Register</h1>
      <label htmlFor="register-email">Email</label>
      <input
        id="register-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <label htmlFor="register-password">Password</label>
      <input
        id="register-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  );
}
