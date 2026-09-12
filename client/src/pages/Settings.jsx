import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';
import { useLanguage } from '../i18n.jsx';

export default function Settings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [saveMsg, setSaveMsg] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState(null);
  const [backups, setBackups] = useState([]);
  const [backupMsg, setBackupMsg] = useState(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [notifyMsg, setNotifyMsg] = useState(null);
  const [apiTokens, setApiTokens] = useState([]);
  const [newTokenLabel, setNewTokenLabel] = useState('');

  function load() {
    api.getSettings().then(setSettings);
    api.listApiTokens().then(setApiTokens).catch(() => {});
    if (user?.role === 'admin') {
      api.listUsers().then(setUsers).catch(() => {});
      api.listBackups().then(setBackups).catch(() => {});
    }
  }
  useEffect(load, [user]);

  async function handleTakeBackup() {
    setBackupBusy(true);
    try {
      await api.takeBackupNow();
      setBackupMsg({ ok: true, text: 'Backup taken.' });
      api.listBackups().then(setBackups);
    } catch (e) {
      setBackupMsg({ ok: false, text: e.message });
    } finally {
      setBackupBusy(false);
      setTimeout(() => setBackupMsg(null), 3000);
    }
  }

  async function handleDeleteBackup(filename) {
    if (!confirm(`Delete backup "${filename}"?`)) return;
    await api.deleteBackup(filename);
    api.listBackups().then(setBackups);
  }

  async function handleRestore(filename) {
    if (!confirm(`Restore the database from "${filename}"? Your current data will be replaced after you restart the container. This cannot be undone from within the app.`)) return;
    try {
      const res = await api.restoreBackup(filename);
      setBackupMsg({ ok: true, text: res.message });
    } catch (e) {
      setBackupMsg({ ok: false, text: e.message });
    }
  }

  async function handleRestoreUpload() {
    if (!restoreFile) return;
    if (!confirm('Restore the database from this uploaded file? Your current data will be replaced after you restart the container. This cannot be undone from within the app.')) return;
    try {
      const res = await api.restoreBackupUpload(restoreFile);
      setBackupMsg({ ok: true, text: res.message });
      setRestoreFile(null);
    } catch (e) {
      setBackupMsg({ ok: false, text: e.message });
    }
  }

  function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleTestWebhook() {
    try {
      await api.testWebhook();
      setNotifyMsg({ ok: true, text: 'Test notification sent — check your webhook destination.' });
    } catch (e) {
      setNotifyMsg({ ok: false, text: e.message });
    } finally {
      setTimeout(() => setNotifyMsg(null), 4000);
    }
  }

  async function handleSendDigestNow() {
    try {
      const res = await api.sendDigestNow();
      setNotifyMsg({ ok: true, text: res.lines.length ? `Digest sent (${res.lines.length} item(s)).` : 'Nothing to report right now — no digest sent.' });
    } catch (e) {
      setNotifyMsg({ ok: false, text: e.message });
    } finally {
      setTimeout(() => setNotifyMsg(null), 4000);
    }
  }

  async function handleCreateToken(e) {
    e.preventDefault();
    await api.createApiToken(newTokenLabel || null);
    setNewTokenLabel('');
    api.listApiTokens().then(setApiTokens);
  }

  async function handleDeleteToken(id) {
    if (!confirm('Revoke this API token? Anything using it will stop working.')) return;
    await api.deleteApiToken(id);
    api.listApiTokens().then(setApiTokens);
  }

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

  if (!settings) return <p>{t('loading')}</p>;

  return (
    <div>
      <h1>{t('settings_title')}</h1>

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

      <section className="panel">
        <h2>Personal API Token</h2>
        <p className="hint-text">
          A read-only token for your own scripts/dashboards outside the browser — no login required, just an
          Authorization header. Anyone holding a token can read (not modify) everything in the collection, so treat
          it like a password. Example: <code>curl -H "Authorization: Bearer &lt;token&gt;" {window.location.origin}/api/v1/cards</code>
        </p>
        {apiTokens.length > 0 && (
          <table className="simple-table">
            <thead><tr><th>Label</th><th>Token</th><th>Created</th><th>Last Used</th><th></th></tr></thead>
            <tbody>
              {apiTokens.map((tok) => (
                <tr key={tok.id}>
                  <td>{tok.label || '—'}</td>
                  <td><code>{tok.token}</code></td>
                  <td>{new Date(tok.created_at).toLocaleDateString()}</td>
                  <td>{tok.last_used_at ? new Date(tok.last_used_at).toLocaleString() : 'Never'}</td>
                  <td><button className="btn small danger" onClick={() => handleDeleteToken(tok.id)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form className="cta-row" onSubmit={handleCreateToken} style={{ marginTop: '0.75rem' }}>
          <input placeholder="Label (optional, e.g. 'home dashboard')" value={newTokenLabel} onChange={(e) => setNewTokenLabel(e.target.value)} />
          <button className="btn" type="submit">Generate Token</button>
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
              <p className="hint-text">Marketplace OAuth connection + active-listing price lookup. Register a developer app at <a href="https://developer.ebay.com/" target="_blank" rel="noreferrer">developer.ebay.com</a> to get these three values. Implemented per eBay's docs but untested against a live app — verify before relying on it.</p>
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
              <strong>eBay Business Policies (for pushing live listings)</strong>
              <p className="hint-text">Required only to push a listing live from the Listings page. Find these IDs in your eBay account under Account → Business Policies, and your shipping location under Account → Shipping → Locations. A default category ID is also required — trading-card categories vary a lot by game/sport, so pick one from your own eBay account's listing flow or the Taxonomy API.</p>
            </div>
            <div className="api-key-fields">
              <input value={settings.ebay_payment_policy_id || ''} onChange={(e) => set('ebay_payment_policy_id', e.target.value)} placeholder="Payment Policy ID" />
              <input value={settings.ebay_return_policy_id || ''} onChange={(e) => set('ebay_return_policy_id', e.target.value)} placeholder="Return Policy ID" />
              <input value={settings.ebay_fulfillment_policy_id || ''} onChange={(e) => set('ebay_fulfillment_policy_id', e.target.value)} placeholder="Fulfillment Policy ID" />
              <input value={settings.ebay_merchant_location_key || ''} onChange={(e) => set('ebay_merchant_location_key', e.target.value)} placeholder="Merchant Location Key" />
              <input value={settings.ebay_default_category_id || ''} onChange={(e) => set('ebay_default_category_id', e.target.value)} placeholder="Default Category ID" />
            </div>
          </div>

          <div className="api-key-row">
            <div className="api-key-info">
              <strong>TCGplayer (direct)</strong>
              <p className="hint-text">Alternative direct pricing source for TCG cards. Requires partner-program approval at <a href="https://docs.tcgplayer.com/" target="_blank" rel="noreferrer">docs.tcgplayer.com</a>. Implemented per their published API but unverified against a live account.</p>
            </div>
            <div className="api-key-fields">
              <input value={settings.tcgplayer_client_id || ''} onChange={(e) => set('tcgplayer_client_id', e.target.value)} placeholder="Client ID" />
              <input value={settings.tcgplayer_client_secret || ''} onChange={(e) => set('tcgplayer_client_secret', e.target.value)} placeholder="Client Secret" />
            </div>
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

      {user?.role === 'admin' && (
        <section className="panel">
          <h2>Automated Backups</h2>
          <p className="hint-text">
            Backs up the whole database (using SQLite's online backup API - safe to run while the app is in use)
            to <code>data/backups/</code>. Restoring is staged and applied on the next container restart, rather
            than swapping the live file - keep your Docker/Unraid restart policy set to something other than
            "no restart" if you want an in-app restore to actually take effect after you confirm it.
          </p>
          <div className="form-grid">
            <label className="checkbox-label">
              <input type="checkbox" checked={!!settings.backup_enabled} onChange={(e) => set('backup_enabled', e.target.checked)} />
              Enabled
            </label>
            <label>Hour of day (0-23, server time)
              <input type="number" min="0" max="23" value={settings.backup_hour ?? 4} onChange={(e) => set('backup_hour', Number(e.target.value))} />
            </label>
            <label>Keep last N backups
              <input type="number" min="1" max="365" value={settings.backup_retention ?? 14} onChange={(e) => set('backup_retention', Number(e.target.value))} />
            </label>
          </div>
          <div className="cta-row">
            <button className="btn" onClick={handleTakeBackup} disabled={backupBusy}>{backupBusy ? 'Backing up...' : 'Take Backup Now'}</button>
          </div>
          {backupMsg && <p className={backupMsg.ok ? 'hint-text' : 'error-text'}>{backupMsg.text}</p>}

          {backups.length > 0 && (
            <table className="simple-table" style={{ marginTop: '1rem' }}>
              <thead><tr><th>File</th><th>Size</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.filename}>
                    <td>{b.filename}</td>
                    <td>{formatBytes(b.size)}</td>
                    <td>{new Date(b.created_at).toLocaleString()}</td>
                    <td className="cta-row">
                      <a className="btn small" href={`/api/backups/${encodeURIComponent(b.filename)}/download`}>Download</a>
                      <button className="btn small" onClick={() => handleRestore(b.filename)}>Restore</button>
                      <button className="btn small danger" onClick={() => handleDeleteBackup(b.filename)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {backups.length === 0 && <p className="hint-text">No backups yet.</p>}

          <div className="cta-row" style={{ marginTop: '1rem' }}>
            <input type="file" accept=".db" onChange={(e) => setRestoreFile(e.target.files[0] || null)} />
            <button className="btn" disabled={!restoreFile} onClick={handleRestoreUpload}>Restore From Uploaded File</button>
          </div>
        </section>
      )}

      {user?.role === 'admin' && (
        <section className="panel">
          <h2>Notifications</h2>
          <p className="hint-text">
            A daily digest posted to a webhook URL — works as-is with Discord and Slack incoming webhooks, or any
            generic receiver (ntfy.sh, Home Assistant, n8n...). No SMTP/email setup needed. Covers this shared
            collection's eBay watch hits and grading submissions past their expected return date.
          </p>
          <div className="form-grid">
            <label className="checkbox-label">
              <input type="checkbox" checked={!!settings.notify_enabled} onChange={(e) => set('notify_enabled', e.target.checked)} />
              Enabled
            </label>
            <label>Webhook URL
              <input value={settings.notify_webhook_url || ''} onChange={(e) => set('notify_webhook_url', e.target.value)} placeholder="https://discord.com/api/webhooks/..." />
            </label>
            <label>Hour of day (0-23, server time)
              <input type="number" min="0" max="23" value={settings.notify_hour ?? 8} onChange={(e) => set('notify_hour', Number(e.target.value))} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={settings.notify_watches_enabled !== false} onChange={(e) => set('notify_watches_enabled', e.target.checked)} />
              Include eBay watch hits
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={settings.notify_grading_enabled !== false} onChange={(e) => set('notify_grading_enabled', e.target.checked)} />
              Include overdue grading submissions
            </label>
          </div>
          <div className="cta-row">
            <button className="btn primary" onClick={saveSettings}>Save Notification Settings</button>
            <button className="btn" onClick={handleTestWebhook}>Send Test Webhook</button>
            <button className="btn" onClick={handleSendDigestNow}>Send Digest Now</button>
          </div>
          {notifyMsg && <p className={notifyMsg.ok ? 'hint-text' : 'error-text'}>{notifyMsg.text}</p>}
        </section>
      )}

      <section className="panel">
        <h2>Automatic Price Lookup</h2>
        <p className="hint-text">
          "Manual" means you enter values yourself. <strong>TCGdex</strong> (Pokemon), <strong>YGOPRODeck</strong>
          (Yu-Gi-Oh), <strong>Scryfall</strong> (Magic USD), <strong>Cardhoarder</strong> (Magic Online tickets), and
          <strong> Card Kingdom</strong> (Magic retail) are free, keyless, and work immediately. All match against
          the card's Player/Character or Set Name field (or use the 🔍 Look Up buttons to fill it precisely).
          PokéWallet/eBay/TCGplayer need API keys — see the API Keys panel above. <strong>eBay</strong> returns the
          median price of currently active listings (an asking-price estimate) — true sold comps require eBay's
          Marketplace Insights API, which needs separate limited approval most developer accounts don't have.
        </p>
        <div className="form-grid">
          <label>Provider
            <select value={settings.price_provider || 'manual'} onChange={(e) => set('price_provider', e.target.value)}>
              <option value="manual">Manual</option>
              <option value="tcgdex">TCGdex — Pokemon (free, no key)</option>
              <option value="ygoprodeck">YGOPRODeck — Yu-Gi-Oh (free, no key)</option>
              <option value="scryfall">Scryfall — Magic USD (free, no key)</option>
              <option value="cardhoarder">Cardhoarder — Magic Online tix (free, no key)</option>
              <option value="cardkingdom">Card Kingdom — Magic retail (free, no key)</option>
              <option value="pokewallet">PokéWallet — Pokemon (needs API key)</option>
              <option value="ebay">eBay active listings (needs API key)</option>
              <option value="tcgplayer">TCGplayer direct (needs API key)</option>
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
