import React from 'react';

// Definisce il componente Label
const Label = ({ htmlFor, children }) => {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children} {/* Contenuto del label */}
    </label>
  );
};

export default Label; // Esporta il componente Label