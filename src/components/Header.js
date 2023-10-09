import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../css/Header.css';

function Header() {
    const [selectedWatchlist, setSelectedWatchlist] = useState('movies');
    const [selectedFavorites, setSelectedFavorites] = useState('movies');
    const [watchlistDropdownOpen, setWatchlistDropdownOpen] = useState(false);
    const [favoritesDropdownOpen, setFavoritesDropdownOpen] = useState(false);

    const handleWatchlistClick = (watchlistType) => {
        setSelectedWatchlist(watchlistType);
        setWatchlistDropdownOpen(false);
    };

    const handleFavoritesClick = (favoritesType) => {
        setSelectedFavorites(favoritesType);
        setFavoritesDropdownOpen(false);
    };

    const toggleWatchlistDropdown = () => {
        setWatchlistDropdownOpen(!watchlistDropdownOpen);
    };

    const toggleFavoritesDropdown = () => {
        setFavoritesDropdownOpen(!favoritesDropdownOpen);
    };

    return (
        <header className="app-header">
            <Link to="/" className="logo-inner">
                <span className="letter">M</span>
                <span className="letter">O</span>
                <span className="letter">V</span>
                <span className="letter">I</span>
                <span className="letter">E</span>
                <span className="letter">P</span>
                <span className="letter">E</span>
                <span className="letter">D</span>
                <span className="letter">I</span>
                <span className="letter">A</span>
            </Link>
            <Link className="home" to="/">Home</Link>
            <div className="dropdown-header watchlist-dropdown">
                <button className="dropbtn-header" onClick={toggleWatchlistDropdown}>
                    WatchList
                </button>
                <div className={`dropdown-header-content ${watchlistDropdownOpen ? 'show' : ''}`}>
                    <Link
                        to="/watchlist/movies"
                        onClick={() => handleWatchlistClick('movies')}
                        className={selectedWatchlist === 'movies' ? 'active' : ''}
                    >
                        Movies
                    </Link>
                    <Link
                        to="/watchlist/tv"
                        onClick={() => handleWatchlistClick('tv')}
                        className={selectedWatchlist === 'tv' ? 'active' : ''}
                    >
                        TV Shows
                    </Link>
                </div>
            </div>
            <div className="dropdown-header favorites-dropdown">
                <button className="dropbtn-header" onClick={toggleFavoritesDropdown}>
                    Favorites
                </button>
                <div className={`dropdown-header-content ${favoritesDropdownOpen ? 'show' : ''}`}>
                    <Link
                        to="/favorites/movies"
                        onClick={() => handleFavoritesClick('movies')}
                        className={selectedFavorites === 'movies' ? 'active' : ''}
                    >
                        Movies
                    </Link>
                    <Link
                        to="/favorites/tv"
                        onClick={() => handleFavoritesClick('tv')}
                        className={selectedFavorites === 'tv' ? 'active' : ''}
                    >
                        TV Shows
                    </Link>
                </div>
            </div>
        </header>
    );
}

export default Header;
