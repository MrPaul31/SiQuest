import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthContext } from './componenti/config/AuthContext';
import ProtectedLayout from './componenti/config/ProtectedLayout';
import Login from './componenti/Login';
import Register from './componenti/Register'; // Import the Register component
import QuestionarioPage from './componenti/QuestionarioPage';
import PaginaConferma from './componenti/PaginaConferma';
import CrudQuestionari from './componenti/CrudQuestionari';
import CrudRisposteProposte from './componenti/CrudRisposteProposte';
import RisposteQuestionari from './componenti/RisposteQuestionari';
import DomandeQuestionari from './componenti/domandeQuestionari';
import Utenti from './componenti/Utenti';
import Config from './componenti/config/Config';
import NotFound from './componenti/NotFound';
import RicercaRisposteQuestionari from './componenti/RicercaRisposteQuestionari';

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Routes>
      {/* Redirect base URL to /login */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* Add the Register route */}
      <Route path="/questionari/:questionarioId" element={<QuestionarioPage />} />
      <Route path="/conferma" element={<PaginaConferma />} />

      {/* Protected routes: Wrap them inside a single "ProtectedLayout" */}
      <Route element={<ProtectedLayout />}>
        {/* All these routes require auth */}
        <Route path="/RicercaRisposteQuestionari" element={<RicercaRisposteQuestionari />} />
        <Route path="/Utenti" element={<Utenti />} />
        <Route path="/CrudQuestionari" element={<CrudQuestionari />} />
        <Route path="/CrudRisposteProposte" element={<CrudRisposteProposte />} />
        <Route path="/RisposteQuestionari" element={<RisposteQuestionari />} />
        <Route path="/DomandeQuestionari" element={<DomandeQuestionari />} />
        <Route path="/Config" element={<Config />} />
      </Route>

      {/* Fallback for unknown routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;