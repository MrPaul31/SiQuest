import React, { useEffect, useState } from 'react';
import Tabella from '../Tabella';
import { endpoint } from './AuthContext';

const DataFetcher = ({ tableName, title }) => {
  const [data, setData] = useState({ data: [], tableName });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await endpoint.post('/listaRecords', {
          tableName: tableName,
          filtro: null,
        });

        setData(response.data);
      } catch (error) {
        setError(`Errore nel recuperare i dati per ${tableName}`);
      }
    };

    fetchData();
  }, [tableName]);
  console.log(data.data);
  if (error) {
    return <div className="text-red-600 p-4">{error}</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-xl font-semibold text-blue-700 mb-4">{title}</h2>
      
      <Tabella data={data} tableName={tableName} />
    </div>
  );
};

export default DataFetcher;
