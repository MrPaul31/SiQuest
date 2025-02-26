import React, { useState, useEffect } from "react";
import DataFetcher from "./config/DataFetcher";
import { endpoint } from "./config/AuthContext";

const RicercaRisposteQuestionari = () => {
  const [filtro, setFiltro] = useState({
    questionarioId: "1",
    dataInizio: new Date().toISOString().split("T")[0],
    dataFine: new Date().toISOString().split("T")[0],
  });
  const [questionarioDescrizione, setQuestionarioDescrizione] = useState("Questionario soddisfazione pazienti");
  const [questionari, setQuestionari] = useState([]);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchQuestionari = async () => {
      try {
        const response = await endpoint.post("/dataHandling/risposteQuestionari", {
          tableName: "ANS_Questionari",
        });
        if (response.data && response.data.data) {
          setQuestionari(response.data.data);
        }
      } catch (error) {
        console.error("❌ Errore nel recupero dei questionari:", error);
      }
    };
    fetchQuestionari();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltro((prevFiltro) => {
      let newFiltro = { ...prevFiltro, [name]: value };

      if (name === "dataInizio" && newFiltro.dataFine && newFiltro.dataFine < value) {
        newFiltro.dataFine = value;
      }
      return newFiltro;
    });

    if (e.target.name === "questionarioId") {
      const selected = questionari.find(
        (q) => String(q.QUE_IdRif_Questionari) === value
      );
      setQuestionarioDescrizione(selected ? selected.QUE_Descrizione : "");
    }
  };

  const avviaRicerca = () => {
    if (!filtro.dataInizio || !filtro.dataFine) {
      alert("Selezionare entrambe le date per il filtro!");
      return;
    }
    setIsSearching(true);
    setTimeout(() => {
      setSearchTrigger((prev) => prev + 1);
      setIsSearching(false);
    }, 500);
  };

  const buildFilter = () => ({
    filtro: {
      ...(questionarioDescrizione && { QUE_Descrizione: questionarioDescrizione }),
      ...(filtro.dataInizio &&
        filtro.dataFine && {
          RQU_DataOraInserimento: {
            between: [`${filtro.dataInizio} 00:00:00`, `${filtro.dataFine} 23:59:59`],
          },
        }),
    },
  });

  return (
    <div className="flex flex-col h-screen p-6 bg-white shadow-lg rounded-lg transition-all duration-300">
      <h2 className="text-2xl font-bold text-blue-800 mb-4">Ricerca Risposte Questionari</h2>

      {/* 🔹 Sezione Filtri */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔎 Filtri di Ricerca</h3>
        <div className="grid grid-cols-4 gap-4">
       
          <div className="flex flex-col group h-24">
            <label htmlFor="questionarioId" className="mb-1 text-sm font-bold text-gray-700 uppercase tracking-wide">
              Questionario
            </label>
            <select
              name="questionarioId"
              value={filtro.questionarioId || "Questionario soddisfazione pazienti"}
              onChange={handleChange}
              className="border p-2 rounded text-lg w-full shadow-sm focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out group-hover:bg-gray-50 group-hover:scale-[1.02]"
            >
              <option value="Questionario soddisfazione pazienti">Seleziona un'altro questionario</option>
              {questionari.map((q) => (
                <option key={q.QUE_IdRif_Questionari} value={q.QUE_IdRif_Questionari}>
                  {q.QUE_Descrizione}
                </option>
              ))}
            </select>
            {filtro.questionarioId === "Questionario soddisfazione pazienti" && (
              <small className="text-xs text-gray-600 mt-1">
                Per poter scaricare le risposte è selezionare un questionario specifico
              </small>
            )}
          </div>

          {/* Data Inizio */}
          <div className="flex flex-col group">
            <label htmlFor="dataInizio" className="mb-1 text-sm font-bold text-gray-700">
              Data risposta inserita dal:
            </label>
            <input
              type="date"
              name="dataInizio"
              value={filtro.dataInizio || new Date().toISOString().split("T")[0]}
              onChange={handleChange}
              className="border p-2 rounded text-lg w-full shadow-sm focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out group-hover:bg-gray-50 group-hover:scale-[1.02]"
            />
          </div>

          {/* Data Fine */}
          <div className="flex flex-col group">
            <label htmlFor="dataFine" className="mb-1 text-sm font-bold text-gray-700">
              Data risposta inserita al:
            </label>
            <input
              type="date"
              name="dataFine"
              value={filtro.dataFine || new Date().toISOString().split("T")[0]}
              onChange={handleChange}
              min={filtro.dataInizio }
              className="border p-2 rounded text-lg w-full shadow-sm focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out group-hover:bg-gray-50 group-hover:scale-[1.02]"
            />
          </div>

          {/* Pulsante Ricerca */}
          <div className="flex items-end">
            <button
              onClick={avviaRicerca}
              className={`w-full px-4 py-2 text-white rounded shadow-md transition-all duration-300 text-lg flex items-center justify-center gap-2 transform hover:scale-[1.05] hover:bg-gradient-to-r hover:from-blue-600 hover:to-blue-700 ${isSearching ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600"}`}
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <span className="animate-spin h-5 w-5 border-t-2 border-white rounded-full"></span>
                  Ricerca...
                </>
              ) : (
                "🔍 Cerca"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 🔹 Divider */}
      <hr className="my-6 border-gray-300" />

      {/* 🔹 Risultati */}
      <div className="flex-grow overflow-auto bg-gray-50 p-4 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02]">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Risultati della Ricerca</h3>
        <DataFetcher
          key={searchTrigger}
          tableName="ANS_RisposteQuestionari"
          body={buildFilter()}
          descrizione={questionarioDescrizione}
        />
      </div>
    </div>
  );
};

export default RicercaRisposteQuestionari;