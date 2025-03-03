const express = require('express');
const router = express.Router();
const checkOperationPermission = require('../middleware/checkOperationPermission');
const { readOperation, writeOperations } = require('../utils/crudOperations');

// Lista delle tabelle autorizzate
const allowedTables = [
  'ANS_Utenti',
  'ANS_Questionari',
  'ANS_DomandeQuestionari',
  'ANS_RisposteQuestionari',
  'CNF_RisposteProposte',
  'ANS_TipiDomande',
  'DOM_TipiDomande'
];

/**
 * Middleware per verificare i permessi in base all'operazione.
 */
const permissionMiddleware = (req, res, next) => {
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
  const functionId = 10;
  return checkOperationPermission([operationType], functionId)(req, res, next);
};

/**
 * Endpoint CRUD per operazioni dinamiche su una tabella.
 */
router.post('/crudTabella', permissionMiddleware, async (req, res) => {
  const { tableName } = req.body;
  if (!tableName) {
    return res.status(400).json({ message: 'Nome della tabella mancante' });
  }
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ message: 'Nome della tabella non valido' });
  }

  try {
    // Se l'operazione richiesta è "read"
    if (req.body.operation && req.body.operation === 'read') {
      const { filters } = req.body;
      const results = await readOperation(tableName, filters);
      return res.status(200).json(results);
    }
    // Se le operazioni sono create/update/delete
    else if (req.body.changes && Array.isArray(req.body.changes)) {
      const { changes } = req.body;
      const requestInfo = {
        ip: req.ip,
        userId: req.user ? req.user.id : 0
      };
      
      const results = await writeOperations(tableName, changes, requestInfo);
      return res.status(200).json({ 
        message: 'Operazioni eseguite con successo', 
        results 
      });
    } else {
      return res.status(400).json({ 
        message: 'Payload non valido. Inviare "operation": "read" oppure un array "changes".' 
      });
    }
  } catch (error) {
    console.error('Errore durante l\'elaborazione della richiesta:', error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;