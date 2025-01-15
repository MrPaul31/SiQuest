import React from "react";
import { useNavigate } from "react-router-dom";

const Menu = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-64 bg-white shadow-lg flex flex-col justify-start">
      {/* Sidebar Content */}
      <nav className="mt-6 space-y-1">
        <button
          onClick={() => navigate("/")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Home
        </button>
        <button
          onClick={() => navigate("/questionari/1")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Questionari
        </button>
        <button
          onClick={() => navigate("/crudQuestionari")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Crud Questionari
        </button>
        <button
          onClick={() => navigate("/risposteQuestionari")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Risposte Questionari
        </button>
        <button
          onClick={() => navigate("/risposteProposte")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Risposte Proposte
        </button>
        <button
          onClick={() => navigate("/utenti")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Utenti
        </button>
        <button
          onClick={() => navigate("/impostazioni")}
          className="w-full text-left px-6 py-3 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
        >
          Impostazioni
        </button>
      </nav>
    </div>
  );
};

export default Menu;
