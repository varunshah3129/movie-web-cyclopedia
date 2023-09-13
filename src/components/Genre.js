// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import config from '../config';
// import { renderResults } from '../utils/RenderingUtils';
// import '../css/Genre.css';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faFilter } from '@fortawesome/free-solid-svg-icons';
// import Select from 'react-select';
//
// function Genre({ onResultsChange, selectedMediaTypeUrl }) {
//     const [selectedGenre, setSelectedGenre] = useState('');
//     const [movieGenres, setMovieGenres] = useState([]);
//     const [results, setResults] = useState([]);
//
//     useEffect(() => {
//         const apiKey = config.apiKey;
//         const apiUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}&language=en-US`;
//
//         axios
//             .get(apiUrl, {
//                 headers: {
//                     Authorization: `Bearer ${config.apiKey}`,
//                     'Content-Type': 'application/json',
//                 },
//             })
//             .then((response) => {
//                 const genres = response.data.genres;
//                 setMovieGenres(genres);
//             })
//             .catch((error) => {
//                 console.error('Error fetching movie genres:', error);
//             });
//     }, []);
//
//     const handleGenreChange = (newGenre) => {
//         setSelectedGenre(newGenre);
//         const apiKey = config.apiKey;
//         const selectedMediaTypeLabel = document.querySelector('input[name="tabs"]:checked + label').textContent;
//         console.log(selectedMediaTypeLabel);
//         if (selectedMediaTypeLabel === 'Movies') {
//             selectedMediaTypeUrl = 'movie';
//         }
//         else if (selectedMediaTypeLabel === 'TV Shows') {
//             selectedMediaTypeUrl = 'tv';
//         }
//         if (newGenre !== '') {
//             const genreQueryParam = `&with_genres=${newGenre}`;
//             const apiUrl = `https://api.themoviedb.org/3/discover/${selectedMediaTypeUrl}?api_key=${apiKey}${genreQueryParam}`;
//
//             const headers = {
//                 Authorization: `Bearer ${config.apiKey}`,
//                 'Content-Type': 'application/json',
//             };
//
//             axios
//                 .get(apiUrl, { headers })
//                 .then((response) => {
//                     setResults(response.data.results);
//                     onResultsChange(response.data.results);
//                 })
//                 .catch((error) => {
//                     console.error('Error fetching genre results:', error);
//                 });
//         } else {
//             setResults([]);
//             onResultsChange([]);
//         }
//     };
//
//     const customStyles = {
//         control: (base, state) => ({
//             ...base,
//             width: '32px',
//             border: state.isFocused ? 0 : 0,
//             boxShadow: state.isFocused ? 0 : 0,
//             cursor: 'pointer',
//             backgroundColor: '#eee',
//         }),
//         menu: (base) => ({
//             ...base,
//             width: '150px', // Adjust the width as needed
//         }),
//         dropdownIndicator: (base) => ({
//             ...base,
//             display: 'none',
//         }),
//     };
//
//     return (
//         <div className="genre">
//             <div className="genreSelect">
//                 <Select
//                     styles={customStyles}
//                     openMenuOnClick={false}
//                     openMenuOnFocus={true}
//                     isSearchable={false}
//                     value={selectedGenre}
//                     onChange={(selectedOption) => handleGenreChange(selectedOption.value)}
//                     options={movieGenres.map((genre) => ({
//                         value: genre.id,
//                         label: genre.name,
//                     }))}
//                     placeholder={<FontAwesomeIcon icon={faFilter} size="xs" />}
//                 />
//             </div>
//             {renderResults(results)}
//         </div>
//     );
// }
//
// export default Genre;
