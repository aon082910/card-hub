const BASE = '/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`${res.status} ${res.statusText}: ${text}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  listCards: (params = {}) => request(`/cards?${new URLSearchParams(params)}`),
  getCard: (id) => request(`/cards/${id}`),
  createCard: (data) => request('/cards', { method: 'POST', body: JSON.stringify(data) }),
  updateCard: (id, data) => request(`/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCard: (id) => request(`/cards/${id}`, { method: 'DELETE' }),
  cloneCard: (id) => request(`/cards/${id}/clone`, { method: 'POST' }),
  similarCards: (id) => request(`/cards/${id}/similar`),
  refreshValue: (id) => request(`/cards/${id}/refresh-value`, { method: 'POST' }),
  bulkAction: (ids, action, value) => request('/cards/bulk', { method: 'POST', body: JSON.stringify({ ids, action, value }) }),
  uploadImage: (id, blob, side = 'front') => {
    const form = new FormData();
    form.append('image', blob, `${side}-${Date.now()}.jpg`);
    form.append('side', side);
    return request(`/cards/${id}/images`, { method: 'POST', body: form });
  },
  deleteImage: (cardId, imageId) => request(`/cards/${cardId}/images/${imageId}`, { method: 'DELETE' }),
  importImage: (cardId, url, side = 'front') => request(`/cards/${cardId}/import-image`, { method: 'POST', body: JSON.stringify({ url, side }) }),

  listSales: () => request('/sales'),
  createSale: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  deleteSale: (id) => request(`/sales/${id}`, { method: 'DELETE' }),

  listListings: () => request('/listings'),
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
  updateListing: (id, data) => request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteListing: (id) => request(`/listings/${id}`, { method: 'DELETE' }),
  pushEbayListing: (id) => request(`/listings/${id}/push-ebay`, { method: 'POST' }),
  syncEbayListing: (id) => request(`/listings/${id}/sync-ebay`, { method: 'POST' }),

  listSets: () => request('/sets'),
  getSet: (id) => request(`/sets/${id}`),
  createSet: (data) => request('/sets', { method: 'POST', body: JSON.stringify(data) }),
  updateSet: (id, data) => request(`/sets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSet: (id) => request(`/sets/${id}`, { method: 'DELETE' }),

  dashboard: () => request('/dashboard'),
  takeSnapshot: () => request('/dashboard/snapshot', { method: 'POST' }),

  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  auditLog: () => request('/settings/audit-log'),

  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username, password) => request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) => request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  listUsers: () => request('/auth/users'),
  searchUsers: (q) => request(`/auth/users/search?q=${encodeURIComponent(q)}`),
  createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/auth/users/${id}`, { method: 'DELETE' }),

  listFriends: () => request('/friends'),
  listFriendRequests: () => request('/friends/requests'),
  sendFriendRequest: (username) => request('/friends', { method: 'POST', body: JSON.stringify({ username }) }),
  acceptFriendRequest: (id) => request(`/friends/${id}/accept`, { method: 'POST' }),
  declineFriendRequest: (id) => request(`/friends/${id}/decline`, { method: 'POST' }),
  removeFriend: (id) => request(`/friends/${id}`, { method: 'DELETE' }),
  friendCollection: (userId) => request(`/friends/${userId}/collection`),

  listConversations: () => request('/messages/conversations'),
  messagesWith: (userId) => request(`/messages/with/${userId}`),
  sendMessage: (userId, body, tradeRequestId) => request(`/messages/with/${userId}`, { method: 'POST', body: JSON.stringify({ body, trade_request_id: tradeRequestId }) }),
  unreadMessageCount: () => request('/messages/unread-count'),

  listTradeRequests: () => request('/trade-requests'),
  createTradeRequest: (data) => request('/trade-requests', { method: 'POST', body: JSON.stringify(data) }),
  acceptTradeRequest: (id) => request(`/trade-requests/${id}/accept`, { method: 'POST' }),
  declineTradeRequest: (id) => request(`/trade-requests/${id}/decline`, { method: 'POST' }),
  cancelTradeRequest: (id) => request(`/trade-requests/${id}/cancel`, { method: 'POST' }),
  completeTradeRequest: (id) => request(`/trade-requests/${id}/complete`, { method: 'POST' }),

  ebayConnectUrl: () => request('/oauth/ebay/connect'),

  lookupPokemon: (q) => request(`/lookup/pokemon?q=${encodeURIComponent(q)}`),
  lookupPokemonCard: (id) => request(`/lookup/pokemon/${encodeURIComponent(id)}`),
  lookupYugioh: (q) => request(`/lookup/yugioh?q=${encodeURIComponent(q)}`),
  lookupMagic: (q) => request(`/lookup/magic?q=${encodeURIComponent(q)}`),

  listGrading: () => request('/grading'),
  createGrading: (data) => request('/grading', { method: 'POST', body: JSON.stringify(data) }),
  updateGrading: (id, data) => request(`/grading/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGrading: (id) => request(`/grading/${id}`, { method: 'DELETE' }),

  listDecks: () => request('/decks'),
  getDeck: (id) => request(`/decks/${id}`),
  createDeck: (data) => request('/decks', { method: 'POST', body: JSON.stringify(data) }),
  updateDeck: (id, data) => request(`/decks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeck: (id) => request(`/decks/${id}`, { method: 'DELETE' }),
  addCardToDeck: (deckId, cardId, quantity = 1) => request(`/decks/${deckId}/cards`, { method: 'POST', body: JSON.stringify({ card_id: cardId, quantity }) }),
  removeCardFromDeck: (deckId, deckCardId) => request(`/decks/${deckId}/cards/${deckCardId}`, { method: 'DELETE' }),

  listTrades: () => request('/trades'),
  createTrade: (data) => request('/trades', { method: 'POST', body: JSON.stringify(data) }),
  deleteTrade: (id) => request(`/trades/${id}`, { method: 'DELETE' }),

  listShareLinks: () => request('/share'),
  createShareLink: (data) => request('/share', { method: 'POST', body: JSON.stringify(data) }),
  deleteShareLink: (id) => request(`/share/${id}`, { method: 'DELETE' }),

  listWatches: () => request('/watches'),
  createWatch: (data) => request('/watches', { method: 'POST', body: JSON.stringify(data) }),
  deleteWatch: (id) => request(`/watches/${id}`, { method: 'DELETE' }),
  checkWatch: (id) => request(`/watches/${id}/check`, { method: 'POST' }),

  listBackups: () => request('/backups'),
  takeBackupNow: () => request('/backups', { method: 'POST' }),
  deleteBackup: (filename) => request(`/backups/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  restoreBackup: (filename) => request(`/backups/${encodeURIComponent(filename)}/restore`, { method: 'POST' }),
  restoreBackupUpload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/backups/restore-upload', { method: 'POST', body: form });
  },

  checkDuplicate: (params) => request(`/cards/check-duplicate?${new URLSearchParams(params)}`),

  testWebhook: () => request('/settings/test-webhook', { method: 'POST' }),
  sendDigestNow: () => request('/settings/send-digest-now', { method: 'POST' }),

  ocrExtract: (blob) => {
    const form = new FormData();
    form.append('image', blob, 'ocr.jpg');
    return request('/ocr', { method: 'POST', body: form });
  },

  listApiTokens: () => request('/api-tokens'),
  createApiToken: (label) => request('/api-tokens', { method: 'POST', body: JSON.stringify({ label }) }),
  deleteApiToken: (id) => request(`/api-tokens/${id}`, { method: 'DELETE' }),

  tradeMatch: (url) => request('/trade-match', { method: 'POST', body: JSON.stringify({ url }) }),

  previewImport: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/import/preview', { method: 'POST', body: form });
  },
  customImport: (file, mapping) => {
    const form = new FormData();
    form.append('file', file);
    form.append('mapping', JSON.stringify(mapping));
    return request('/import/custom', { method: 'POST', body: form });
  },
};
