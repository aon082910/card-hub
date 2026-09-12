import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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

function NavDropdown({ id, label, badge, items, openGroup, setOpenGroup }) {
  const isOpen = openGroup === id;
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpenGroup((g) => (g === id ? null : g));
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { setOpenGroup((g) => (g === id ? null : g)); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = items.some((it) => location.pathname === it.to || location.pathname.startsWith(`${it.to}/`));

  return (
    <div className="nav-dropdown" ref={ref}>
      <button
        type="button"
        className={`nav-dropdown-toggle ${isActive ? 'active' : ''}`}
        onClick={() => setOpenGroup((g) => (g === id ? null : id))}
      >
        {label}{badge > 0 ? ` (${badge})` : ''} <span className="nav-caret">▾</span>
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className="nav-dropdown-item" onClick={() => setOpenGroup(null)}>
              {it.label}{it.badge > 0 ? ` (${it.badge})` : ''}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [theme, setTheme] = useState(getInitialTheme);
  const [unread, setUnread] = useState(0);
  const [openGroup, setOpenGroup] = useState(null);

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

        <NavDropdown
          id="organize"
          label={t('nav_group_organize')}
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
          items={[
            { to: '/want-list', label: t('nav_want_list') },
            { to: '/for-trade', label: t('nav_for_trade') },
            { to: '/decks', label: t('nav_decks') },
            { to: '/sets', label: t('nav_sets') },
            { to: '/grading', label: t('nav_grading') },
          ]}
        />

        <NavDropdown
          id="marketplace"
          label={t('nav_group_marketplace')}
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
          items={[
            { to: '/sales', label: t('nav_sales') },
            { to: '/trades', label: t('nav_trades') },
            { to: '/listings', label: t('nav_listings') },
            { to: '/watches', label: t('nav_watches') },
            { to: '/trade-match', label: t('nav_trade_match') },
          ]}
        />

        <NavDropdown
          id="community"
          label={t('nav_group_community')}
          badge={unread}
          openGroup={openGroup}
          setOpenGroup={setOpenGroup}
          items={[
            { to: '/friends', label: 'Friends' },
            { to: '/messages', label: 'Messages', badge: unread },
          ]}
        />

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
