import React, { useState, useEffect } from 'react';
import { Pokedex3D } from './components/Pokedex3D';
import { PokedexInterface } from './components/PokedexInterface';
import { DexterSpeech } from './utils/speech';
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
  const [isActivated, setIsActivated] = useState<boolean>(false);
  
  // Game states: scan mode, guess who's that pokemon, catch minigame
  const [gameMode, setGameMode] = useState<'scan' | 'guess' | 'catch'>('scan');
  const [isSilhouette, setIsSilhouette] = useState<boolean>(false);

  // Initialize data instantly
  useEffect(() => {
    setPokemonData(pokemonDataRaw as Pokemon[]);
  }, []);

  // 8-bit retro startup beep to unlock AudioContext
  const playBootSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  };

  const handleInitialize = () => {
    if (isActivated) return;
    setIsActivated(true);
    playBootSound();
    setOpeningAnimation(true);
    
    // Speak welcome dialogue instantly (unlocks browser TTS)
    setTimeout(() => {
      DexterSpeech.speak("Dexter system online. Bulbasaur scanned.");
    }, 150);

    setTimeout(() => {
      setLoading(false);
    }, 650);
  };

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
            <div className="pokeball-half pokeball-top" />
            <div className="pokeball-band" />
            <div className="pokeball-button">
              <div className="pokeball-button-inner animate-pulse" />
            </div>
            <div className="pokeball-half pokeball-bottom" />
          </div>
          {openingAnimation && <div className="pokeball-burst-glow" />}
        </div>

        <div className={`transition-all duration-500 flex flex-col items-center mt-8 ${openingAnimation ? 'opacity-0 scale-95' : 'opacity-100'}`}>
          <h2 className="font-cyber font-black tracking-widest text-red-500 glow-text-red text-lg uppercase">
            DEXTER POKEDEX SYSTEM
          </h2>
          <button
            onClick={handleInitialize}
            className="cyber-btn cyber-btn-cyan text-xs font-cyber mt-5 py-2.5 px-8 shadow-[0_0_15px_rgba(0,243,255,0.35)] animate-pulse"
          >
            INITIALIZE DEXTER
          </button>
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
