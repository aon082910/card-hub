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
    nav_listings: 'Listings', nav_sets: 'Sets', nav_reports: 'Reports', nav_settings: 'Settings', nav_watches: 'Watches',

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
    field_status: 'Status', field_notes: 'Notes', field_for_trade: 'For Trade (available to trade away)',

    category_sports: 'Sports', category_tcg: 'TCG', category_other: 'Other',
    status_owned: 'Owned', status_wanted: 'Wanted', status_listed: 'Listed', status_sold: 'Sold', status_archived: 'Archived',

    login_title: 'Card-Hub', login_subtitle: 'Sign in to your collection.', login_username: 'Username', login_password: 'Password',
    login_signing_in: 'Signing in...', login_sign_in: 'Sign In', login_error: 'Invalid username or password.',
    login_first_time: 'First time? Default login is', login_change_after: '— change it from Settings after signing in.',

    col_card: 'Card', col_price: 'Price', col_fees: 'Fees', col_shipping: 'Shipping', col_platform: 'Platform',
    col_date: 'Date', col_direction: 'Direction', col_counterparty: 'Counterparty', col_est_value: 'Est. Value',
    col_company: 'Company', col_tracking: 'Tracking #', col_link: 'Link',

    sales_title: 'Sales', sales_record_a_sale: 'Record a Sale', sales_qty_sold: 'Quantity Sold', sales_sale_price: 'Sale Price ($)',
    sales_buyer: 'Buyer', sales_sale_date: 'Sale Date', sales_record: 'Record Sale', sales_confirm_delete: 'Delete this sale record?',
    sales_none: 'No sales recorded', select_a_card: 'Select a card...',

    trades_title: 'Trades', trades_hint: "A simple ledger for cards traded with other collectors (no money changing hands). Trading a card away reduces its quantity in your collection, same as a sale.",
    trades_log_a_trade: 'Log a Trade', trades_direction: 'Direction', trades_traded_away: 'Traded Away', trades_received: 'Received',
    trades_counterparty_ph: "Who'd you trade with?", trades_est_value: 'Estimated Value ($)', trades_date: 'Trade Date',
    trades_log: 'Log Trade', trades_confirm_delete: 'Delete this trade record?', trades_none: 'No trades logged',

    grading_title: 'Grading', grading_roi_calc: 'Grading ROI Calculator', btn_show: 'Show', btn_hide: 'Hide',
    grading_submit_card: 'Submit a Card for Grading', grading_company: 'Company', grading_service_level: 'Service Level',
    grading_cost: 'Cost ($)', grading_tracking: 'Tracking Number', grading_submitted_date: 'Submitted Date',
    grading_expected_return: 'Expected Return Date', grading_log_submission: 'Log Submission', grading_prompt_grade: 'What grade did it come back?',
    grading_confirm_delete: 'Delete this grading submission record?', grading_none: 'No grading submissions logged',
    grading_status_submitted: 'Submitted', grading_status_in_progress: 'In Progress', grading_status_returned: 'Returned', grading_status_cancelled: 'Cancelled',

    decks_title: 'Decks & Binders', decks_hint: "Group cards from your collection into a named list — a deck you play, or a binder page you're curating.",
    decks_new: 'New Deck', decks_name: 'Name', decks_create: 'Create Deck', decks_confirm_delete: 'Delete this deck? (cards themselves are not affected)',
    decks_none: 'No decks yet.', decks_card_count: 'card(s)', decks_all: '← All Decks', decks_add_a_card: 'Add a Card',
    decks_select_from_collection: 'Select a card from your collection...', decks_qty_in_deck: 'Qty in Deck', btn_remove: 'Remove',
    decks_none_in_deck: 'No cards in this deck yet',

    want_list_title: 'Want List', want_list_share: '🔗 Share Want List', want_list_add: '+ Add Wanted Card',
    want_list_public_link: 'Public link (no login needed):', want_list_hint: 'Cards marked with status "Wanted" show up here — mark a card Wanted from Add Card or a card\'s Details form.',
    want_list_none: 'Nothing on your want list yet', card_number_col: 'Card #',

    listings_title: 'Marketplace Listings', listings_new: 'New Listing', listings_list_price: 'List Price ($)',
    listings_external_url: 'External URL', listings_add: 'Add Listing', listings_confirm_delete: 'Delete this listing?',
    listings_none: 'No listings yet', listings_open: 'Open', listings_status_draft: 'Draft', listings_status_active: 'Active',
    listings_status_ended: 'Ended', listings_status_sold: 'Sold',

    sets_title: 'Sets & Checklists', reports_title: 'Reports & Export', settings_title: 'Settings',

    images_title: 'Images', side_front: 'Front', side_back: 'Back', side_other: 'Other',
    no_images_hint: "No images yet. Use the USB webcam on this machine, or open Card-Hub on your phone's browser to scan with your phone camera.",
    quick_actions_title: 'Quick Actions', add_to_deck_ph: 'Add to deck...', details_title: 'Details',
    value_history_title: 'Value History', similar_cards_title: 'Similar Cards', col_source: 'Source', col_submitted: 'Submitted',

    nav_for_trade: 'For Trade', for_trade_title: 'For Trade', for_trade_share: '🔗 Share For Trade List',
    for_trade_hint: 'Cards marked "For Trade" show up here — check the For Trade box on a card\'s Details form to list it as available.',
    for_trade_none: 'Nothing marked for trade yet',

    watches_title: 'eBay Deal Watches', watches_hint: 'Save a search + target price, then check current active eBay listings against it. Uses the eBay API Key from Settings — an active-listing search, not sold comps.',
    watches_new: 'New Watch', watches_query: 'Search Query', watches_target_price: 'Target Price ($)',
    watches_add: 'Add Watch', watches_check_now: 'Check Now', watches_last_checked: 'Last Checked', watches_matches: 'Matches Under Target',
    watches_none: 'No watches yet', watches_confirm_delete: 'Delete this watch?', watches_no_matches: 'No listings under target price right now.',

    deck_summary_title: 'Deck Summary', deck_summary_total_cards: 'Total Cards', deck_summary_total_value: 'Total Value',
    deck_summary_by_category: 'By Category',

    nav_scan: 'Scan', scan_title: 'Card Scanner', scan_setup_hint: 'Works with a plain USB webcam, or a purpose-built stand like the ',
    scan_setup_link_text: 'MakerWorld card scanner stand', scan_setup_hint2: ' — point the camera at the slot and let cards glide through.',
    scan_camera_label: 'Camera', scan_default_camera: 'Default camera', scan_no_camera: 'No camera detected. Plug in a USB camera and reload.',
    scan_auto_capture: 'Auto-capture', scan_capture_now: 'Capture Now', scan_sensitivity: 'Sensitivity',
    scan_zone_top: 'Capture Zone Position', scan_zone_height: 'Capture Zone Height', scan_mirror: 'Mirror preview',
    scan_zone_left: 'Capture Zone Left', scan_zone_width: 'Capture Zone Width',
    scan_tuning_hint: "If cards aren't triggering a capture, narrow the zone to just the slot (less static hardware diluting the motion signal) and watch the meter above the video — it should cross the halfway line when a card passes. Raise Sensitivity if it doesn't.",
    scan_state_empty: 'Ready — slide a card through', scan_state_detecting: 'Card detected, holding...', scan_state_captured: 'Captured!',
    scan_state_clearing: 'Clearing zone...',
    scan_side_front: 'Front', scan_side_back: 'Back', scan_auto_alternate: 'Auto-alternate front/back',
    scan_queue_title: 'Scanned Cards', scan_no_shots: 'No cards scanned yet — captures will appear here.',
    scan_retake: 'Retake', scan_delete: 'Delete', scan_create_card: 'Create Card', scan_creating: 'Creating...',
    scan_pair_incomplete: 'Missing side', scan_settings_title: 'Scanner Settings',
  },
  es: {
    nav_dashboard: 'Panel', nav_collection: 'Colección', nav_want_list: 'Lista de Deseos',
    nav_decks: 'Mazos', nav_grading: 'Clasificación', nav_sales: 'Ventas', nav_trades: 'Intercambios',
    nav_listings: 'Publicaciones', nav_sets: 'Colecciones', nav_reports: 'Informes', nav_settings: 'Ajustes', nav_watches: 'Alertas',

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
    field_status: 'Estado', field_notes: 'Notas', field_for_trade: 'Para Intercambio (disponible para intercambiar)',

    category_sports: 'Deportes', category_tcg: 'TCG', category_other: 'Otro',
    status_owned: 'En posesión', status_wanted: 'Deseada', status_listed: 'Publicada', status_sold: 'Vendida', status_archived: 'Archivada',

    login_title: 'Card-Hub', login_subtitle: 'Inicia sesión en tu colección.', login_username: 'Usuario', login_password: 'Contraseña',
    login_signing_in: 'Iniciando sesión...', login_sign_in: 'Iniciar Sesión', login_error: 'Usuario o contraseña incorrectos.',
    login_first_time: '¿Primera vez? El inicio de sesión predeterminado es', login_change_after: '— cámbialo desde Ajustes después de iniciar sesión.',

    col_card: 'Carta', col_price: 'Precio', col_fees: 'Comisiones', col_shipping: 'Envío', col_platform: 'Plataforma',
    col_date: 'Fecha', col_direction: 'Dirección', col_counterparty: 'Contraparte', col_est_value: 'Valor Est.',
    col_company: 'Empresa', col_tracking: 'N.º de Seguimiento', col_link: 'Enlace',

    sales_title: 'Ventas', sales_record_a_sale: 'Registrar una Venta', sales_qty_sold: 'Cantidad Vendida', sales_sale_price: 'Precio de Venta ($)',
    sales_buyer: 'Comprador', sales_sale_date: 'Fecha de Venta', sales_record: 'Registrar Venta', sales_confirm_delete: '¿Eliminar este registro de venta?',
    sales_none: 'No hay ventas registradas', select_a_card: 'Selecciona una carta...',

    trades_title: 'Intercambios', trades_hint: 'Un registro simple de cartas intercambiadas con otros coleccionistas (sin dinero de por medio). Intercambiar una carta reduce su cantidad en tu colección, igual que una venta.',
    trades_log_a_trade: 'Registrar un Intercambio', trades_direction: 'Dirección', trades_traded_away: 'Intercambiada', trades_received: 'Recibida',
    trades_counterparty_ph: '¿Con quién intercambiaste?', trades_est_value: 'Valor Estimado ($)', trades_date: 'Fecha del Intercambio',
    trades_log: 'Registrar Intercambio', trades_confirm_delete: '¿Eliminar este registro de intercambio?', trades_none: 'No hay intercambios registrados',

    grading_title: 'Clasificación', grading_roi_calc: 'Calculadora de ROI de Clasificación', btn_show: 'Mostrar', btn_hide: 'Ocultar',
    grading_submit_card: 'Enviar una Carta a Clasificar', grading_company: 'Empresa', grading_service_level: 'Nivel de Servicio',
    grading_cost: 'Costo ($)', grading_tracking: 'Número de Seguimiento', grading_submitted_date: 'Fecha de Envío',
    grading_expected_return: 'Fecha de Retorno Esperada', grading_log_submission: 'Registrar Envío', grading_prompt_grade: '¿Qué grado obtuvo?',
    grading_confirm_delete: '¿Eliminar este registro de envío?', grading_none: 'No hay envíos de clasificación registrados',
    grading_status_submitted: 'Enviada', grading_status_in_progress: 'En Progreso', grading_status_returned: 'Recibida', grading_status_cancelled: 'Cancelada',

    decks_title: 'Mazos y Álbumes', decks_hint: 'Agrupa cartas de tu colección en una lista con nombre — un mazo que juegas, o una página de álbum que estás organizando.',
    decks_new: 'Nuevo Mazo', decks_name: 'Nombre', decks_create: 'Crear Mazo', decks_confirm_delete: '¿Eliminar este mazo? (las cartas no se ven afectadas)',
    decks_none: 'Aún no hay mazos.', decks_card_count: 'carta(s)', decks_all: '← Todos los Mazos', decks_add_a_card: 'Añadir una Carta',
    decks_select_from_collection: 'Selecciona una carta de tu colección...', decks_qty_in_deck: 'Cant. en el Mazo', btn_remove: 'Quitar',
    decks_none_in_deck: 'Aún no hay cartas en este mazo',

    want_list_title: 'Lista de Deseos', want_list_share: '🔗 Compartir Lista de Deseos', want_list_add: '+ Añadir Carta Deseada',
    want_list_public_link: 'Enlace público (sin necesidad de iniciar sesión):', want_list_hint: 'Las cartas marcadas como "Deseada" aparecen aquí — marca una carta como Deseada desde Añadir Carta o el formulario de detalles de una carta.',
    want_list_none: 'Aún no hay nada en tu lista de deseos', card_number_col: 'N.º de Carta',

    listings_title: 'Publicaciones en el Mercado', listings_new: 'Nueva Publicación', listings_list_price: 'Precio de Lista ($)',
    listings_external_url: 'URL Externa', listings_add: 'Añadir Publicación', listings_confirm_delete: '¿Eliminar esta publicación?',
    listings_none: 'Aún no hay publicaciones', listings_open: 'Abrir', listings_status_draft: 'Borrador', listings_status_active: 'Activa',
    listings_status_ended: 'Finalizada', listings_status_sold: 'Vendida',

    sets_title: 'Colecciones y Listas de Verificación', reports_title: 'Informes y Exportación', settings_title: 'Ajustes',

    images_title: 'Imágenes', side_front: 'Frente', side_back: 'Reverso', side_other: 'Otro',
    no_images_hint: 'Aún no hay imágenes. Usa la cámara USB de esta máquina, o abre Card-Hub en el navegador de tu teléfono para escanear con la cámara del teléfono.',
    quick_actions_title: 'Acciones Rápidas', add_to_deck_ph: 'Añadir a mazo...', details_title: 'Detalles',
    value_history_title: 'Historial de Valor', similar_cards_title: 'Cartas Similares', col_source: 'Fuente', col_submitted: 'Enviado',

    nav_for_trade: 'Para Intercambio', for_trade_title: 'Para Intercambio', for_trade_share: '🔗 Compartir Lista de Intercambio',
    for_trade_hint: 'Las cartas marcadas "Para Intercambio" aparecen aquí — marca la casilla en el formulario de detalles de una carta para listarla como disponible.',
    for_trade_none: 'Aún no hay nada marcado para intercambio',

    watches_title: 'Alertas de Ofertas en eBay', watches_hint: 'Guarda una búsqueda + precio objetivo, y revisa las publicaciones activas actuales de eBay contra ese precio. Usa la clave API de eBay de Ajustes — es una búsqueda de publicaciones activas, no de ventas concretadas.',
    watches_new: 'Nueva Alerta', watches_query: 'Consulta de Búsqueda', watches_target_price: 'Precio Objetivo ($)',
    watches_add: 'Añadir Alerta', watches_check_now: 'Revisar Ahora', watches_last_checked: 'Última Revisión', watches_matches: 'Coincidencias Bajo el Objetivo',
    watches_none: 'Aún no hay alertas', watches_confirm_delete: '¿Eliminar esta alerta?', watches_no_matches: 'No hay publicaciones bajo el precio objetivo por ahora.',

    deck_summary_title: 'Resumen del Mazo', deck_summary_total_cards: 'Total de Cartas', deck_summary_total_value: 'Valor Total',
    deck_summary_by_category: 'Por Categoría',

    nav_scan: 'Escanear', scan_title: 'Escáner de Cartas', scan_setup_hint: 'Funciona con una webcam USB normal, o con un soporte dedicado como el ',
    scan_setup_link_text: 'soporte escáner de cartas de MakerWorld', scan_setup_hint2: ' — apunta la cámara a la ranura y deja que las cartas se deslicen.',
    scan_camera_label: 'Cámara', scan_default_camera: 'Cámara predeterminada', scan_no_camera: 'No se detectó cámara. Conecta una cámara USB y recarga.',
    scan_auto_capture: 'Captura automática', scan_capture_now: 'Capturar Ahora', scan_sensitivity: 'Sensibilidad',
    scan_zone_top: 'Posición de la Zona de Captura', scan_zone_height: 'Altura de la Zona de Captura', scan_mirror: 'Vista previa en espejo',
    scan_zone_left: 'Posición Izquierda de la Zona', scan_zone_width: 'Ancho de la Zona de Captura',
    scan_tuning_hint: 'Si las cartas no activan una captura, estrecha la zona para que cubra solo la ranura (menos estructura fija diluyendo la señal de movimiento) y observa el medidor sobre el video — debería cruzar la línea media cuando pase una carta. Sube la Sensibilidad si no lo hace.',
    scan_state_empty: 'Listo — desliza una carta', scan_state_detecting: 'Carta detectada, esperando...', scan_state_captured: '¡Capturada!',
    scan_state_clearing: 'Despejando zona...',
    scan_side_front: 'Frente', scan_side_back: 'Reverso', scan_auto_alternate: 'Alternar frente/reverso automáticamente',
    scan_queue_title: 'Cartas Escaneadas', scan_no_shots: 'Aún no hay cartas escaneadas — las capturas aparecerán aquí.',
    scan_retake: 'Repetir', scan_delete: 'Eliminar', scan_create_card: 'Crear Carta', scan_creating: 'Creando...',
    scan_pair_incomplete: 'Falta un lado', scan_settings_title: 'Ajustes del Escáner',
  },
  fr: {
    nav_dashboard: 'Tableau de bord', nav_collection: 'Collection', nav_want_list: 'Liste de souhaits',
    nav_decks: 'Decks', nav_grading: 'Gradation', nav_sales: 'Ventes', nav_trades: 'Échanges',
    nav_listings: 'Annonces', nav_sets: 'Séries', nav_reports: 'Rapports', nav_settings: 'Paramètres', nav_watches: 'Alertes',

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
    field_status: 'Statut', field_notes: 'Notes', field_for_trade: "À Échanger (disponible pour échange)",

    category_sports: 'Sports', category_tcg: 'JCC', category_other: 'Autre',
    status_owned: 'Possédée', status_wanted: 'Recherchée', status_listed: 'En vente', status_sold: 'Vendue', status_archived: 'Archivée',

    login_title: 'Card-Hub', login_subtitle: 'Connectez-vous à votre collection.', login_username: "Nom d'utilisateur", login_password: 'Mot de passe',
    login_signing_in: 'Connexion...', login_sign_in: 'Se Connecter', login_error: "Nom d'utilisateur ou mot de passe invalide.",
    login_first_time: 'Première fois ? La connexion par défaut est', login_change_after: '— changez-la depuis Paramètres après vous être connecté.',

    col_card: 'Carte', col_price: 'Prix', col_fees: 'Frais', col_shipping: 'Livraison', col_platform: 'Plateforme',
    col_date: 'Date', col_direction: 'Direction', col_counterparty: 'Contrepartie', col_est_value: 'Val. Est.',
    col_company: 'Société', col_tracking: 'N° de Suivi', col_link: 'Lien',

    sales_title: 'Ventes', sales_record_a_sale: 'Enregistrer une Vente', sales_qty_sold: 'Quantité Vendue', sales_sale_price: 'Prix de Vente ($)',
    sales_buyer: 'Acheteur', sales_sale_date: 'Date de Vente', sales_record: 'Enregistrer la Vente', sales_confirm_delete: 'Supprimer cet enregistrement de vente ?',
    sales_none: 'Aucune vente enregistrée', select_a_card: 'Sélectionner une carte...',

    trades_title: 'Échanges', trades_hint: "Un registre simple des cartes échangées avec d'autres collectionneurs (sans argent). Échanger une carte réduit sa quantité dans votre collection, comme une vente.",
    trades_log_a_trade: 'Enregistrer un Échange', trades_direction: 'Direction', trades_traded_away: 'Échangée', trades_received: 'Reçue',
    trades_counterparty_ph: 'Avec qui avez-vous échangé ?', trades_est_value: 'Valeur Estimée ($)', trades_date: "Date de l'Échange",
    trades_log: "Enregistrer l'Échange", trades_confirm_delete: "Supprimer cet enregistrement d'échange ?", trades_none: 'Aucun échange enregistré',

    grading_title: 'Gradation', grading_roi_calc: 'Calculateur de ROI de Gradation', btn_show: 'Afficher', btn_hide: 'Masquer',
    grading_submit_card: 'Envoyer une Carte à Grader', grading_company: 'Société', grading_service_level: 'Niveau de Service',
    grading_cost: 'Coût ($)', grading_tracking: 'Numéro de Suivi', grading_submitted_date: "Date d'Envoi",
    grading_expected_return: 'Date de Retour Prévue', grading_log_submission: "Enregistrer l'Envoi", grading_prompt_grade: 'Quelle note a-t-elle reçue ?',
    grading_confirm_delete: "Supprimer cet enregistrement d'envoi ?", grading_none: 'Aucun envoi de gradation enregistré',
    grading_status_submitted: 'Envoyée', grading_status_in_progress: 'En Cours', grading_status_returned: 'Reçue', grading_status_cancelled: 'Annulée',

    decks_title: 'Decks et Classeurs', decks_hint: "Regroupez des cartes de votre collection dans une liste nommée — un deck que vous jouez, ou une page de classeur que vous organisez.",
    decks_new: 'Nouveau Deck', decks_name: 'Nom', decks_create: 'Créer le Deck', decks_confirm_delete: 'Supprimer ce deck ? (les cartes elles-mêmes ne sont pas affectées)',
    decks_none: 'Aucun deck pour le moment.', decks_card_count: 'carte(s)', decks_all: '← Tous les Decks', decks_add_a_card: 'Ajouter une Carte',
    decks_select_from_collection: 'Sélectionner une carte de votre collection...', decks_qty_in_deck: 'Qté dans le Deck', btn_remove: 'Retirer',
    decks_none_in_deck: 'Aucune carte dans ce deck pour le moment',

    want_list_title: 'Liste de Souhaits', want_list_share: '🔗 Partager la Liste de Souhaits', want_list_add: '+ Ajouter une Carte Recherchée',
    want_list_public_link: 'Lien public (sans connexion requise) :', want_list_hint: 'Les cartes marquées "Recherchée" apparaissent ici — marquez une carte comme Recherchée depuis Ajouter une Carte ou le formulaire de détails d\'une carte.',
    want_list_none: 'Rien dans votre liste de souhaits pour le moment', card_number_col: 'N° de Carte',

    listings_title: 'Annonces du Marché', listings_new: 'Nouvelle Annonce', listings_list_price: 'Prix Affiché ($)',
    listings_external_url: 'URL Externe', listings_add: "Ajouter l'Annonce", listings_confirm_delete: 'Supprimer cette annonce ?',
    listings_none: "Aucune annonce pour le moment", listings_open: 'Ouvrir', listings_status_draft: 'Brouillon', listings_status_active: 'Active',
    listings_status_ended: 'Terminée', listings_status_sold: 'Vendue',

    sets_title: 'Séries et Listes de Vérification', reports_title: 'Rapports et Export', settings_title: 'Paramètres',

    images_title: 'Images', side_front: 'Recto', side_back: 'Verso', side_other: 'Autre',
    no_images_hint: "Aucune image pour le moment. Utilisez la webcam USB de cette machine, ou ouvrez Card-Hub dans le navigateur de votre téléphone pour scanner avec l'appareil photo du téléphone.",
    quick_actions_title: 'Actions Rapides', add_to_deck_ph: 'Ajouter à un deck...', details_title: 'Détails',
    value_history_title: 'Historique de Valeur', similar_cards_title: 'Cartes Similaires', col_source: 'Source', col_submitted: 'Envoyé',

    nav_for_trade: 'À Échanger', for_trade_title: 'À Échanger', for_trade_share: '🔗 Partager la Liste d\'Échange',
    for_trade_hint: 'Les cartes marquées "À Échanger" apparaissent ici — cochez la case correspondante dans le formulaire de détails d\'une carte pour la lister comme disponible.',
    for_trade_none: 'Rien marqué à échanger pour le moment',

    watches_title: "Alertes de Bonnes Affaires eBay", watches_hint: "Enregistrez une recherche + un prix cible, puis vérifiez les annonces eBay actives par rapport à celui-ci. Utilise la clé API eBay des Paramètres — une recherche d'annonces actives, pas de ventes conclues.",
    watches_new: 'Nouvelle Alerte', watches_query: 'Requête de Recherche', watches_target_price: 'Prix Cible ($)',
    watches_add: "Ajouter l'Alerte", watches_check_now: 'Vérifier Maintenant', watches_last_checked: 'Dernière Vérification', watches_matches: 'Correspondances Sous le Prix Cible',
    watches_none: "Aucune alerte pour le moment", watches_confirm_delete: 'Supprimer cette alerte ?', watches_no_matches: "Aucune annonce sous le prix cible pour l'instant.",

    deck_summary_title: 'Résumé du Deck', deck_summary_total_cards: 'Total des Cartes', deck_summary_total_value: 'Valeur Totale',
    deck_summary_by_category: 'Par Catégorie',

    nav_scan: 'Scanner', scan_title: 'Scanner de Cartes', scan_setup_hint: 'Fonctionne avec une simple webcam USB, ou un support dédié comme le ',
    scan_setup_link_text: 'support scanner de cartes MakerWorld', scan_setup_hint2: ' — pointez la caméra vers la fente et laissez les cartes glisser.',
    scan_camera_label: 'Caméra', scan_default_camera: 'Caméra par défaut', scan_no_camera: 'Aucune caméra détectée. Branchez une caméra USB et rechargez.',
    scan_auto_capture: 'Capture automatique', scan_capture_now: 'Capturer Maintenant', scan_sensitivity: 'Sensibilité',
    scan_zone_top: 'Position de la Zone de Capture', scan_zone_height: 'Hauteur de la Zone de Capture', scan_mirror: 'Aperçu en miroir',
    scan_zone_left: 'Position Gauche de la Zone', scan_zone_width: 'Largeur de la Zone de Capture',
    scan_tuning_hint: "Si les cartes ne déclenchent pas de capture, rétrécissez la zone pour ne couvrir que la fente (moins de structure fixe diluant le signal de mouvement) et surveillez la jauge au-dessus de la vidéo — elle devrait franchir la ligne médiane au passage d'une carte. Augmentez la Sensibilité si ce n'est pas le cas.",
    scan_state_empty: 'Prêt — faites glisser une carte', scan_state_detecting: 'Carte détectée, en attente...', scan_state_captured: 'Capturée !',
    scan_state_clearing: 'Dégagement de la zone...',
    scan_side_front: 'Recto', scan_side_back: 'Verso', scan_auto_alternate: 'Alterner recto/verso automatiquement',
    scan_queue_title: 'Cartes Scannées', scan_no_shots: 'Aucune carte scannée pour le moment — les captures apparaîtront ici.',
    scan_retake: 'Reprendre', scan_delete: 'Supprimer', scan_create_card: 'Créer la Carte', scan_creating: 'Création...',
    scan_pair_incomplete: 'Côté manquant', scan_settings_title: 'Paramètres du Scanner',
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
