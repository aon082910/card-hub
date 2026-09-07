import React, { createContext, useContext, useState } from 'react';

// Lightweight i18n - no external dependency. Covers the main navigation and common
// action labels; page-internal form field labels stay in English for now. Structured
// so more languages/strings can be added to the dictionary without touching components.
const DICTIONARY = {
  en: {
    nav_dashboard: 'Dashboard', nav_collection: 'Collection', nav_want_list: 'Want List',
    nav_decks: 'Decks', nav_grading: 'Grading', nav_sales: 'Sales', nav_trades: 'Trades',
    nav_listings: 'Listings', nav_sets: 'Sets', nav_reports: 'Reports', nav_settings: 'Settings',
    btn_save: 'Save', btn_delete: 'Delete', btn_cancel: 'Cancel', btn_add: 'Add',
    btn_edit: 'Edit', btn_close: 'Close', btn_search: 'Search', btn_log_out: 'Log out',
    loading: 'Loading...',
  },
  es: {
    nav_dashboard: 'Panel', nav_collection: 'Colección', nav_want_list: 'Lista de Deseos',
    nav_decks: 'Mazos', nav_grading: 'Clasificación', nav_sales: 'Ventas', nav_trades: 'Intercambios',
    nav_listings: 'Publicaciones', nav_sets: 'Colecciones', nav_reports: 'Informes', nav_settings: 'Ajustes',
    btn_save: 'Guardar', btn_delete: 'Eliminar', btn_cancel: 'Cancelar', btn_add: 'Añadir',
    btn_edit: 'Editar', btn_close: 'Cerrar', btn_search: 'Buscar', btn_log_out: 'Cerrar sesión',
    loading: 'Cargando...',
  },
  fr: {
    nav_dashboard: 'Tableau de bord', nav_collection: 'Collection', nav_want_list: 'Liste de souhaits',
    nav_decks: 'Decks', nav_grading: 'Gradation', nav_sales: 'Ventes', nav_trades: 'Échanges',
    nav_listings: 'Annonces', nav_sets: 'Séries', nav_reports: 'Rapports', nav_settings: 'Paramètres',
    btn_save: 'Enregistrer', btn_delete: 'Supprimer', btn_cancel: 'Annuler', btn_add: 'Ajouter',
    btn_edit: 'Modifier', btn_close: 'Fermer', btn_search: 'Rechercher', btn_log_out: 'Se déconnecter',
    loading: 'Chargement...',
  },
};

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

const LanguageContext = createContext(null);

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem('card-hub-lang');
    if (saved && DICTIONARY[saved]) return saved;
  } catch { /* ignore */ }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  function setLang(code) {
    setLangState(code);
    try { localStorage.setItem('card-hub-lang', code); } catch { /* ignore */ }
  }

  function t(key) {
    return (DICTIONARY[lang] && DICTIONARY[lang][key]) || DICTIONARY.en[key] || key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
