import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import QuestionarioPage from './componenti/QuestionarioPage';
import PaginaConferma from './componenti/PaginaConferma';

const RootRedirect = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const questionarioId = searchParams.get('id');

  return questionarioId ? (
    <Navigate to={`/questionari/${questionarioId}`} replace />
  ) : (
    <div className="error-page">
      <h1>Errore: ID questionario mancante</h1>
      <p>Aggiungi un parametro `id` nell'URL, ad esempio `?id=1`.</p>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/questionari/:questionarioId" element={<QuestionarioPage />} />
      <Route path="/conferma" element={<PaginaConferma />} />
    </Routes>
  );
}

export default App;
