import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Dashboard from './pages/Dashboard';
import SessionForm from './pages/SessionForm';
import History from './pages/History';
import Library from './pages/Library';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions" element={<History />} />
        <Route path="/sessions/new" element={<SessionForm />} />
        <Route path="/sessions/:id/edit" element={<SessionForm />} />
        <Route path="/songs" element={<Library type="songs" />} />
        <Route path="/techniques" element={<Library type="techniques" />} />
      </Routes>
    </BrowserRouter>
  );
}
