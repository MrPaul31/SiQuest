import React from 'react';
import PropTypes from 'prop-types';

// Definisce il componente Logo
const Logo = ({ src, alt, className }) => {
  return (
    <img
      src={src || './logoCentroChirurgico.png'} // Percorso predefinito del logo se src non è fornito
      alt={alt || 'Logos'} // Testo alternativo predefinito se alt non è fornito
      className={`h-12 ${className}`} // Applica classi di stile, con altezza predefinita e classi aggiuntive
    />
  );
};

// Definisce i tipi di prop per una migliore usabilità
Logo.propTypes = {
  src: PropTypes.string,        // Percorso dell'immagine del logo
  alt: PropTypes.string,        // Testo alternativo per l'immagine del logo
  className: PropTypes.string,  // Classi Tailwind aggiuntive per lo stile
};

export default Logo; // Esporta il componente Logo