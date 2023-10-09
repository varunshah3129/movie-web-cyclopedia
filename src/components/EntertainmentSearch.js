import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import '../css/EntertainmentSearch.css';
import EntertainmentOptions from './EntertainmentOptions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { renderResults } from '../utils/RenderingUtils';

function EntertainmentSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedOption, setSelectedOption] = useState('movie');
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showGoToTop, setShowGoToTop] = useState(false);

    useEffect(() => {
        // Fetch all movies when the component mounts
        fetchAllMedia('movie');
    }, []);

    useEffect(() => {
        // Fetch new results when the page changes
        if (selectedOption === 'movie' || selectedOption === 'tv') {
            fetchAllMedia(selectedOption);
        }
    }, [page, selectedOption]);

    useEffect(() => {
        // Add an event listener to detect scrolling
        window.addEventListener('scroll', handleScroll);
        return () => {
            // Remove the event listener when the component unmounts
            window.removeEventListener('scroll', handleScroll);
        };
    }, [loadingMore]);

    const handleScroll = useCallback(() => {
        // Detect when the user is near the bottom of the page
        if (
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 &&
            !loadingMore
        ) {
            // Load more results when near the bottom and not currently loading
            loadMoreResults();
        }

        // Show/hide "Go to Top" button after a certain scroll position
        if (window.scrollY > 400) {
            setShowGoToTop(true);
        } else {
            setShowGoToTop(false);
        }
    }, [loadingMore]);

    const loadMoreResults = () => {
        setLoadingMore(true);
        setPage((prevPage) => prevPage + 1);
    };

    const fetchResults = (mediaType, category) => {
        let url;

        if (mediaType === 'search') {
            // Handle the normal search query
            url = `/search/multi`; // Assuming multi-search endpoint
        } else {
            switch (mediaType) {
                case 'movie':
                    url = `/movie/${category}`;
                    break;
                case 'tv':
                    url = `/tv/${category}`;
                    break;
                default:
                    break;
            }

            // Clear the search input when fetching category-specific results
            setQuery('');
        }

        if (url) {
            // Construct the correct URL with the access token
            const apiUrl = `${config.baseURL}${url}`;

            // Create the query parameters object
            const queryParams = {
                api_key: config.apiAccessToken,
            };

            // Add a query parameter if a search query is provided
            if (query) {
                queryParams.query = query;
            }

            axios
                .get(apiUrl, {
                    params: queryParams,
                    headers: {
                        Authorization: `Bearer ${config.apiAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
                .then((response) => {
                    if (page === 1) {
                        // If it's the first page, replace the existing results
                        setResults(response.data.results);
                    } else {
                        // If it's a subsequent page, append new results to the existing ones
                        setResults((prevResults) => [...prevResults, ...response.data.results]);
                    }
                    setLoadingMore(false); // Mark loading as complete
                })
                .catch((error) => {
                    console.error('Error fetching results:', error);
                });
        }
    };

    const handleDropdownClick = (itemId) => {
        if (selectedItemId === itemId) {
            setSelectedItemId(null); // Close the dropdown if it's already open
        } else {
            setSelectedItemId(itemId); // Open the dropdown for the selected item
        }
    };

    const handleOptionChange = (option) => {
        setSelectedOption(option);
        setResults([]); // Clear previous results when changing options
        setPage(1); // Reset the page to 1 when changing options

        // Fetch all movies or TV shows when 'Movies' or 'TV Shows' is selected
        if (option === 'movie' || option === 'tv') {
            fetchAllMedia(option);
        }
    };

    const handleCategoryClick = (mediaType, category) => {
        setPage(1); // Reset the page to 1 when a category is selected
        fetchResults(mediaType, category);
    };

    const fetchAllMedia = (mediaType) => {
        let url;

        if (mediaType === 'movie') {
            url = '/discover/movie'; // Fetch all movies
        } else if (mediaType === 'tv') {
            url = '/discover/tv'; // Fetch all TV shows
        }

        if (url) {
            // Construct the correct URL with the access token
            const apiUrl = `${config.baseURL}${url}`;

            // Create the query parameters object
            const queryParams = {
                api_key: config.apiAccessToken,
                include_adult: 'false',
                include_video: 'false',
                language: 'en-US',
                page: page.toString(), // Use the current page
                sort_by: 'popularity.desc',
            };

            axios
                .get(apiUrl, {
                    params: queryParams,
                    headers: {
                        Authorization: `Bearer ${config.apiAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
                .then((response) => {
                    if (page === 1) {
                        // If it's the first page, replace the existing results
                        setResults(response.data.results);
                    } else {
                        // If it's a subsequent page, append new results to the existing ones
                        setResults((prevResults) => [...prevResults, ...response.data.results]);
                    }
                    setLoadingMore(false); // Mark loading as complete
                })
                .catch((error) => {
                    console.error('Error fetching results:', error);
                });
        }
    };

    const handleSearch = () => {
        // Trigger a normal search query
        fetchResults('search', 'search');
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth', // Smooth scrolling animation
        });
    };

    return (
        <div className="entertainmentSearch">
            <EntertainmentOptions
                onOptionChange={handleOptionChange}
                onCategoryClick={handleCategoryClick}
                mediaType={selectedOption} // Pass the selected media type to EntertainmentOptions
            />
            <div className="searchContainer">
                <div className="searchBar">
                    <input
                        placeholder="Search"
                        type="text"
                        onChange={(e) => setQuery(e.target.value)}
                        value={query}
                    />
                    <div className="searchButton">
                        <button onClick={handleSearch}>
                            <FontAwesomeIcon icon={faSearch} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="container">
                {renderResults(results, handleDropdownClick, selectedItemId)}
                {loadingMore && <p>Loading more...</p>}
                {showGoToTop && (
                    <button className="goToTopButton" onClick={scrollToTop}>
                        <FontAwesomeIcon icon={faArrowUp} />
                    </button>
                )}
            </div>
        </div>
    );
}

export default EntertainmentSearch;
