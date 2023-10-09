import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import config from '../config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisVertical, faBookmark, faHeart } from '@fortawesome/free-solid-svg-icons';
import { getClassByRate } from '../utils/utils';
import ModalMessage from '../components/ModalMessage';

const WatchList = ({ type }) => {
    const [watchlist, setWatchlist] = useState([]);
    const [openDropdownWatchListId, setopenDropdownWatchListId] = useState(null);
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
        setWatchlist([]);
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
        const watchlistType = selectedType === 'tv' ? 'tv' : 'movies';
        const options = {
            method: 'GET',
            url: `https://api.themoviedb.org/3/account/20375500/watchlist/${watchlistType}`,
            params: {
                language: 'en-US',
                page: currentPage,
                sort_by: 'created_at.desc',
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
                const watchlistData = response.data.results;
                setWatchlist((prevWatchlist) => [...prevWatchlist, ...watchlistData]);
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

    const clearWatchlist = () => {
        setWatchlist([]);
    };

    const removeItemFromWatchlist = (itemId) => {
        const apiAccessToken = config.apiKey;
        const sessionId = localStorage.getItem('sessionID');
        const type = 'movie';

        const requestData = {
            media_type: type,
            media_id: itemId,
            watchlist: false,
        };

        axios
            .post(`https://api.themoviedb.org/3/account/20375500/watchlist?api_key=${apiAccessToken}&session_id=${sessionId}`, requestData, {
                headers: {
                    Authorization: `Bearer ${apiAccessToken}`,
                    'Content-Type': 'application/json',
                },
            })
            .then(function (response) {
                const updatedWatchlist = watchlist.filter((item) => item.id !== itemId);
                setWatchlist(updatedWatchlist);
                setModalMessage('Movie removed from watchlist successfully');
                setModalOpen(true); // Open the modal to show the success message
                // Set messageType to 'success' for the green color
                setTimeout(() => {
                    setModalMessage('');
                    setModalOpen(false); // Close the modal after a few seconds
                }, 3000);
            })
            .catch(function (error) {
                console.error('Error removing item from watchlist:', error);
                setModalMessage('Error removing item from watchlist');
                setModalOpen(true); // Open the modal to show the error message
                // Set messageType to 'error' for the red color
                setTimeout(() => {
                    setModalMessage('');
                    setModalOpen(false); // Close the modal after a few seconds
                }, 3000);
            });
    };

    return (
        <div>
            <h2>My {selectedType === 'tv' ? 'TV Shows' : 'Movies'} Watchlist</h2>
            {modalMessage && (
                <ModalMessage
                    isOpen={modalOpen}
                    closeModal={() => setModalOpen(false)}
                    message={modalMessage}
                    messageType={modalMessage.startsWith('Movie removed') ? 'success' : 'error'}
                />
            )}
            <ul className="show_list_ul">
                {watchlist.map((item, index) => (
                    <li key={index} className="show_list_item">
                        <div className={`dropdown ${openDropdownWatchListId === item.id ? 'open' : ''}`}>
                            <button
                                className="dropdown-btn"
                                onClick={() => setopenDropdownWatchListId(item.id)}
                            >
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                            </button>
                            {openDropdownWatchListId === item.id && (
                                <div className="dropdown-content">
                                    <button onClick={() => removeItemFromWatchlist(item.id)}>
                                        <FontAwesomeIcon icon={faBookmark} /> Remove
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

export default WatchList;
