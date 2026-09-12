import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useLanguage } from '../i18n.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(t('login_error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>{t('login_title')}</h1>
        <p className="hint-text">{t('login_subtitle')}</p>
        {error && <p className="error-text">{error}</p>}
        <label>{t('login_username')}
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label>{t('login_password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? t('login_signing_in') : t('login_sign_in')}</button>
        <p className="hint-text">{t('login_first_time')} <strong>admin</strong> / <strong>admin</strong> {t('login_change_after')}</p>
        <p className="hint-text">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
