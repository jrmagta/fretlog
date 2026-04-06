import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Dashboard from './pages/Dashboard';
import SessionForm from './pages/SessionForm';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sessions/new" element={<SessionForm />} />
        <Route path="/sessions/:id/edit" element={<SessionForm />} />
      </Routes>
    </BrowserRouter>
  );
}
