import { Link } from "react-router-dom";

function PaginaDescrizione() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">Descrizione del Questionario</h2>
      <p className="text-gray-700 leading-relaxed mb-6">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut 
        labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris 
        nisi ut aliquip ex ea commodo consequat.
      </p>
      <Link to="/questionari/1">
        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md shadow-sm">
          Vai al Questionario #1
        </button>
      </Link>
    </div>
  );
}

export default PaginaDescrizione;
