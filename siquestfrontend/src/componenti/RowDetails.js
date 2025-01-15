// RowDetails.js
import React, { useState, useEffect } from 'react';


const RowDetails = ({
  rowData,
  columnsToDisplay = [], // Default to an empty array
  formatHeader,
  onClose,
  onSave,
}) => {
  const [editableData, setEditableData] = useState({});

  useEffect(() => {
    if (rowData) {
      setEditableData({ ...rowData });
    }
  }, [rowData]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {columnsToDisplay.map((column) =>
          column.value === 0 ? null : (
            <div key={column.name}>
              <label htmlFor={column.name} className="block text-sm font-medium text-gray-700">
                {formatHeader(column.name)}:
              </label>
              <input
                id={column.name}
                name={column.name}
                type="text"
                value={editableData[column.name] || ''}
                onChange={(e) => handleChange(e, column.name)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )
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