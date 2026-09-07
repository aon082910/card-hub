import React, { createContext, useContext, useState } from 'react';

// Lightweight i18n - no external dependency. Full coverage of navigation, common
// actions, and the card form (the most-reused piece of UI, shown on Add Card and
// every card's detail page); page-specific labels on the less-visited pages (Sales,
// Trades, Grading, Decks, Reports, Settings) still fall back to their English text.
// Structured so more strings/languages can be added to the dictionary incrementally
// without touching components again.
const DICTIONARY = {
  en: {
    nav_dashboard: 'Dashboard', nav_collection: 'Collection', nav_want_list: 'Want List',
    nav_decks: 'Decks', nav_grading: 'Grading', nav_sales: 'Sales', nav_trades: 'Trades',
    nav_listings: 'Listings', nav_sets: 'Sets', nav_reports: 'Reports', nav_settings: 'Settings',

    btn_save: 'Save', btn_delete: 'Delete', btn_cancel: 'Cancel', btn_add: 'Add',
    btn_edit: 'Edit', btn_close: 'Close', btn_search: 'Search', btn_log_out: 'Log out',
    btn_create_card: 'Create Card', btn_save_changes: 'Save Changes',
    loading: 'Loading...',

    dashboard_title: 'Dashboard', dashboard_total_cards: 'Total Cards', dashboard_collection_value: 'Collection Value',
    dashboard_total_cost: 'Total Cost Basis', dashboard_profit: 'Realized Profit', dashboard_by_category: 'By Category',
    dashboard_recent_sales: 'Recent Sales', dashboard_add_card: '+ Add Card', dashboard_view_collection: 'View Collection',
    dashboard_no_sales: 'No sales yet',

    collection_title: 'Collection', collection_search: 'Search player, set, tags...', collection_all_categories: 'All categories',
    collection_all_statuses: 'All statuses', collection_save_view: 'Save View', collection_selected: 'selected',
    collection_no_cards: 'No cards found', collection_col_player: 'Player/Character', collection_col_set: 'Set',
    collection_col_year: 'Year', collection_col_grade: 'Grade', collection_col_qty: 'Qty', collection_col_cost: 'Cost',
    collection_col_value: 'Value', collection_col_status: 'Status',

    field_category: 'Category', field_sport_or_game: 'Sport / Game', field_player_or_character: 'Player / Character',
    field_team_or_set: 'Team / Set (display)', field_set_name: 'Set Name', field_year: 'Year', field_manufacturer: 'Manufacturer',
    field_card_number: 'Card Number', field_parallel_variant: 'Parallel / Variant', field_rarity: 'Rarity',
    field_serial_number: 'Serial Number', field_graded: 'Graded', field_grading_company: 'Grading Company',
    field_grade: 'Grade', field_cert_number: 'Cert Number', field_condition: 'Condition', field_quantity: 'Quantity',
    field_storage_location: 'Storage Location', field_tags: 'Tags', field_cost_basis: 'Cost Basis ($)',
    field_purchase_date: 'Purchase Date', field_purchase_source: 'Purchase Source', field_current_value: 'Current Value ($)',
    field_raw_value: 'Raw (Ungraded) Est. ($)', field_graded_value_estimate: 'Graded Est. ($)', field_last_sold_value: 'Last Sold ($)',
    field_consigned: 'Consigned (not fully owned)', field_consignor_name: 'Consignor Name', field_consignor_payout: 'Consignor Payout (%)',
    field_status: 'Status', field_notes: 'Notes',

    category_sports: 'Sports', category_tcg: 'TCG', category_other: 'Other',
    status_owned: 'Owned', status_wanted: 'Wanted', status_listed: 'Listed', status_sold: 'Sold', status_archived: 'Archived',
  },
  es: {
    nav_dashboard: 'Panel', nav_collection: 'Colección', nav_want_list: 'Lista de Deseos',
    nav_decks: 'Mazos', nav_grading: 'Clasificación', nav_sales: 'Ventas', nav_trades: 'Intercambios',
    nav_listings: 'Publicaciones', nav_sets: 'Colecciones', nav_reports: 'Informes', nav_settings: 'Ajustes',

    btn_save: 'Guardar', btn_delete: 'Eliminar', btn_cancel: 'Cancelar', btn_add: 'Añadir',
    btn_edit: 'Editar', btn_close: 'Cerrar', btn_search: 'Buscar', btn_log_out: 'Cerrar sesión',
    btn_create_card: 'Crear Carta', btn_save_changes: 'Guardar Cambios',
    loading: 'Cargando...',

    dashboard_title: 'Panel', dashboard_total_cards: 'Total de Cartas', dashboard_collection_value: 'Valor de la Colección',
    dashboard_total_cost: 'Costo Total', dashboard_profit: 'Ganancia Realizada', dashboard_by_category: 'Por Categoría',
    dashboard_recent_sales: 'Ventas Recientes', dashboard_add_card: '+ Añadir Carta', dashboard_view_collection: 'Ver Colección',
    dashboard_no_sales: 'Aún no hay ventas',

    collection_title: 'Colección', collection_search: 'Buscar jugador, set, etiquetas...', collection_all_categories: 'Todas las categorías',
    collection_all_statuses: 'Todos los estados', collection_save_view: 'Guardar Vista', collection_selected: 'seleccionado(s)',
    collection_no_cards: 'No se encontraron cartas', collection_col_player: 'Jugador/Personaje', collection_col_set: 'Set',
    collection_col_year: 'Año', collection_col_grade: 'Grado', collection_col_qty: 'Cant.', collection_col_cost: 'Costo',
    collection_col_value: 'Valor', collection_col_status: 'Estado',

    field_category: 'Categoría', field_sport_or_game: 'Deporte / Juego', field_player_or_character: 'Jugador / Personaje',
    field_team_or_set: 'Equipo / Set (visible)', field_set_name: 'Nombre del Set', field_year: 'Año', field_manufacturer: 'Fabricante',
    field_card_number: 'Número de Carta', field_parallel_variant: 'Paralelo / Variante', field_rarity: 'Rareza',
    field_serial_number: 'Número de Serie', field_graded: 'Clasificada', field_grading_company: 'Empresa Clasificadora',
    field_grade: 'Grado', field_cert_number: 'Número de Certificado', field_condition: 'Condición', field_quantity: 'Cantidad',
    field_storage_location: 'Ubicación de Almacenamiento', field_tags: 'Etiquetas', field_cost_basis: 'Costo Base ($)',
    field_purchase_date: 'Fecha de Compra', field_purchase_source: 'Fuente de Compra', field_current_value: 'Valor Actual ($)',
    field_raw_value: 'Est. Sin Clasificar ($)', field_graded_value_estimate: 'Est. Clasificada ($)', field_last_sold_value: 'Última Venta ($)',
    field_consigned: 'En consignación (no de propiedad total)', field_consignor_name: 'Nombre del Consignador', field_consignor_payout: 'Pago al Consignador (%)',
    field_status: 'Estado', field_notes: 'Notas',

    category_sports: 'Deportes', category_tcg: 'TCG', category_other: 'Otro',
    status_owned: 'En posesión', status_wanted: 'Deseada', status_listed: 'Publicada', status_sold: 'Vendida', status_archived: 'Archivada',
  },
  fr: {
    nav_dashboard: 'Tableau de bord', nav_collection: 'Collection', nav_want_list: 'Liste de souhaits',
    nav_decks: 'Decks', nav_grading: 'Gradation', nav_sales: 'Ventes', nav_trades: 'Échanges',
    nav_listings: 'Annonces', nav_sets: 'Séries', nav_reports: 'Rapports', nav_settings: 'Paramètres',

    btn_save: 'Enregistrer', btn_delete: 'Supprimer', btn_cancel: 'Annuler', btn_add: 'Ajouter',
    btn_edit: 'Modifier', btn_close: 'Fermer', btn_search: 'Rechercher', btn_log_out: 'Se déconnecter',
    btn_create_card: 'Créer la Carte', btn_save_changes: 'Enregistrer les Modifications',
    loading: 'Chargement...',

    dashboard_title: 'Tableau de bord', dashboard_total_cards: 'Total des Cartes', dashboard_collection_value: 'Valeur de la Collection',
    dashboard_total_cost: 'Coût Total', dashboard_profit: 'Profit Réalisé', dashboard_by_category: 'Par Catégorie',
    dashboard_recent_sales: 'Ventes Récentes', dashboard_add_card: '+ Ajouter une Carte', dashboard_view_collection: 'Voir la Collection',
    dashboard_no_sales: 'Aucune vente pour le moment',

    collection_title: 'Collection', collection_search: 'Rechercher joueur, set, étiquettes...', collection_all_categories: 'Toutes les catégories',
    collection_all_statuses: 'Tous les statuts', collection_save_view: 'Enregistrer la Vue', collection_selected: 'sélectionné(s)',
    collection_no_cards: 'Aucune carte trouvée', collection_col_player: 'Joueur/Personnage', collection_col_set: 'Set',
    collection_col_year: 'Année', collection_col_grade: 'Note', collection_col_qty: 'Qté', collection_col_cost: 'Coût',
    collection_col_value: 'Valeur', collection_col_status: 'Statut',

    field_category: 'Catégorie', field_sport_or_game: 'Sport / Jeu', field_player_or_character: 'Joueur / Personnage',
    field_team_or_set: 'Équipe / Set (affichage)', field_set_name: 'Nom du Set', field_year: 'Année', field_manufacturer: 'Fabricant',
    field_card_number: 'Numéro de Carte', field_parallel_variant: 'Parallèle / Variante', field_rarity: 'Rareté',
    field_serial_number: 'Numéro de Série', field_graded: 'Notée', field_grading_company: 'Société de Gradation',
    field_grade: 'Note', field_cert_number: 'Numéro de Certificat', field_condition: 'État', field_quantity: 'Quantité',
    field_storage_location: 'Emplacement de Stockage', field_tags: 'Étiquettes', field_cost_basis: 'Coût de Base ($)',
    field_purchase_date: "Date d'Achat", field_purchase_source: "Source d'Achat", field_current_value: 'Valeur Actuelle ($)',
    field_raw_value: 'Est. Non Notée ($)', field_graded_value_estimate: 'Est. Notée ($)', field_last_sold_value: 'Dernière Vente ($)',
    field_consigned: 'En consignation (non pleinement possédée)', field_consignor_name: 'Nom du Consignataire', field_consignor_payout: 'Paiement au Consignataire (%)',
    field_status: 'Statut', field_notes: 'Notes',

    category_sports: 'Sports', category_tcg: 'JCC', category_other: 'Autre',
    status_owned: 'Possédée', status_wanted: 'Recherchée', status_listed: 'En vente', status_sold: 'Vendue', status_archived: 'Archivée',
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
