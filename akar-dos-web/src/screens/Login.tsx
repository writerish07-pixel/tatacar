import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { ApiError } from '../api';

/** Login screen — userId (salesTeamId) + password. Default view when no token. */
export function Login() {
  const { login } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(userId.trim(), password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={onSubmit} aria-labelledby="login-title">
        <h1 id="login-title" className="login__brand">
          AKAR DOS
        </h1>
        <p className="login__subtitle">Dealer Operating System</p>

        <label htmlFor="userId">Login ID</label>
        <input
          id="userId"
          name="userId"
          autoComplete="username"
          placeholder="e.g. SALES_01"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? (
          <div className="login__error" role="alert">
            {error}
          </div>
        ) : null}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
