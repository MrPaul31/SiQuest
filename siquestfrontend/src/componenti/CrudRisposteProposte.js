import React from 'react';
import DataFetcher from './config/DataFetcher'; // Importa il componente DataFetcher

// Definisce il componente CrudRisposteProposte
const CrudRisposteProposte = () => {
  return <DataFetcher tableName="CNF_RisposteProposte" title="Lista Risposte Proposte" />; // Utilizza DataFetcher per ottenere e visualizzare i dati della tabella CNF_RisposteProposte
};

export default CrudRisposteProposte; // Esporta il componente CrudRisposteProposte