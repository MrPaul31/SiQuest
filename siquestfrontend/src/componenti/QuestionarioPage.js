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
  const [focusedDomanda, setFocusedDomanda] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionario = async () => {
      try {
        const response = await endpoint.get(`/api/questionari/${questionarioId}`);
        setQuestionario(response.data);
      } catch (err) {
        setError("❌ Errore durante il caricamento del questionario.");
        console.error(err);
      } finally {
        setTimeout(() => setLoading(false), 800); // Simulate smooth fade-in
      }
    };
    fetchQuestionario();
  }, [questionarioId]);

  const handleRisposta = (domandaId, rispostaPropostaId, testoRisposta) => {
    setRisposte((prev) => ({
      ...prev,
      [domandaId]: {
        RQU_IdRif_RisposteProposte: rispostaPropostaId,
        RQU_TestoRisposta: testoRisposta || null,
      },
    }));
    setFocusedDomanda(domandaId);
  };

  const handleInvio = async () => {
    // Verify that the last question is answered
    if (questionario && questionario.domande.length > 0) {
      const lastDomanda = questionario.domande[questionario.domande.length - 1];
      const lastDomandaId = lastDomanda.DOM_IdRif_DomandeQuestionari;
      
      // Debug: log what is stored for the last answer
      console.log("Answer for last question:", risposte[lastDomandaId]);
      
      // Check if an answer is provided for the last question
      const rispostaUltima = risposte[lastDomandaId];
      if (
        rispostaUltima === undefined ||
        (
          rispostaUltima.RQU_IdRif_RisposteProposte === null &&
          (!rispostaUltima.RQU_TestoRisposta || rispostaUltima.RQU_TestoRisposta === "")
        )
      ) {
        setError("❌ Per favore, rispondi all'ultima domanda prima di inviare il questionario.");
        return;
      }
    }
  
    try {
      const rispostaArray = Object.entries(risposte).map(([domandaId, risposta]) => ({
        RQU_IdRif_Questionari: parseInt(questionarioId, 10),
        RQU_IdRif_DomandeQuestionari: parseInt(domandaId, 10),
        ...risposta,
      }));
      
      await endpoint.post(`/api/questionari/${questionarioId}/risposte`, {
        risposte: rispostaArray,
      });
  
      navigate("/conferma");
    } catch (err) {
      setError("❌ Errore durante l'invio delle risposte.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-blue-50 to-blue-200 animate-fadeIn">
        <p className="text-blue-800 text-lg font-bold animate-pulse">
          Caricamento del questionario...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative bg-gradient-to-t from-blue-100 via-blue-50 to-blue-200 overflow-hidden animate-fadeIn">
      {/* Artistic Background Shapes */}
      <div className="absolute w-96 h-96 bg-blue-400 opacity-10 rounded-full -top-10 left-20"></div>
      <div className="absolute w-80 h-80 bg-yellow-400 opacity-20 rounded-full top-32 -left-16"></div>
      <div className="absolute w-96 h-96 bg-green-400 opacity-10 rounded-full bottom-0 right-0"></div>

      {/* Main container */}
      <div className="relative w-full max-w-4xl bg-white bg-opacity-90 shadow-xl p-8 rounded-lg animate-slideInUp">
        <h1 className="text-4xl font-bold text-blue-800 mb-4">{questionario.QUE_Descrizione}</h1>
        <p className="text-lg text-blue-600 mb-6 leading-relaxed">
          (Il questionario è completamente anonimo)
        </p>
        <p
          className="text-lg text-blue-600 mb-6 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: questionario.QUE_Sottotitoli || "<i>Sottotitolo non disponibile</i>",
          }}
        ></p>

        {/* Questions List */}
        <div className="space-y-6">
          {questionario.domande.map((domanda, index) => {
            const isEven = index % 2 === 0;
            const isFocused = focusedDomanda === domanda.DOM_IdRif_DomandeQuestionari;

            return (
              <div
                key={domanda.DOM_IdRif_DomandeQuestionari}
                className={`relative p-4 bg-white/80 shadow-lg rounded-lg border-l-4 
                  backdrop-blur-md transition-all duration-300 ease-in-out 
                  flex items-start space-x-4 
                  ${isEven ? "border-l-blue-400" : "border-l-yellow-400"}
                  ${isFocused ? "scale-105 ring-4 ring-blue-300" : "opacity-80 hover:opacity-100"}
                `}
                onClick={() => setFocusedDomanda(domanda.DOM_IdRif_DomandeQuestionari)}
              >
                {/* Question Number Badge */}
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full 
                    text-white font-bold text-sm shadow-md ring-2 ring-white
                    ${isEven ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-yellow-500 to-yellow-700"}
                  `}
                >
                  {index + 1}
                </div>

                <div className="flex-1">
                  <Domanda domanda={domanda} onRisposta={handleRisposta} />
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

        {/* Submit Button */}
        <div className="flex justify-end mt-8">
          <BottoneInvio
            onClick={handleInvio}
            className="px-6 py-3 rounded-full text-white bg-blue-600 hover:bg-blue-700 shadow-md focus:ring-2 focus:ring-blue-300 transition-transform duration-300 hover:scale-105"
          >
            Invia Risposte
          </BottoneInvio>
        </div>
      </div>

      {/* Logo Bottom Right */}
      <Immagine
        src="./logoCentroChirurgico.png"
        alt="Logo Centro Chirurgico"
        className="fixed bottom-4 right-4 h-24 w-auto shadow-lg"
      />
    </div>
  );
};

export default QuestionarioPage;
