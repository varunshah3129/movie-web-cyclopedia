import React, { useEffect, useState } from 'react';
import '../css/EntertainmentOptions.css';
import '../css/Genre.css';
import config from "../config";
import axios from "axios";
import Select from "react-select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { renderResults } from "../utils/RenderingUtils";

function EntertainmentOptions({ onOptionChange, onCategoryClick, selectedMediaTypeUrl, onResultsChange }) {
    const [selectedOption, setSelectedOption] = useState('movie'); // Default to Movies
    const [selectedCategory, setSelectedCategory] = useState(''); // Initialize selectedCategory with the default value
    const [selectedGenre, setSelectedGenre] = useState('');
    const [movieGenres, setMovieGenres] = useState([]);
    const [results, setResults] = useState([]);

    const handleOptionChange = (event) => {
        const newOption = event.target.value;
        setSelectedOption(newOption);
        setSelectedCategory(''); // Reset selectedCategory when changing the option
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
        const apiKey = config.apiKey;
        const apiUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`;

        axios
            .get(apiUrl, {
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
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
        const apiKey = config.apiKey;
        const selectedMediaTypeLabel = document.querySelector('input[name="tabs"]:checked + label').textContent;
        console.log(selectedMediaTypeLabel);
        if (selectedMediaTypeLabel === 'Movies') {
            selectedMediaTypeUrl = 'movie';
        } else if (selectedMediaTypeLabel === 'TV Shows') {
            selectedMediaTypeUrl = 'tv';
        }
        if (newGenre !== '') {
            const genreQueryParam = `&with_genres=${newGenre}`;
            const apiUrl = `https://api.themoviedb.org/3/discover/${selectedMediaTypeUrl}?api_key=${apiKey}${genreQueryParam}`;

            const headers = {
                Authorization: `Bearer ${config.apiKey}`,
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
            width: '32px',
            border: state.isFocused ? 0 : 0,
            boxShadow: state.isFocused ? 0 : 0,
            cursor: 'pointer',
            backgroundColor: '#ffffff',
        }),
        menu: (base) => ({
            ...base,
            width: '150px', // Adjust the width as needed
        }),
        dropdownIndicator: (base) => ({
            ...base,
            display: 'none',
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
            width: '150px',
            border: state.isFocused ? 0 : 0,
            boxShadow: state.isFocused ? 0 : 0,
            cursor: 'pointer',
            backgroundColor: '#ffffff',
        }),
        menu: (base) => ({
            ...base,
            width: '150px',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            display: 'none',
            overflow: 'none',
        }),
        valueContainer: (provided, state) => ({
            ...provided,
            overflow: 'none',
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
                            value={selectedGenre ? { value: selectedGenre, label: selectedGenre } : null}
                            onChange={(selectedOption) => handleGenreChange(selectedOption.value)}
                            options={movieGenres.map((genre) => ({
                                value: genre.id,
                                label: genre.name,
                            }))}
                            placeholder={<FontAwesomeIcon icon={faFilter} size="xs" />}
                        />
                    </div>
                </div>
            </div>
            <div className="container">
                {renderResults(results)}
            </div>
        </div>
    );
}

export default EntertainmentOptions;
