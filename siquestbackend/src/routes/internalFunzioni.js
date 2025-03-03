const express = require('express');
const router = express.Router();
const checkOperationPermission = require('../middleware/checkOperationPermission');
const { readOperation, writeOperations } = require('../utils/crudOperations');
const bcrypt = require('bcrypt');

// Tabella specifica per gli utenti
const tableName = 'ANS_Funzioni';

/**
 * Middleware per verificare i permessi specifici per gli utenti
 */
const userPermissionMiddleware = (req, res, next) => {
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
  // Function ID specifico per la gestione utenti (cambiare in base alle esigenze)
  const functionId = 10; 
  return checkOperationPermission([operationType], functionId)(req, res, next);
};


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
        userId: req.user ? req.user.id : 0
      };
      
      const results = await writeOperations(tableName, processedChanges, requestInfo);
      return res.status(200).json({ 
        message: 'Operazioni su ANS_Funzioni eseguite con successo', 
        results 
      });
    } else {
      return res.status(400).json({ 
        message: 'Payload non valido. Inviare "operation": "read" oppure un array "changes".' 
      });
    }
  } catch (error) {
    console.error('Errore durante l\'elaborazione della richiesta funzioni:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;