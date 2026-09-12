import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useLanguage, LANGUAGES } from '../i18n.jsx';
import { api } from '../api.js';

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('card-hub-theme');
    if (saved) return saved;
  } catch { /* ignore */ }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function Nav() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [theme, setTheme] = useState(getInitialTheme);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('card-hub-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const check = () => api.unreadMessageCount().then((r) => setUnread(r.count)).catch(() => {});
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [user]);

  return (
    <header className="nav">
      <div className="nav-brand">Card-Hub</div>
      <nav className="nav-links">
        <NavLink to="/" end>{t('nav_dashboard')}</NavLink>
        <NavLink to="/collection">{t('nav_collection')}</NavLink>
        <NavLink to="/scan">{t('nav_scan')}</NavLink>
        <NavLink to="/want-list">{t('nav_want_list')}</NavLink>
        <NavLink to="/for-trade">{t('nav_for_trade')}</NavLink>
        <NavLink to="/decks">{t('nav_decks')}</NavLink>
        <NavLink to="/grading">{t('nav_grading')}</NavLink>
        <NavLink to="/sales">{t('nav_sales')}</NavLink>
        <NavLink to="/trades">{t('nav_trades')}</NavLink>
        <NavLink to="/listings">{t('nav_listings')}</NavLink>
        <NavLink to="/watches">{t('nav_watches')}</NavLink>
        <NavLink to="/trade-match">{t('nav_trade_match')}</NavLink>
        <NavLink to="/friends">Friends</NavLink>
        <NavLink to="/messages">Messages{unread > 0 ? ` (${unread})` : ''}</NavLink>
        <NavLink to="/sets">{t('nav_sets')}</NavLink>
        <NavLink to="/reports">{t('nav_reports')}</NavLink>
        <NavLink to="/settings">{t('nav_settings')}</NavLink>
      </nav>
      <div className="nav-right">
        <select className="lang-select" value={lang} onChange={(e) => setLang(e.target.value)} title="Language">
          {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
        <button className="btn small" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {user && <span className="nav-user">{user.username}</span>}
        {user && <button className="btn small" onClick={logout}>{t('btn_log_out')}</button>}
      </div>
    </header>
  );
}
