import React, { useState } from 'react';
import Label from '../Label.js';
import Immagine from '../Immagine.js'; 
import {endpoint} from './AuthContext.js'; // Verify the correct path


const Config = () => {
    const [nomeUtente, setNomeUtente] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validatePassword = (password) => {
            const regex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
            return regex.test(password);
        };
        
        if (!validatePassword(password)) {
            setErrorMessage('La password deve contenere almeno 8 caratteri, un numero e una lettera maiuscola.');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage('Le password non corrispondono');
            return;
        }

        try {
            const response = await endpoint.post('/utenteins', {
                username: nomeUtente,
                email,
                password: password,
            });
            setSuccessMessage('Utente amministratore registrato con successo!');
            setErrorMessage('');
        } catch (error) {
            console.error('Error response:', error.response);
            if (error.response && error.response.status === 400) {
                setErrorMessage('Nome utente già in uso. Scegli un altro nome utente. ' + error.response.data.message);
            } else {
                setErrorMessage('Errore durante la registrazione: ' + error.message);
            }
            setSuccessMessage('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-t from-red-900 via-red-800 to-brown-700 relative">
            <div className="absolute top-4 flex justify-center w-full z-10">
                <Immagine className="h-20 w-90" />
            </div>

            <div className="bg-brown-900 rounded-lg shadow-lg p-8 w-full max-w-md border border-brown-700 relative z-10">
                <h2 className="text-2xl font-bold text-center text-white">Crea un Nuovo Account</h2>
                <p className="text-sm font-bold text-center text-white mb-6">
                    Compila il modulo per registrarti al sistema
                </p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <Label htmlFor="nomeUtente">Nome Utente</Label>
                        <input
                            type="text"
                            id="nomeUtente"
                            value={nomeUtente}
                            onChange={(e) => setNomeUtente(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-brown-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm bg-brown-800 text-red-100"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="email">E-mail</Label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-brown-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm bg-brown-800 text-red-100"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="password">Password</Label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-brown-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm bg-brown-800 text-red-100"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="confirmPassword">Conferma Password</Label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-brown-700 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm bg-brown-800 text-red-100"
                            required
                        />
                    </div>

                    {errorMessage && (
                        <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
                    )}
                    {successMessage && (
                        <p className="text-green-500 text-sm mt-2">{successMessage}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Registrati
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Config;
