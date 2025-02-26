import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch and parse a properties file based on the table name.
 * @param {string} tableName - The name of the table to fetch properties for.
 * @returns {Object} - An object containing column configurations and loading/error states.
 */
const useFetchProperties = (tableName) => {
  const [configs, setConfigs] = useState([]); // Renamed from columnConfigs to configs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tableName) return;

    const fetchProperties = async () => {
      setLoading(true);
      setError(null);

      try {
        const tableNameWithoutPrefix = tableName.substring(4);
        const filename = `${tableNameWithoutPrefix.toLowerCase()}.properties`; // Fixed template literal

        console.log('Caricamento del file delle proprietà:', filename);

        const response = await fetch(`config/${filename}`); // Fixed template literal
        if (!response.ok) {
          throw new Error(`Impossibile caricare il file delle proprietà: ${filename}`); // Fixed template literal
        }

        const text = await response.text();
        const lines = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));

        console.log('Righe del file delle proprietà:', lines);

        const parsedConfigs = lines
          .map((line) => {
            try {
              // 🛠 Dividi SOLO sul PRIMO '=' per evitare di troncare refTable o displayField
              const equalsIndex = line.indexOf('=');
              if (equalsIndex === -1) return null;

              const key = line.substring(0, equalsIndex).trim(); // 🔹 Nome colonna
              const rest = line.substring(equalsIndex + 1).trim(); // 🔹 Tutto il resto come stringa unica

              const tokens = rest.split(',').map((token) => token.trim()); // 🔹 Dividi ora su ','
              const [valueStr, columnName, ...additionalTokens] = tokens;

              let isFK = false;
              let idColumn = '';
              let refTable = '';
              let displayField = '';
              const value = parseInt(valueStr, 10);

              additionalTokens.forEach((token) => {
                const [propKey, propVal] = token.split('=').map((s) => s.trim());
                if (propKey.toLowerCase() === 'fk') isFK = true;
                if (propKey.toLowerCase() === 'idcolumn') idColumn = propVal;
                if (propKey.toLowerCase() === 'reftable') refTable = propVal;
                if (propKey.toLowerCase() === 'displayfield') displayField = propVal;
              });

              return {
                name: key,
                value,
                columnName,
                isFK,
                idColumn,
                refTable,
                displayField,
              };
            } catch (error) {
              console.error(`Errore nel parsing della linea: "${line}".`, error);
              return null;
            }
          })
          .filter(Boolean);

        setConfigs(parsedConfigs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [tableName]);

  return { configs, loading, error };
};

export default useFetchProperties;