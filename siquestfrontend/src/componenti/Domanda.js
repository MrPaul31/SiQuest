import React, { useState } from "react";

const Domanda = ({ domanda, onRisposta }) => {
  const [testoLibero, setTestoLibero] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [isTestoLiberoSelected, setIsTestoLiberoSelected] = useState(false);

  // Deduplicate the risposte array to ensure no duplicates in rendering
  const risposte = domanda.risposte
    ? Array.from(
        new Map(
          domanda.risposte.map((r) => [r.RPR_TestoRisposta + r.RPR_Ordinamento, r])
        ).values()
      )
    : [];

  const handleRadioChange = (event) => {
    const rispostaId = parseInt(event.target.value, 10);
    setSelectedOption(rispostaId);
    setTestoLibero('');
    setIsTestoLiberoSelected(false);
    onRisposta(domanda.DOM_Id_DomandeQuestionari, rispostaId, null);
  };

  const handleTestoLibero = (event) => {
    const newTesto = event.target.value;
    setTestoLibero(newTesto);
    onRisposta(domanda.DOM_Id_DomandeQuestionari, null, newTesto);
  };

  const handleTestoLiberoSelection = () => {
    setSelectedOption(null);
    setIsTestoLiberoSelected(true);
    onRisposta(domanda.DOM_Id_DomandeQuestionari, null, testoLibero);
  };

  const renderRisposta = () => {
    switch (domanda.DOM_TipoDomanda) {
      case 1:
        return (
          <input
            type="text"
            value={testoLibero}
            onChange={handleTestoLibero}
            className="w-full p-2 border rounded-md"
            placeholder="Inserisci la tua risposta..."
          />
        );

      case 2:
        return (
          <div className="space-y-2">
            {risposte.map((risposta) => (
              <label key={risposta.RPR_Id_RisposteProposte} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`domanda-${domanda.DOM_Id_DomandeQuestionari}`}
                  value={risposta.RPR_Id_RisposteProposte}
                  onChange={handleRadioChange}
                  checked={selectedOption === risposta.RPR_Id_RisposteProposte}
                />
                <span>{risposta.RPR_TestoRisposta}</span>
              </label>
            ))}
          </div>
        );

      case 3:
      case 5:
        return (
          <>
            <div className="space-y-2 mb-4">
              {risposte.map((risposta) => (
                <label key={risposta.RPR_Id_RisposteProposte} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={`domanda-${domanda.DOM_Id_DomandeQuestionari}`}
                    value={risposta.RPR_Id_RisposteProposte}
                    onChange={handleRadioChange}
                    checked={selectedOption === risposta.RPR_Id_RisposteProposte}
                  />
                  <span>{risposta.RPR_TestoRisposta}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name={`domanda-${domanda.DOM_Id_DomandeQuestionari}`}
                onChange={handleTestoLiberoSelection}
                checked={isTestoLiberoSelected}
              />
              <input
                type="text"
                value={testoLibero}
                onChange={handleTestoLibero}
                disabled={!isTestoLiberoSelected}
                placeholder="Specificare..."
                className="w-full p-2 border rounded-md"
              />
            </div>
          </>
        );

      default:
        return <p>Tipo domanda non supportato</p>;
    }
  };

  return (
    <div className="bg-white text-blue-800 rounded-md p-4 shadow-lg border border-blue-300 mb-4">
      <h3 className="text-lg font-semibold mb-2">{domanda.DOM_Descrizione}</h3>
      {renderRisposta()}
    </div>
  );
};

export default Domanda;
