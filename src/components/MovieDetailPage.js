import React, { useEffect, useState } from 'react';
import '../css/EntertainmentOptions.css';
import '../css/Genre.css';
import config from "../config";
import axios from "axios";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { renderResults } from "../utils/RenderingUtils";

function EntertainmentOptions({ onOptionChange, onCategoryClick, selectedMediaTypeUrl, onResultsChange, handleDropdownClick, selectedItemId, sessionId, selectedOptionGenreId, mediaType }) {
    const [selectedOption, setSelectedOption] = useState(mediaType); // Default to the provided media type
    const [selectedCategory, setSelectedCategory] = useState(''); // Initialize selectedCategory with the default value
    const [selectedGenre, setSelectedGenre] = useState('');
    const [movieGenres, setMovieGenres] = useState([]);
    const [results, setResults] = useState([]);
    const [selectedGenreName, setSelectedGenreName] = useState('');

    const getGenreNameById = (id) => {
        const genre = movieGenres.find((genre) => genre.id === id);
        return genre ? genre.name : "Unknown Genre";
    };

    const handleOptionChange = (event) => {
        const newOption = event.target.value;
        setSelectedOption(newOption);
        setSelectedCategory('');
        onOptionChange(newOption);
    };

    const optionsMovie = [
        { value: 'now_playing', label: 'Now Playing' },
        { value: 'popular', label: 'Popular' },
        { value: 'top_rated', label: 'Top Rated' },
        { value: 'upcoming', label: 'Upcoming' },
    ];

    const optionsTV = [
        { value: 'airing_today', label: 'Airing Today' },
        { value: 'on_the_air', label: 'On The Air' },
        { value: 'popular', label: 'Popular' },
        { value: 'top_rated', label: 'Top Rated' },
    ];

    const handleLabelClick = (option) => {
        if (selectedOption !== option) {
            setSelectedOption(option);
            setSelectedCategory(''); // Reset selectedCategory when changing the option
            onOptionChange(option);
        }
    };

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
        onCategoryClick(selectedOption, category);
    };

    useEffect(() => {
        const apiAccessToken = config.apiAccessToken;
        const apiUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiAccessToken}&language=en-US`;

        axios
            .get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${config.apiAccessToken}`,
                    'Content-Type': 'application/json',
                },
            })
            .then((response) => {
                const genres = response.data.genres;
                setMovieGenres(genres);
            })
            .catch((error) => {
                console.error('Error fetching movie genres:', error);
            });
    }, []);

    const handleGenreChange = (newGenre) => {
        setSelectedGenre(newGenre);

        // Find the name of the selected genre.
        const genreName = movieGenres.find((genre) => genre.id === newGenre)?.name || '';
        setSelectedGenreName(genreName);

        const apiAccessToken = config.apiAccessToken;
        const selectedMediaTypeLabel = document.querySelector('input[name="tabs"]:checked + label').textContent;
        if (selectedMediaTypeLabel === 'Movies') {
            selectedMediaTypeUrl = 'movie';
        } else if (selectedMediaTypeLabel === 'TV Shows') {
            selectedMediaTypeUrl = 'tv';
        }

        if (newGenre !== '') {
            const genreQueryParam = `&with_genres=${newGenre}`;
            const apiUrl = `https://api.themoviedb.org/3/discover/${selectedMediaTypeUrl}?api_key=${apiAccessToken}${genreQueryParam}`;

            const headers = {
                Authorization: `Bearer ${config.apiAccessToken}`,
                'Content-Type': 'application/json',
            };

            axios
                .get(apiUrl, { headers })
                .then((response) => {
                    setResults(response.data.results);
                    onResultsChange(response.data.results);
                })
                .catch((error) => {
                    console.error('Error fetching genre results:', error);
                });
        } else {
            setResults([]);
            onResultsChange([]);
        }
    };


    const customStyles = {
        control: (base, state) => ({
            ...base,
            width: '200px',
            height: "54px",
            border: '0px',
            boxShadow: '0 0 1px 0 rgba(24, 94, 224, 0.15), 0 6px 12px 0 rgba(24, 94, 224, 0.15)',
            cursor: 'pointer',
            padding: '5px',
            backgroundColor: '#ffffff',
            borderRadius: '99px',

        }),
        menu: (base) => ({
            ...base,
            width: '150px',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            overflow: 'none',
        }),
        valueContainer: (provided, state) => ({
            ...provided,
            overflow: 'none',
        }),
    };

    const customStyles_categories = {
        control: (base, state) => ({
            ...base,
            width: '200px',
            height: '54px',
            border: '0px',
            boxShadow: '0 0 1px 0 rgba(24, 94, 224, 0.15), 0 6px 12px 0 rgba(24, 94, 224, 0.15)',
            cursor: 'pointer',
            padding: '5px',
            backgroundColor: '#ffffff',
            borderRadius: '99px',
        }),
        menu: (base) => ({
            ...base,
            width: '150px',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            // display: 'none',
            overflow: 'none',
        }),
        valueContainer: (provided, state) => ({
            ...provided,
            overflow: 'none',
        }),
        indicatorSeparator: (provided, state) => ({
            ...provided,
            display: 'none',
        }),
        indicatorContainer: (provided, state) => ({
            ...provided,
            display: 'none',
        }),
    };

    const formatCategoryLabel = (category) => {
        return category
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="entertainmentOptions">
            <div className="filter-region">
                <div className="tabs">
                    <input
                        type="radio"
                        id="radio-movie"
                        name="tabs"
                        checked={selectedOption === 'movie'}
                        onChange={() => handleLabelClick('movie')}
                    />
                    <label className={`tab ${selectedOption === 'movie' ? 'selected' : ''}`} htmlFor="radio-movie">
                        Movies
                    </label>
                    <input
                        type="radio"
                        id="radio-tv"
                        name="tabs"
                        checked={selectedOption === 'tv'}
                        onChange={() => handleLabelClick('tv')}
                    />
                    <label className={`tab ${selectedOption === 'tv' ? 'selected' : ''}`} htmlFor="radio-tv">
                        TV Shows
                    </label>
                    <span className="glider"></span>
                </div>
                <div className="categorySelect">
                    <Select
                        placeholder="Select Category"
                        styles={customStyles_categories}
                        isSearchable={false}
                        options={selectedOption === 'tv' ? optionsTV : optionsMovie}
                        name={selectedCategory ? formatCategoryLabel(selectedCategory) : ''}
                        formatOptionLabel={({ label }) => formatCategoryLabel(label)}
                        value={selectedCategory ? { value: selectedCategory, label: formatCategoryLabel(selectedCategory) } : null}
                        onChange={(selectedOption) => handleCategoryClick(selectedOption.value)}
                    />
                </div>
                <div className="genre">
                    <div className="genreSelect">
                        <Select
                            styles={customStyles}
                            openMenuOnClick={false}
                            openMenuOnFocus={true}
                            isSearchable={false}
                            name={movieGenres.find(genre => genre.id === selectedGenre)?.name || ''}
                            value={
                                selectedGenre
                                    ? { value: selectedGenre, label: movieGenres.find(genre => genre.id === selectedGenre)?.name }
                                    : null
                            }
                            onChange={(selectedOption) => handleGenreChange(selectedOption.value)}
                            options={movieGenres.map((genre) => ({
                                value: genre.id,
                                label: genre.name,
                            }))}
                        />
                    </div>
                </div>
            </div>
            <div className="container">
                {renderResults(results, handleDropdownClick, selectedItemId, sessionId, selectedMediaTypeUrl, selectedGenre, setSelectedGenre, mediaType)}
            </div>
        </div>
    );
}

export default EntertainmentOptions;
