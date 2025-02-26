import React from "react";

// Definisce il componente BottoneInvio
const BottoneInvio = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick} // Assegna la funzione onClick passata come prop
      className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${className}`} // Applica le classi di stile
    >
      Invia Risposte {/* Testo del bottone */}
    </button>
  );
};

export default BottoneInvio; // Esporta il componente BottoneInvio