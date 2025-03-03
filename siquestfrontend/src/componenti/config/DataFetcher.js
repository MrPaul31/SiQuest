import React, { useEffect, useState, useMemo } from 'react';
import Tabella from '../Tabella';
import { endpoint } from './AuthContext';

const DataFetcher = ({ tableName, title, body = { filtro: {} },descrizione }) => {
  const [data, setData] = useState({ data: [], tableName });
  const [error, setError] = useState(null);

  // Memorizza il filtro in modo da evitare cambiamenti inutili
  const stableBody = useMemo(() => body, [JSON.stringify(body.filtro)]);

  useEffect(() => {
    const fetchData = async () => {
      try {
  
        const response = await endpoint.post('/api/dataHandling/risposteQuestionari', {
          tableName,
          ...stableBody,
        });
        setData(response.data);
      } catch (error) {
        if (error.response && error.response.status === 403) {
          setError("Funzione di accesso non abilitata per questo utente");
        } else {
          console.error("❌ Errore nella richiesta:", error);
          setError(`Errore nel recuperare i dati per ${tableName}`);
        }
      }
    };
  
    if (tableName) {
      fetchData();
    } else {
      console.error("⚠️ Errore: `tableName` è undefined!");
    }
  }, [tableName, stableBody]);
  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-xl font-semibold text-blue-700 mb-4">{title}</h2>
      <Tabella data={data} tableName={tableName} descrizione={descrizione} />
    </div>
  );
};

export default DataFetcher;
