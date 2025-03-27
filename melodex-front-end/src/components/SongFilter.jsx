// Filepath: Melodex/melodex-front-end/src/components/SongFilter.jsx
import React, { useState } from 'react';
import { useSongContext } from '../contexts/SongContext';

const genres = [
  { value: '', label: 'Select Genre' },
  { value: 'any', label: 'All Genres' },
  { value: 'Rock', label: 'Rock' },
  { value: 'Pop', label: 'Pop' },
  { value: 'Hip-Hop/Rap', label: 'Hip-Hop/Rap' },
  { value: 'R&B/Soul', label: 'R&B/Soul' },
  { value: 'Electronic Dance Music (EDM)', label: 'Electronic Dance Music (EDM)' },
  { value: 'Country', label: 'Country' },
  { value: 'Reggae/Reggaeton', label: 'Reggae/Reggaeton' },
  { value: 'K-Pop', label: 'K-Pop' },
  { value: 'Jazz', label: 'Jazz' },
  { value: 'Latin Pop', label: 'Latin Pop' },
];

const subgenres = {
  '': [{ value: 'any', label: 'All Subgenres' }],
  'any': [{ value: 'any', label: 'All Subgenres' }],
  'Rock': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Classic Rock', label: 'Classic Rock' },
    { value: 'Grunge', label: 'Grunge' },
    { value: 'Alternative Rock', label: 'Alternative Rock' },
    { value: 'Indie Rock', label: 'Indie Rock' },
    { value: 'Punk Rock', label: 'Punk Rock' },
  ],
  'Pop': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Teen Pop', label: 'Teen Pop' },
    { value: 'Dance-Pop', label: 'Dance-Pop' },
    { value: 'Indie Pop', label: 'Indie Pop' },
    { value: 'Synth-Pop', label: 'Synth-Pop' },
  ],
  'Hip-Hop/Rap': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Gangsta Rap', label: 'Gangsta Rap' },
    { value: 'Trap', label: 'Trap' },
    { value: 'Conscious Rap', label: 'Conscious Rap' },
    { value: 'Pop Rap', label: 'Pop Rap' },
  ],
  'R&B/Soul': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Contemporary R&B', label: 'Contemporary R&B' },
    { value: 'Neo-Soul', label: 'Neo-Soul' },
    { value: 'Hip-Hop Soul', label: 'Hip-Hop Soul' },
  ],
  'Electronic Dance Music (EDM)': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'House', label: 'House' },
    { value: 'Dubstep', label: 'Dubstep' },
    { value: 'Trance', label: 'Trance' },
    { value: 'Techno', label: 'Techno' },
  ],
  'Country': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Country Pop', label: 'Country Pop' },
    { value: 'Alt-Country', label: 'Alt-Country' },
    { value: 'Bro-Country', label: 'Bro-Country' },
  ],
  'Reggae/Reggaeton': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Roots Reggae', label: 'Roots Reggae' },
    { value: 'Reggaeton', label: 'Reggaeton' },
  ],
  'K-Pop': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Bubblegum Pop K-Pop', label: 'Bubblegum Pop K-Pop' },
    { value: 'Modern K-Pop', label: 'Modern K-Pop' },
  ],
  'Jazz': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Smooth Jazz', label: 'Smooth Jazz' },
    { value: 'Jazz Fusion', label: 'Jazz Fusion' },
  ],
  'Latin Pop': [
    { value: 'any', label: 'All Subgenres' },
    { value: 'Salsa Pop', label: 'Salsa Pop' },
    { value: 'Latin Trap', label: 'Latin Trap' },
  ],
};

const decades = {
  '': [{ value: 'all decades', label: 'All Decades' }],
  'any': [{ value: 'all decades', label: 'All Decades' }],
  'Rock': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1960', label: '1960s' },
    { value: '1970', label: '1970s' },
    { value: '1980', label: '1980s' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Pop': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1980', label: '1980s' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Hip-Hop/Rap': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'R&B/Soul': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Electronic Dance Music (EDM)': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Country': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Reggae/Reggaeton': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1970', label: '1970s' },
    { value: '1980', label: '1980s' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'K-Pop': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Jazz': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1970', label: '1970s' },
    { value: '1980', label: '1980s' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
  'Latin Pop': [
    { value: 'all decades', label: 'All Decades' },
    { value: '1990', label: '1990s' },
    { value: '2000', label: '2000s' },
    { value: '2010', label: '2010s' },
    { value: '2020', label: '2020s' },
  ],
};

const SongFilter = ({ onApply, isRankPage, onHide }) => {
  const { setSelectedGenre } = useSongContext();
  const [selectedGenre, setLocalGenre] = useState(isRankPage ? '' : 'any');
  const [selectedSubgenre, setSelectedSubgenre] = useState('any');
  const [selectedDecade, setSelectedDecade] = useState('all decades');

  const handleGenreChange = (e) => {
    setLocalGenre(e.target.value);
    setSelectedSubgenre('any');
    setSelectedDecade('all decades');
  };

  const handleApplyClick = () => {
    const genreToApply = selectedGenre || 'any';
    setSelectedGenre(genreToApply);
    const filters = {
      genre: genreToApply,
      subgenre: selectedSubgenre || 'any',
      decade: isRankPage ? (selectedDecade || 'all decades') : 'all decades',
    };
    console.log('SongFilter applying filters:', filters);
    if (typeof onApply === 'function') {
      onApply(filters);
    } else {
      console.error('onApply is not a function');
    }
  };

  // Filter genres: exclude "All Genres" for /rank, exclude "Select Genre" for /rerank and /rankings
  const genreOptions = isRankPage
    ? genres.filter(genre => genre.value !== 'any')
    : genres.filter(genre => genre.value !== '');

  return (
    <div className="song-filter-container" style={{ marginTop: '0.8em', marginBottom: '0.8em', display: 'flex', justifyContent: 'center', width: '100%' }}>
      <select
        value={selectedGenre}
        onChange={handleGenreChange}
        style={{
          marginRight: '10px',
          padding: '5px 5px',
          backgroundColor: '#f4f7fa',
          border: '1px solid #141820',
          borderRadius: '8px',
          color: '#141820',
          fontSize: '1rem',
          fontFamily: 'Inter, Arial, sans-serif',
          cursor: 'pointer',
          transition: 'border-color 0.3s ease, background-color 0.3s ease',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#3498db')}
        onBlur={(e) => (e.target.style.borderColor = '#141820')}
        onMouseOver={(e) => (e.target.style.backgroundColor = '#ecf0f1')}
        onMouseOut={(e) => (e.target.style.backgroundColor = '#f4f7fa')}
      >
        {genreOptions.map((genre) => (
          <option key={genre.value} value={genre.value}>
            {genre.label}
          </option>
        ))}
      </select>
      <select
        value={selectedSubgenre}
        onChange={(e) => setSelectedSubgenre(e.target.value)}
        disabled={!selectedGenre}
        style={{
          marginRight: '10px',
          padding: '5px 5px',
          backgroundColor: selectedGenre ? '#f4f7fa' : '#ecf0f1',
          border: '1px solid #141820',
          borderRadius: '8px',
          color: '#141820',
          fontSize: '1rem',
          fontFamily: 'Inter, Arial, sans-serif',
          cursor: selectedGenre ? 'pointer' : 'not-allowed',
          transition: 'border-color 0.3s ease, background-color 0.3s ease',
        }}
        onFocus={(e) => selectedGenre && (e.target.style.borderColor = '#3498db')}
        onBlur={(e) => (e.target.style.borderColor = '#141820')}
        onMouseOver={(e) => selectedGenre && (e.target.style.backgroundColor = '#ecf0f1')}
        onMouseOut={(e) => selectedGenre && (e.target.style.backgroundColor = '#f4f7fa')}
      >
        {subgenres[selectedGenre]?.map((sub) => (
          <option key={sub.value} value={sub.value}>
            {sub.label}
          </option>
        ))}
      </select>
      {isRankPage && (
        <select
          value={selectedDecade}
          onChange={(e) => setSelectedDecade(e.target.value)}
          disabled={!selectedGenre}
          style={{
            marginRight: '10px',
            padding: '5px 5px',
            backgroundColor: selectedGenre ? '#f4f7fa' : '#ecf0f1',
            border: '1px solid #141820',
            borderRadius: '8px',
            color: '#141820',
            fontSize: '1rem',
            fontFamily: 'Inter, Arial, sans-serif',
            cursor: selectedGenre ? 'pointer' : 'not-allowed',
            transition: 'border-color 0.3s ease, background-color 0.3s ease',
          }}
          onFocus={(e) => selectedGenre && (e.target.style.borderColor = '#3498db')}
          onBlur={(e) => (e.target.style.borderColor = '#141820')}
          onMouseOver={(e) => selectedGenre && (e.target.style.backgroundColor = '#ecf0f1')}
          onMouseOut={(e) => selectedGenre && (e.target.style.backgroundColor = '#f4f7fa')}
        >
          {decades[selectedGenre]?.map((decade) => (
            <option key={decade.value} value={decade.value}>
              {decade.label}
            </option>
          ))}
        </select>
      )}
      <button
        onClick={handleApplyClick}
        disabled={isRankPage && !selectedGenre}
        style={{
          padding: '5px 10px',
          backgroundColor: (isRankPage && !selectedGenre) ? '#bdc3c7' : '#7f8c8d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontFamily: 'Inter, Arial, sans-serif',
          cursor: (isRankPage && !selectedGenre) ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease',
        }}
        onMouseOver={(e) => !(isRankPage && !selectedGenre) && (e.target.style.backgroundColor = '#95a5a6')}
        onMouseOut={(e) => !(isRankPage && !selectedGenre) && (e.target.style.backgroundColor = '#7f8c8d')}
      >
        Apply
      </button>
    </div>
  );
};

export default SongFilter;