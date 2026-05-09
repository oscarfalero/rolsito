import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CampaignNew from './pages/CampaignNew';
import CampaignDetail from './pages/CampaignDetail';
import GamePlay from './pages/GamePlay';
import CharacterNew from './pages/CharacterNew';
import CharacterSheet from './pages/CharacterSheet';
import ScenesManager from './pages/ScenesManager';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns/new"
        element={
          <PrivateRoute>
            <CampaignNew />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns/:id"
        element={
          <PrivateRoute>
            <CampaignDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns/:id/play"
        element={
          <PrivateRoute>
            <GamePlay />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns/:id/characters/new"
        element={
          <PrivateRoute>
            <CharacterNew />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns/:id/characters/:characterId"
        element={
          <PrivateRoute>
            <CharacterSheet />
          </PrivateRoute>
        }
      />
      <Route
        path="/campaigns/:id/scenes"
        element={
          <PrivateRoute>
            <ScenesManager />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
