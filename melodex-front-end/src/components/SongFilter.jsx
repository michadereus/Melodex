// Filepath: Melodex/melodex-front-end/src/components/SongFilter.jsx
import React, { useState } from 'react';
import { useSongContext } from '../contexts/SongContext';

const genres = [
  'Rock', 'Pop', 'Hip-Hop/Rap', 'R&B/Soul', 'Electronic Dance Music (EDM)',
  'Country', 'Reggae/Reggaeton', 'K-Pop', 'Jazz', 'Latin Pop'
];

const subgenres = {
  'Rock': ['Classic Rock', 'Grunge', 'Alternative Rock', 'Indie Rock', 'Punk Rock'],
  'Pop': ['Teen Pop', 'Dance-Pop', 'Indie Pop', 'Synth-Pop'],
  'Hip-Hop/Rap': ['Gangsta Rap', 'Trap', 'Conscious Rap', 'Pop Rap'],
  'R&B/Soul': ['Contemporary R&B', 'Neo-Soul', 'Hip-Hop Soul'],
  'Electronic Dance Music': ['House', 'Dubstep', 'Trance', 'Techno'],
  'Country': ['Country Pop', 'Alt-Country', 'Bro-Country'],
  'Reggae/Reggaeton': ['Roots Reggae', 'Reggaeton'],
  'K-Pop': ['Bubblegum Pop K-Pop', 'Modern K-Pop'],
  'Jazz': ['Smooth Jazz', 'Jazz Fusion'],
  'Latin Pop': ['Salsa Pop', 'Latin Trap'],
};

const decades = {
  'Rock': ['1960', '1970', '1980', '1990', '2000', '2010', '2020'],
  'Pop': ['1980', '1990', '2000', '2010', '2020'],
  'Hip-Hop/Rap': ['1990', '2000', '2010', '2020'],
  'R&B/Soul': ['1990', '2000', '2010', '2020'],
  'Electronic Dance Music (EDM)': ['1990', '2000', '2010', '2020'],
  'Country': ['1990', '2000', '2010', '2020'],
  'Reggae/Reggaeton': ['1970', '1980', '1990', '2000', '2010', '2020'],
  'K-Pop': ['1990', '2000', '2010', '2020'],
  'Jazz': ['1970', '1980', '1990', '2000', '2010', '2020'],
  'Latin Pop': ['1990', '2000', '2010', '2020'],
};

const SongFilter = ({ onApply, isRankPage, onHide }) => {
  const { setSelectedGenre } = useSongContext();
  const [selectedGenre, setLocalGenre] = useState('');
  const [selectedSubgenre, setSelectedSubgenre] = useState('');
  const [selectedDecade, setSelectedDecade] = useState('');

  const handleGenreChange = (e) => {
    setLocalGenre(e.target.value);
    setSelectedSubgenre('');
    setSelectedDecade('');
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
      onApply(filters); // Removed .finally() to prevent onHide from toggling showFilter back
    } else {
      console.error('onApply is not a function');
    }
  };

  return (
    <div style={{ marginTop: '0.8em', marginBottom: '0.8em', display: 'flex', justifyContent: 'center', width: '100%' }}>
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
        <option value="">Select Genre</option>
        {genres.map((genre) => (
          <option key={genre} value={genre}>{genre}</option>
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
        <option value="">All Subgenres</option>
        {subgenres[selectedGenre]?.map((sub) => (
          <option key={sub} value={sub}>{sub}</option>
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
          <option value="">All Decades</option>
          {decades[selectedGenre]?.map((decade) => (
            <option key={decade} value={decade}>{decade}s</option>
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