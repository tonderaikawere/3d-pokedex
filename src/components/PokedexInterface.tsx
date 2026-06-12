import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, MicOff, Search, ChevronLeft, ChevronRight, 
  Heart, Sword, Shield, Zap, ShieldAlert, Activity, 
  Gamepad2, Sparkles, Trophy, Disc, HelpCircle, LayoutGrid, MessageSquare, ShieldCheck
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
  gameMode: 'scan' | 'guess' | 'catch';
  setGameMode: (mode: 'scan' | 'guess' | 'catch') => void;
  isSilhouette: boolean;
  setIsSilhouette: (val: boolean) => void;
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
  setSelectedType,
  gameMode,
  setGameMode,
  isSilhouette,
  setIsSilhouette
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: 'dexter',
      text: "System initialized. Use scanner, play Guessing Game, or go Catching!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [textInput, setTextInput] = useState('');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Visualizer Simulation
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(new Array(15).fill(4));
  const visualizerInterval = useRef<any | null>(null);

  // --- Mobile Active Tab State ---
  const [activeMobileTab, setActiveMobileTab] = useState<'hologram' | 'specs' | 'games'>('hologram');

  // --- GAME 1: "Who's That Pokémon?" State ---
  const [guessOptions, setGuessOptions] = useState<Pokemon[]>([]);
  const [correctGuessPokemon, setCorrectGuessPokemon] = useState<Pokemon | null>(null);
  const [guessScore, setGuessScore] = useState(0);
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [hasAnsweredGuess, setHasAnsweredGuess] = useState(false);

  // --- GAME 2: "Catch Minigame" State ---
  const [wildPokemon, setWildPokemon] = useState<Pokemon | null>(null);
  const [selectedBall, setSelectedBall] = useState<'pokeball' | 'greatball' | 'ultraball' | 'masterball'>('pokeball');
  const [catchStatus, setCatchStatus] = useState<'idle' | 'throwing' | 'shaking' | 'caught' | 'escaped'>('idle');
  const [shakeCount, setShakeCount] = useState(0);
  const [capturedSquad, setCapturedSquad] = useState<Pokemon[]>([]);
  const [ballCounts, setBallCounts] = useState({
    pokeball: 15,
    greatball: 8,
    ultraball: 4,
    masterball: 1
  });

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

  // Speak selected pokemon description when it changes (ONLY in Scan Mode)
  useEffect(() => {
    if (selectedPokemon && gameMode === 'scan') {
      const introText = `${selectedPokemon.name}, the ${selectedPokemon.category}. ${selectedPokemon.description}`;
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
  }, [selectedPokemon, gameMode]);

  const addChatMessage = (sender: 'user' | 'dexter', text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatHistory(prev => [...prev, { sender, text, timestamp: time }]);
  };

  const handlePlayCry = () => {
    if (selectedPokemon?.cryUrl) {
      const audio = new Audio(selectedPokemon.cryUrl);
      audio.volume = 0.5;
      audio.play().catch(e => console.error("Could not play Pokemon cry:", e));
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const query = textInput.trim();
    addChatMessage('user', query);
    setTextInput('');

    if (gameMode === 'guess') {
      handleGuessAttempt(query);
    } else {
      processQuery(query);
    }
  };

  // --- Speech input handling ---
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
        if (gameMode === 'guess') {
          handleGuessAttempt(transcript);
        } else {
          processQuery(transcript);
        }
      },
      (error) => {
        console.error("STT error:", error);
        addChatMessage('dexter', `Voice recognition error: ${error}.`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const processQuery = (queryText: string) => {
    const result = DexterRecognition.parseCommand(queryText, pokemonList);
    if (result.matchedPokemonId) {
      onSelectPokemon(result.matchedPokemonId);
    }
    setTimeout(() => {
      addChatMessage('dexter', result.answerText);
      DexterSpeech.speak(result.speakText);
    }, 400);
  };

  // --- GAME 1: "Who's That Pokémon?" Logic ---
  const startNewGuessRound = () => {
    if (pokemonList.length < 4) return;
    
    const correct = pokemonList[Math.floor(Math.random() * pokemonList.length)];
    setCorrectGuessPokemon(correct);
    onSelectPokemon(correct.id);
    setIsSilhouette(true);
    setHasAnsweredGuess(false);
    setGuessFeedback(null);

    const options = [correct];
    while (options.length < 4) {
      const rand = pokemonList[Math.floor(Math.random() * pokemonList.length)];
      if (!options.find(o => o.id === rand.id)) {
        options.push(rand);
      }
    }
    options.sort(() => Math.random() - 0.5);
    setGuessOptions(options);

    setTimeout(() => {
      DexterSpeech.speak("Who is that Pokaymon? Look at the hologram screen and guess!");
    }, 300);
  };

  const handleGuessAttempt = (guessName: string) => {
    if (hasAnsweredGuess || !correctGuessPokemon) return;

    const correctName = correctGuessPokemon.name.toLowerCase();
    const cleanGuess = guessName.toLowerCase().trim();

    setHasAnsweredGuess(true);
    setIsSilhouette(false);

    if (cleanGuess.includes(correctName)) {
      setGuessScore(prev => prev + 1);
      setGuessFeedback("CORRECT!");
      DexterSpeech.speak(`Correct! It is indeed ${correctGuessPokemon.name}!`);
      handlePlayCry();
    } else {
      setGuessFeedback(`INCORRECT. It is ${correctGuessPokemon.name}.`);
      DexterSpeech.speak(`Incorrect. That is ${correctGuessPokemon.name}, the ${correctGuessPokemon.category}.`);
    }
  };

  // --- GAME 2: "Catch Minigame" Logic ---
  const spawnWildPokemon = () => {
    if (pokemonList.length === 0) return;
    const wild = pokemonList[Math.floor(Math.random() * pokemonList.length)];
    setWildPokemon(wild);
    onSelectPokemon(wild.id);
    setCatchStatus('idle');
    setShakeCount(0);
  };

  const throwBall = () => {
    if (!wildPokemon || catchStatus !== 'idle') return;
    if (ballCounts[selectedBall] <= 0) {
      DexterSpeech.speak(`You are out of ${selectedBall}s!`);
      return;
    }

    setBallCounts(prev => ({ ...prev, [selectedBall]: prev[selectedBall] - 1 }));
    setCatchStatus('throwing');
    DexterSpeech.speak(`Throwing ${selectedBall}!`);

    setTimeout(() => {
      setCatchStatus('shaking');
      setShakeCount(1);
      playShakeSound();
      
      setTimeout(() => {
        setShakeCount(2);
        playShakeSound();
        
        setTimeout(() => {
          setShakeCount(3);
          playShakeSound();
          
          setTimeout(() => {
            determineCatchResult();
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1200);
  };

  const playShakeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const osc = new AudioCtx().createOscillator();
      const gain = new AudioCtx().createGain();
      osc.connect(gain);
      gain.connect(new AudioCtx().destination);
      osc.frequency.setValueAtTime(220, new AudioCtx().currentTime);
      gain.gain.setValueAtTime(0.1, new AudioCtx().currentTime);
      osc.start();
      osc.stop(new AudioCtx().currentTime + 0.15);
    } catch (e) {}
  };

  const determineCatchResult = () => {
    if (!wildPokemon) return;
    
    let catchRate = 0.45;
    if (selectedBall === 'greatball') catchRate = 0.65;
    if (selectedBall === 'ultraball') catchRate = 0.80;
    if (selectedBall === 'masterball') catchRate = 1.0;

    const roll = Math.random();
    
    if (roll < catchRate) {
      setCatchStatus('caught');
      setCapturedSquad(prev => {
        if (prev.find(p => p.id === wildPokemon.id)) return prev;
        return [...prev, wildPokemon];
      });
      DexterSpeech.speak(`Alright! ${wildPokemon.name} was caught! Added to your squad!`);
      handlePlayCry();
    } else {
      setCatchStatus('escaped');
      DexterSpeech.speak(`Oh no! ${wildPokemon.name} broke free and ran away!`);
    }
  };

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

  useEffect(() => {
    if (gameMode === 'guess') {
      startNewGuessRound();
    } else if (gameMode === 'catch') {
      spawnWildPokemon();
      setIsSilhouette(false);
    } else {
      setIsSilhouette(false);
    }
  }, [gameMode]);

  const types = [
    'all', 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 
    'rock', 'ghost', 'dragon', 'steel', 'fairy'
  ];

  return (
    <div className="pokedex-hud-wrapper font-sans">
      
      {/* Top Header Banner */}
      <header className="pokedex-header">
        <div className="header-branding">
          <div className="lens-camera">
            <div className="lens-flare animate-pulse" />
          </div>
          <div className="header-status-dots">
            <span className="dot dot-red animate-pulse" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <h1 className="header-title font-cyber">
            DEXTER <span className="title-highlight">3D HOLOGRAPH</span>
          </h1>
        </div>

        {/* Header Search & Select Controls */}
        <div className="header-controls">
          <div className="search-box">
            <Search className="search-icon text-cyan-400" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input font-cyber"
            />
          </div>

          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="type-dropdown font-cyber"
          >
            {types.map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>

          <button 
            onClick={() => setIsGridOpen(!isGridOpen)}
            className="cyber-btn cyber-btn-cyan grid-trigger-btn font-cyber"
          >
            Grid
          </button>
        </div>
      </header>

      {/* Grid Index Popup Overlay */}
      {isGridOpen && (
        <div className="grid-index-popup bg-slate-950 border border-cyan-500 rounded-xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.3)] z-50 overflow-y-auto">
          <div className="popup-header">
            <span className="font-cyber popup-title text-cyan-400">Pokemon Index</span>
            <button onClick={() => setIsGridOpen(false)} className="text-red-500 font-bold hover:text-red-400">X</button>
          </div>
          <div className="grid-grid-container pt-2">
            {pokemonList.map(p => (
              <button 
                key={p.id}
                onClick={() => {
                  onSelectPokemon(p.id);
                  setIsGridOpen(false);
                  setActiveMobileTab('hologram');
                }}
                className={`grid-card-select border transition-all ${
                  selectedPokemon?.id === p.id 
                    ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                    : 'bg-slate-900/60 border-cyan-500/10 hover:border-cyan-500 text-slate-300'
                }`}
              >
                <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-contain" />
                <span className="font-cyber card-select-name truncate w-full">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN CONTAINER LAYOUT */}
      <main className="pokedex-hud-body">
        
        {/* LEFT PANEL: Pokedex specs details (hologram stats) */}
        <section className={`pokedex-left-panel cyber-panel p-5 ${activeMobileTab === 'specs' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="corner-decor corner-tl" />
          <div className="corner-decor corner-tr" />
          <div className="corner-decor corner-bl" />
          <div className="corner-decor corner-br" />
          <div className="cyber-grid-bg" />

          {selectedPokemon ? (
            <>
              <div className="flex flex-col gap-3 relative z-10 w-full">
                <div className="flex justify-between items-baseline border-b border-cyan-500/30 pb-2">
                  <span className="font-cyber text-sm text-cyan-400 font-bold">
                    #{String(selectedPokemon.id).padStart(3, '0')}
                  </span>
                  <h2 className="font-cyber font-black text-xl tracking-wider text-white uppercase grow-text-cyan">
                    {selectedPokemon.name}
                  </h2>
                </div>
                
                <div className="text-right">
                  <span className="font-cyber text-[9px] text-slate-400 border border-slate-700/60 rounded px-2 py-0.5 uppercase bg-slate-950/40">
                    {selectedPokemon.category}
                  </span>
                </div>

                {/* Mobile view image container */}
                <div className="relative w-full aspect-video flex items-center justify-center bg-slate-950/60 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
                  <img src={selectedPokemon.imageUrl} alt={selectedPokemon.name} className="w-1/2 h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,243,255,0.2)]" />
                </div>

                <div className="flex gap-2 justify-center">
                  {selectedPokemon.types.map(t => (
                    <span key={t} className={`type-badge ${t}`}>{t}</span>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-950/40 border border-cyan-500/10 rounded-lg p-2.5">
                    <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase block">HEIGHT</span>
                    <span className="font-cyber text-sm text-white font-bold block mt-0.5">{selectedPokemon.height} m</span>
                  </div>
                  <div className="bg-slate-950/40 border border-cyan-500/10 rounded-lg p-2.5">
                    <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase block">WEIGHT</span>
                    <span className="font-cyber text-sm text-white font-bold block mt-0.5">{selectedPokemon.weight} kg</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase">Abilities</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPokemon.abilities.map(ab => (
                      <span key={ab} className="font-cyber text-[9px] text-slate-300 bg-slate-900 border border-slate-700/60 rounded px-2.5 py-0.5 capitalize">
                        {ab}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="border border-cyan-500/20 rounded-lg p-3 bg-slate-950/40 mt-1">
                  <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase block mb-1">Pokedex description</span>
                  <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                    {selectedPokemon.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 relative z-10 w-full">
                <button onClick={handlePlayCry} className="cyber-btn cyber-btn-cyan text-xs py-2 w-full">
                  Play Cry
                </button>
                <button 
                  onClick={() => {
                    DexterSpeech.speakPokemonEntry(selectedPokemon.name, selectedPokemon.category, selectedPokemon.description);
                  }} 
                  className="cyber-btn text-xs py-2 w-full"
                >
                  Re-Scan
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 relative z-10">
              Scanning...
            </div>
          )}
        </section>

        {/* MIDDLE SECTION (empty desktop spacer to reveal Canvas, mobile container tab toggle) */}
        <section className={`pokedex-middle-panel ${activeMobileTab === 'hologram' ? 'mobile-visible' : 'mobile-hidden'}`} />

        {/* RIGHT PANEL: Voice assistant and minigames */}
        <section className={`pokedex-right-panel cyber-panel p-5 ${activeMobileTab === 'games' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <div className="corner-decor corner-tl" />
          <div className="corner-decor corner-tr" />
          <div className="corner-decor corner-bl" />
          <div className="corner-decor corner-br" />
          <div className="cyber-grid-bg" />

          {/* Top segment: speech dialog terminal */}
          <div className="speech-history-container border-b border-cyan-500/20 pb-3 relative z-10">
            <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-2">
              <span className="font-cyber text-xs text-red-500 font-bold flex items-center gap-1.5 glow-text-red">
                <span className={`w-2 h-2 rounded-full bg-red-500 ${isSpeaking ? 'animate-ping' : ''}`} />
                SPEECH UTTERANCE CONSOLE
              </span>
              <div className="flex items-end gap-0.5 h-6">
                {visualizerHeights.map((h, i) => (
                  <div key={i} className="audio-visualizer-bar" style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>

            <div className="chat-history-logs overflow-y-auto bg-slate-950/70 border border-cyan-900/60 rounded-xl p-3 flex flex-col gap-2.5 text-xs shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]">
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

            <form onSubmit={handleTextSubmit} className="flex gap-2 mt-2">
              <input 
                type="text" 
                placeholder={gameMode === 'guess' ? "Type your guess..." : "Ask Dexter..."}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="flex-1 bg-slate-950/80 text-white font-cyber text-[10px] border border-cyan-500/45 rounded-lg px-3 focus:outline-none focus:border-cyan-400"
              />
              <button 
                type="button" 
                onClick={startVoiceInput} 
                className={`p-2 rounded-lg border transition-all ${
                  isListening 
                    ? 'bg-red-600 border-red-400 text-white shadow-[0_0_12px_#ff1c46] animate-pulse' 
                    : 'bg-slate-950 border-cyan-500/40 text-cyan-400 hover:border-cyan-400'
                }`}
              >
                {isListening ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <button type="submit" className="cyber-btn cyber-btn-cyan text-[9px] px-3 font-cyber">
                Send
              </button>
            </form>
          </div>

          {/* Bottom segment: Game console overlays */}
          <div className="game-overlay-container pt-3 relative z-10 flex flex-col justify-between">
            {gameMode === 'scan' && (
              <>
                <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-2">
                  <span className="font-cyber text-xs text-cyan-400 font-bold tracking-widest">
                    COMBAT CAPABILITY SPECS
                  </span>
                </div>

                {selectedPokemon ? (
                  <div className="stats-bars-wrapper flex flex-col justify-around gap-2 bg-slate-950/40 border border-cyan-500/10 rounded-xl p-3">
                    {Object.entries(selectedPokemon.stats).map(([key, value]) => {
                      const percentage = Math.min(100, Math.round((value / 180) * 100));
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 w-16">
                            <span className="font-cyber text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {key === 'spAttack' ? 'SATK' : key === 'spDefense' ? 'SDEF' : key.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full h-2.5 overflow-hidden p-[1px]">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

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
              </>
            )}

            {gameMode === 'guess' && (
              <div className="flex flex-col gap-2.5 h-full justify-between">
                <div className="border-b border-cyan-500/30 pb-2 mb-1 flex justify-between items-center">
                  <span className="font-cyber text-xs text-cyan-400 font-bold uppercase tracking-widest">GUESS THE SILHOUETTE</span>
                  <span className="font-cyber text-[9px] text-yellow-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-yellow-500/30">SCORE: {guessScore}</span>
                </div>

                <div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2">
                  {guessFeedback ? (
                    <div className={`font-cyber text-xs font-bold px-3 py-1.5 rounded border ${
                      guessFeedback.startsWith('CORRECT') 
                        ? 'border-green-500/30 bg-green-950/20 text-green-400' 
                        : 'border-red-500/30 bg-red-950/20 text-red-400'
                    }`}>
                      {guessFeedback}
                    </div>
                  ) : (
                    <div className="text-[10px] font-cyber text-slate-400 uppercase tracking-widest text-center animate-pulse">
                      Guess name by voice/typing or select option:
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {guessOptions.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={hasAnsweredGuess}
                      onClick={() => handleGuessAttempt(opt.name)}
                      className={`cyber-btn text-[10px] font-cyber py-2 capitalize truncate ${
                        hasAnsweredGuess && correctGuessPokemon?.id === opt.id
                          ? 'bg-green-600 border-green-400 text-white'
                          : 'bg-slate-950 border-cyan-500/35'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>

                {hasAnsweredGuess && (
                  <button
                    onClick={startNewGuessRound}
                    className="cyber-btn cyber-btn-cyan text-[10px] font-cyber py-2 w-full mt-1"
                  >
                    Next Silhouette
                  </button>
                )}
              </div>
            )}

            {gameMode === 'catch' && (
              <div className="flex flex-col gap-2 h-full justify-between">
                <div className="border-b border-cyan-500/30 pb-2 mb-1">
                  <span className="font-cyber text-xs text-cyan-400 font-bold uppercase tracking-widest">WILD POKÉMON SCAN</span>
                </div>

                {wildPokemon && (
                  <div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5">
                    {catchStatus === 'idle' && (
                      <>
                        <span className="font-cyber text-[8px] text-red-400 uppercase tracking-widest animate-pulse">WILD ENCOUNTERED</span>
                        <h3 className="font-cyber font-bold text-base text-white uppercase mt-0.5">{wildPokemon.name}</h3>
                      </>
                    )}

                    {catchStatus === 'throwing' && (
                      <div className="flex items-center gap-2 animate-bounce">
                        <Disc size={24} className="text-red-500 animate-spin" />
                        <span className="font-cyber text-[10px] text-white uppercase tracking-widest">THROWING BALL...</span>
                      </div>
                    )}

                    {catchStatus === 'shaking' && (
                      <div className="flex items-center gap-2 animate-pulse">
                        <Disc size={24} className="text-yellow-500 animate-bounce" />
                        <span className="font-cyber text-[10px] text-yellow-400 uppercase tracking-widest">SHAKING ({shakeCount})...</span>
                      </div>
                    )}

                    {catchStatus === 'caught' && (
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="font-cyber text-xs font-bold text-green-400 uppercase tracking-widest">CAUGHT SUCCESSFULLY!</span>
                        <p className="text-[9px] text-slate-400 uppercase">{wildPokemon.name} is in squad</p>
                      </div>
                    )}

                    {catchStatus === 'escaped' && (
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="font-cyber text-xs font-bold text-red-500 uppercase tracking-widest">POKEMON ESCAPED</span>
                        <p className="text-[9px] text-slate-400 uppercase">Wild unit fled</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Ball selector grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {(['pokeball', 'greatball', 'ultraball', 'masterball'] as const).map((ball) => (
                    <button
                      key={ball}
                      disabled={catchStatus !== 'idle'}
                      onClick={() => setSelectedBall(ball)}
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-left transition-all ${
                        selectedBall === ball 
                          ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                          : 'bg-slate-950 border-cyan-500/10 hover:border-cyan-500/30 text-slate-300'
                      }`}
                    >
                      <span className="font-cyber text-[9px] capitalize font-bold">{ball.replace('ball', '')}</span>
                      <span className="font-cyber text-[9px] text-cyan-400/80">x{ballCounts[ball]}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  {catchStatus === 'idle' ? (
                    <button
                      onClick={throwBall}
                      className="cyber-btn cyber-btn-cyan text-[10px] font-cyber py-2 w-full"
                    >
                      Catch Pokemon
                    </button>
                  ) : (
                    (catchStatus === 'caught' || catchStatus === 'escaped') && (
                      <button
                        onClick={spawnWildPokemon}
                        className="cyber-btn text-[10px] font-cyber py-2 w-full"
                      >
                        Search Next
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Captured Squad logs */}
          {gameMode === 'catch' && (
            <div className="captured-squad-wrapper mt-3 relative z-10 flex flex-col justify-between flex-1 border-t border-cyan-500/20 pt-2.5">
              <div className="flex justify-between items-center pb-2">
                <span className="font-cyber text-[9px] text-cyan-400 font-bold uppercase tracking-widest">CAPTURED SQUAD DIRECTORY</span>
                <span className="font-cyber text-[9px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-700/60">SQUAD: {capturedSquad.length}</span>
              </div>
              <div className="squad-list-scroll overflow-y-auto bg-slate-950/50 border border-cyan-500/10 rounded-xl p-2.5 flex flex-col gap-1.5 max-h-36">
                {capturedSquad.length > 0 ? (
                  capturedSquad.map((captured) => (
                    <div 
                      key={captured.id} 
                      onClick={() => {
                        onSelectPokemon(captured.id);
                        setActiveMobileTab('hologram');
                      }}
                      className="flex items-center justify-between p-1.5 bg-slate-900 border border-cyan-500/10 hover:border-cyan-500/40 rounded-lg cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <img src={captured.spriteUrl || captured.imageUrl} alt={captured.name} className="w-6 h-6 object-contain" />
                        <span className="font-cyber text-[10px] text-white font-bold">{captured.name}</span>
                      </div>
                      <span className="font-cyber text-[8px] text-cyan-400/80">#{String(captured.id).padStart(3, '0')}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest text-center py-4">Squad is empty. Catch Pokemon!</div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Desktop HUD Navigation Footer (Arrow buttons) */}
      <footer className="pokedex-footer">
        <button onClick={handlePrev} className="pokedex-footer-nav-btn cyber-btn cyber-btn-cyan text-xs font-cyber">
          <ChevronLeft size={16} /> Previous
        </button>
        <div className="footer-decor-line" />
        <button onClick={handleNext} className="pokedex-footer-nav-btn cyber-btn cyber-btn-cyan text-xs font-cyber">
          Next <ChevronRight size={16} />
        </button>
      </footer>

      {/* MOBILE BOTTOM NAVIGATION TAB BAR */}
      <div className="pokedex-mobile-tabs">
        <button 
          onClick={() => setActiveMobileTab('specs')} 
          className={`mobile-tab-btn ${activeMobileTab === 'specs' ? 'active' : ''}`}
        >
          <LayoutGrid size={18} />
          <span>Specs</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab('hologram')} 
          className={`mobile-tab-btn ${activeMobileTab === 'hologram' ? 'active' : ''}`}
        >
          <Volume2 size={18} />
          <span>Hologram</span>
        </button>
        <button 
          onClick={() => setActiveMobileTab('games')} 
          className={`mobile-tab-btn ${activeMobileTab === 'games' ? 'active' : ''}`}
        >
          <Gamepad2 size={18} />
          <span>Games</span>
        </button>
      </div>

    </div>
  );
};
export default PokedexInterface;
