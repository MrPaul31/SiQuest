import React, { useState, useEffect } from 'react'; // importazione delle funzionalità di React
import RowDetails from './RowDetails'; //  componente visualizzazione dettaglio
import { endpoint } from './config/AuthContext'; // per effettuare chiamate HTTP usando Axios(https://www.npmjs.com/package/axios)

//tabella dinamicamente generata e configurabile
const Tabella = ({ data, tableName }) => {
  const [columnConfigs, setColumnConfigs] = useState([]); // stato per la configurazione delle colonne all'interno della tabella ottenuta dal file delle proprietà
  const [selectedRow, setSelectedRow] = useState(null); // stato per la riga selezionata
  const [tableData, setTableData] = useState([]); // stato per i dati della tabella
  const [modifiedRows, setModifiedRows] = useState({});   // stato per le righe modificate
  const [primaryKey, setPrimaryKey] = useState(''); // stato per la chiave primaria

  //effetto utilizzato per determinare la chiave primaria sapendo che il suo nome è uguale al nome della tabella senza il prefisso
  useEffect(() => {
    if (data && data.data && tableName) {
      console.log('dati ricevuti:', data);
      setTableData(data.data);
  
      if (data.data.length > 0) {
        
        const tableNameWithoutPrefix = tableName.substring(4);
        const dataFields = Object.keys(data.data[0]);
  
        const primaryKeyField = dataFields.find((field) => {
          const fieldNameWithoutPrefix = field.substring(7);
          return fieldNameWithoutPrefix === tableNameWithoutPrefix;
        });
  
        if (primaryKeyField) {
          setPrimaryKey(primaryKeyField);
        } else {
          console.error('Campo chiave primaria non trovato');
        }
      }
    }
  }, [data, tableName]);


  //effetto utilizzato per ottenere la configurazione delle colonne della tabella 
  useEffect(() => {
    //cerco il file di properties corrispondente al nome della tabella
    if (tableName) {
      const tableNameWithoutPrefix = tableName.substring(4);
      const filename = tableNameWithoutPrefix.toLowerCase() + '.properties';
      // fetch del file delle proprietà per ottenere la configurazione delle colonne sapendo il formato del file
      fetch(`config/${filename}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Errore nel fetch del file delle proprietà');
        }
        return response.text();
      })
      .then((text) => {
        const lines = text.split('\n');
        const configs = lines
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'))
          .map((line) => {
            const [key, rest] = line.split('=').map((s) => s.trim());
            const [value, columnName] = rest.split(',').map((s) => s.trim());
            return { name: key, value: parseInt(value, 10), columnName };
          });
        setColumnConfigs(configs);
      })
      .catch((error) => {
        console.error('Errore durante il fetch del file delle proprietà:', error);
      });
    }
  }, [tableName]);
  

//tableName è usato come una dependency per l'effetto, quindi l'effetto verrà eseguito ogni volta che il valore di tableName cambia
   if (
  tableData.length === 0 ||
    columnConfigs.length === 0 ||
    !tableName ||
    !primaryKey
  ) {
    return <div>Caricamento in corso...</div>;
  } //se i dati non sono ancora stati caricati, viene visualizzato un messaggio di caricamento

  //array di oggetti contenente le colonne da visualizzare
  const headers = Object.keys(tableData[0]);

  //filtraggio delle colonne da visualizzare 1=hidden, 2=visible,0=non presente
  const columnsToDisplay = columnConfigs
    .map((config) => {
      const headerExists = headers.includes(config.name);
      return headerExists ? { name: config.name, value: config.value ,columnName: config.columnName} : null;
    })
    .filter(Boolean);


    
  const formatHeader = (header) => {
    const substring = header.substring(4);
    return substring.replace(/([A-Z])/g, (match, offset) => {
      return offset > 0 ? ` ${match}` : match;
    });
  };

  const handleSave = (updatedRow, operationType) => {
    const filteredUpdatedRow = {};
    Object.keys(updatedRow).forEach((key) => {
      const columnConfig = columnConfigs.find((config) => config.name === key);
      if (columnConfig && columnConfig.value === 2) {
        filteredUpdatedRow[key] = updatedRow[key];
      }
    });

    filteredUpdatedRow[primaryKey] = updatedRow[primaryKey];

    let updatedData;
    if (operationType === 'update') {
      updatedData = tableData.map((item) =>
        item[primaryKey] === updatedRow[primaryKey] ? updatedRow : item
      );
    } else if (operationType === 'create') {
      updatedData = [...tableData, updatedRow];
    }

    setTableData(updatedData);
    setSelectedRow(null);

    setModifiedRows((prev) => ({
      ...prev,
      [updatedRow[primaryKey]]: {
        ...filteredUpdatedRow,
        operation: operationType,
      },
    }));
  };

  const handleInsert = () => {
    if (!primaryKey || columnConfigs.length === 0) {
      console.error("Impossibile aggiungere righe senza configurazioni valide.");
      return;
    }
  
    // Create a new empty row object
    const newRow = columnConfigs.reduce((acc, config) => {
      if (config.value !== 0) { // Only include visible/editable columns
        acc[config.name] = ""; // Set empty values for editable fields
      }
      return acc;
    }, {});
  
    // Generate a temporary primary key for the new row
    const tempKey = `temp_${Date.now()}`;
    newRow[primaryKey] = tempKey;
  
    // Update table data with the new row
    setTableData((prevData) => [...prevData, newRow]);
  
    // Mark the new row for creation in modifiedRows
    setModifiedRows((prev) => ({
      ...prev,
      [tempKey]: { ...newRow, operation: "create" },
    }));
  
    console.log("Riga aggiunta:", newRow);
  };
  
  
  
  const handleSaveToServer = () => {
    const userConfirmed = window.confirm('Vuoi davvero salvare tutte le modifiche al server?');
    if (userConfirmed) {
      const changes = Object.values(modifiedRows).map((change) => {
        const filteredChange = { operation: change.operation };
        Object.keys(change).forEach((key) => {
          const columnConfig = columnConfigs.find((config) => config.name === key);
          if (columnConfig && columnConfig.value === 2 && key !== 'operation') {
            filteredChange[key] = change[key];
          }
        });
        
        filteredChange[primaryKey] = change[primaryKey];
        return filteredChange;
      });
      console.log("Modifiche:", JSON.stringify(changes, null, 2));
      endpoint
        .post('/crudTabella', { changes, tableName })
        .then((response) => {
          console.log('Modifiche salvate con successo:', response.data);
          setModifiedRows({});
        })
        .catch((error) => {
          console.error('Errore durante il salvataggio delle modifiche:', error);
        });
    }
  };

  const handleDeleteRow = (row) => {
    const userConfirmed = window.confirm('Sei sicuro di voler eliminare questa riga?');
    if (userConfirmed) {
      const updatedData = tableData.filter((item) => item[primaryKey] !== row[primaryKey]);
      setTableData(updatedData);

      setModifiedRows((prev) => ({
        ...prev,
        [row[primaryKey]]: {
          [primaryKey]: row[primaryKey],
          operation: 'delete',
        },
      }));
    }
  };

  const handleDuplicateRow = (row) => {
    const duplicatedRow = { ...row };
    duplicatedRow[primaryKey] = `temp_${Math.random()}`;
    setTableData((prevData) => [...prevData, duplicatedRow]);
    setModifiedRows((prev) => ({
      ...prev,
      [duplicatedRow[primaryKey]]: {
        ...duplicatedRow,
        operation: 'create',
      },
    }));
  };

  const handleExportToCSV = () => {
    const csvContent = convertToCSV(tableData);
    const filename = `${tableName}.csv`;
    downloadCSV(csvContent, filename);
  };

  const convertToCSV = (dataArray) => {
    if (!dataArray || dataArray.length === 0) {
      return '';
    }

    const columns = Object.keys(dataArray[0]);
    const header = columns.join(',');
    const rows = dataArray.map((row) =>
      columns.map((column) => `"${row[column]}"`).join(',')
    );
    return [header, ...rows].join('\n');
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          onClick={handleInsert} 
        >
          Aggiungi
        </button>
        <div className="flex space-x-2">
    <button
      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
      onClick={handleSaveToServer}
    >
      Salva
    </button>
    <button
      onClick={handleExportToCSV}
      className="bg-blue-900 hover:bg-blue-340 text-white px-4 py-2 rounded-md"
    >
      Save to CSV
    </button>
    </div>
      </div>

      <div className="max-h-[420px] max-w-[800px] overflow-y-auto">
      <table className="min-w-full bg-white border border-gray-300">

          <thead>
            <tr>
              {columnsToDisplay.map((column) =>
                column.value === 0 ? null : (
                  <th
                    key={column.name}
                    className={`py-2 px-4 border border-gray-300 text-left ${
                      column.value === 1 ? 'hidden' : ''
                    }`}
                  >
                    {column.columnName}
                  </th>
                )
              )}
              <th className="py-2 px-4 border border-gray-300 text-left">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-100">
                {columnsToDisplay.map((column) =>
                  column.value === 0 ? null : (
                    <td
                      key={column.name}
                      className={`py-2 px-4 border border-gray-300 ${
                        column.value === 1 ? 'hidden' : ''
                      } cursor-pointer`}
                      onClick={() => setSelectedRow(item)}
                    >
                      {item[column.name]}
                    </td>
                  )
                )}
                <td className="py-2 px-4 border border-gray-300">
                  <button
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md mr-2"
                    onClick={() => handleDeleteRow(item)}
                  >
                    Elimina
                  </button>
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md"
                    onClick={() => handleDuplicateRow(item)}
                  >
                    Duplica
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        
          <RowDetails
            rowData={selectedRow}
            columnsToDisplay={columnsToDisplay}
            formatHeader={formatHeader}
            onClose={() => setSelectedRow(null)}
            onSave={(updatedRow) => {
              const operationType = updatedRow[primaryKey].toString().startsWith('temp_')
                ? 'create'
                : 'update';
              handleSave(updatedRow, operationType);
            }}
          />
        
      )}
    </div>
  );
};

export default Tabella;