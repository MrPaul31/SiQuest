const db = require('../connect');

/**
 * Funzione helper per ottenere la chiave primaria di una tabella.
 */
function getPrimaryKeyField(tableName) {
  return new Promise((resolve, reject) => {
    const sql = `SHOW KEYS FROM ${tableName} WHERE Key_name = 'PRIMARY'`;
    db.query(sql, (err, keys) => {
      if (err) {
        console.error(`Errore fetching primary key per la tabella ${tableName}:`, err);
        return reject(err);
      }
      if (!keys || keys.length === 0) {
        return reject(new Error(`Primary key non trovata per la tabella ${tableName}`));
      }
      resolve(keys[0].Column_name);
    });
  });
}

/**
 * Funzione helper per recuperare il prefisso associato ad una tabella.
 */
async function getPrefixFromTable(tableName) {
  try {
    const pkField = await getPrimaryKeyField(tableName);
    const index = pkField.indexOf('Id');
    if (index > 0) {
      return pkField.substring(0, index);
    }
    return '';
  } catch (err) {
    throw err;
  }
}

/**
 * Funzione helper per recuperare il nome della colonna StatoRecord.
 */
async function findStatoRecordColumn(tableName) {
  try {
    const prefix = await getPrefixFromTable(tableName);
    return prefix + "StatoRecord";
  } catch (err) {
    throw err;
  }
}

/**
 * Funzione helper per formattare una data nel formato MySQL.
 */
function formatDateForMySQL(dateInput) {
  if (!dateInput) return null;
  
  let date;
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) {
      date = new Date(dateInput);
    } else {
      return dateInput.includes(' ') ? dateInput : `${dateInput} 00:00:00`;
    }
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return null;
  }

  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);
  const seconds = ('0' + date.getSeconds()).slice(-2);
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Funzione per eseguire operazioni di lettura con filtri dinamici.
 */
async function readOperation(tableName, filters = {}) {
  try {
    const prefix = await getPrefixFromTable(tableName);
    const statoRecordColumn = await findStatoRecordColumn(tableName);
    
    let whereClauses = [];
    let values = [];
    
    // Aggiungi la condizione StatoRecord = 'A' se non specificata
    const filterKeys = Object.keys(filters);
    if (!filterKeys.includes(statoRecordColumn)) {
      whereClauses.push(`${statoRecordColumn} = ?`);
      values.push('A');
    }
    
    for (const [field, condition] of Object.entries(filters)) {
      if (typeof condition === 'object' && condition !== null && condition.from && condition.to) {
        // Filtro per range di date
        whereClauses.push(`${field} BETWEEN ? AND ?`);
        values.push(formatDateForMySQL(condition.from), formatDateForMySQL(condition.to));
      } else if (typeof condition === 'string') {
        // Filtro LIKE per stringhe
        whereClauses.push(`${field} LIKE ?`);
        values.push(`%${condition}%`);
      } else {
        // Filtro per corrisponza esatta
        whereClauses.push(`${field} = ?`);
        values.push(condition);
      }
    }
    
    const whereClause = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const query = `SELECT * FROM ${tableName} ${whereClause}`;
    
    return new Promise((resolve, reject) => {
      db.query(query, values, (err, results) => {
        if (err) {
          console.error('Errore durante la query di read:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
  } catch (error) {
    console.error('Errore durante l\'operazione di read:', error);
    throw error;
  }
}

/**
 * Funzione per eseguire operazioni di scrittura (create, update, delete).
 */
async function writeOperations(tableName, changes, requestInfo) {
  try {
    const statoRecordColumn = await findStatoRecordColumn(tableName);
    if (!statoRecordColumn) {
      throw new Error('Colonna StatoRecord non trovata');
    }
    
    const prefix = await getPrefixFromTable(tableName);
    const idField = await getPrimaryKeyField(tableName);
    
    return new Promise((resolve, reject) => {
      db.getConnection((connErr, connection) => {
        if (connErr) {
          console.error('Errore di connessione:', connErr);
          reject(connErr);
          return;
        }
        
        connection.beginTransaction(async (txErr) => {
          if (txErr) {
            connection.release();
            console.error('Errore durante l\'inizio della transazione:', txErr);
            reject(txErr);
            return;
          }
          
          try {
            const results = [];
            
            // Elaborazione sequenziale di ogni operazione
            for (const change of changes) {
              const { operation, ...data } = change;
              if (!operation) {
                throw new Error('Tipo di operazione mancante');
              }
              
              if (operation === 'update') {
                try {
                  // Get table schema first
                  const columnDetails = await getTableSchema(connection, tableName);
                  const validColumnNames = columnDetails.map(col => col.name);
                  
                  if (!data[idField]) {
                    throw new Error(`ID mancante per l'aggiornamento (campo atteso: ${idField})`);
                  }
                  
                  const originalId = data[idField];
                  
                  // NUOVO: Controllo concorrenza con timestamp
                  if (data.originalTimestamp) {
                    // Ottieni il record attuale
                    const currentRecord = await getLatestRecord(connection, tableName, idField, originalId);
                    
                    // Campo che contiene la data di modifica
                    const modificationDateField = `${prefix}DataOraModifica`;
                    
                    // Se la data di modifica è più recente del timestamp originale
                    if (currentRecord && 
                        currentRecord[modificationDateField] && 
                        new Date(currentRecord[modificationDateField]) > new Date(data.originalTimestamp)) {
                      
                      // Un altro utente ha modificato il record, segnala conflitto
                      results.push({
                        operation: 'update',
                        status: 'conflict',
                        message: 'Il record è stato modificato da un altro utente',
                        currentRecord,
                        requestedId: originalId
                      });
                      
                      // Passa al prossimo change senza eseguire questo update
                      continue;
                    }
                    
                    // Rimuovi il campo originalTimestamp dai dati da salvare
                    delete data.originalTimestamp;
                  }
                  
                  // Create clean data with only valid columns and primitive values
                  const cleanData = {};
                  for (const key in data) {
                    if (validColumnNames.includes(key)) {
                      const value = data[key];
                      if (value === null || 
                          value === undefined ||
                          typeof value === 'string' || 
                          typeof value === 'number' || 
                          typeof value === 'boolean') {
                        cleanData[key] = value;
                      }
                    }
                  }
                  
                  // Continue with your existing update logic, but use cleanData instead of data
                  // 1. Recupera i dati del record originale
                  const getOriginalRecordQuery = `SELECT * FROM ${tableName} WHERE ${idField} = ?`;
                  const originalRecords = await new Promise((resolveQuery, rejectQuery) => {
                    connection.query(getOriginalRecordQuery, [originalId], (err, result) => {
                      if (err) {
                        console.error(`Errore nel recupero del record originale con ID ${originalId}:`, err);
                        rejectQuery(err);
                      } else {
                        resolveQuery(result);
                      }
                    });
                  });
                  
                  if (!originalRecords || originalRecords.length === 0) {
                    throw new Error(`Record con ID ${originalId} non trovato per l'aggiornamento`);
                  }
                  
                  const originalRecord = originalRecords[0];
                  
                  // 2. Marca il record esistente come "D" (disabilitato)
                  const disableQuery = `UPDATE ${tableName} SET ${statoRecordColumn} = 'D' WHERE ${idField} = ?`;
                  await new Promise((resolveDisable, rejectDisable) => {
                    connection.query(disableQuery, [originalId], (err, result) => {
                      if (err) {
                        console.error(`Errore nella disabilitazione del record con ID ${originalId}:`, err);
                        rejectDisable(err);
                      } else {
                        resolveDisable(result);
                      }
                    });
                  });
                  
                  // 3. Calcola un nuovo ID per il record aggiornato
                  const getLastIdQuery = `SELECT COALESCE(MAX(${idField}), 0) + 1 AS newId FROM ${tableName}`;
                  const lastIdResults = await new Promise((resolveId, rejectId) => {
                    connection.query(getLastIdQuery, (err, result) => {
                      if (err) {
                        rejectId(err);
                      } else {
                        resolveId(result);
                      }
                    });
                  });
                  
                  const newId = lastIdResults[0].newId;
                  
                  // 4. Crea un nuovo record pulito, copiando solo valori primitivi
                  const newRecord = {};
                  for (const key in originalRecord) {
                    const value = originalRecord[key];
                    if (value === null || 
                        typeof value === 'undefined' ||
                        typeof value === 'string' || 
                        typeof value === 'number' || 
                        typeof value === 'boolean') {
                      newRecord[key] = value;
                    }
                  }

                  // Ora applica i dati aggiornati
                  for (const key in cleanData) {
                    newRecord[key] = cleanData[key];
                  }

                  delete newRecord[idField]; // Rimuovi l'ID vecchio
                  
                  // 5. Configura i campi per il nuovo record
                  newRecord[idField] = newId;  // Assegna il nuovo ID
                  
                  // 6. Configura il riferimento all'ID originale
                  // Costruisci il nome del campo di riferimento
                  const tableSuffix = tableName.substring(prefix.length);
                  const refFieldName = `${prefix}IdRif_${tableSuffix}`;
                  
                  // 7. For updates, we need to preserve the original IdRif, not set it to the original ID
                  const originalIdRif = originalRecord[refFieldName];
                  
                  // If this record already has an IdRif, use that (preserving the chain to the first record)
                  // Otherwise, use the original ID as the IdRif
                  if (originalIdRif) {
                    newRecord[refFieldName] = originalIdRif;
                  } else {
                    newRecord[refFieldName] = originalId;
                  }
                  
                  // 8. Imposta stato record a "A" e i campi di audit
                  newRecord[`${statoRecordColumn}`] = 'A';
                  newRecord[`${prefix}DataOraModifica`] = formatDateForMySQL(new Date());
                  newRecord[`${prefix}UtenteModifica`] = requestInfo.userId || 0;
                  newRecord[`${prefix}TerminaleModifica`] = requestInfo.ip;
                  newRecord[`${prefix}UtenteInserimento`] = requestInfo.userId || 0;
                  // Add this line to explicitly set UTE_InizioValidita
                  newRecord[`${prefix}InizioValidita`] = formatDateForMySQL(new Date());
                  
                  // 9. Formatta le date per MySQL
                  for (const field in newRecord) {
                    if ((field.includes('Data') || 
                         field.includes('Validita') || 
                         field.includes('Timestamp') ||
                         field.includes('Ora')) &&
                        typeof newRecord[field] === 'string' &&
                        newRecord[field].includes('T')) {
                      newRecord[field] = formatDateForMySQL(newRecord[field]);
                    }
                  }
                  
                  // 10. Esegui l'inserimento del nuovo record
                  const fields = [];
                  const placeholders = [];
                  const insertValues = [];

                  for (const key in newRecord) {
                    const value = newRecord[key];
                    
                    // Only include primitive values that can be properly sent to MySQL
                    if (value === null || 
                        typeof value === 'string' || 
                        typeof value === 'number' || 
                        typeof value === 'boolean' ||
                        typeof value === 'undefined') {
                      
                      fields.push(key);
                      placeholders.push('?');
                      
                      // Handle undefined as null for MySQL
                      insertValues.push(value === undefined ? null : value);
                    }
                  }

                  // Create the SQL statement with proper escaping
                  const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;

                  console.log('SQL Query:', sql);
                  console.log('Values count:', insertValues.length);
                  console.log('Fields count:', fields.length);

                  // Execute the query with properly prepared values
                  const insertResult = await new Promise((resolveInsert, rejectInsert) => {
                    connection.query(sql, insertValues, (err, result) => {
                      if (err) {
                        console.error('SQL Error:', err);
                        rejectInsert(err);
                      } else {
                        console.log('Insert successful, result:', result);
                        resolveInsert(result);
                      }
                    });
                  });
                  
                  results.push({ operation: 'update', oldId: originalId, newId, result: insertResult });
                  
                } catch (error) {
                  console.error('Error in update operation:', error);
                  throw error;
                }
              } else if (operation === 'create') {
                try {
                  // Get table schema to adapt to any schema changes
                  const columnDetails = await getTableSchema(connection, tableName);
                  const validColumnNames = columnDetails.map(col => col.name);
                  
                  console.log(`Valid columns for ${tableName}:`, validColumnNames);
                  
                  // Calculate new ID
                  const getLastIdQuery = `SELECT COALESCE(MAX(${idField}), 0) + 1 AS newId FROM ${tableName}`;
                  const lastIdResults = await new Promise((resolveId, rejectId) => {
                    connection.query(getLastIdQuery, (err, result) => {
                      if (err) {
                        rejectId(err);
                      } else {
                        resolveId(result);
                      }
                    });
                  });
                  
                  const newId = lastIdResults[0].newId;
                  
                  // Create a clean data object with only primitive values
                  const cleanData = {};
                  for (const key in data) {
                    // Only include keys that exist in the database schema
                    if (validColumnNames.includes(key)) {
                      const value = data[key];
                      // Only include primitive values
                      if (value === null || 
                          value === undefined ||
                          typeof value === 'string' || 
                          typeof value === 'number' || 
                          typeof value === 'boolean') {
                        cleanData[key] = value;
                      }
                    }
                  }
                  
                  // Set ID and standard fields
                  cleanData[idField] = newId;
                  
                  // Always set InizioValidita regardless of schema check
                  cleanData[`${prefix}InizioValidita`] = formatDateForMySQL(new Date());
                  
                  if (validColumnNames.includes(`${prefix}StatoRecord`)) {
                    cleanData[`${prefix}StatoRecord`] = 'A';
                  }
                  if (validColumnNames.includes(`${prefix}Utente`)) {
                    cleanData[`${prefix}Utente`] = requestInfo.userId || 0; 
                  }
                  if (validColumnNames.includes(`${prefix}Terminale`)) {
                    cleanData[`${prefix}Terminale`] = requestInfo.ip;
                  }
                  if (validColumnNames.includes(`${prefix}UtenteInserimento`)) {
                    cleanData[`${prefix}UtenteInserimento`] = requestInfo.ip;
                  }
                  if (validColumnNames.includes(`${prefix}DataOraInserimento`)) {
                    cleanData[`${prefix}DataOraInserimento`] = formatDateForMySQL(new Date());
                  }
                  if (validColumnNames.includes(`${prefix}TerminaleInserimento`)) {
                    cleanData[`${prefix}TerminaleInserimento`] = requestInfo.ip;
                  }
                  
                  // Set UTE_Utente to 0 if not provided
                  cleanData[`${prefix}Utente`] = 0; // Always set UTE_Utente to 0 (required field)
                  
                  // Format dates
                  for (const field in cleanData) {
                    if ((field.includes('Data') || 
                         field.includes('Validita') || 
                         field.includes('Timestamp') ||
                         field.includes('Ora')) &&
                        typeof cleanData[field] === 'string' &&
                        cleanData[field] &&
                        cleanData[field].includes('T')) {
                      cleanData[field] = formatDateForMySQL(cleanData[field]);
                    }
                  }
                  
                  // Check for reference field and set it to the same ID for new records
                  const tableSuffix = tableName.substring(prefix.length);
                  const refFieldName = `${prefix}IdRif_${tableSuffix}`;

                  // For new records (create operation), IdRif should equal the new ID itself
                  if (validColumnNames.includes(refFieldName)) {
                    cleanData[refFieldName] = newId; // Set IdRif = ID for new records
                  }

                  // Generate arrays for SQL insert statement
                  const fields = [];
                  const placeholders = [];
                  const insertValues = [];

                  // Process each field in cleanData to ensure consistent ordering
                  for (const key in cleanData) {
                    const value = cleanData[key];
                    
                    // Add all primitive values to the arrays
                    if (value === null || 
                        typeof value === 'string' || 
                        typeof value === 'number' || 
                        typeof value === 'boolean' ||
                        typeof value === 'undefined') {
                      
                      fields.push(key);
                      placeholders.push('?');
                      insertValues.push(value === undefined ? null : value);
                    }
                  }

                  // Generate SQL statement
                  const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;

                  console.log('Final SQL fields:', fields);
                  console.log('Final values count:', insertValues.length);

                  // Execute the insert with proper data
                  const insertResult = await new Promise((resolveInsert, rejectInsert) => {
                    connection.query(sql, insertValues, (err, result) => {
                      if (err) {
                        console.error('SQL Error:', err);
                        rejectInsert(err);
                      } else {
                        console.log('Insert successful, result:', result);
                        resolveInsert(result);
                      }
                    });
                  });

                  // Add only one result push
                  results.push({ operation, id: newId, result: insertResult });
                } catch (error) {
                  console.error('Error in create operation:', error);
                  throw error;
                }
              } else if (operation === 'delete') {
                if (!data[idField]) {
                  throw new Error(`ID mancante per la cancellazione (campo atteso: ${idField})`);
                }
                
                const id = data[idField];
                // Cancellazione logica
                const deleteQuery = `UPDATE ${tableName} SET ${statoRecordColumn} = 'C' WHERE ${idField} = ?`;
                
                const deleteResult = await new Promise((resolveDelete, rejectDelete) => {
                  connection.query(deleteQuery, [id], (err, result) => {
                    if (err) {
                      rejectDelete(err);
                    } else {
                      resolveDelete(result);
                    }
                  });
                });
                
                results.push({ operation, id, result: deleteResult });
              } else {
                throw new Error(`Operazione non supportata: ${operation}`);
              }
            }
            
            // Commit della transazione
            connection.commit((commitErr) => {
              if (commitErr) {
                connection.rollback(() => {
                  connection.release();
                  console.error('Errore nel commit della transazione:', commitErr);
                  reject(commitErr);
                });
              } else {
                connection.release();
                resolve(results);
              }
            });
          } catch (error) {
            // Rollback
            connection.rollback(() => {
              connection.release();
              console.error('Errore nella transazione:', error);
              reject(error);
            });
          }
        });
      });
    });
  } catch (err) {
    console.error('Errore durante le operazioni di scrittura:', err);
    throw err;
  }
}

// Add this function at the top level of your module
async function getTableSchema(connection, tableName) {
  return new Promise((resolve, reject) => {
    // This query gets all columns from the table
    connection.query(`SHOW COLUMNS FROM ${tableName}`, (err, results) => {
      if (err) {
        console.error(`Error getting schema for ${tableName}:`, err);
        reject(err);
      } else {
        const columnDetails = results.map(col => ({
          name: col.Field,
          type: col.Type,
          allowNull: col.Null === 'YES'
        }));
        resolve(columnDetails);
      }
    });
  });
}

// For create operations
const createRecord = async (connection, tableName, data) => {
  // Get valid column names
  const columnsQuery = `SHOW COLUMNS FROM ${tableName}`;
  const columnResults = await connection.query(columnsQuery);
  const validColumns = columnResults.map(col => col.Field);
  
  // Filter data to only include valid columns
  const filteredData = {};
  for (const key in data) {
    if (validColumns.includes(key)) {
      filteredData[key] = data[key];
    }
  }
  
  // Prepare columns and values arrays
  const columns = Object.keys(filteredData);
  const values = Object.values(filteredData);
  
  // Create placeholders array with the right length
  const placeholders = columns.map(() => '?').join(', ');
  
  // Generate proper INSERT query
  const insertQuery = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  console.log('SQL Query:', insertQuery);
  console.log('Values count:', values.length);
  
  // Execute the query
  const result = await connection.query(insertQuery, values);
  return result;
};

// For update operations
const updateRecord = async (connection, tableName, idField, data) => {
  // Get valid column names
  const columnsQuery = `SHOW COLUMNS FROM ${tableName}`;
  const columnResults = await connection.query(columnsQuery);
  const validColumns = columnResults.map(col => col.Field);
  
  // Extract ID for the WHERE clause
  const id = data[idField];
  if (!id) {
    throw new Error(`Missing ID field (${idField}) for update operation`);
  }
  
  // Filter data to only include valid columns, excluding the ID field
  const updateData = {};
  for (const key in data) {
    if (key !== idField && validColumns.includes(key)) {
      updateData[key] = data[key];
    }
  }
  
  // Prepare SET clause parts and values array
  const setParts = [];
  const values = [];
  
  for (const key in updateData) {
    setParts.push(`${key} = ?`);
    values.push(updateData[key]);
  }
  
  // Add ID at the end for the WHERE clause
  values.push(id);
  
  // Generate proper UPDATE query
  const updateQuery = `UPDATE ${tableName} SET ${setParts.join(', ')} WHERE ${idField} = ?`;
  
  console.log('Update SQL Query:', updateQuery);
  console.log('Update values count:', values.length);
  
  // Execute the query
  const result = await connection.query(updateQuery, values);
  return result;
};

// Esportiamo le funzioni
module.exports = {
  readOperation,
  writeOperations,
  formatDateForMySQL,
  getPrimaryKeyField,
  getPrefixFromTable,
  findStatoRecordColumn
};

// 2. AGGIUNGI questa funzione helper per ottenere il record più recente
async function getLatestRecord(connection, tableName, idField, id) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM ${tableName} WHERE ${idField} = ? ORDER BY ${idField} DESC LIMIT 1`;
    connection.query(query, [id], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results && results.length > 0 ? results[0] : null);
      }
    });
  });
}