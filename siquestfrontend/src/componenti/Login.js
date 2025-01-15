import React, { useState, useContext } from "react";
import { AuthContext } from "./config/AuthContext";
import ErrorMessage from "./config/ErrorMessage";
import Immagine from "./Immagine";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setErrorMessage(
          error.response.data.message || "Nome utente o password errati"
        );
      } else {
        setErrorMessage("Si è verificato un errore. Riprova più tardi.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50">
      {/* Login Form Section */}
      <div className="lg:flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Benvenuto</h2>
          <p className="text-sm text-blue-600 mb-6">
            Effettua l'accesso per accedere ai nostri servizi
          </p>

          <ErrorMessage message={errorMessage} />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-blue-700"
              >
                Nome Utente
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-blue-700"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-700 text-white rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Caricamento..." : "Accedi"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Branding Section */}
      <div className="lg:flex-1 flex items-center justify-center bg-gradient-to-t from-blue-100 via-blue-50 to-white">
        <div className="text-center">
          <Immagine className="h-40 w-64 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800">
            Centro Chirurgico Toscano
          </h3>
          <p className="text-sm text-blue-600">
            La chirurgia della migliore qualità possibile
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
