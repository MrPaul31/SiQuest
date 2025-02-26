import React, { useState } from "react";

const Domanda = ({ domanda, onRisposta }) => {
  const [testoLibero, setTestoLibero] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [isTestoLiberoSelected, setIsTestoLiberoSelected] = useState(false);

  // Deduplicate the risposte array
  const risposte = domanda.risposte
    ? Array.from(
        new Map(
          domanda.risposte.map((r) => [r.RPR_TestoRisposta + r.RPR_Ordinamento, r])
        ).values()
      )
    : [];

  const handleRadioChange = (event) => {
    const rispostaId = parseInt(event.currentTarget.value, 10);
    if (selectedOption === rispostaId) {
      // Toggle off if already selected.
      setSelectedOption(null);
      onRisposta(domanda.DOM_IdRif_DomandeQuestionari, null, null);
    } else {
      setSelectedOption(rispostaId);
      setTestoLibero('');
      setIsTestoLiberoSelected(false);
      onRisposta(domanda.DOM_IdRif_DomandeQuestionari, rispostaId, null);
    }
  };

  const handleTestoLibero = (event) => {
    const newTesto = event.target.value;
    setTestoLibero(newTesto);
    onRisposta(domanda.DOM_IdRif_DomandeQuestionari, null, newTesto);
  };

  const handleTestoLiberoSelection = () => {
    if (isTestoLiberoSelected) {
      setIsTestoLiberoSelected(false);
      onRisposta(domanda.DOM_IdRif_DomandeQuestionari, null, null);
    } else {
      setSelectedOption(null);
      setIsTestoLiberoSelected(true);
      onRisposta(domanda.DOM_IdRif_DomandeQuestionari, null, testoLibero);
    }
  };

  const renderRisposta = () => {
    switch (domanda.DOM_TipoDomanda) {
      case 1:
  return (
    <div className="flex flex-col">
      <textarea
        value={testoLibero}
        onChange={handleTestoLibero}
        placeholder="Inserisci la tua risposta..."
        rows={4} // puoi regolare le righe iniziali
        className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm 
                   focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:bg-gray-200 transition-all resize-none"
      />
    </div>
  );

      case 2:
        return (
          <div className="space-y-1">
            {risposte.map((risposta) => (
              <label
                key={risposta.RPR_IdRif_RisposteProposte}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 transition p-2 rounded-md cursor-pointer text-sm"
              >
                <input
                  type="radio"
                  name={`domanda-${domanda.DOM_IdRif_DomandeQuestionari}`}
                  value={risposta.RPR_IdRif_RisposteProposte}
                  onClick={handleRadioChange}
                  checked={selectedOption === risposta.RPR_IdRif_RisposteProposte}
                  className="peer hidden"
                />
                <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center transition peer-checked:border-blue-500 peer-checked:bg-blue-500">
                  {selectedOption === risposta.RPR_IdRif_RisposteProposte && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-gray-800">{risposta.RPR_TestoRisposta}</span>
              </label>
            ))}
          </div>
        );

      case 3:
        return (
          <>
            <div className="space-y-1 mb-2">
              {risposte.map((risposta) => (
                <label
                  key={risposta.RPR_IdRif_RisposteProposte}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 transition p-2 rounded-md cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name={`domanda-${domanda.DOM_IdRif_DomandeQuestionari}`}
                    value={risposta.RPR_IdRif_RisposteProposte}
                    onClick={handleRadioChange}
                    checked={selectedOption === risposta.RPR_IdRif_RisposteProposte}
                    className="peer hidden"
                  />
                  <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center transition peer-checked:border-blue-500 peer-checked:bg-blue-500">
                    {selectedOption === risposta.RPR_IdRif_RisposteProposte && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-800">{risposta.RPR_TestoRisposta}</span>
                </label>
              ))}
            </div>
            {/* Container a colonna per forzare il free text su una nuova riga */}
            <div className="flex flex-col space-y-2">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name={`domanda-${domanda.DOM_IdRif_DomandeQuestionari}`}
                  onClick={handleTestoLiberoSelection}
                  checked={isTestoLiberoSelected}
                  className="peer hidden"
                />
                <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center transition peer-checked:border-blue-500 peer-checked:bg-blue-500">
                  {isTestoLiberoSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
              </label>
              <textarea
  value={testoLibero}
  onChange={handleTestoLibero}
  onFocus={() => {
    if (!isTestoLiberoSelected) {
      handleTestoLiberoSelection();
    }
  }}
  disabled={!isTestoLiberoSelected}
  placeholder="Specificare..."
  rows={3} // puoi regolare il numero di righe iniziali
  className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:bg-gray-200 transition-all resize-none"
/>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <div className="space-y-1 mb-2">
              {risposte.map((risposta) => (
                <label
                  key={risposta.RPR_IdRif_RisposteProposte}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 transition p-2 rounded-md cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name={`domanda-${domanda.DOM_IdRif_DomandeQuestionari}`}
                    value={risposta.RPR_IdRif_RisposteProposte}
                    onClick={handleRadioChange}
                    checked={selectedOption === risposta.RPR_IdRif_RisposteProposte}
                    className="peer hidden"
                  />
                  <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center transition peer-checked:border-blue-500 peer-checked:bg-blue-500">
                    {selectedOption === risposta.RPR_IdRif_RisposteProposte && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-800">{risposta.RPR_TestoRisposta}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name={`domanda-${domanda.DOM_IdRif_DomandeQuestionari}`}
                onClick={handleTestoLiberoSelection}
                checked={isTestoLiberoSelected}
                className="peer hidden"
              />
              <div className="w-4 h-4 border border-gray-400 rounded-full flex items-center justify-center transition peer-checked:border-blue-500 peer-checked:bg-blue-500">
                {isTestoLiberoSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <input
                type="text"
                value={testoLibero}
                onChange={handleTestoLibero}
                disabled={!isTestoLiberoSelected}
                placeholder="Specificare..."
                className="w-full p-1 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:bg-gray-200 transition-all"
              />
            </div>
          </>
        );

      default:
        return <p className="text-red-500">Tipo domanda non supportato</p>;
    }
  };

  return (
    <div className="bg-white text-blue-800 rounded-md p-3 shadow-md border border-blue-300 mb-3">
      <h3 className="text-sm font-semibold mb-2">{domanda.DOM_Descrizione}</h3>
      {renderRisposta()}
    </div>
  );
};

export default Domanda;
