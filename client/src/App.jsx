import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import SharePage from './pages/SharePage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Collection from './pages/Collection.jsx';
import CardDetail from './pages/CardDetail.jsx';
import AddCard from './pages/AddCard.jsx';
import Sales from './pages/Sales.jsx';
import Listings from './pages/Listings.jsx';
import Sets from './pages/Sets.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Grading from './pages/Grading.jsx';
import Decks from './pages/Decks.jsx';
import DeckDetail from './pages/DeckDetail.jsx';
import Trades from './pages/Trades.jsx';
import WantList from './pages/WantList.jsx';

export default function App() {
  const { user } = useAuth();
  const location = useLocation();

  // Public share links must render without a login - checked before the auth gate.
  if (location.pathname.startsWith('/share/')) {
    return (
      <Routes>
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    );
  }

  if (user === undefined) return <div className="loading-shell">Loading...</div>;
  if (user === null) return <Login />;

  return (
    <div className="app-shell">
      <Nav />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/collection/new" element={<AddCard />} />
          <Route path="/collection/:id" element={<CardDetail />} />
          <Route path="/want-list" element={<WantList />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/grading" element={<Grading />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/decks/:id" element={<DeckDetail />} />
          <Route path="/sets" element={<Sets />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
