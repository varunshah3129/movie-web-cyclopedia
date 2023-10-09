import React, { useState, useEffect, useRef } from 'react';
import config from '../config';
import { getClassByRate } from './utils';
import '../css/DropDown.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faBookmark, faHeart } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import ModalMessage from "../components/ModalMessage";
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

export function renderResults(results, handleDropdownClick, selectedItemId, sessionId, selectedMediaTypeUrl, selectedGenre, setSelectedGenre, mediaType) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [openDropdownIds, setOpenDropdownIds] = useState({});
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [modalOpen, setModalOpen] = useState(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [modalMessage, setModalMessage] = useState('');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const dropdownContentRef = useRef(null);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [genres, setGenres] = useState([]);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [selectedOptionGenreId, setSelectedOptionGenreId] = useState(null);

    const handleGenreSelection = (genreId) => {
        setSelectedOptionGenreId(genreId);
    };

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
                setOpenDropdownIds({});
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

    const toggleDropdown = (itemId, resultIndex) => {
        setOpenDropdownIds((prevIds) => ({
            ...prevIds,
            [`${itemId}_${resultIndex}`]: !prevIds[`${itemId}_${resultIndex}`],
        }));
    };

    const toggleModal = () => {
        setModalOpen((prevModalOpen) => !prevModalOpen);
    };

    const handleDropdownButtonClick = (itemId, resultIndex) => {
        toggleDropdown(itemId, resultIndex);
    };

    const handleAddToWatchlist = (itemId, itemTitle) => {
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
                if (data.status_code === 1 && data.status_message === 'Success.') {
                    setModalMessage(`${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} added to watchlist successfully.`);
                    toggleModal();
                } else if (data.status_code === 12 && data.status_message === 'The item/record was updated successfully.') {
                    setModalMessage(`${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} is already added to watchlist.`);
                    toggleModal();
                } else {
                    setModalMessage(`Error adding ${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} to watchlist.`);
                    toggleModal('error'); // Specify the messageType as 'error'
                }
            })
            .catch((error) => {
                setModalMessage(`Error adding ${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} to watchlist.`);
                toggleModal('error'); // Specify the messageType as 'error'
            });
    };

    const handleAddToFavorites = (itemId, itemTitle) => {
        const apiKey = config.apiAccessToken;
        const sessionId = localStorage.getItem('sessionID');

        const selectedMediaTypeLabel = document.querySelector('input[name="tabs"]:checked + label').textContent;
        let selectedMediaTypeUrl = '';

        if (selectedMediaTypeLabel === 'Movies') {
            selectedMediaTypeUrl = 'movie';
        } else if (selectedMediaTypeLabel === 'TV Shows') {
            selectedMediaTypeUrl = 'tv';
        }

        if (!sessionId) {
            console.error('Session ID not found in localStorage');
            return;
        }

        const apiUrl = `https://api.themoviedb.org/3/account/${config.accountId}/favorite`;

        const requestBody = {
            media_type: `${selectedMediaTypeUrl}`,
            media_id: itemId,
            favorite: true,
        };

        axios
            .post(apiUrl, requestBody, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                params: {
                    session_id: sessionId,
                },
            })
            .then((response) => response.data)
            .then((data) => {
                if (data.status_code === 1) {
                    setModalMessage(`${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} added to favorite successfully.`);
                    toggleModal();
                } else if (data.status_code === 12) {
                    setModalMessage(`${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} is already added to favorite.`);
                    toggleModal();
                } else {
                    setModalMessage(`Error adding ${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} to favorite.`);
                    toggleModal('error'); // Specify the messageType as 'error'
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                setModalMessage(`Error adding ${selectedMediaTypeUrl.toUpperCase()}:  ${itemTitle} to favorite.`);
                toggleModal('error'); // Specify the messageType as 'error'
            });
    };

    const getGenreNameById = (genreId) => {
        const genre = genres && genres.find((g) => g.id === genreId);
        return genre ? genre.name : 'Genre not found';
    };

    const resultsByGenre = {};

    if (Array.isArray(results)) {
        results.forEach((result) => {
            result.genre_ids.forEach((genreId) => {
                if (!resultsByGenre[genreId]) {
                    resultsByGenre[genreId] = [];
                }
                resultsByGenre[genreId].push(result);
            });
        });
    }

    const renderGenreResults = () => {
        if (selectedGenre === null || selectedGenre === undefined || selectedGenre === "") {
            return Object.keys(resultsByGenre).map((genreId, index) => (
                <div key={index} className={`genre_results ${selectedGenre ? 'hidden' : ''}`} id="not_genre_selected">
                    <h2>
                        Genre: {selectedOptionGenreId ? getGenreNameById(selectedOptionGenreId) : getGenreNameById(parseInt(genreId))}
                    </h2>
                    <div className="horizontal_scroll">
                        <ul className={`show_list_ul ${selectedGenre ? 'hidden' : ''}`} id={`genreUl_${genreId}`}>
                            {resultsByGenre[genreId] && resultsByGenre[genreId].map((result, resultIndex) => (
                                <li key={resultIndex} className="show_list_item">
                                    <div className={`dropdown ${openDropdownIds[`${result.id}_${resultIndex}`] ? 'open' : ''}`}>
                                        <button
                                            className="dropdown-btn"
                                            onClick={() => handleDropdownButtonClick(result.id, resultIndex)}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisVertical} />
                                        </button>
                                        <div className="movie-link">
                                            {/* Add Link Component */}
                                             <Link to={`/${mediaType}/${result.id}`}>
                                                <img
                                                    src={
                                                        result.poster_path
                                                            ? `${config.imagesURI}${config.imageSize}${result.poster_path}`
                                                            : 'fallback_image_url'
                                                    }
                                                    alt={result.title || result.name}
                                                />
                                            </Link>
                                            <div className="movie_info">
                                                <h3>{result.title || result.name}</h3>
                                                {result.release_date && (
                                                    <div className="release_date" style={{ display: 'block' }}>
                                                        <h4>Release Date:</h4>
                                                        <p>{result.release_date}</p>
                                                    </div>
                                                )}
                                                <span className={getClassByRate(result.vote_average)}>
                                                    {result.vote_average}
                                                </span>
                                            </div>
                                            <div className="overview">
                                                <h3>Overview</h3>
                                                <p>{result.overview}</p>
                                            </div>
                                        </div>
                                        {openDropdownIds[`${result.id}_${resultIndex}`] && (
                                            <div className="dropdown-content" ref={dropdownContentRef}>
                                                <button onClick={() => handleAddToWatchlist(result.id, result.title)}>
                                                    <FontAwesomeIcon icon={faBookmark} /> Add to Watchlist
                                                </button>
                                                <button onClick={() => handleAddToFavorites(result.id, result.title)}>
                                                    <FontAwesomeIcon icon={faHeart} /> Favorite
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ));
        } else {
            return (
                <div className={`genre_results ${selectedGenre ? 'show' : ''}`} id={`genre_selected_${selectedGenre}`}>
                    <h2>
                        Genre: {selectedOptionGenreId ? getGenreNameById(selectedOptionGenreId) : getGenreNameById(parseInt(selectedGenre))}
                    </h2>
                    <div className="horizontal_scroll">
                        <ul className={`show_list_ul ${selectedGenre ? '' : 'hidden'}`} id={`genreUl_selected_${selectedGenre}`}>
                            {resultsByGenre[selectedGenre] && resultsByGenre[selectedGenre].map((result, resultIndex) => (
                                <li key={resultIndex} className="show_list_item">
                                    <div className={`dropdown ${openDropdownIds[`${result.id}_${resultIndex}`] ? 'open' : ''}`}>
                                        <button
                                            className="dropdown-btn"
                                            onClick={() => handleDropdownButtonClick(result.id, resultIndex)}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisVertical} />
                                        </button>
                                        <div className="movie-link">
                                            {/* Add Link Component */}
                                             <Link to={`/${mediaType}/${result.id}`}>
                                                <img
                                                    src={
                                                        result.poster_path
                                                            ? `${config.imagesURI}${config.imageSize}${result.poster_path}`
                                                            : 'fallback_image_url'
                                                    }
                                                    alt={result.title || result.name}
                                                />
                                            </Link>
                                            <div className="movie_info">
                                                <h3>{result.title || result.name}</h3>
                                                {result.release_date && (
                                                    <div className="release_date" style={{ display: 'block' }}>
                                                        <h4>Release Date:</h4>
                                                        <p>{result.release_date}</p>
                                                    </div>
                                                )}
                                                <span className={getClassByRate(result.vote_average)}>
                                                    {result.vote_average}
                                                </span>
                                            </div>
                                            <div className="overview">
                                                <h3>Overview</h3>
                                                <p>{result.overview}</p>
                                            </div>
                                        </div>
                                        {openDropdownIds[`${result.id}_${resultIndex}`] && (
                                            <div className="dropdown-content" ref={dropdownContentRef}>
                                                <button onClick={() => handleAddToWatchlist(result.id, result.title)}>
                                                    <FontAwesomeIcon icon={faBookmark} /> Add to Watchlist
                                                </button>
                                                <button onClick={() => handleAddToFavorites(result.id, result.title)}>
                                                    <FontAwesomeIcon icon={faHeart} /> Favorite
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className={`movie_results ${selectedGenre ? 'hidden' : ''}`}>
            {renderGenreResults()}
            {modalOpen && (
                <ModalMessage
                    isOpen={modalOpen}
                    closeModal={() => setModalOpen(false)}
                    messageType={modalMessage.startsWith('Error') ? 'error' : 'success'}
                    message={modalMessage}
                />
            )}
        </div>
    );
}
