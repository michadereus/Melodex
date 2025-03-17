// Melodex/melodex-front-end/src/components/SongFilter.jsx
import React, { useState } from 'react';

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
  'Rock': ['60s', '70s', '80s', '90s', '2000s', '2010s', '2020s'],
  'Pop': ['80s', '90s', '2000s', '2010s', '2020s'],
  'Hip-Hop/Rap': ['90s', '2000s', '2010s', '2020s'],
  'R&B/Soul': ['90s', '2000s', '2010s', '2020s'],
  'Electronic Dance Music (EDM)': ['90s', '2000s', '2010s', '2020s'],
  'Country': ['90s', '2000s', '2010s', '2020s'],
  'Reggae/Reggaeton': ['70s', '80s', '90s', '2000s', '2010s', '2020s'],
  'K-Pop': ['90s', '2000s', '2010s', '2020s'],
  'Jazz': ['70s', '80s', '90s', '2000s', '2010s'],
  'Latin Pop': ['90s', '2000s', '2010s', '2020s'],
};

const SongFilter = ({ onApply, isRankPage }) => {
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedSubgenre, setSelectedSubgenre] = useState('');
  const [selectedDecade, setSelectedDecade] = useState('');

  const handleGenreChange = (e) => {
    setSelectedGenre(e.target.value);
    setSelectedSubgenre('');
    setSelectedDecade('');
  };

  const handleApply = () => {
    if (isRankPage && !selectedGenre) {
      alert('Please select a genre');
      return;
    }
    onApply({
      genre: selectedGenre || 'pop', // Default to 'pop' if none selected
      subgenre: selectedSubgenre || 'all subgenres',
      decade: selectedDecade || 'all decades',
    });
  };

  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>
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
        <option value="">Select Subgenre</option>
        {subgenres[selectedGenre]?.map(sub => (
          <option key={sub} value={sub}>{sub}</option>
        ))}
      </select>
      <select
        value={selectedDecade}
        onChange={(e) => setSelectedDecade(e.target.value)}
        disabled={!selectedGenre}
        style={{ marginRight: '10px', padding: '5px' }}
      >
        <option value="">Select Decade</option>
        {decades[selectedGenre]?.map(decade => (
          <option key={decade} value={decade}>{decade}</option>
        ))}
      </select>
      <button onClick={handleApply} style={{ padding: '5px 10px' }}>
        Apply
      </button>
    </div>
  );
};

export default SongFilter;