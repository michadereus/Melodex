// Melodex/melodex-front-end/src/components/SongFilter.jsx
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
  'Electronic Dance Music (EDM)': ['House', 'Dubstep', 'Trance', 'Techno'],
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

const SongFilter = ({ onApply, isRankPage }) => {
  const { setSelectedGenre } = useSongContext();
  const [selectedGenre, setLocalGenre] = useState('');
  const [selectedSubgenre, setSelectedSubgenre] = useState('');
  const [selectedDecade, setSelectedDecade] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleGenreChange = (e) => {
    setLocalGenre(e.target.value);
    setSelectedSubgenre('');
    setSelectedDecade('');
  };

  const handleApplyClick = () => {
    setIsApplying(true);
    const genreToApply = selectedGenre || 'any';
    setSelectedGenre(genreToApply);
    const filters = {
      genre: genreToApply,
      subgenre: selectedSubgenre || 'all subgenres',
      decade: isRankPage ? (selectedDecade || 'all decades') : 'all decades', // Only include decade for /rank
    };
    if (typeof onApply === 'function') {
      onApply(filters).finally(() => {
        setIsApplying(false);
      });
    } else {
      console.error('onApply is not a function');
      setIsApplying(false);
    }
  };

  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
      {isApplying && isRankPage ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
        }}>
          <div style={{
            border: '4px solid #ecf0f1',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{ 
            marginTop: '1rem', 
            fontSize: '1.2em', 
            color: '#7f8c8d', 
            fontWeight: '600' 
          }}>
            Generating Songs...
          </p>
        </div>
      ) : (
        <>
          <select
            value={selectedGenre}
            onChange={handleGenreChange}
            style={{ marginRight: '10px', padding: '5px' }}
          >
            <option value="">Select Genre</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
          <select
            value={selectedSubgenre}
            onChange={(e) => setSelectedSubgenre(e.target.value)}
            disabled={!selectedGenre}
            style={{ marginRight: '10px', padding: '5px' }}
          >
            <option value="">All Subgenres</option>
            {subgenres[selectedGenre]?.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
          {isRankPage && ( // Only show decade field for /rank
            <select
              value={selectedDecade}
              onChange={(e) => setSelectedDecade(e.target.value)}
              disabled={!selectedGenre}
              style={{ marginRight: '10px', padding: '5px' }}
            >
              <option value="">All Decades</option>
              {decades[selectedGenre]?.map(decade => (
                <option key={decade} value={decade}>{decade}s</option>
              ))}
            </select>
          )}
          <button onClick={handleApplyClick} style={{ padding: '5px 10px' }}>
            Apply
          </button>
        </>
      )}
    </div>
  );
};

export default SongFilter;