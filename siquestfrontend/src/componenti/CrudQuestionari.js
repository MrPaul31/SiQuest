import React from 'react';
import DataFetcher from './config/DataFetcher'; // Importa il componente DataFetcher

// Definisce il componente CrudQuestionari
const CrudQuestionari = () => {
  return <DataFetcher tableName="ANS_Questionari" title="Lista Questionari" />; // Utilizza DataFetcher per ottenere e visualizzare i dati della tabella ANS_Questionari
};

export default CrudQuestionari; // Esporta il componente CrudQuestionari