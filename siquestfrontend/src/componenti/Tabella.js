import React, { useState, useEffect } from 'react';
import RowDetails from './RowDetails';
import { endpoint } from './config/AuthContext';

const Tabella = ({ data, tableName, descrizione }) => {
  const [columnConfigs, setColumnConfigs] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [modifiedRows, setModifiedRows] = useState({});
  const [primaryKey, setPrimaryKey] = useState('');
  const [tableHeight, setTableHeight] = useState(0);
  const [referenceData, setReferenceData] = useState({}); 
  const [csvDownloading, setCsvDownloading] = useState(false);
  const [domandeMapping, setDomandeMapping] = useState([]);

  const rowHeight = 50; 
  const maxVisibleRows = 10; 

  // ---------------------------
  // PRIMARY KEY EXTRACTION
  // ---------------------------
  useEffect(() => {
    if (data && data.data && tableName) {
      setTableData(data.data);

      if (data.data.length > 0) {
        const tableNameWithoutPrefix = tableName.substring(4);
        const dataFields = Object.keys(data.data[0]);
        const primaryKeyField = dataFields.find((field) => {
          let fieldNameWithoutPrefix;
          if (tableName === "ANS_RisposteQuestionari") {
            fieldNameWithoutPrefix = field.substring(7);
          } else {
            fieldNameWithoutPrefix = field.substring(10);
          }
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

  // ---------------------------
  // CONFIGURATION FETCHING
  // ---------------------------
  useEffect(() => {
    if (!tableName) return;
  
    const tableNameWithoutPrefix = tableName.substring(4);
    const filename = tableNameWithoutPrefix.toLowerCase() + '.properties';
  
    fetch(`config/${filename}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Impossibile caricare il file delle proprietà: ${filename}`);
        }
        return response.text();
      })
      .then((text) => {
        const lines = text.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  
  
        const configs = lines.map((line) => {
          try {
            const equalsIndex = line.indexOf('=');
            if (equalsIndex === -1) return null;
  
            const key = line.substring(0, equalsIndex).trim();
            const rest = line.substring(equalsIndex + 1).trim();
  
            const tokens = rest.split(',').map((token) => token.trim());
            const [valueStr, columnName, ...additionalTokens] = tokens;
  
            const value = parseInt(valueStr, 10);
            let isFK = false;
            let idColumn = '';
            let refTable = '';
            let displayField = '';
  
            additionalTokens.forEach((token) => {
              const [propKey, propValue] = token.split('=').map((s) => s.trim());
  
              if (propKey === 'fk') {
                isFK = true;
              } else if (propKey === 'idColumn') {
                idColumn = propValue;
              } else if (propKey === 'refTable') {
                refTable = propValue;
              } else if (propKey === 'displayField') {
                displayField = propValue;
              }
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
            console.error(`Errore nel parsing della riga "${line}":`, error);
            return null;
          }
        }).filter(Boolean);
  
        setColumnConfigs(configs);
      })
      .catch((error) => {
        console.error('Errore durante il fetch del file delle proprietà:', error);
      });
  }, [tableName]);
  
  // ---------------------------
  // FETCH REFERENCE DATA FOR FOREIGN KEYS
  // ---------------------------
  useEffect(() => {
    const fkConfigs = columnConfigs.filter((cfg) => cfg.isFK);
    if (fkConfigs.length === 0) return;
  
    fkConfigs.forEach(async (fkConfig) => {
      if (!fkConfig.refTable || !fkConfig.displayField || !fkConfig.idColumn) {
        console.warn(
          `Skipping FK fetch for ${fkConfig.name} due to missing refTable, displayField, or idColumn.`
        );
        return;
      }
  
      try {
        const response = await endpoint.get('/referenceDataSimple', {
          params: {
            table: fkConfig.refTable,
            idColumn: fkConfig.idColumn,
            displayField: fkConfig.displayField,
          },
        });
  
  
        setReferenceData((prev) => ({
          ...prev,
          [fkConfig.name]: response.data,
        }));
      } catch (error) {
        console.error(`Errore durante il fetch di reference data per ${fkConfig.name}:`, error);
      }
    });
  }, [columnConfigs]);
  
  // Fetch del mapping dal backend usando la descrizione
  useEffect(() => {
    if (descrizione) {
      endpoint
        .get(`/api/questionari/${encodeURIComponent(descrizione)}/domandeMapping`)
        .then((response) => {
          setDomandeMapping(response.data.domandeMapping);
        })
        .catch((error) => {
          console.error("Errore nel fetch del mapping delle domande:", error);
        });
    }
  }, [descrizione]);

  // ---------------------------
  // ADJUST TABLE HEIGHT
  // ---------------------------
  useEffect(() => {
    const visibleRows = Math.min(tableData.length, maxVisibleRows);
    setTableHeight(visibleRows * rowHeight + 10);
  }, [tableData]);

  // ---------------------------
  // EARLY RETURN IF NOT READY
  // ---------------------------
  if (
    tableData.length === 0 ||
    columnConfigs.length === 0 ||
    !tableName ||
    !primaryKey
  ) {
    if (tableName === "ANS_RisposteQuestionari" && tableData.length === 0) {
      return <div>Nessuna risposta trovata</div>;
    }
    return <div>Caricamento in corso...</div>;
  }

  // ---------------------------
  // BUILD COLUMNS TO DISPLAY
  // ---------------------------
  const headers = Object.keys(tableData[0]);
  const columnsToDisplay = columnConfigs
    .map((config) => {
      const headerExists = headers.includes(config.name);
      return headerExists
        ? {
            name: config.name,
            value: config.value,
            columnName: config.columnName,
            isFK: config.isFK,
            refTable: config.refTable,
            displayField: config.displayField,
          }
        : null;
    })
    .filter(Boolean);

  console.log('Colonne da visualizzare:', columnsToDisplay);

  // ---------------------------
  // FORMAT HEADER (OPTIONAL)
  // ---------------------------
  const formatHeader = (header) => {
    const substring = header.substring(4);
    return substring.replace(/([A-Z])/g, (match, offset) => {
      return offset > 0 ? ` ${match}` : match;
    });
  };

  // ---------------------------
  // COMPUTE RECORD COUNT & DISTINCT USERS
  // ---------------------------
  const recordCount = tableData.length;
  const distinctUsers = new Set(
    tableData.map((row) => row.RQU_TerminaleInserimento)
  ).size;

  // ---------------------------
  // HANDLE SAVE (UPDATE/CREATE)
  // ---------------------------
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
  

  // ---------------------------
  // HANDLE INSERT
  // ---------------------------
  const handleInsert = () => {
    if (!primaryKey || columnConfigs.length === 0) {
      console.error('Impossibile aggiungere righe senza configurazioni valide.');
      return;
    }

    const newRow = columnConfigs.reduce((acc, config) => {
      if (config.value !== 0) acc[config.name] = '';
      return acc;
    }, {});

    newRow[primaryKey] = `temp_${Date.now()}`;

    setTableData((prevData) => [...prevData, newRow]);
    setModifiedRows((prev) => ({
      ...prev,
      [newRow[primaryKey]]: { ...newRow, operation: 'create' },
    }));
  };

  // ---------------------------
  // HANDLE SAVE TO SERVER
  // ---------------------------
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

        if (
          change.operation === 'create' &&
          String(change[primaryKey]).startsWith('temp_')
        ) {
          // do not include any temp primary key in the final payload
        } else {
          filteredChange[primaryKey] = change[primaryKey];
        }

        return filteredChange;
      });

      console.log('Modifiche:', JSON.stringify(changes, null, 2));
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

  // ---------------------------
  // HANDLE DELETE ROW
  // ---------------------------
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
  // ---------------------------
  // EXPORT TO CSV CON MAPPING DELLE DOMANDE
  // ---------------------------
  const handleExportToCSV = async () => {
    try {
      // Effettua chiamata al backend utilizzando la descrizione del questionario
      const mappingResponse = await endpoint.get(
        `/api/questionari/${encodeURIComponent(descrizione)}/domandeMapping`
      );
      const domandeMapping = mappingResponse.data.domandeMapping; // [{ indice, domanda }, ...]
      
      // Usa tableData (array) invece di data (oggetto)
      const csvContent = convertToCSV(tableData, ";", domandeMapping);
      const filename = `${tableName}.csv`;
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error("Errore durante l'esportazione del CSV:", error);
    }
  };

  const convertToCSV = (dataArray, delimiter, domandeMapping) => {
    if (!dataArray || dataArray.length === 0) return '';
  
    const visibleColumns = columnsToDisplay.filter(
      (col) => col.value !== 0 && col.value !== 1
    );
  
    // Header: se trova "Testo domanda" aggiunge "Numero domanda"
    const headerArr = visibleColumns.reduce((arr, col) => {
      if (col.columnName === "Domanda") {
        arr.push("Numero domanda");
        arr.push(col.columnName);
      } else {
        arr.push(
          col.columnName === "Data e ora di inserimento"
            ? "Data inserimento"
            : col.columnName
        );
      }
      return arr;
    }, []);
    const header = headerArr.join(delimiter);
    console.log("Header CSV:", header);
  
    const rows = dataArray.map((row) => {
      const rowCells = [];
      visibleColumns.forEach((col) => {
        if (col.columnName === "Domanda") {
          // Se la colonna è una FK, usa i dati referenziati per ottenere il testo da visualizzare
          let cellRawValue = row[col.name] ?? '';
          if (col.isFK && referenceData && referenceData[col.name]) {
            const fkId = row[col.name];
            const refArray = referenceData[col.name];
            const matchedRef = refArray.find((ref) => ref.id === fkId);
            cellRawValue = matchedRef ? (matchedRef[col.displayField] || matchedRef.id) : cellRawValue;
          }
          console.log("Valore raw della domanda:", cellRawValue);
        
          // Confronta il testo della domanda in maniera case-insensitive e trim-izzata
          const mapping = domandeMapping.find((m) =>
            String(m.domanda).trim().toUpperCase() === String(cellRawValue).trim().toUpperCase()
          );
          console.log("Mapping trovato per:", cellRawValue, "->", mapping);
        
          // Se il mapping viene trovato, usa l'indice ottenuto dal backend; altrimenti lascia il testo originale
          const numeroDomanda = mapping ? mapping.indice : "";
          const testoDomanda = mapping ? mapping.domanda : cellRawValue;
          console.log("Numero domanda:", numeroDomanda, "Testo domanda:", testoDomanda);
        
          rowCells.push(numeroDomanda);
          rowCells.push(
            (testoDomanda ?? '')
              .toString()
              .replace(new RegExp(delimiter, "g"), ",")
              .replace(/\r?\n/g, ". ")
          );
        } else {
          let cellValue = row[col.name] ?? '';
          if (col.isFK && referenceData && referenceData[col.name]) {
            const fkId = row[col.name];
            const refArray = referenceData[col.name];
            const matchedRef = refArray.find((ref) => ref.id === fkId);
            cellValue = matchedRef
              ? (matchedRef[col.displayField] || matchedRef.id)
              : fkId;
          }
          rowCells.push(
            (cellValue ?? '')
              .toString()
              .replace(new RegExp(delimiter, "g"), ",")
              .replace(/\r?\n/g, ". ")
          );
        }
      });
      const rowString = rowCells.join(delimiter);
      console.log("Riga CSV:", rowString);
      return rowString;
    });
  
    const csvString = [header, ...rows].join("\n");
    console.log("CSV completo:\n", csvString);
    return csvString;
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


  const handleDownloadCSV = () => {
    setCsvDownloading(true);
    setTimeout(() => {
      handleExportToCSV();
      setCsvDownloading(false);
    }, 1500);
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <button
          onClick={!csvDownloading ? handleDownloadCSV : null}
          disabled={csvDownloading}
          className={`relative px-4 py-2 rounded-md text-white transition-all duration-300 ${
            csvDownloading
              ? "bg-gradient-to-r from-blue-600 to-blue-500 cursor-not-allowed"
              : "bg-blue-900 hover:bg-blue-700"
          }`}
        >
          {csvDownloading ? (
            <div className="flex items-center justify-center">
              <span className="inline-block animate-spin rounded-full border-4 border-blue-200 border-t-blue-500 h-6 w-6 mr-3"></span>
              <span className="animate-pulse">Preparando CSV...</span>
            </div>
          ) : (
            "Scarica risposte in CSV"
          )}
        </button>
        <div className="text-right text-sm text-gray-700">
          <div>Risposte: {recordCount}</div>
          <div>Utenti: {distinctUsers}</div>
        </div>
      </div>
      <div
        className="overflow-y-auto border border-gray-300 rounded-md"
        style={{ height: `${tableHeight}px` }}
      >
        <table className="min-w-full bg-white border border-gray-300 rounded-lg shadow-lg">
          <thead>
            <tr className="bg-gradient-to-r from-blue-700 to-blue-500 text-white uppercase tracking-wide text-sm">
              {columnsToDisplay.map((column) =>
                column.value === 0 ? null : (
                  <th
                    key={column.name}
                    className={`py-3 px-6 border border-gray-300 text-left font-semibold ${
                      column.value === 1 ? "hidden" : ""
                    }`}
                  >
                    {column.columnName}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map((item, idx) => (
              <tr
                key={idx}
                className="hover:shadow-md transition-shadow duration-300 even:bg-gray-100 odd:bg-white"
              >
                {columnsToDisplay.map((column) => {
                  if (column.value === 0) return null;

                  if (column.isFK && referenceData[column.name]) {
                    const fkId = item[column.name];
                    const refArray = referenceData[column.name];
                    const matchedRef = refArray.find((ref) => ref.id === fkId);
                    const label = matchedRef
                      ? matchedRef[column.displayField] || matchedRef.id
                      : fkId;
  
                    return (
                      <td
                        key={column.name}
                        className={`py-3 px-6 border border-gray-300 text-gray-800 transition transform duration-300 hover:scale-105 hover:bg-blue-50 ${
                          column.value === 1 ? "hidden" : ""
                        }`}
                        onClick={() => setSelectedRow(item)}
                      >
                        {label}
                      </td>
                    );
                  } else {
                    return (
                      <td
                        key={column.name}
                        className={`py-3 px-6 border border-gray-300 text-gray-800 transition transform duration-300 hover:scale-105 hover:bg-blue-50 ${
                          column.value === 1 ? "hidden" : ""
                        }`}
                        onClick={() => setSelectedRow(item)}
                      >
                        {item[column.name]}
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tabella;