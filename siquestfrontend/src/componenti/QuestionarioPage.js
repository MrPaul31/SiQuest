import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Domanda from "./Domanda";
import BottoneInvio from "./BottoneInvio";
import { endpoint } from "./config/AuthContext";
import Immagine from "./Immagine"; // Importa il componente Logo

const QuestionarioPage = () => {
  const { questionarioId } = useParams();
  const navigate = useNavigate();
  const [questionario, setQuestionario] = useState(null);
  const [risposte, setRisposte] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestionario = async () => {
      try {
        const response = await endpoint.get(`/api/questionari/${questionarioId}`);
        setQuestionario(response.data);
      } catch (err) {
        setError("Errore durante il caricamento del questionario.");
        console.error(err);
      }
    };
    fetchQuestionario();
  }, [questionarioId]);

  const handleRisposta = (domandaId, rispostaPropostaId, testoRisposta) => {
    setRisposte((prev) => ({
      ...prev,
      [domandaId]: {
        RQU_Id_RisposteProposte: rispostaPropostaId,
        RQU_TestoRisposta: testoRisposta || null,
      },
    }));
  };

  const handleInvio = async () => {
    try {
      const rispostaArray = Object.entries(risposte).map(([domandaId, risposta]) => ({
        RQU_Id_DomandeQuestionari: parseInt(domandaId, 10),
        ...risposta,
      }));

      await endpoint.post(`/api/questionari/${questionarioId}/risposte`, {
        risposte: rispostaArray,
      });

      navigate("/conferma");
    } catch (err) {
      setError("Errore durante l'invio delle risposte.");
      console.error(err);
    }
  };

  if (!questionario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-blue-50 to-blue-200 relative">
        <div className="absolute w-72 h-72 bg-blue-300 opacity-20 rounded-full top-10 left-10"></div>
        <div className="absolute w-96 h-96 bg-blue-500 opacity-10 rounded-full bottom-10 right-10"></div>
        <p className="text-blue-800 text-lg font-bold">Caricamento del questionario...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-t from-blue-100 via-blue-50 to-blue-200 overflow-hidden">
      {/* Background artistic shapes */}
      <div className="absolute w-96 h-96 bg-blue-400 opacity-10 rounded-full -top-10 left-20"></div>
      <div className="absolute w-80 h-80 bg-yellow-400 opacity-20 rounded-full top-32 -left-16"></div>
      <div className="absolute w-96 h-96 bg-green-400 opacity-10 rounded-full bottom-0 right-0"></div>

      {/* Main container */}
      <div className="relative w-full max-w-4xl bg-white bg-opacity-90 shadow-xl p-8 rounded-lg">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">
          {questionario.QUE_Descrizione}
        </h1>
        <p className="text-lg text-blue-600 mb-6">{questionario.QUE_Sottotitoli}</p>

        <div className="space-y-6">
          {questionario.domande.map((domanda, index) => (
            <Domanda
              key={domanda.DOM_Id_DomandeQuestionari}
              domanda={domanda}
              onRisposta={handleRisposta}
              className={`p-6 bg-white shadow-lg rounded-lg border ${
                index % 2 === 0
                  ? "border-blue-300 ml-4"
                  : "border-yellow-300 mr-4"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
        )}

        <div className="flex justify-end mt-8">
          <BottoneInvio
            onClick={handleInvio}
            className="px-6 py-3 rounded-full text-white bg-blue-600 hover:bg-blue-700 shadow-md focus:ring-2 focus:ring-blue-300"
          >
            Invia Risposte
          </BottoneInvio>
        </div>
      </div>

      {/* Logo in basso a destra */}
      <Immagine
  src="./logoCentroChirurgico.png"
  alt="Logo Centro Chirurgico"
  className="fixed bottom-4 right-4 h-24 w-auto shadow-lg"
/>

    </div>
  );
};

export default QuestionarioPage;
