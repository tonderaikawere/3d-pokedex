import React, { useState, useEffect } from 'react';
import { Pokedex3D } from './components/Pokedex3D';
import { PokedexInterface } from './components/PokedexInterface';
import pokemonDataRaw from './data/pokemon.json';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  imageUrl: string;
  spriteUrl: string;
  height: number;
  weight: number;
  abilities: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  category: string;
  description: string;
  cryUrl: string;
}

export const App: React.FC = () => {
  const [pokemonData, setPokemonData] = useState<Pokemon[]>([]);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [openingAnimation, setOpeningAnimation] = useState<boolean>(false);
  
  // Game states: scan mode, guess who's that pokemon, catch minigame
  const [gameMode, setGameMode] = useState<'scan' | 'guess' | 'catch'>('scan');
  const [isSilhouette, setIsSilhouette] = useState<boolean>(false);

  // Initialize data instantly and run the PokeBall loading animation
  useEffect(() => {
    setPokemonData(pokemonDataRaw as Pokemon[]);
    
    // 2.0 seconds of loading, then trigger the 0.5s opening/splitting animation
    const loadTimeout = setTimeout(() => {
      setOpeningAnimation(true);
    }, 2000);

    const finishTimeout = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => {
      clearTimeout(loadTimeout);
      clearTimeout(finishTimeout);
    };
  }, []);

  // Filter Pokemon based on search query and selected type
  const filteredPokemon = pokemonData.filter((pokemon) => {
    const matchesSearch = pokemon.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          String(pokemon.id).includes(searchQuery);
    
    const matchesType = selectedType === 'all' || pokemon.types.includes(selectedType.toLowerCase());

    return matchesSearch && matchesType;
  });

  const selectedPokemon = pokemonData.find(p => p.id === selectedId) || null;

  const handleSelectPokemon = (id: number) => {
    setSelectedId(id);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#08080f] flex flex-col items-center justify-center font-sans relative overflow-hidden select-none">
        <div className="crt-overlay" />
        <div className="cyber-grid-bg" />

        {/* CSS-based Opening PokeBall Loading Animation */}
        <div className={`pokeball-wrapper ${openingAnimation ? 'open-pokedex' : ''}`}>
          <div className="pokeball-container">
            {/* Top red half */}
            <div className="pokeball-half pokeball-top" />
            {/* Middle band */}
            <div className="pokeball-band" />
            {/* Center button */}
            <div className="pokeball-button">
              <div className="pokeball-button-inner animate-pulse" />
            </div>
            {/* Bottom white half */}
            <div className="pokeball-half pokeball-bottom" />
          </div>
          {/* Inner intense holographic glow that shines when opening */}
          {openingAnimation && <div className="pokeball-burst-glow" />}
        </div>

        <div className={`transition-all duration-500 flex flex-col items-center mt-8 ${openingAnimation ? 'opacity-0 scale-95' : 'opacity-100'}`}>
          <h2 className="font-cyber font-black tracking-widest text-red-500 glow-text-red text-lg uppercase">
            INITIALIZING DEXTER OS
          </h2>
          <p className="font-cyber text-[9px] text-cyan-400 mt-2 tracking-widest uppercase animate-pulse">
            Booting 3D Holographic Chamber...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#08080f] overflow-hidden relative select-none">
      {/* Sci-Fi Overlay Elements */}
      <div className="crt-overlay" />
      <div className="cyber-grid-bg" />
      
      {/* 3D Holographic Scene Viewport */}
      {filteredPokemon.length > 0 ? (
        <Pokedex3D 
          pokemonList={filteredPokemon} 
          selectedId={selectedId} 
          onSelectPokemon={handleSelectPokemon}
          isSilhouette={isSilhouette}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-cyber text-slate-500 tracking-widest uppercase text-xs">
          No matches found in hologram database
        </div>
      )}

      {/* Futuristic 2D HUD Overlays */}
      <PokedexInterface 
        pokemonList={pokemonData}
        selectedPokemon={selectedPokemon}
        onSelectPokemon={handleSelectPokemon}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        gameMode={gameMode}
        setGameMode={setGameMode}
        isSilhouette={isSilhouette}
        setIsSilhouette={setIsSilhouette}
      />
    </div>
  );
};
export default App;
