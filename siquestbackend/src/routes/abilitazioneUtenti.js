const express = require('express');
const router = express.Router();
const db = require('../connect');
// Presupponiamo di avere già un middleware per validare la sessione
const validateSession = require('../utility').validateSession;

/**
 * Funzione ausiliaria per costruire l'albero gerarchico.
 * @param {Array} treeData - Array di record con { AFU_Id_Padre, AFU_Id_Figlio, AFU_Posizionamento }
 * @param {Set} allowedIds - Set di ID funzione abilitati per l'utente
 * @returns {Array} - Albero delle funzioni filtrato
 */
function buildTree(treeData, allowedIds) {
  console.log("buildTree: allowedIds:", [...allowedIds]);
  
  // Create a map for all allowed nodes
  const nodeMap = new Map();
  allowedIds.forEach(funcId => {
    nodeMap.set(funcId, { id: funcId, children: [] });
  });

  // Set to record which nodes have been attached as children
  const childrenSet = new Set();

  console.log("buildTree: treeData:", treeData);
  // Process each parent-child relationship
  treeData.forEach(record => {
    const parentId = record.AFU_Id_Padre;
    const childId = record.AFU_Id_Figlio;
    console.log(`Processing relationship - Parent: ${parentId}, Child: ${childId}`);

    // Only consider the child if it is allowed
    if (allowedIds.has(childId)) {
      // If the parent is allowed and exists in nodeMap, attach the child
      if (allowedIds.has(parentId) && nodeMap.has(parentId)) {
        console.log(`Attaching child ${childId} to parent ${parentId}`);
        nodeMap.get(parentId).children.push(nodeMap.get(childId));
        childrenSet.add(childId);
      } else {
        // Otherwise, the child is not attached to any allowed parent
        console.log(`No allowed parent found for child ${childId}`);
        childrenSet.add(childId);
      }
    } else {
      console.log(`Child ${childId} non presente in allowedIds, saltato`);
    }
  });

  // Nodes that were never attached as children are roots
  const roots = [];
  for (const [funcId, node] of nodeMap.entries()) {
    if (!childrenSet.has(funcId)) {
      roots.push(node);
    }
  }
  
  console.log("buildTree: Risultato roots:", roots);
  return roots;
}

// Rotta per ottenere il menu (albero filtrato e lista dettagliata delle funzioni)
router.get('/menu', validateSession, (req, res) => {
  const userGroupId = req.user.UTE_Id_GruppiAbilitazioni;
  console.log("Menu route: userGroupId:", userGroupId);

  const allowedFunctionsQuery = `
    SELECT 
      ao.ABO_Id_Funzioni AS functionId, 
      ao.ABO_Accesso,
      efu.EFU_CodiceFunzione,
      efu.EFU_NomeFunzione,
      efu.EFU_Componente,
      efu.EFU_RottaFrontend,
      efu.Efu_RottaBackend,
      efu.EFU_ModuloApplicativo,
      efu.EFU_NomeTabella
    FROM ANS_AbilitazioniOperazioni ao
    JOIN ANS_Funzioni efu ON ao.ABO_Id_Funzioni = efu.EFU_Id_Funzioni
    WHERE (? = 0 OR ao.ABO_Id_GruppiAbilitazioni = ? OR ao.ABO_Id_GruppiAbilitazioni = 0)
      AND ao.ABO_Accesso = 1
  `;

  db.query(allowedFunctionsQuery, [userGroupId, userGroupId], (err, allowedResults) => {
    if (err) {
      console.error('Errore nella query delle funzioni abilitate:', err);
      return res.status(500).json({ message: 'Errore interno del server' });
    }
    console.log("Menu route: allowedResults:", allowedResults);

    // Creiamo un Set degli ID funzione abilitati (quelli che compaiono in ANS_ElencoFunzioni)
    const allowedFunctionIds = new Set(allowedResults.map(r => r.functionId));
    console.log("Menu route: allowedFunctionIds:", [...allowedFunctionIds]);

    const treeQuery = `
      SELECT AFU_Id_Padre, AFU_Id_Figlio, AFU_Posizionamento
      FROM ANS_AlberoFunzioni
      WHERE AFU_Id_GruppiAbilitazioni = ?
      ORDER BY AFU_Posizionamento
    `;
    db.query(treeQuery, [userGroupId], (err, treeData) => {
      if (err) {
        console.error("Errore nella query dell'albero delle funzioni:", err);
        return res.status(500).json({ message: 'Errore interno del server' });
      }
      console.log("Menu route: treeData:", treeData);

      // Filtriamo l'albero: consideriamo solo i nodi (AFU_Id_Figlio) che sono abilitati
      const filteredTreeData = treeData.filter(record => allowedFunctionIds.has(record.AFU_Id_Figlio));
      console.log("Menu route: filteredTreeData:", filteredTreeData);

      // Costruiamo l'albero gerarchico a partire dal filteredTreeData
      const menuTree = buildTree(filteredTreeData, allowedFunctionIds);
      console.log("Menu route: menuTree:", menuTree);

      // Restituiamo una struttura che contenga sia l'albero che la lista dettagliata delle funzioni
      return res.status(200).json({
        tree: menuTree,
        functions: allowedResults
      });
    });
  });
});

module.exports = router;
