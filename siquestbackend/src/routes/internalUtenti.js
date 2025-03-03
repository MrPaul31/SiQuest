const express = require('express');
const router = express.Router();
const checkOperationPermission = require('../middleware/checkOperationPermission');
const { readOperation, writeOperations } = require('../utils/crudOperations');
const { getFunctionIdByTableName } = require('../utils/functionUtils');
const bcrypt = require('bcrypt');

// Tabella specifica per gli utenti
const tableName = 'ANS_Utenti';

/**
 * Middleware per verificare i permessi specifici per gli utenti
 */
const userPermissionMiddleware = async (req, res, next) => {
  try {
    let operationType;
    if (req.body.operation && req.body.operation === 'read') {
      operationType = 'access';
    } else if (req.body.changes && Array.isArray(req.body.changes)) {
      if (req.body.changes.some(change => change.operation === 'create')) {
        operationType = 'insert';
      } else if (req.body.changes.some(change => change.operation === 'update' || change.operation === 'delete')) {
        operationType = 'modify';
      } else {
        return res.status(400).json({ message: 'Operazione non riconosciuta' });
      }
    } else {
      return res.status(400).json({ message: 'Payload non valido' });
    }
    
    // Ottieni l'ID funzione in base al nome della tabella
    const functionId = await getFunctionIdByTableName(tableName);
    return checkOperationPermission([operationType], functionId)(req, res, next);
  } catch (error) {
    console.error('Errore nella verifica dei permessi:', error);
    return res.status(500).json({ message: 'Errore nella verifica dei permessi', error: error.message });
  }
};

/**
 * Pre-elaborazione per le password: hash con bcrypt
 * Corretto il problema che impediva il login
 */
function preprocessUserData(changes) {
  return changes.map(change => {
    const { operation, ...data } = change;
    
    if (operation === 'create' && data.UTE_Password) {
      // Salva la password chiara in base64
      data.UTE_CRC = Buffer.from(data.UTE_Password, 'utf8').toString('base64');
      
      // Hash della password
      const saltRounds = 12;
      const hashedPassword = bcrypt.hashSync(data.UTE_Password, saltRounds);
      data.UTE_Password = hashedPassword;
      
      // Impostiamo anche UTE_DurataSessione se non presente
      if (!data.UTE_DurataSessione) {
        data.UTE_DurataSessione = 30; // Default di 30 minuti
      }
      
      // Assicuriamo che UTE_StatoRecord sia "A"
      data.UTE_StatoRecord = 'A';
    }
    else if (operation === 'update' && data.UTE_Password) {
      console.log(data.UTE_Password);
      // FIRST: Store the original client password in base64 format
      data.UTE_CRC = Buffer.from(data.UTE_Password, 'utf8').toString('base64');
      
      // SECOND: Hash the password and replace the original
      const saltRounds = 12;
      const hashedPassword = bcrypt.hashSync(data.UTE_Password, saltRounds);
      data.UTE_Password = hashedPassword;
      
      // Ensure updated users are active
      data.UTE_StatoRecord = 'A';
    }
    
    return { operation, ...data };
  });
}

/**
 * Endpoint CRUD specifico per gli utenti
 */
router.post('/users', userPermissionMiddleware, async (req, res) => {
  try {
    // Se l'operazione richiesta è "read"
    if (req.body.operation && req.body.operation === 'read') {
      const { filters } = req.body;
      const results = await readOperation(tableName, filters);
      return res.status(200).json(results);
    }
    // Se le operazioni sono create/update/delete
    else if (req.body.changes && Array.isArray(req.body.changes)) {
      // Pre-elaborazione dei dati (hash delle password)
      const processedChanges = preprocessUserData(req.body.changes);
      
      const requestInfo = {
        ip: req.ip,
        userId: req.user 
      };
      
      const result = await writeOperations(
        tableName,
        processedChanges,
        { userId: req.session?.userId || 0, ip: req.ip }
      );

      // Cerca conflitti nei risultati
      const conflicts = result.filter(item => item.status === 'conflict');
      if (conflicts.length > 0) {
        return res.status(409).json({
          conflict: {
            message: conflicts[0].message,
            currentRecord: conflicts[0].currentRecord
          }
        });
      }

      // Se non ci sono conflitti, invia la risposta normale
      res.json(result);
    } else {
      return res.status(400).json({
        message: 'Payload non valido. Inviare "operation": "read" oppure un array "changes".'
      });
    }
  } catch (error) {
    console.error('Errore durante l\'elaborazione della richiesta utenti:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;