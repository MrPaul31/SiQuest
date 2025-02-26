import React, { useEffect, useState, useMemo } from 'react';
import { useTable } from 'react-table';
import { endpoint } from './config/AuthContext';

/*
  Simuliamo il file di proprietà come un array di stringhe.
  La struttura è:
    NomeCampo=FLAG,Label
  FLAG:
    2: il dato deve essere mostrato al client (ed inviato al backend),
    1: il dato non è mostrato ma va inviato al backend,
    0: il dato non va inviato al backend.
*/
const columnPropertiesData = [
  "UTE_Id_Utenti=1,Id",
  "UTE_NomeUtente=2,Nome utente",
  "UTE_Password=2,Password",
  "UTE_Email=2,Email",
  "UTE_LivelloAbilitazione=2,Livello abilitazione",
  "UTE_DurataSessione=2,Durata sessione",
  "UTE_UtenteInserimento=1,UtenteInserimento",
  "UTE_DataOraInserimento=1,Data Ora Inserimento",
  "UTE_TerminaleInserimento=1,Terminale Inserimento",
  "UTE_DataOraModifica=1,DataOraModifica",
  "UTE_UtenteModifica=1,UtenteModifica",
  "UTE_TerminaleModifica=1,TerminaleModifica",
  "UTE_InizioValidita=0,Inizio Validità",
  "UTE_FineValidita=0,Fine Validità",
  "UTE_StatoRecord=0,Stato Record",
  "UTE_Utente=0,Utente",
  "UTE_Terminale=0,Terminale",
  "UTE_Timestamp=0,Timestamp"
];

// Parsing del file di proprietà: si crea un array di oggetti { field, flag, label }
const columnProps = columnPropertiesData.map(line => {
  const [field, rest] = line.split('=');
  const [flag, label] = rest.split(',');
  return { field, flag: Number(flag), label };
});

// Colonne da mostrare in React Table: includiamo solo quelle con flag === 2
const displayColumns = columnProps
  .filter(col => col.flag === 2)
  .map(col => ({
    Header: col.label,
    accessor: col.field,
  }));

// Array dei campi da inviare al backend: includiamo campi con flag 2 o 1
const backendFields = columnProps
  .filter(col => col.flag === 2 || col.flag === 1)
  .map(col => col.field);

const UsersTable = () => {
  // Stati per i dati, loading, messaggi di errore e successo
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Stato per la riga selezionata (per aggiornamento/cancellazione)
  const [selectedRow, setSelectedRow] = useState(null);
  
  // Stati per la gestione dei filtri (esempio per Nome ed Email)
  const [filterName, setFilterName] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  
  // Stato per il form di creazione di un nuovo utente
  const [newUser, setNewUser] = useState({
    UTE_NomeUtente: "",
    UTE_Password: "",
    UTE_Email: "",
    UTE_LivelloAbilitazione: "",
    UTE_DurataSessione: ""
  });
  
  // tableName hardcoded (potrebbe essere derivato da props o config)
  const tableName = "utenti";

  // useMemo per memorizzare le colonne (React Table richiede colonne memoizzate)
  const columns = useMemo(() => displayColumns, []);
  
  // Funzione per recuperare i dati dal backend (operazione "read")
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      // Payload per la read; includiamo eventuali filtri se valorizzati
      const payload = {
        tableName,
        operation: "read",
        filters: {}
      };
      if(filterName) {
        payload.filters.UTE_NomeUtente = filterName;
      }
      if(filterEmail) {
        payload.filters.UTE_Email = filterEmail;
      }
      // Eseguiamo la chiamata all'endpoint
      const response = await endpoint.post('/crudTabella', payload);
      setData(response.data);
    } catch(err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // useEffect per il caricamento iniziale dei dati
  useEffect(() => {
    fetchUsers();
  }, []);

  // Funzione per creare un nuovo utente
  const handleCreate = async () => {
    setError('');
    setSuccess('');
    try {
      const payload = {
        tableName,
        changes: [
          {
            operation: "create",
            ...newUser
          }
        ]
      };
      await endpoint.post('/crudTabella', payload); // Removed response variable
      setSuccess("Utente creato con successo");
      fetchUsers();
      setNewUser({
        UTE_NomeUtente: "",
        UTE_Password: "",
        UTE_Email: "",
        UTE_LivelloAbilitazione: "",
        UTE_DurataSessione: ""
      });
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Funzione per aggiornare l'utente selezionato
  const handleUpdate = async () => {
    if(!selectedRow) {
      setError("Nessuna riga selezionata per l'aggiornamento");
      return;
    }
    setError('');
    setSuccess('');
    try {
      const payload = {
        tableName,
        changes: [
          {
            operation: "update",
            ...selectedRow
          }
        ]
      };
      await endpoint.post('/crudTabella', payload); // Removed response variable
      setSuccess("Utente aggiornato con successo");
      fetchUsers();
      setSelectedRow(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Funzione per eliminare l'utente selezionato
  const handleDelete = async () => {
    if(!selectedRow) {
      setError("Nessuna riga selezionata per la cancellazione");
      return;
    }
    setError('');
    setSuccess('');
    try {
      // Si invia solo l'ID per l'operazione delete
      const payload = {
        tableName,
        changes: [
          {
            operation: "delete",
            UTE_Id_Utenti: selectedRow.UTE_Id_Utenti
          }
        ]
      };
      await endpoint.post('/crudTabella', payload); // Removed response variable
      setSuccess("Utente cancellato con successo");
      fetchUsers();
      setSelectedRow(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Inizializziamo React Table
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data });

  return (
    <div>
      <h2>Gestione Utenti</h2>
      
      {/* Filtri: esempi di input per filtrare per nome ed email */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Filtra per Nome"
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtra per Email"
          value={filterEmail}
          onChange={e => setFilterEmail(e.target.value)}
        />
        <button onClick={() => fetchUsers()}>Applica Filtri</button>
      </div>
      
      {/* Messaggi di successo o errore */}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      {/* Visualizzazione della tabella */}
      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <table {...getTableProps()} style={{ border: 'solid 1px blue' }}>
          <thead>
            {headerGroups.map(headerGroup => (
              <tr {...headerGroup.getHeaderGroupProps()} key={headerGroup.id}>
                {headerGroup.headers.map(column => (
                  <th
                    {...column.getHeaderProps()}
                    key={column.id}
                    style={{
                      borderBottom: 'solid 3px red',
                      background: 'aliceblue',
                      color: 'black',
                      fontWeight: 'bold',
                    }}
                  >
                    {column.render('Header')}
                  </th>
                ))}
                <th>Azioni</th>
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
                  style={{
                    background: selectedRow && selectedRow.UTE_Id_Utenti === row.original.UTE_Id_Utenti ? '#eee' : 'white'
                  }}
                  onClick={() => setSelectedRow(row.original)}
                >
                  {row.cells.map(cell => (
                    <td
                      {...cell.getCellProps()}
                      key={cell.column.id}
                      style={{
                        padding: '10px',
                        border: 'solid 1px gray',
                      }}
                    >
                      {cell.render('Cell')}
                    </td>
                  ))}
                  <td>
                    <button onClick={() => setSelectedRow(row.original)}>Seleziona</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Form per la creazione di un nuovo utente */}
      <div style={{ marginTop: '2rem' }}>
        <h3>Aggiungi Nuovo Utente</h3>
        <input
          type="text"
          placeholder="Nome Utente"
          value={newUser.UTE_NomeUtente}
          onChange={e => setNewUser({ ...newUser, UTE_NomeUtente: e.target.value })}
        />
        <input
          type="text"
          placeholder="Password"
          value={newUser.UTE_Password}
          onChange={e => setNewUser({ ...newUser, UTE_Password: e.target.value })}
        />
        <input
          type="text"
          placeholder="Email"
          value={newUser.UTE_Email}
          onChange={e => setNewUser({ ...newUser, UTE_Email: e.target.value })}
        />
        <input
          type="number"
          placeholder="Livello Abilitazione"
          value={newUser.UTE_LivelloAbilitazione}
          onChange={e => setNewUser({ ...newUser, UTE_LivelloAbilitazione: e.target.value })}
        />
        <input
          type="number"
          placeholder="Durata Sessione"
          value={newUser.UTE_DurataSessione}
          onChange={e => setNewUser({ ...newUser, UTE_DurataSessione: e.target.value })}
        />
        <button onClick={handleCreate}>Crea Utente</button>
      </div>
      
      {/* Se è selezionata una riga, mostriamo il form per l'aggiornamento */}
      {selectedRow && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Modifica Utente (ID: {selectedRow.UTE_Id_Utenti})</h3>
          <input
            type="text"
            placeholder="Nome Utente"
            value={selectedRow.UTE_NomeUtente}
            onChange={e => setSelectedRow({ ...selectedRow, UTE_NomeUtente: e.target.value })}
          />
          <input
            type="text"
            placeholder="Email"
            value={selectedRow.UTE_Email}
            onChange={e => setSelectedRow({ ...selectedRow, UTE_Email: e.target.value })}
          />
          <button onClick={handleUpdate}>Salva Modifiche</button>
          <button onClick={handleDelete}>Elimina Utente</button>
        </div>
      )}
    </div>
  );
};

export default UsersTable;
