import React from "react";
import Immagine from "./Immagine";

const PaginaConferma = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-t from-blue-100 via-blue-50 to-blue-200 relative p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center relative border-t-4 border-brown-800 border-b-4 border-green-500 border-l-4 border-blue-800 border-r-4 border-yellow-500">
        <h1 className="text-3xl font-bold text-blue-800 mb-4">
          Grazie per aver completato il questionario!
        </h1>
        <p className="text-sm font-bold text-blue-600">
          Le tue risposte sono state inviate con successo.
        </p>
      </div>

      {/* Logo at the Bottom-Left */}
      <div className="absolute bottom-4 left-4">
        <Immagine className="h-16 w-auto" />
      </div>
    </div>
  );
};

export default PaginaConferma;
