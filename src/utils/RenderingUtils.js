import React, { useState, useEffect, useRef } from 'react';
import config from '../config';
import { getClassByRate } from './utils';
import '../css/DropDown.css';
import '../css/Modal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faBookmark, faHeart } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios'; // Import Axios

export function renderResults(results, handleDropdownClick, selectedItemId, sessionId, selectedMediaTypeUrl) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [openDropdownId, setOpenDropdownId] = useState(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [modalOpen, setModalOpen] = useState(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [modalMessage, setModalMessage] = useState('');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const dropdownContentRef = useRef(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [genres, setGenres] = useState([]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
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

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownContentRef.current && !dropdownContentRef.current.contains(event.target)) {
                setOpenDropdownId(null);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const apiKey = config.apiKey;
                const apiUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`;

                const response = await axios.get(apiUrl, {
                    headers: {
                        Authorization: `Bearer ${config.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = response.data;
                setGenres(data.genres);
            } catch (error) {
                console.error('Error fetching genres:', error);
            }
        };

        fetchGenres();
    }, []);

    const toggleDropdown = (itemId) => {
        setOpenDropdownId((prevId) => (prevId === itemId ? null : itemId));
    };

    const toggleModal = () => {
        setModalOpen((prevModalOpen) => !prevModalOpen);
    };

    const handleDropdownButtonClick = (itemId) => {
        toggleDropdown(itemId);
    };

    const handleAddToWatchlist = (itemId) => {
        const apiKey = config.apiKey;
        const sessionId = localStorage.getItem('sessionID');
        const selectedMediaTypeLabel = document.querySelector('input[name="tabs"]:checked + label').textContent;
        let selectedMediaTypeUrl = '';

        if (selectedMediaTypeLabel === 'Movies') {
            selectedMediaTypeUrl = 'movie';
        } else if (selectedMediaTypeLabel === 'TV Shows') {
            selectedMediaTypeUrl = 'tv';
        }

        fetch(`https://api.themoviedb.org/3/account/${config.accountId}/watchlist?api_key=${apiKey}&session_id=${sessionId}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                accept: 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                media_type: `${selectedMediaTypeUrl}`,
                media_id: itemId,
                watchlist: true,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status_code === 1) {
                    setModalMessage('Movie added to watchlist successfully.');
                    toggleModal();
                } else {
                    console.error('Error adding movie to watchlist:', data.status_message);
                    setModalMessage('Error adding movie to watchlist.');
                    toggleModal();
                }
            })
            .catch((error) => {
                console.error('Error adding movie to watchlist:', error);
                setModalMessage('Error adding movie to watchlist.');
                toggleModal();
            });
    };

    const handleAddToFavorites = (itemId) => {
        // Make an API call to add the item to favorites
        // You can use the TMDB API for this, following their documentation
        // Example: axios.post('TMDB_API_URL_HERE', { itemId })
    };

    const getGenreNameById = (genreId) => {
        const genre = genres && genres.find((g) => g.id === genreId);
        return genre ? genre.name : 'Genre not found';
    };

    const resultsByGenre = {};

    results.forEach((result) => {
        result.genre_ids.forEach((genreId) => {
            if (!resultsByGenre[genreId]) {
                resultsByGenre[genreId] = [];
            }
            resultsByGenre[genreId].push(result);
        });
    });

    return (
        <div className="movie_results">
            {Object.keys(resultsByGenre).map((genreId, index) => (
                <div key={index} className="genre_results">
                    <h2>Genre: {getGenreNameById(parseInt(genreId))}</h2>
                    <div className="horizontal_scroll">
                        <ul className="show_list_ul" id={`genreUl_${genreId}`}>
                            {resultsByGenre[genreId].map((result, resultIndex) => (
                                <li key={resultIndex} className="show_list_item">
                                    <div className={`dropdown ${openDropdownId === result.id ? 'open' : ''}`}>
                                        <button
                                            className="dropdown-btn"
                                            onClick={() => handleDropdownButtonClick(result.id)}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisVertical} />
                                        </button>
                                        {openDropdownId === result.id && (
                                            <div className="dropdown-content" ref={dropdownContentRef}>
                                                <button onClick={() => handleAddToWatchlist(result.id)}>
                                                    <FontAwesomeIcon icon={faBookmark} /> Add to Watchlist
                                                </button>
                                                <button onClick={() => handleAddToFavorites(result.id)}>
                                                    <FontAwesomeIcon icon={faHeart} /> Favorite
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <img
                                        src={
                                            result.poster_path
                                                ? `${config.imagesURI}${config.imageSize}${result.poster_path}`
                                                : 'fallback_image_url'
                                        }
                                        alt={result.title || result.name}
                                    />
                                    <div className="movie_info">
                                        <h3>{result.title || result.name}</h3>
                                        <div className="release_date" style={{ display: 'block' }}>
                                            <h4>Release Date:</h4>
                                            <p>{result.release_date}</p>
                                        </div>
                                        <span className={getClassByRate(result.vote_average)}>
                                            {result.vote_average}
                                        </span>
                                    </div>
                                    <div className="overview">
                                        <h3>Overview</h3>
                                        <p>{result.overview}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
            {modalOpen && (
                <div className="modal__backdrop">
                    <div className="modal__container">
                        <button type="button" onClick={() => setModalOpen(false)}>
                            Close this modal
                        </button>
                        <div className="placeholder" />
                        <div className="placeholder" />
                        <div className="placeholder medium" />
                        <div className="placeholder" />
                        <p>{modalMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
