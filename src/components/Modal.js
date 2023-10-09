import React, { useEffect } from 'react';
import '../css/Modal.css';

const Modal = ({ isOpen, onRequestClose, onAuthenticate }) => {
    useEffect(() => {
        function onKeyDown(event) {
            if (event.keyCode === 27) {
                onRequestClose(); // Close the modal when the Escape key is pressed
            }
        }

        // Prevent scrolling when the modal is open
        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
        document.addEventListener('keydown', onKeyDown);

        return () => {
            // Restore scrolling when the modal is closed
            document.body.style.overflow = 'auto';
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onRequestClose]);

    return (
        <div className={`modal__backdrop__main ${isOpen ? 'open' : ''}`}>
            <div className="modal__container__main">
                <h4 className="modal__title">Authenticate</h4>
                <button type="button" onClick={onRequestClose}>
                    Close this modal
                </button>
                <button type="button" onClick={onAuthenticate}>
                    Authenticate
                </button>
                <div className="placeholder" />
                <div className="placeholder" />
                <div className="placeholder medium" />
                <div className="placeholder" />
            </div>
        </div>
    );
};

export default Modal;
