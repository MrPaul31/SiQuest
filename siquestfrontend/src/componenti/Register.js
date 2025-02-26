import React, { useState, useContext } from "react";
import { AuthContext } from "./config/AuthContext";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "./config/ErrorMessage"; // if you wish to display error messages

const Register = () => {
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);
    try {
      await register(username, password, email);
      // After successful registration, navigate to login page or auto login.
      navigate("/login");
    } catch (error) {
      if (error.response && error.response.data.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage("Si è verificato un errore durante la registrazione.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50">
      {/* Registration Form Section */}
      <div className="lg:flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Registrazione</h2>
          <p className="text-sm text-blue-600 mb-6">
            Inserisci i tuoi dati per creare un nuovo account
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
                htmlFor="email"
                className="block text-sm font-medium text-blue-700"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                {loading ? "Registrazione..." : "Registrati"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Optionally, add a branding section similar to Login */}
      <div className="lg:flex-1 flex items-center justify-center bg-gradient-to-t from-blue-100 via-blue-50 to-white">
        <div className="text-center">
          {/* You may re-use the image component or add any branding here */}
          <h3 className="text-lg font-semibold text-blue-800">
            Benvenuto nel nostro sistema!
          </h3>
          <p className="text-sm text-blue-600">
            Crea il tuo account per iniziare
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;