// RowDetails.js
import React, { useState, useEffect } from 'react';
import useFetchProperties from './config/useFetchProperties'; // Adjust the path as necessary

const RowDetails = ({
  rowData,
  columnsToDisplay = [],
  formatHeader,
  onClose,
  onSave,
  tableName, // Add tableName as a prop
}) => {
  const [editableData, setEditableData] = useState({});
  const { configs, error } = useFetchProperties(tableName);
  const [fkOptions, setFkOptions] = useState({});

  useEffect(() => {
    if (rowData) {
      setEditableData({ ...rowData });
    }
  }, [rowData]);

  useEffect(() => {
    const fetchFKOptions = async () => {
      const fkConfigs = configs.filter((cfg) => cfg.isFK);
      const newFkOptions = {};

      await Promise.all(
        fkConfigs.map(async (cfg) => {
          try {
            const response = await fetch(`/api/${cfg.refTable}`); // Adjust endpoint as needed
            if (response.ok) {
              const data = await response.json();
              newFkOptions[cfg.name] = data;
            } else {
              console.error(`Failed to fetch data for ${cfg.refTable}`);
            }
          } catch (err) {
            console.error(`Error fetching ${cfg.refTable}:`, err);
          }
        })
      );

      setFkOptions(newFkOptions);
    };

    if (configs.length > 0) {
      fetchFKOptions();
    }
  }, [configs]);

  if (!rowData) return null;

  const handleChange = (e, fieldName) => {
    setEditableData({
      ...editableData,
      [fieldName]: e.target.value,
    });
  };

  const handleSubmit = () => {
    onSave(editableData);
  };

  return (
    <div className="mt-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-bold mb-4">Dettagli Riga</h2>

      {/* Display any error from loading properties */}
      {error && (
        <div className="text-red-500 mb-2">
          Errore nel caricamento del file .properties: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs && configs.length > 0 ? (
          configs.map((config) => {
            if (config.value < 1) return null; // Adjust based on your criteria

            return (
              <div key={config.name} className="flex flex-col">
                <label htmlFor={config.name} className="block text-sm font-medium text-gray-700">
                  {config.columnName}:
                </label>
                {config.isFK && fkOptions[config.name] ? (
                  <select
                    id={config.name}
                    name={config.name}
                    value={editableData[config.name] || ''}
                    onChange={(e) => handleChange(e, config.name)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select {config.columnName}</option>
                    {fkOptions[config.name].map((option) => (
                      <option key={option.id} value={option.id}>
                        {option[config.displayField] || option.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={config.name}
                    name={config.name}
                    type="text"
                    value={editableData[config.name] || ''}
                    onChange={(e) => handleChange(e, config.name)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            );
          })
        ) : (
          <div>Loading...</div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded-md mr-2"
          onClick={onClose}
        >
          Annulla
        </button>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
          onClick={handleSubmit}
        >
          Salva
        </button>
      </div>
    </div>
  );
};

export default RowDetails;