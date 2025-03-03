import React from 'react';
import { FaUser, FaSearch, FaEnvelope } from 'react-icons/fa';
import TableManager from './TableManager';


const columnPropertiesData = [
  "UTE_Id_Utenti=1,Id",
  "UTE_IdRif_Utenti=1,IdRif",
  "UTE_NomeUtente=2,Nome utente",
  "UTE_Password=2,Password",
  "UTE_CRC=1,CRC",
  "UTE_Email=2,Email",
  "UTE_Id_GruppiAbilitazioni=2,Gruppo abilitazione",
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

// Parsing del file di proprietà
const columnProps = columnPropertiesData.map(line => {
  const [field, rest] = line.split('=');
  const [flag, label] = rest.split(',');
  return { 
    field, 
    flag: Number(flag), 
    label,
    required: ['UTE_NomeUtente', 'UTE_Email'].includes(field) // Campi obbligatori
  };
});

// Template per nuovo utente
const newUserTemplate = {
  UTE_NomeUtente: "",
  UTE_Password: "",
  UTE_Email: "",
  UTE_Id_GruppiAbilitazioni: "",
  UTE_DurataSessione: ""
};

// Configurazione dei filtri
const filterConfig = [
  {
    field: 'UTE_NomeUtente',
    label: 'Nome utente',
    icon: <FaUser className="text-gray-400" />
  },
  {
    field: 'UTE_Email',
    label: 'Email',
    icon: <FaEnvelope className="text-gray-400" />
  }
];

// Tipi di input
const inputTypes = {
  UTE_Password: 'password',
  UTE_NomeUtente: 'text',
  UTE_Email: 'email',
  UTE_Id_GruppiAbilitazioni: 'number',
  UTE_DurataSessione: 'number'
};

const UsersTable = () => {
  return (
    <TableManager
      tableName="ANS_Utenti"
      columnProps={columnProps}
      primaryKey="UTE_Id_Utenti"
      apiEndpoint="/api/internalUtenti/users"
      title="Gestione Utenti"
      icon={FaUser}
      newRecordTemplate={newUserTemplate}
      filterConfig={filterConfig}
      inputTypes={inputTypes}
    />
  );
};

export default UsersTable;