// TVShowDetailPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { useParams } from 'react-router-dom';
import Modal from 'react-modal';
import ReactPlayer from 'react-player'; // Import ReactPlayer
import '../css/TVShowDetails.css'; // Import your custom CSS for styling

Modal.setAppElement('#root'); // Set the root element for the Modal

const TVShowDetailPage = () => {
    const { id } = useParams();
    const [tvShowDetails, setTVShowDetails] = useState(null);
    const [trailer, setTrailer] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false); // State to control the modal

    useEffect(() => {
        const fetchTVShowDetails = async () => {
            try {
                const apiKey = config.apiKey;
                const apiUrl = `https://api.themoviedb.org/3/tv/${id}?api_key=${apiKey}&append_to_response=videos`;

                const response = await axios.get(apiUrl, {
                    headers: {
                        Authorization: `Bearer ${config.apiAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const data = response.data;
                setTVShowDetails(data);

                // Extract the trailer key (you may need to adapt this depending on your API response)
                if (data.videos?.results.length > 0) {
                    const trailerKey = data.videos.results[0].key;
                    setTrailer(trailerKey);
                }
            } catch (error) {
                console.error('Error fetching TV show details:', error);
            }
        };

        fetchTVShowDetails();
    }, [id]);

    useEffect(() => {
        if (trailer) {
            setVideoUrl(`https://www.youtube.com/watch?v=${trailer}`);
        }
    }, [trailer]);

    const openTrailerModal = () => {
        setIsTrailerModalOpen(true);
    };

    const closeTrailerModal = () => {
        setIsTrailerModalOpen(false);
    };

    if (!tvShowDetails) {
        return <div>Loading...</div>;
    }

    return (
        <div className="tv-show-details">
            <h1 className="tv-show-title">{tvShowDetails.name}</h1>
            <p className="first-air-date">
                First Air Date: {tvShowDetails.first_air_date}
            </p>
            <p className="genre">
                Genre: {tvShowDetails.genres.map(genre => genre.name).join(', ')}
            </p>
            <p className="episode-runtime">
                Episode Runtime: {tvShowDetails.episode_run_time.join(' min, ')} min
            </p>
            {/* Trailer */}
            {trailer && (
                <div className="trailer">
                    <button onClick={openTrailerModal}>Watch Trailer</button>
                </div>
            )}
            <img
                src={
                    tvShowDetails.poster_path
                        ? `${config.imagesURI}${config.imageSize}${tvShowDetails.poster_path}`
                        : 'fallback_image_url'
                }
                alt={tvShowDetails.name}
                className="poster"
            />
            {/* Other TV show details go here */}
            <div className="user-ratings">
                <p>User Ratings: {tvShowDetails.vote_average}</p>
            </div>
            {/* Reviews */}
            <div className="reviews">
                <p>Reviews: {/* Insert review content here */}</p>
            </div>
            {/* Recommendations */}
            <div className="recommendations">
                <p>Recommendations: {/* Insert recommendation content here */}</p>
            </div>
            {/* Awards and Nominations */}
            <div className="awards">
                <p>Awards and Nominations: {/* Insert awards and nominations content here */}</p>
            </div>
            {/* Trailer Modal */}
            <Modal
                isOpen={isTrailerModalOpen}
                onRequestClose={closeTrailerModal}
                contentLabel="Trailer Modal"
                className="trailer-modal-content"
                overlayClassName="trailer-modal-overlay"
            >
                <div className="trailer-video-container">
                    <ReactPlayer
                        url={videoUrl}
                        controls // Show video controls (play, pause, etc.)
                        width="900px" // Increase the width to make it bigger
                        height="500px" // Increase the height proportionally
                    />
                </div>
                <button className="close-button" onClick={closeTrailerModal}>
                    Close Trailer
                </button>
            </Modal>
        </div>
    );
};

export default TVShowDetailPage;
