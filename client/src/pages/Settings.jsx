import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState(null);

  function load() {
    api.getSettings().then(setSettings);
    if (user?.role === 'admin') api.listUsers().then(setUsers).catch(() => {});
  }
  useEffect(load, [user]);

  function set(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  async function saveSettings() {
    await api.updateSettings(settings);
    setSaveMsg('Saved.');
    setTimeout(() => setSaveMsg(null), 2000);
    load();
  }

  async function saveApiKeys() {
    await api.updateSettings(settings);
    setApiKeyMsg('API keys saved.');
    setTimeout(() => setApiKeyMsg(null), 2000);
    load();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    try {
      await api.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwMsg({ ok: true, text: 'Password changed.' });
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwMsg({ ok: false, text: 'Could not change password (check current password).' });
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    await api.createUser(newUser);
    setNewUser({ username: '', password: '', role: 'member' });
    load();
  }

  async function handleDeleteUser(id) {
    if (!confirm('Remove this user?')) return;
    await api.deleteUser(id);
    load();
  }

  async function connectEbay() {
    try {
      const { url } = await api.ebayConnectUrl();
      window.open(url, '_blank');
    } catch (e) {
      alert(e.message);
    }
  }

  async function loadAudit() {
    setShowAudit(true);
    setAuditLog(await api.auditLog());
  }

  if (!settings) return <p>Loading...</p>;

  return (
    <div>
      <h1>Settings</h1>

      <section className="panel">
        <h2>Your Account</h2>
        <form className="card-form" onSubmit={handleChangePassword}>
          <div className="form-grid">
            <label>Current Password
              <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
            </label>
            <label>New Password
              <input type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
            </label>
          </div>
          {pwMsg && <p className={pwMsg.ok ? 'hint-text' : 'error-text'}>{pwMsg.text}</p>}
          <button className="btn primary" type="submit">Change Password</button>
        </form>
      </section>

      {user?.role === 'admin' && (
        <section className="panel">
          <h2>Users</h2>
          <table className="simple-table">
            <thead><tr><th>Username</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{u.id !== user.id && <button className="btn small danger" onClick={() => handleDeleteUser(u.id)}>Remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="card-form" onSubmit={handleAddUser} style={{ marginTop: '1rem' }}>
            <div className="form-grid">
              <label>Username
                <input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
              </label>
              <label>Temporary Password
                <input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
              </label>
              <label>Role
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <button className="btn primary" type="submit">Add User</button>
          </form>
        </section>
      )}

      {user?.role === 'admin' && (
        <section className="panel">
          <h2>🔑 API Keys</h2>
          <p className="hint-text">
            Every external service Card-Hub can connect to, in one place. Admin-only. Keys are stored server-side
            and masked once saved — TCGdex, YGOPRODeck, and Scryfall need nothing here and work out of the box.
          </p>

          <div className="api-key-row">
            <div className="api-key-info">
              <strong>PokéWallet</strong>
              <p className="hint-text">Pokemon TCG pricing. Free tier, no credit card. Sign up at <a href="https://www.pokewallet.io/" target="_blank" rel="noreferrer">pokewallet.io</a>, copy your key here, then set Price Provider to PokéWallet below.</p>
            </div>
            <input value={settings.pokewallet_api_key || ''} onChange={(e) => set('pokewallet_api_key', e.target.value)} placeholder="pk_live_..." />
          </div>

          <div className="api-key-row">
            <div className="api-key-info">
              <strong>eBay Developer App</strong>
              <p className="hint-text">Marketplace OAuth connection + (future) price lookup. Register a developer app at <a href="https://developer.ebay.com/" target="_blank" rel="noreferrer">developer.ebay.com</a> to get these three values. OAuth flow is implemented per eBay's docs but untested against a live app — verify before relying on it.</p>
            </div>
            <div className="api-key-fields">
              <input value={settings.ebay_client_id || ''} onChange={(e) => set('ebay_client_id', e.target.value)} placeholder="Client ID" />
              <input value={settings.ebay_client_secret || ''} onChange={(e) => set('ebay_client_secret', e.target.value)} placeholder="Client Secret" />
              <input value={settings.ebay_redirect_uri || ''} onChange={(e) => set('ebay_redirect_uri', e.target.value)} placeholder="Redirect URI (RuName)" />
              <div className="cta-row" style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn small" onClick={connectEbay}>Connect eBay</button>
                {settings.ebay_connected && <span className="badge status-listed">Connected</span>}
              </div>
            </div>
          </div>

          <div className="api-key-row">
            <div className="api-key-info">
              <strong>TCGplayer (direct)</strong>
              <p className="hint-text">Alternative direct pricing source. Register at <a href="https://docs.tcgplayer.com/" target="_blank" rel="noreferrer">docs.tcgplayer.com</a>. Live lookup isn't implemented yet even once a key is set — see server/src/lib/priceProviders.js.</p>
            </div>
            <input value={settings.price_provider_api_key || ''} onChange={(e) => set('price_provider_api_key', e.target.value)} placeholder="paste key here" />
          </div>

          <div className="cta-row">
            <button className="btn primary" onClick={saveApiKeys}>Save API Keys</button>
            {apiKeyMsg && <span className="hint-text">{apiKeyMsg}</span>}
          </div>
        </section>
      )}

      <section className="panel">
        <h2>Automated Portfolio Snapshots</h2>
        <p className="hint-text">Takes a daily snapshot of total collection value for the Dashboard's value-over-time chart.</p>
        <div className="form-grid">
          <label className="checkbox-label">
            <input type="checkbox" checked={!!settings.snapshot_enabled} onChange={(e) => set('snapshot_enabled', e.target.checked)} />
            Enabled
          </label>
          <label>Hour of day (0-23, server time)
            <input type="number" min="0" max="23" value={settings.snapshot_hour ?? 3} onChange={(e) => set('snapshot_hour', Number(e.target.value))} />
          </label>
        </div>
        <div className="cta-row">
          <button className="btn" onClick={async () => { await api.takeSnapshot(); setSaveMsg('Snapshot taken.'); setTimeout(() => setSaveMsg(null), 2000); }}>Take Snapshot Now</button>
        </div>
      </section>

      <section className="panel">
        <h2>Automatic Price Lookup</h2>
        <p className="hint-text">
          "Manual" means you enter values yourself. <strong>TCGdex</strong> (Pokemon), <strong>YGOPRODeck</strong>
          (Yu-Gi-Oh), and <strong>Scryfall</strong> (Magic: The Gathering) are free, keyless, and work immediately.
          All match against the card's Player/Character or Set Name field (or use the 🔍 Look Up buttons on a card
          to fill it precisely). PokéWallet/eBay/TCGplayer need API keys — see the API Keys panel above.
        </p>
        <div className="form-grid">
          <label>Provider
            <select value={settings.price_provider || 'manual'} onChange={(e) => set('price_provider', e.target.value)}>
              <option value="manual">Manual</option>
              <option value="tcgdex">TCGdex — Pokemon (free, no key)</option>
              <option value="ygoprodeck">YGOPRODeck — Yu-Gi-Oh (free, no key)</option>
              <option value="scryfall">Scryfall — Magic: The Gathering (free, no key)</option>
              <option value="pokewallet">PokéWallet — Pokemon (needs API key)</option>
              <option value="ebay">eBay (experimental, needs API key)</option>
              <option value="tcgplayer">TCGplayer direct (experimental, needs API key)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Card Lookup Sources</h2>
        <p className="hint-text">
          The 🔍 Look Up buttons on Add Card / a card's detail page search live card databases and can pull in the
          official image: <strong>TCGdex</strong> (Pokemon), <strong>YGOPRODeck</strong> (Yu-Gi-Oh), and
          <strong> Scryfall</strong> (Magic: The Gathering) — all free and keyless. A few other sites you may know
          don't publish a public API, so they can't be wired in the same way — Eyevo, ManaBox, TCDB, Slabfy, and
          CollX are consumer apps with no developer access. If any of them can export your collection to CSV/Excel,
          use <strong>Reports → Import From Another App</strong> to map their columns into Card-Hub instead.
        </p>
      </section>

      <section className="panel">
        <h2>Appearance</h2>
        <div className="form-grid">
          <label>Site Title
            <input value={settings.site_title || ''} onChange={(e) => set('site_title', e.target.value)} placeholder="Card-Hub" />
          </label>
        </div>
      </section>

      <div className="cta-row">
        <button className="btn primary" onClick={saveSettings}>Save Settings</button>
        {saveMsg && <span className="hint-text">{saveMsg}</span>}
      </div>

      <section className="panel">
        <div className="panel-header-row">
          <h2>Activity / Audit Log</h2>
          <button className="btn small" onClick={loadAudit}>{showAudit ? 'Refresh' : 'Show'}</button>
        </div>
        {showAudit && (
          <table className="simple-table">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
            <tbody>
              {auditLog.map((a) => (
                <tr key={a.id}>
                  <td>{a.created_at}</td>
                  <td>{a.username || '—'}</td>
                  <td>{a.action}</td>
                  <td>{a.entity_type}{a.entity_id ? ` #${a.entity_id}` : ''}</td>
                  <td>{a.details}</td>
                </tr>
              ))}
              {auditLog.length === 0 && <tr><td colSpan={5}>No activity recorded yet.</td></tr>}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
