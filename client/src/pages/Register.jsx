import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Register() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await register(username, password);
    } catch (err) {
      let text = err.message;
      try { text = JSON.parse(err.message.split(': ').slice(1).join(': ')).error || text; } catch { /* ignore */ }
      setError(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Card-Hub</h1>
        <p className="hint-text">Create an account — you get your own private collection.</p>
        {error && <p className="error-text">{error}</p>}
        <label>Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required minLength={3} />
        </label>
        <label>Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} />
        </label>
        <label>Confirm Password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={4} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Creating account...' : 'Create Account'}</button>
        <p className="hint-text">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
