import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faBookmark, faHeart } from '@fortawesome/free-solid-svg-icons';
import { getClassByRate } from '../utils/utils';
import ModalMessage from '../components/ModalMessage';

const Favorites = ({ type }) => {
    const [favorites, setFavorites] = useState([]);
    const [openDropdownFavoritesId, setOpenDropdownFavoritesId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const lastItemRef = useRef(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedType, setSelectedType] = useState(type);

    const sessionId = localStorage.getItem('sessionID');

    useEffect(() => {
        setSelectedType(type);
        setCurrentPage(1);
        setFavorites([]);
    }, [type]);

    useEffect(() => {
        function onKeyDown(event) {
            if (event.keyCode === 27) {
                setModalOpen(false);
            }
        }

        document.body.style.overflow = modalOpen ? 'hidden' : 'auto';
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = 'auto';
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [modalOpen]);

    useEffect(() => {
        const favoritesType = selectedType === 'tv' ? 'tv' : 'movies';
        const options = {
            method: 'GET',
            url: `https://api.themoviedb.org/3/account/20375500/favorite/${favoritesType}`,
            params: {
                language: 'en-US',
                page: currentPage,
                sort_by: 'created_at.asc',
                session_id: sessionId,
            },
            headers: {
                Authorization: `Bearer ${config.apiAccessToken}`,
                'Content-Type': 'application/json',
            },
        };

        axios
            .request(options)
            .then(function (response) {
                const favoritesData = response.data.results;
                setFavorites((prevFavorites) => [...prevFavorites, ...favoritesData]);
                setLoadingMore(false);
                setTotalPages(response.data.total_pages);
            })
            .catch(function (error) {
                console.error(error);
            });
    }, [selectedType, sessionId, currentPage]);

    const loadMoreItems = () => {
        if (!loadingMore && currentPage < totalPages) {
            setLoadingMore(true);
            setCurrentPage((prevPage) => prevPage + 1);
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreItems();
                }
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 1.0,
            }
        );

        if (lastItemRef.current) {
            observer.observe(lastItemRef.current);
        }

        return () => {
            if (lastItemRef.current) {
                observer.unobserve(lastItemRef.current);
            }
        };
    }, [loadingMore, currentPage, totalPages]);

    const clearFavorites = () => {
        setFavorites([]);
    };

    const removeItemFromFavorites = (itemId) => {
        const apiAccessToken = config.apiKey;
        const sessionId = localStorage.getItem('sessionID');
        const type = 'movie';

        const requestData = {
            media_type: type,
            media_id: itemId,
            favorite: false,
        };

        axios
            .post(`https://api.themoviedb.org/3/account/20375500/favorite?api_key=${apiAccessToken}&session_id=${sessionId}`, requestData, {
                headers: {
                    Authorization: `Bearer ${apiAccessToken}`,
                    'Content-Type': 'application/json',
                },
            })
            .then(function (response) {
                const updatedFavorites = favorites.filter((item) => item.id !== itemId);
                setFavorites(updatedFavorites);
                setModalMessage('Movie removed from favorites successfully');
                setModalOpen(true); // Open the modal to show the success message
                setTimeout(() => {
                    setModalMessage('');
                    setModalOpen(false); // Close the modal after a few seconds
                }, 3000);
            })
            .catch(function (error) {
                console.error('Error removing item from favorites:', error);
                setModalMessage('Error removing item from favorites');
                setModalOpen(true); // Open the modal to show the error message
                setTimeout(() => {
                    setModalMessage('');
                    setModalOpen(false); // Close the modal after a few seconds
                }, 3000);
            });
    };

    return (
        <div>
            <h2>My {selectedType === 'tv' ? 'TV Shows' : 'Movies'} Favorites</h2>
            {modalMessage && (
                <ModalMessage
                    isOpen={modalOpen}
                    closeModal={() => setModalOpen(false)}
                    message={modalMessage}
                    messageType={modalMessage.startsWith('Movie removed') ? 'success' : 'error'}
                />
            )}
            <ul className="show_list_ul">
                {favorites.map((item, index) => (
                    <li key={index} className="show_list_item">
                        <div className={`dropdown ${openDropdownFavoritesId === item.id ? 'open' : ''}`}>
                            <button
                                className="dropdown-btn"
                                onClick={() => setOpenDropdownFavoritesId(item.id)}
                            >
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                            </button>
                            {openDropdownFavoritesId === item.id && (
                                <div className="dropdown-content">
                                    <button onClick={() => removeItemFromFavorites(item.id)}>
                                        <FontAwesomeIcon icon={faHeart} /> Remove
                                    </button>
                                </div>
                            )}
                        </div>
                        <img
                            src={
                                item.poster_path
                                    ? `${config.imagesURI}${config.imageSize}${item.poster_path}`
                                    : 'fallback_image_url'
                            }
                            alt={item.title || item.name}
                        />
                        <div className="movie_info">
                            <h3>{item.title || item.name}</h3>
                            {item.release_date && (
                                <div className="release_date" style={{ display: 'block' }}>
                                    <h4>Release Date:</h4>
                                    <p>{item.release_date}</p>
                                </div>
                            )}
                            <span className={getClassByRate(item.vote_average)}>{item.vote_average}</span>
                        </div>
                        <div className="overview">
                            <h3>Overview</h3>
                            <p>{item.overview}</p>
                        </div>
                    </li>
                ))}
                {currentPage < totalPages && <div ref={lastItemRef} />}
            </ul>
            {loadingMore && <div>Loading more items...</div>}
        </div>
    );
};

export default Favorites;
