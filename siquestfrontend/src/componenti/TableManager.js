import React, { useState, useEffect, useMemo } from 'react';
import { useTable } from 'react-table';
import { endpoint } from './config/AuthContext';
import { FaSearch, FaUserPlus, FaEdit, FaTrash, FaTable, FaExclamationTriangle, FaCodeBranch, FaArrowRight } from 'react-icons/fa';

// Utility function per trovare le differenze tra oggetti
const findDifferences = (original, modified) => {
  const differences = {};
  
  Object.keys(modified).forEach(key => {
    // Consideriamo solo campi con valori diversi
    if (original[key] !== modified[key]) {
      differences[key] = {
        original: original[key],
        modified: modified[key]
      };
    }
  });
  
  return differences;
};

const TableManager = ({ 
  tableName,
  columnProps, 
  primaryKey,
  apiEndpoint,
  title,
  icon: TableIcon,
  newRecordTemplate,
  filterConfig,
  inputTypes = {}
}) => {
  // Stati per i dati, loading, messaggi di errore e successo
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Stato per la riga selezionata
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Stato per memorizzare l'originale della riga selezionata
  const [originalSelectedRow, setOriginalSelectedRow] = useState(null);
  
  // Stato per la gestione dei conflitti
  const [conflictData, setConflictData] = useState(null);
  
  // Stati per la gestione dei filtri (generati dinamicamente)
  const [filters, setFilters] = useState({});
  
  // Stato per il form di creazione di un nuovo record
  const [newRecord, setNewRecord] = useState(newRecordTemplate);
  
  // Colonne da mostrare in React Table - solo quelle con flag 2
  const displayColumns = useMemo(() => {
    return columnProps
      .filter(col => col.flag === 2)
      .map(col => ({
        Header: col.label,
        accessor: col.field,
      }));
  }, [columnProps]);
  
  // Array dei campi da inviare al backend (flag 1 e 2)
  const backendFields = useMemo(() => {
    return columnProps
      .filter(col => col.flag === 2 || col.flag === 1)
      .map(col => col.field);
  }, [columnProps]);
  
  // useMemo per memorizzare le colonne
  const columns = useMemo(() => displayColumns, [displayColumns]);
  
  // Funzione generica per recuperare i dati dal backend
  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      // Payload per la read
      const payload = {
        tableName,
        operation: "read",
        filters: filters
      };
      
      const response = await endpoint.post(apiEndpoint, payload);
      
      // Verifica se la risposta contiene dati
      if (response.data && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        console.warn('La risposta API non contiene un array di dati:', response.data);
        setData([]);
      }
    } catch(err) {
      console.error('Errore durante il recupero dei dati:', err);
      setError(err.message || 'Si è verificato un errore durante il caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // useEffect per il caricamento iniziale dei dati
  useEffect(() => {
    fetchRecords();
  }, []);
  
  // Selezione di una riga
  const handleRowSelect = (row) => {
    // Salva una copia profonda del record originale
    const deepCopy = JSON.parse(JSON.stringify(row));
    setOriginalSelectedRow(deepCopy);
    setSelectedRow(deepCopy);
    // Reset dei conflitti
    setConflictData(null);
  };

  // Funzione per creare un nuovo record
  const handleCreate = async () => {
    setError('');
    setSuccess('');
    
    // Validazione base (richiede almeno un campo obbligatorio)
    const requiredFields = columnProps.filter(col => col.flag === 2 && col.required).map(col => col.field);
    const missingRequired = requiredFields.filter(field => !newRecord[field]);
    
    if (missingRequired.length > 0) {
      setError(`Campi obbligatori mancanti: ${missingRequired.join(', ')}`);
      return;
    }
    
    try {
      // Prepara i dati da inviare
      const createData = {};
      
      backendFields.forEach(field => {
        if (newRecord[field] !== undefined && newRecord[field] !== '') {
          createData[field] = newRecord[field];
        }
      });
      
      console.log('Sending create data:', createData);
      
      const payload = {
        tableName,
        changes: [
          {
            operation: "create",
            ...createData
          }
        ]
      };
      
      await endpoint.post(apiEndpoint, payload);
      setSuccess("Record creato con successo");
      fetchRecords();
      
      // Reset del form
      setNewRecord({...newRecordTemplate});
    } catch (err) {
      console.error('Errore durante la creazione:', err);
      setError(err.message || "Errore durante la creazione del record");
    }
  };

  // Funzione per aggiornare un record
  const handleUpdate = async () => {
    if(!selectedRow) {
      setError("Nessuna riga selezionata per l'aggiornamento");
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      // Trova i campi che sono stati effettivamente modificati
      const differences = findDifferences(originalSelectedRow, selectedRow);
      
      // Se non ci sono differenze, mostra un messaggio e termina
      if (Object.keys(differences).length === 0) {
        setSuccess("Nessuna modifica da salvare");
        return;
      }
      
      // Prepara i dati da inviare (solo i campi modificati)
      const updateData = {
        // Includi sempre l'ID per identificare il record
        [primaryKey]: selectedRow[primaryKey]
      };
      
      // Aggiungi solo i campi che sono stati modificati
      Object.keys(differences).forEach(key => {
        updateData[key] = differences[key].modified;
      });
      
      // Aggiungi il timestamp originale per il controllo concorrenza
      if (originalSelectedRow && originalSelectedRow.DataOraModifica) {
        updateData.originalTimestamp = originalSelectedRow.DataOraModifica;
      }
      
      console.log('Sending update data (only changed fields):', updateData);
      
      const payload = {
        tableName,
        changes: [
          {
            operation: "update",
            ...updateData
          }
        ]
      };
      
      const response = await endpoint.post(apiEndpoint, payload);
      
      // Verifica conflitti
      if (response.data && response.data.conflict) {
        const { currentRecord } = response.data.conflict;
        
        // Trova le differenze tra originale e modifiche attuali
        const differences = findDifferences(originalSelectedRow, selectedRow);
        
        // Imposta il conflitto per visualizzazione
        setConflictData({
          currentRecord,
          yourChanges: differences,
          merged: { ...currentRecord, ...differences }
        });
        
        setError("Il record è stato modificato da un altro utente. Controlla le differenze e scegli come procedere.");
        return;
      }
      
      setSuccess("Record aggiornato con successo");
      fetchRecords();
      setSelectedRow(null);
      setOriginalSelectedRow(null);
    } catch (err) {
      console.error('Errore durante l\'aggiornamento:', err);
      
      // Gestione conflitti tramite risposta di errore
      if (err.response && err.response.data && err.response.data.conflict) {
        const { currentRecord } = err.response.data.conflict;
        
        // Trova le modifiche dell'utente
        const differences = findDifferences(originalSelectedRow, selectedRow);
        
        // Imposta il conflitto
        setConflictData({
          currentRecord,
          yourChanges: differences,
          merged: { ...currentRecord, ...differences }
        });
        
        setError("Il record è stato modificato da un altro utente. Controlla le differenze e scegli come procedere.");
      } else {
        setError(err.message || "Errore durante l'aggiornamento del record");
      }
    }
  };

  // Accetta il record corrente in caso di conflitto
  const handleAcceptCurrent = () => {
    if (!conflictData) return;
    setSelectedRow(conflictData.currentRecord);
    setOriginalSelectedRow(conflictData.currentRecord);
    setConflictData(null);
    setError('');
  };

  // Merge delle modifiche in caso di conflitto
  const handleMerge = async () => {
    if (!conflictData) return;
    
    try {
      // Prepara l'oggetto con i dati del merge
      const mergeData = { ...conflictData.currentRecord };
      
      // Applica le modifiche dell'utente
      Object.keys(conflictData.yourChanges).forEach(key => {
        mergeData[key] = conflictData.yourChanges[key].modified;
      });
      
      const payload = {
        tableName,
        changes: [
          {
            operation: "update",
            ...mergeData,
            // Timestamp dell'attuale record per controllo concorrenza
            originalTimestamp: conflictData.currentRecord.DataOraModifica
          }
        ]
      };
      
      await endpoint.post(apiEndpoint, payload);
      setSuccess("Modifiche unite con successo");
      fetchRecords();
      setSelectedRow(null);
      setOriginalSelectedRow(null);
      setConflictData(null);
    } catch (err) {
      console.error('Errore durante il merge:', err);
      setError(`Errore durante il merge: ${err.message || 'Operazione non completata'}`);
    }
  };

  // Elimina record selezionato
  const handleDelete = async () => {
    if(!selectedRow) {
      setError("Nessuna riga selezionata per la cancellazione");
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      const payload = {
        tableName,
        changes: [
          {
            operation: "delete",
            [primaryKey]: selectedRow[primaryKey]
          }
        ]
      };
      
      await endpoint.post(apiEndpoint, payload);
      setSuccess("Record cancellato con successo");
      fetchRecords();
      setSelectedRow(null);
      setOriginalSelectedRow(null);
    } catch (err) {
      console.error('Errore durante l\'eliminazione:', err);
      setError(err.message || "Errore durante l'eliminazione del record");
    }
  };
  
  // Funzione per gestire cambio nei filtri
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Inizializza React Table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data });
  
  // Helper per determinare il tipo di input appropriato
  const getInputType = (field) => {
    if (inputTypes[field]) return inputTypes[field];
    
    // Inferisco il tipo in base al nome del campo
    if (field.toLowerCase().includes('email')) return 'email';
    if (field.toLowerCase().includes('password')) return 'password';
    if (field.toLowerCase().includes('data') || field.toLowerCase().includes('date')) return 'date';
    if (field.toLowerCase().includes('ora') || field.toLowerCase().includes('time')) return 'time';
    if (field.toLowerCase().includes('numero') || field.toLowerCase().includes('id')) return 'number';
    
    return 'text'; // Default
  };

  return (
    <div className="flex flex-col h-full p-4 bg-white shadow-lg rounded-lg transition-all duration-300">
      <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
        {TableIcon && <TableIcon className="text-blue-600" />}
        {title || 'Gestione Dati'}
      </h2>
      
      {/* Messaggi di successo o errore */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center border-l-4 border-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center border-l-4 border-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      
      {/* Conflitto di Modifica Concorrente */}
      {conflictData && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
          <h4 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
            <FaExclamationTriangle className="mr-2 text-yellow-600" />
            Conflitto di Modifica Concorrente
          </h4>
          <p className="mb-3 text-yellow-700">
            Un altro utente ha modificato questo record mentre lo stavi modificando tu.
            Controlla le differenze e scegli come procedere:
          </p>
          
          <div className="grid grid-cols-3 gap-4 bg-white p-3 rounded-lg shadow-sm mb-3">
            <div>
              <h5 className="font-bold text-gray-700 border-b pb-1 mb-2">Versione attuale</h5>
              {Object.keys(conflictData.yourChanges).map(key => (
                <div key={key} className="mb-2">
                  <span className="text-sm font-semibold block">{key}:</span>
                  <span className="bg-red-100 px-2 py-1 rounded block truncate">
                    {conflictData.currentRecord[key] || '(vuoto)'}
                  </span>
                </div>
              ))}
            </div>
            
            <div>
              <h5 className="font-bold text-gray-700 border-b pb-1 mb-2">Le tue modifiche</h5>
              {Object.keys(conflictData.yourChanges).map(key => (
                <div key={key} className="mb-2">
                  <span className="text-sm font-semibold block">{key}:</span>
                  <span className="bg-green-100 px-2 py-1 rounded block truncate">
                    {conflictData.yourChanges[key].modified || '(vuoto)'}
                  </span>
                </div>
              ))}
            </div>
            
            <div>
              <h5 className="font-bold text-gray-700 border-b pb-1 mb-2">Risultato del merge</h5>
              {Object.keys(conflictData.yourChanges).map(key => (
                <div key={key} className="mb-2">
                  <span className="text-sm font-semibold block">{key}:</span>
                  <span className="bg-blue-100 px-2 py-1 rounded block truncate">
                    {conflictData.yourChanges[key].modified || '(vuoto)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={handleAcceptCurrent}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
            >
              <FaArrowRight className="mr-1" /> Accetta versione attuale
            </button>
            <button
              onClick={handleMerge}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <FaCodeBranch className="mr-1" /> Unisci le modifiche
            </button>
          </div>
        </div>
      )}
      
      {/* Sezione Filtri */}
      {filterConfig && (
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FaSearch className="mr-2 text-blue-600" />
            Filtri di Ricerca
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filterConfig.map((filter, idx) => (
              <div key={idx} className="flex flex-col group">
                <label htmlFor={`filter_${filter.field}`} className="mb-1 text-sm font-bold text-gray-700 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                  {filter.label}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {filter.icon}
                  </div>
                  <input
                    id={`filter_${filter.field}`}
                    type={getInputType(filter.field)}
                    placeholder={`Filtra per ${filter.label}`}
                    value={filters[filter.field] || ''}
                    onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                    className="border pl-10 p-2 rounded text-lg w-full shadow-sm focus:ring-2 focus:ring-blue-500 
                             transition-all duration-200 ease-in-out group-hover:border-blue-300"
                  />
                </div>
              </div>
            ))}
            
            <div className="flex items-end">
              <button
                onClick={fetchRecords}
                className="w-full px-4 py-2 text-white rounded shadow-md transition-all duration-300 text-lg 
                          flex items-center justify-center gap-2 transform hover:scale-[1.02]
                          bg-blue-600 hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700"
              >
                <FaSearch />
                Cerca
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sezione Tabella */}
      <div className="flex-grow overflow-auto bg-gray-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md mb-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <FaTable className="mr-2 text-blue-600" />
          Elenco Dati
        </h3>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-blue-600 animate-pulse">Caricamento...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table {...getTableProps()} className="min-w-full bg-white rounded-lg overflow-hidden shadow">
              <thead className="sticky top-0 z-10">
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                    {headerGroup.headers.map(column => (
                      <th
                        {...column.getHeaderProps()}
                        key={column.id}
                        className="bg-gradient-to-r from-blue-700 to-blue-500 text-white uppercase tracking-wide text-sm py-3 px-6 text-left font-semibold"
                      >
                        {column.render('Header')}
                      </th>
                    ))}
                    <th className="bg-gradient-to-r from-blue-700 to-blue-500 text-white uppercase tracking-wide text-sm py-3 px-6 text-left font-semibold">
                      Azioni
                    </th>
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()}>
                {rows.map(row => {
                  prepareRow(row);
                  return (
                    <tr
                      {...row.getRowProps()}
                      key={row.id}
                      className={`hover:shadow-md transition-shadow duration-300 ${
                        selectedRow && selectedRow[primaryKey] === row.original[primaryKey]
                          ? 'bg-blue-100'
                          : 'odd:bg-white even:bg-gray-100'
                      }`}
                    >
                      {row.cells.map(cell => (
                        <td
                          {...cell.getCellProps()}
                          key={cell.column.id}
                          className="py-3 px-6 border border-gray-300 text-gray-800 transition transform duration-300 hover:bg-blue-50"
                        >
                          {cell.render('Cell')}
                        </td>
                      ))}
                      <td className="py-3 px-6 border border-gray-300">
                        <button 
                          onClick={() => handleRowSelect(row.original)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors duration-300 flex items-center gap-1"
                        >
                          <FaEdit /> Seleziona
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Sezione Modifica Record (visibile solo quando un record è selezionato) */}
      {selectedRow && (
        <div className="bg-blue-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md mb-4 border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FaEdit className="mr-2 text-blue-600" />
            Modifica Record
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {columnProps.filter(col => col.flag === 2).map(col => (
              <div className="flex flex-col" key={col.field}>
                <label className="mb-1 text-sm font-bold text-gray-700">{col.label}</label>
                <input
                  type={getInputType(col.field)}
                  value={selectedRow[col.field] || ''}
                  onChange={e => setSelectedRow({...selectedRow, [col.field]: e.target.value})}
                  className="border p-2 rounded"
                  placeholder={col.label}
                />
              </div>
            ))}
            
            <div className="flex items-end">
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleUpdate}
                  className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                >
                  <FaEdit /> Salva Modifiche
                </button>
                
                <button
                  onClick={handleDelete}
                  className="p-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1"
                >
                  <FaTrash /> Elimina
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-3">
            <button 
              onClick={() => {
                setSelectedRow(null);
                setOriginalSelectedRow(null); 
              }}
              className="text-gray-600 hover:text-gray-800 underline flex items-center"
            >
              Annulla selezione
            </button>
          </div>
        </div>
      )}
      
      {/* Sezione Nuovo Record */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FaUserPlus className="mr-2 text-blue-600" />
          Nuovo Record
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columnProps.filter(col => col.flag === 2).map(col => (
            <div className="flex flex-col" key={col.field}>
              <label className="mb-1 text-sm font-bold text-gray-700">{col.label}</label>
              <input
                type={getInputType(col.field)}
                value={newRecord[col.field] || ''}
                onChange={e => setNewRecord({...newRecord, [col.field]: e.target.value})}
                className="border p-2 rounded"
                placeholder={col.label}
              />
            </div>
          ))}
          
          <div className="flex items-end">
            <button
              onClick={handleCreate}
              className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <FaUserPlus /> Crea Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableManager;