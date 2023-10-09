import React, { useEffect } from 'react';
import '../css/ModalMessage.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClose, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

const ModalMessage = ({ isOpen, closeModal, message, messageType }) => {
    useEffect(() => {
        function onKeyDown(event) {
            if (event.keyCode === 27) {
                closeModal();
            }
        }

        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = 'auto';
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, closeModal]);

    // Determine the message color based on messageType
    const getColorClass = () => {
        if (messageType === 'success') {
            return 'success';
        } else if (messageType === 'error') {
            return 'error';
        }
        // Default to error if messageType is not recognized
        return 'error';
    };

    // Determine the icon and additional classes based on messageType
    const getIconAndAdditionalClasses = () => {
        if (messageType === 'success') {
            return { icon: faCheckCircle, additionalClasses: 'success-icon' };
        } else if (messageType === 'error') {
            return { icon: faExclamationCircle, additionalClasses: 'error-icon' };
        }
        // Default to error if messageType is not recognized
        return { icon: faExclamationCircle, additionalClasses: 'error-icon' };
    };

    const { icon, additionalClasses } = getIconAndAdditionalClasses();

    return (
        isOpen && (
            <div className="modal__backdrop">
                <div className={`modal__container ${getColorClass()}`}>
                    <button type="button" onClick={closeModal}>
                        <FontAwesomeIcon icon={faClose} />
                    </button>
                    <p>
                        <FontAwesomeIcon icon={icon} className={additionalClasses} /> {message}
                    </p>
                </div>
            </div>
        )
    );
};

export default ModalMessage;
