import React, { useMemo } from 'react';
import DataFetcher from './config/DataFetcher'; // Importa il componente DataFetcher

// Definisce il componente DomandeQuestionari
const DomandeQuestionari = () => {
  // Crea un body memoizzato per evitare ricreazioni ad ogni render
  const body = useMemo(() => ({}), []);

  return (
    <DataFetcher
      tableName="ANS_DomandeQuestionari"
      title="Lista Domande Proposte"
      body={body} // Passa il body memoizzato
    />
  );
};

export default DomandeQuestionari; // Esporta il componente DomandeQuestionari