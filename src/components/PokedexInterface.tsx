import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, MicOff, Search, ChevronLeft, ChevronRight, 
  RotateCcw, Sliders, Shield, Zap, Heart, Sword, ShieldAlert, Activity, CornerDownRight
} from 'lucide-react';
import { DexterSpeech } from '../utils/speech';
import { DexterRecognition } from '../utils/recognition';

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

interface PokedexInterfaceProps {
  pokemonList: Pokemon[];
  selectedPokemon: Pokemon | null;
  onSelectPokemon: (id: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedType: string;
  setSelectedType: (type: string) => void;
}

interface ChatMessage {
  sender: 'user' | 'dexter';
  text: string;
  timestamp: string;
}

export const PokedexInterface: React.FC<PokedexInterfaceProps> = ({
  pokemonList,
  selectedPokemon,
  onSelectPokemon,
  searchQuery,
  setSearchQuery,
  selectedType,
  setSelectedType
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: 'dexter',
      text: "Dexter voice system online. Click the microphone or type below to ask me a question about any Pokémon.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [textInput, setTextInput] = useState('');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Visualizer Simulation
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(new Array(15).fill(4));
  const visualizerInterval = useRef<any | null>(null);

  // Monitor Dexter's speaking state
  useEffect(() => {
    DexterSpeech.registerStateListener((speaking) => {
      setIsSpeaking(speaking);
    });
  }, []);

  // Handle visualizer animation when speaking
  useEffect(() => {
    if (isSpeaking) {
      visualizerInterval.current = setInterval(() => {
        setVisualizerHeights(
          Array.from({ length: 15 }, () => Math.floor(Math.random() * 32) + 4)
        );
      }, 100);
    } else {
      if (visualizerInterval.current) {
        clearInterval(visualizerInterval.current);
      }
      setVisualizerHeights(new Array(15).fill(4));
    }

    return () => {
      if (visualizerInterval.current) clearInterval(visualizerInterval.current);
    };
  }, [isSpeaking]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Speak selected pokemon description when it changes
  useEffect(() => {
    if (selectedPokemon) {
      const introText = `${selectedPokemon.name}, the ${selectedPokemon.category}. ${selectedPokemon.description}`;
      // Small timeout to allow user to hear button clicks first
      const timeoutId = setTimeout(() => {
        DexterSpeech.speakPokemonEntry(
          selectedPokemon.name, 
          selectedPokemon.category, 
          selectedPokemon.description
        );
        addChatMessage('dexter', introText);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedPokemon]);

  const addChatMessage = (sender: 'user' | 'dexter', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender, text, timestamp: time }]);
  };

  const handlePlayCry = () => {
    if (selectedPokemon?.cryUrl) {
      const audio = new Audio(selectedPokemon.cryUrl);
      audio.volume = 0.5;
      audio.play().catch(e => console.error("Could not play Pokemon cry:", e));
      addChatMessage('dexter', `Playing ${selectedPokemon.name}'s cry...`);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const query = textInput.trim();
    addChatMessage('user', query);
    setTextInput('');

    processQuery(query);
  };

  const startVoiceInput = () => {
    if (isListening) {
      DexterRecognition.stopListening();
      setIsListening(false);
      return;
    }

    DexterSpeech.stop();
    setIsListening(true);
    
    DexterRecognition.startListening(
      (transcript) => {
        addChatMessage('user', transcript);
        processQuery(transcript);
      },
      (error) => {
        console.error("STT error:", error);
        addChatMessage('dexter', `Voice recognition error: ${error}. Please try typing.`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const processQuery = (queryText: string) => {
    const result = DexterRecognition.parseCommand(queryText, pokemonList);
    
    // If a specific Pokemon was matched, select it in the 3D viewport
    if (result.matchedPokemonId) {
      onSelectPokemon(result.matchedPokemonId);
    }

    setTimeout(() => {
      addChatMessage('dexter', result.answerText);
      DexterSpeech.speak(result.speakText);
    }, 400);
  };

  // Type list for filter
  const types = [
    'all', 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 
    'rock', 'ghost', 'dragon', 'steel', 'fairy'
  ];

  // Navigate through list
  const handlePrev = () => {
    if (!selectedPokemon) return;
    const curIndex = pokemonList.findIndex(p => p.id === selectedPokemon.id);
    const prevIndex = (curIndex - 1 + pokemonList.length) % pokemonList.length;
    onSelectPokemon(pokemonList[prevIndex].id);
  };

  const handleNext = () => {
    if (!selectedPokemon) return;
    const curIndex = pokemonList.findIndex(p => p.id === selectedPokemon.id);
    const nextIndex = (curIndex + 1) % pokemonList.length;
    onSelectPokemon(pokemonList[nextIndex].id);
  };

  const formatStatName = (key: string) => {
    switch (key) {
      case 'hp': return 'HP';
      case 'attack': return 'ATK';
      case 'defense': return 'DEF';
      case 'spAttack': return 'SATK';
      case 'spDefense': return 'SDEF';
      case 'speed': return 'SPD';
      default: return key.toUpperCase();
    }
  };

  const getStatIcon = (key: string) => {
    switch (key) {
      case 'hp': return <Heart size={14} className="text-pink-500" />;
      case 'attack': return <Sword size={14} className="text-red-500" />;
      case 'defense': return <Shield size={14} className="text-blue-500" />;
      case 'spAttack': return <Zap size={14} className="text-yellow-500" />;
      case 'spDefense': return <ShieldAlert size={14} className="text-purple-500" />;
      case 'speed': return <Activity size={14} className="text-green-500" />;
      default: return null;
    }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid grid-cols-12 grid-rows-12 p-6 gap-6 z-10 font-sans">
      
      {/* Top Banner (Header) */}
      <header className="col-span-12 row-span-1 pointer-events-auto flex justify-between items-center bg-gradient-to-r from-red-950/80 to-slate-900/80 backdrop-blur-md border-b-2 border-red-500 px-6 py-2 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          {/* Glowing camera lens (classic Pokedex dot) */}
          <div className="relative w-8 h-8 rounded-full bg-blue-500 border-4 border-white flex items-center justify-center shadow-[0_0_15px_#3b82f6]">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-200 absolute top-1 left-1 animate-pulse" />
          </div>
          {/* Status dots */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
          <h1 className="font-cyber font-black tracking-widest text-xl text-red-500 glow-text-red ml-4">
            DEXTER <span className="text-cyan-400 font-light">3D HOLOGRAPH</span>
          </h1>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" size={16} />
            <input 
              type="text" 
              placeholder="Search database..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950/80 text-white font-cyber text-xs border border-cyan-500/40 rounded-lg pl-9 pr-4 py-2 w-56 focus:outline-none focus:border-cyan-400 shadow-[inset_0_0_8px_rgba(6,182,212,0.1)] transition-all"
            />
          </div>

          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950/80 text-white font-cyber text-xs border border-cyan-500/40 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-400 cursor-pointer shadow-[inset_0_0_8px_rgba(6,182,212,0.1)] transition-all"
          >
            {types.map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsGridOpen(!isGridOpen)}
            className="cyber-btn cyber-btn-cyan text-xs font-cyber py-1.5"
          >
            Grid
          </button>
        </div>
      </header>

      {/* Grid Overlay Select (Popup) */}
      {isGridOpen && (
        <div className="absolute top-[80px] right-6 w-80 max-h-[500px] pointer-events-auto bg-slate-950/95 border border-cyan-500 rounded-xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.3)] z-50 overflow-y-auto flex flex-col gap-2">
          <div className="flex justify-between items-center pb-2 border-b border-cyan-500/30">
            <span className="font-cyber text-xs text-cyan-400">Pokemon Index</span>
            <button onClick={() => setIsGridOpen(false)} className="text-red-500 font-bold hover:text-red-400">X</button>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2">
            {pokemonList.map(p => (
              <button 
                key={p.id}
                onClick={() => {
                  onSelectPokemon(p.id);
                  setIsGridOpen(false);
                }}
                className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all ${
                  selectedPokemon?.id === p.id 
                    ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                    : 'bg-slate-900/60 border-cyan-500/20 hover:border-cyan-500 text-slate-300'
                }`}
              >
                <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-contain" />
                <span className="font-cyber text-[9px] mt-1 truncate w-full">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Left Panel: Holographic Pokemon Info Card */}
      <section className="col-span-4 row-span-11 pointer-events-auto flex flex-col justify-between cyber-panel p-5 mt-4">
        <div className="corner-decor corner-tl"></div>
        <div className="corner-decor corner-tr"></div>
        <div className="corner-decor corner-bl"></div>
        <div className="corner-decor corner-br"></div>
        
        {/* Diagnostic background mesh grid */}
        <div className="cyber-grid-bg"></div>

        {selectedPokemon ? (
          <>
            <div className="flex flex-col gap-4 relative z-10">
              {/* ID & Name */}
              <div className="flex justify-between items-baseline border-b border-cyan-500/30 pb-2">
                <span className="font-cyber text-sm text-cyan-400 font-bold">
                  #{String(selectedPokemon.id).padStart(3, '0')}
                </span>
                <h2 className="font-cyber font-black text-2xl tracking-wider text-white uppercase grow-text-cyan text-right">
                  {selectedPokemon.name}
                </h2>
              </div>

              {/* Genus / Subcategory */}
              <div className="text-right">
                <span className="font-cyber text-[10px] text-slate-400 border border-slate-700/60 rounded px-2 py-0.5 uppercase bg-slate-950/40">
                  {selectedPokemon.category}
                </span>
              </div>

              {/* Holographic illustration frame */}
              <div className="relative w-full aspect-square flex items-center justify-center bg-slate-950/60 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none" />
                {/* Horizontal scan line passing over image */}
                <div className="absolute left-0 top-0 w-full h-[2px] bg-cyan-400/40 shadow-[0_0_8px_#00f3ff] animate-[scan-horizontal_4s_infinite_linear]" 
                     style={{ animationDirection: 'alternate' }} />
                
                <img 
                  src={selectedPokemon.imageUrl} 
                  alt={selectedPokemon.name} 
                  className="w-4/5 h-4/5 object-contain filter drop-shadow-[0_4px_15px_rgba(0,243,255,0.25)] animate-[bounce_6s_infinite_ease-in-out]" 
                />
              </div>

              {/* Types Badges */}
              <div className="flex gap-2 justify-center">
                {selectedPokemon.types.map(t => (
                  <span key={t} className={`type-badge ${t}`}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Height & Weight */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col items-center bg-slate-950/40 border border-cyan-500/10 rounded-lg p-2.5">
                  <span className="font-cyber text-[9px] text-cyan-400/70 tracking-widest uppercase">HEIGHT</span>
                  <span className="font-cyber text-lg text-white font-bold mt-1">
                    {selectedPokemon.height} m
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(selectedPokemon.height * 3.28084).toFixed(1)} ft
                  </span>
                </div>
                
                <div className="flex flex-col items-center bg-slate-950/40 border border-cyan-500/10 rounded-lg p-2.5">
                  <span className="font-cyber text-[9px] text-cyan-400/70 tracking-widest uppercase">WEIGHT</span>
                  <span className="font-cyber text-lg text-white font-bold mt-1">
                    {selectedPokemon.weight} kg
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(selectedPokemon.weight * 2.20462).toFixed(1)} lbs
                  </span>
                </div>
              </div>

              {/* Abilities */}
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="font-cyber text-[9px] text-cyan-400/70 tracking-widest uppercase">Special Abilities</span>
                <div className="flex flex-wrap gap-2">
                  {selectedPokemon.abilities.map(ab => (
                    <span key={ab} className="font-cyber text-[10px] text-slate-300 bg-slate-900 border border-slate-700/60 rounded-md px-2.5 py-1 capitalize">
                      {ab}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4 relative z-10">
              <button 
                onClick={handlePlayCry} 
                className="cyber-btn cyber-btn-cyan text-xs py-2 w-full"
              >
                <Volume2 size={14} /> Play Cry
              </button>
              <button 
                onClick={() => {
                  DexterSpeech.speakPokemonEntry(selectedPokemon.name, selectedPokemon.category, selectedPokemon.description);
                }} 
                className="cyber-btn text-xs py-2 w-full"
              >
                <Volume2 size={14} /> Re-Scan
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 relative z-10">
            Scanning network...
          </div>
        )}
      </section>

      {/* Middle Spacing (for 3D canvas viewport clear view) */}
      <div className="col-span-4 row-span-11 pointer-events-none"></div>

      {/* Right Panel: Dexter voice assistant chat + stats */}
      <section className="col-span-4 row-span-11 pointer-events-auto flex flex-col justify-between cyber-panel p-5 mt-4">
        <div className="corner-decor corner-tl"></div>
        <div className="corner-decor corner-tr"></div>
        <div className="corner-decor corner-bl"></div>
        <div className="corner-decor corner-br"></div>
        
        <div className="cyber-grid-bg"></div>

        {/* Top: Dialogue / Chat History */}
        <div className="flex flex-col h-[48%] border-b border-cyan-500/20 pb-4 relative z-10">
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-3">
            <span className="font-cyber text-xs text-red-500 font-bold flex items-center gap-1.5 glow-text-red">
              <span className={`w-2 h-2 rounded-full bg-red-500 ${isSpeaking ? 'animate-ping' : ''}`} />
              SPEECH UTTERANCE CONSOLE
            </span>
            {/* Visualizer bars */}
            <div className="flex items-end gap-0.5 h-6">
              {visualizerHeights.map((h, i) => (
                <div 
                  key={i} 
                  className="audio-visualizer-bar" 
                  style={{ height: `${h}px` }} 
                />
              ))}
            </div>
          </div>

          {/* Dialogue logs scrolling list */}
          <div className="flex-1 overflow-y-auto bg-slate-950/70 border border-cyan-900/60 rounded-xl p-3 flex flex-col gap-2.5 text-xs shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]">
            {chatHistory.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col gap-0.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <span className={`font-cyber text-[8px] tracking-widest ${
                  msg.sender === 'user' ? 'text-cyan-400' : 'text-red-500'
                }`}>
                  {msg.sender === 'user' ? 'TRAINER' : 'DEXTER'} • {msg.timestamp}
                </span>
                <div className={`p-2.5 rounded-lg leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-200' 
                    : 'bg-red-950/30 border border-red-500/30 text-red-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* User query text / mic input bar */}
          <form onSubmit={handleTextSubmit} className="flex gap-2 mt-3">
            <input 
              type="text" 
              placeholder="Ask Dexter (e.g. 'Who is Mewtwo?')..." 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="flex-1 bg-slate-950/80 text-white font-cyber text-[10px] border border-cyan-500/40 rounded-lg px-3 focus:outline-none focus:border-cyan-400"
            />
            
            <button 
              type="button" 
              onClick={startVoiceInput} 
              className={`p-2 rounded-lg border transition-all ${
                isListening 
                  ? 'bg-red-600 border-red-400 text-white shadow-[0_0_12px_#ff1c46] animate-pulse' 
                  : 'bg-slate-950 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
              }`}
              title="Voice Input (Speech-to-Text)"
            >
              {isListening ? <Mic size={14} /> : <MicOff size={14} />}
            </button>
            
            <button type="submit" className="cyber-btn cyber-btn-cyan text-[9px] px-3 font-cyber py-0.5">
              Send
            </button>
          </form>
        </div>

        {/* Bottom: Pokemon Combat Statistics */}
        <div className="flex flex-col h-[48%] pt-3 relative z-10">
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-3">
            <span className="font-cyber text-xs text-cyan-400 font-bold tracking-widest">
              COMBAT CAPABILITY SPECS
            </span>
          </div>

          {selectedPokemon ? (
            <div className="flex-1 flex flex-col justify-around gap-2 bg-slate-950/40 border border-cyan-500/10 rounded-xl p-3">
              {Object.entries(selectedPokemon.stats).map(([key, value]) => {
                const percentage = Math.min(100, Math.round((value / 180) * 100)); // Max stat around 180
                return (
                  <div key={key} className="flex items-center gap-3">
                    {/* Stat Icon & Name */}
                    <div className="flex items-center gap-1.5 w-16">
                      {getStatIcon(key)}
                      <span className="font-cyber text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        {formatStatName(key)}
                      </span>
                    </div>

                    {/* Stat bar */}
                    <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full h-3 overflow-hidden p-[1px]">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Value */}
                    <span className="font-cyber text-[10px] text-white font-bold w-6 text-right">
                      {value}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              No stats scanned
            </div>
          )}
        </div>
      </section>

      {/* Bottom Control Interface: Previous/Next Navigation */}
      <footer className="col-span-12 row-span-1 pointer-events-none flex justify-between items-center px-4 relative z-10">
        <button 
          onClick={handlePrev} 
          className="pointer-events-auto cyber-btn cyber-btn-cyan text-xs font-cyber"
        >
          <ChevronLeft size={16} /> Previous Pokemon
        </button>
        
        {/* Central visual decoration */}
        <div className="w-1/3 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60 animate-[pulse-glow_2s_infinite_ease-in-out]" />

        <button 
          onClick={handleNext} 
          className="pointer-events-auto cyber-btn cyber-btn-cyan text-xs font-cyber"
        >
          Next Pokemon <ChevronRight size={16} />
        </button>
      </footer>
    </div>
  );
};
export default PokedexInterface;
