import React, { useState, useEffect } from 'react';
import EntertainmentSearch from './components/EntertainmentSearch';
import Modal from './components/Modal';
import Header from './components/Header';
import './css/App.css';
import axios from 'axios';
import config from './config';

// Function to get the request token
const getRequestToken = async (apiKey) => {
    const apiUrl = `https://api.themoviedb.org/3/authentication/token/new`;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        const requestToken = response.data.request_token;
        console.log(requestToken);
        return requestToken;
    } catch (error) {
        throw new Error('Error getting request token:', error);
    }
};

// Function to get the session ID
const getSessionId = async (requestToken) => {
    const apiKey = config.apiKey;
    const apiUrl = `https://api.themoviedb.org/3/authentication/session/new`;

    const requestData = {
        request_token: requestToken,
    };

    console.log(requestToken);

    const headers = {
        Authorization: `Bearer ${apiKey}`,
        accept: 'application/json',
        'content-type': 'application/json',
    };

    try {
        const response = await axios.post(apiUrl, requestData, { headers });

        if (response.status === 200) {
            const sessionId = response.data.session_id;
            console.log('Session ID obtained:', sessionId);
            return sessionId;
        } else {
            throw new Error(`Error getting session ID. Status Code: ${response.status}`);
        }
    } catch (error) {
        console.error('Error getting session ID:', error);
    }
};
export function App() {
    const [sessionID, setSessionID] = useState(localStorage.getItem('sessionID'));
    const [showModal, setShowModal] = useState(!sessionID);

    const handleAuthenticateClick = async () => {
        // Session ID is missing, show the authentication modal
        const apiKey = config.apiKey;

        try {
            const requestToken = await getRequestToken(apiKey);
            const authUrl = `https://www.themoviedb.org/authenticate/${requestToken}`;

            const popup = window.open(
                authUrl,
                'AuthPopup',
                'width=600,height=400'
            );

            // Check if the popup has been closed
            const checkPopupClosed = setInterval(async () => {
                if (!popup || popup.closed || popup.closed === undefined) {
                    clearInterval(checkPopupClosed);
                    // Continue with session and watchlist logic
                    const sessionId = await getSessionId(requestToken);
                    setSessionID(sessionId);
                    localStorage.setItem('sessionID', sessionId);
                    console.log('localStorage sessionID set:', sessionId);

                    // Add a debug statement here
                    console.log('Closing the modal');
                    setShowModal(false);
                }
            }, 1000);
        } catch (error) {
            console.error('Error opening authentication popup:', error);
        }
    };

    const clearLocalStorage = () => {
        localStorage.removeItem('sessionID'); // Remove the session ID from local storage
        setSessionID(null); // Reset the session ID state
        console.log('localStorage sessionID has been cleared.');
    };

    return (
        <div className="app-container">
            <Header />
            <main className="app-main">
                <div className="content-container">
                    <EntertainmentSearch />
                </div>
            </main>
            <div>
                {sessionID && (
                    <button onClick={clearLocalStorage}>Clear localStorage</button>
                )}
            </div>
            <footer className="app-footer">
                <p>&copy; {new Date().getFullYear()} MOVIEPEDIA. All rights reserved.</p>
            </footer>
            {sessionID === null && (
                <Modal
                    isOpen={showModal}
                    onRequestClose={() => setShowModal(false)}
                    onAuthenticate={handleAuthenticateClick}
                />
            )}
        </div>
    );
}


export default App;
