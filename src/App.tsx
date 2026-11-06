import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DraftProvider } from './lib/draft';
import HomePage from './pages/HomePage';
import ReportPage from './pages/ReportPage';
const LocationPage = lazy(() => import('./pages/LocationPage'));
import DonePage from './pages/DonePage';
import TrackPage from './pages/TrackPage';
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const StaffLogin = lazy(() => import('./pages/staff/StaffLogin'));
const StaffShell = lazy(() => import('./pages/staff/StaffShell'));
const Inbox = lazy(() => import('./pages/staff/Inbox'));
const Today = lazy(() => import('./pages/staff/Today'));
const Board = lazy(() => import('./pages/staff/Board'));
const ReportDetail = lazy(() => import('./pages/staff/ReportDetail'));
const Accounts = lazy(() => import('./pages/staff/Accounts'));

// Hash routing: GitHub Pages can't serve deep links, and the private
// tracking token in /#/track/<ref>/<token> never reaches any server log.
export default function App() {
  return (
    <HashRouter>
      <DraftProvider>
        <Suspense fallback={<div style={{ padding: 24, color: 'var(--muted)' }}>…</div>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/report/location" element={<LocationPage />} />
          <Route path="/done" element={<DonePage />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/track/:ref/:token" element={<TrackPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/staff" element={<StaffLogin />} />
          <Route path="/staff" element={<StaffShell />}>
            <Route path="today" element={<Today />} />
            <Route path="board" element={<Board />} />
            <Route path="all" element={<Inbox />} />
            <Route path="inbox" element={<Navigate to="/staff/today" replace />} />
            <Route path="report/:id" element={<ReportDetail />} />
            <Route path="accounts" element={<Accounts />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </DraftProvider>
    </HashRouter>
  );
}
