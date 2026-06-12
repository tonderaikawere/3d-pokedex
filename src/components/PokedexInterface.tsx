import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, MicOff, Search, ChevronLeft, ChevronRight, 
  LayoutGrid, Gamepad2, Disc, Play
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
  children?: React.ReactNode;
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
  setIsSilhouette,
  children
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: 'dexter',
      text: "System active. Bulbasaur scanned.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [textInput, setTextInput] = useState('');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Visualizer Simulation (10 bars)
  const [visualizerHeights, setVisualizerHeights] = useState<number[]>(new Array(10).fill(4));
  const visualizerInterval = useRef<any | null>(null);

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
          Array.from({ length: 10 }, () => Math.floor(Math.random() * 24) + 4)
        );
      }, 100);
    } else {
      if (visualizerInterval.current) {
        clearInterval(visualizerInterval.current);
      }
      setVisualizerHeights(new Array(10).fill(4));
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
      audio.volume = 0.45;
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
        addChatMessage('dexter', `Speech error: ${error}.`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const processQuery = (queryText: string) => {
    // Pass selectedPokemon context into parseCommand to support relative queries!
    const result = DexterRecognition.parseCommand(queryText, pokemonList, selectedPokemon);
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
      DexterSpeech.speak("Who is that Pokaymon? Look at the screen and guess!");
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
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  };

  const determineCatchResult = () => {
    if (!wildPokemon) return;
    
    let catchRate = 0.45;
    if (selectedBall === 'greatball') catchRate = 0.65;
    if (selectedBall === 'ultraball') catchRate = 0.82;
    if (selectedBall === 'masterball') catchRate = 1.0;

    const roll = Math.random();
    
    if (roll < catchRate) {
      setCatchStatus('caught');
      setCapturedSquad(prev => {
        if (prev.find(p => p.id === wildPokemon.id)) return prev;
        return [...prev, wildPokemon];
      });
      DexterSpeech.speak(`Alright! ${wildPokemon.name} was caught! Added to squad!`);
      handlePlayCry();
    } else {
      setCatchStatus('escaped');
      DexterSpeech.speak(`Oh no! ${wildPokemon.name} broke free and fled!`);
    }
  };

  const handlePrev = () => {
    if (!selectedPokemon || pokemonList.length === 0) return;
    const curIndex = pokemonList.findIndex(p => p.id === selectedPokemon.id);
    const prevIndex = (curIndex - 1 + pokemonList.length) % pokemonList.length;
    onSelectPokemon(pokemonList[prevIndex].id);
  };

  const handleNext = () => {
    if (!selectedPokemon || pokemonList.length === 0) return;
    const curIndex = pokemonList.findIndex(p => p.id === selectedPokemon.id);
    const nextIndex = (curIndex + 1) % pokemonList.length;
    onSelectPokemon(pokemonList[nextIndex].id);
  };

  // Jump to specific index from keypad
  const handleKeypadPress = () => {
    if (pokemonList.length === 0) return;
    // Select a random Pokemon
    const randomId = Math.floor(Math.random() * pokemonList.length);
    onSelectPokemon(pokemonList[randomId].id);
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
    <div className="pokedex-container-wrapper">
      {/* Physical Pokedex Shell */}
      <div className="pokedex-device">
        <div className="crt-overlay" />
        
        {/* LEFT WING - Display Screen, Lens, D-Pad */}
        <div className="pokedex-left-wing">
          {/* Top Bar with Camera and flashing LEDs */}
          <div className="left-wing-top-bar">
            <div className="blue-lens-camera" onClick={handlePlayCry} title="Play Cry">
              <div className="lens-reflection" />
            </div>
            <div className="mini-leds">
              <span className={`mini-led led-red ${isSpeaking || isListening ? 'pulsing' : ''}`} />
              <span className="mini-led led-yellow" />
              <span className="mini-led led-green" />
            </div>
          </div>

          {/* Hologram Screen housing the 3D Canvas */}
          <div className="left-wing-screen-bezel">
            <div className="bezel-top-leds">
              <span className={`dot-led red-led ${isListening ? 'blinking' : ''}`} />
              <span className="dot-led green-led" />
            </div>
            <div className="left-wing-screen-inner">
              <div className="cyber-grid-bg" />
              {children}
            </div>
            <div className="bezel-bottom-controls">
              <span className="bezel-red-dot" />
              <span className="bezel-vent-lines" />
            </div>
          </div>

          {/* Bottom Left Controls */}
          <div className="left-wing-controls">
            <button 
              className="pokedex-btn-circle-black" 
              onClick={handlePlayCry} 
              title="Play Pokemon Cry"
            />
            
            {/* D-Pad cross */}
            <div className="dpad-container">
              <button className="dpad-btn dpad-up" onClick={handlePrev} title="Previous" />
              <button className="dpad-btn dpad-right" onClick={handleNext} title="Next" />
              <button className="dpad-btn dpad-down" onClick={handleNext} title="Next" />
              <button className="dpad-btn dpad-left" onClick={handlePrev} title="Previous" />
              <div className="dpad-center" />
            </div>

            <div className="status-bars-left">
              <div className="status-bar-rect bar-red" />
              <div className="status-bar-rect bar-blue" />
            </div>
          </div>
        </div>

        {/* MECHANICAL HINGE COLUMN */}
        <div className="pokedex-hinge">
          <div className="hinge-segment" />
          <div className="hinge-segment" />
          <div className="hinge-segment" />
          <div className="hinge-segment" />
        </div>

        {/* RIGHT WING - CRT Screen, Keypad, Action Buttons, Mic */}
        <div className="pokedex-right-wing">
          {/* Header controls for searching and filtering */}
          <div className="right-wing-header">
            <div className="search-bar-container">
              <Search className="glow-text-cyan" size={12} style={{ color: 'var(--neon-cyan)', marginRight: '6px' }} />
              <input 
                type="text" 
                placeholder="Search name/ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="type-select-dropdown"
            >
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <button 
              onClick={() => setIsGridOpen(!isGridOpen)}
              className="query-submit-btn"
              style={{ fontSize: '9px', padding: '6px 12px' }}
            >
              Index
            </button>
          </div>

          {/* Grid Popup Overlay */}
          {isGridOpen && (
            <div className="pokedex-database-modal">
              <div className="database-modal-header">
                <span style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-pixel)', fontSize: '8px' }}>Pokémon Database</span>
                <button 
                  onClick={() => setIsGridOpen(false)} 
                  style={{ color: '#ff2222', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'var(--font-pixel)', fontSize: '9px' }}
                >
                  X
                </button>
              </div>
              <div className="database-modal-grid">
                {pokemonList.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => {
                      onSelectPokemon(p.id);
                      setIsGridOpen(false);
                    }}
                    className={`database-grid-item ${selectedPokemon?.id === p.id ? 'active' : ''}`}
                  >
                    <img src={p.imageUrl} alt={p.name} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Green CRT Info Display */}
          <div className="right-wing-screen-bezel">
            <div className="right-wing-screen-inner">
              {gameMode === 'scan' && selectedPokemon && (
                <>
                  <p style={{ fontWeight: 'bold' }}>NO. {String(selectedPokemon.id).padStart(3, '0')} {selectedPokemon.name}</p>
                  <p style={{ fontSize: '7px', margin: '4px 0' }}>CLASS: {selectedPokemon.category}</p>
                  <p style={{ fontSize: '7px', margin: '4px 0' }}>HT: {selectedPokemon.height}M  WT: {selectedPokemon.weight}KG</p>
                  <p style={{ fontSize: '7px', borderBottom: '1px solid rgba(77, 250, 77, 0.3)', paddingBottom: '4px', marginBottom: '4px' }}>
                    TYPE: {selectedPokemon.types.join('/').toUpperCase()}
                  </p>
                  
                  {/* Embedded small stats table */}
                  <div className="pokemon-stats-grid">
                    <span>HP:{selectedPokemon.stats.hp}</span>
                    <span>ATK:{selectedPokemon.stats.attack}</span>
                    <span>DEF:{selectedPokemon.stats.defense}</span>
                    <span>SPD:{selectedPokemon.stats.speed}</span>
                    <span>SATK:{selectedPokemon.stats.spAttack}</span>
                    <span>SDEF:{selectedPokemon.stats.spDefense}</span>
                  </div>

                  {/* Dexter Speech Log */}
                  <div className="voice-chat-log-container">
                    <div className="voice-chat-header-row" style={{ fontSize: '7px' }}>
                      <span>DEXTER VOICE CHAT LOG</span>
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
                        {visualizerHeights.map((h, i) => (
                          <div key={i} className="audio-visualizer-bar" style={{ height: `${Math.max(2, h / 3)}px` }} />
                        ))}
                      </div>
                    </div>
                    
                    <div className="voice-chat-history" style={{ fontSize: '7px' }}>
                      {chatHistory.slice(-5).map((msg, idx) => (
                        <div key={idx} className={msg.sender === 'user' ? 'text-green-300' : 'text-green-400 font-semibold'} style={{ margin: '2px 0' }}>
                          &gt; {msg.sender === 'user' ? 'TRAINER' : 'DEXTER'}: {msg.text}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                </>
              )}

              {gameMode === 'guess' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(77, 250, 77, 0.3)', paddingBottom: '4px' }}>WHO'S THAT POKEMON?</p>
                  <p style={{ fontSize: '7px' }}>GUESS SCORE: {guessScore}</p>
                  {guessFeedback ? (
                    <p style={{ color: '#4dfa4d', fontWeight: 'bold', fontSize: '7px' }}>&gt; {guessFeedback}</p>
                  ) : (
                    <p className="animate-pulse" style={{ fontSize: '7px' }}>&gt; ANALYZING SILHOUETTE DISPLAY...</p>
                  )}
                  <div className="voice-chat-history" style={{ borderTop: '1px solid rgba(77, 250, 77, 0.3)', paddingTop: '6px', marginTop: '6px', fontSize: '7px' }}>
                    {chatHistory.slice(-3).map((msg, idx) => (
                      <div key={idx}>&gt; {msg.sender === 'user' ? 'TRAINER' : 'DEXTER'}: {msg.text}</div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </div>
              )}

              {gameMode === 'catch' && wildPokemon && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <p style={{ fontWeight: 'bold', borderBottom: '1px solid rgba(77, 250, 77, 0.3)', paddingBottom: '4px' }}>WILD RADAR SIGNAL</p>
                  <p style={{ fontSize: '7px' }}>TARGET: {wildPokemon.name.toUpperCase()}</p>
                  <p style={{ fontSize: '7px' }}>STATUS: {catchStatus.toUpperCase()}</p>
                  
                  {catchStatus === 'shaking' && <p style={{ color: '#ffd000', fontSize: '7px' }}>&gt; POKEBALL SHAKING... ({shakeCount})</p>}
                  {catchStatus === 'caught' && <p style={{ color: '#4dfa4d', fontWeight: 'bold', fontSize: '7px' }}>&gt; CAPTURED SUCCESS! SQUAD SIZE: {capturedSquad.length}</p>}
                  {catchStatus === 'escaped' && <p style={{ color: '#ff2222', fontWeight: 'bold', fontSize: '7px' }}>&gt; OH NO! Target broke free!</p>}
                  
                  <div className="voice-chat-history" style={{ borderTop: '1px solid rgba(77, 250, 77, 0.3)', paddingTop: '4px', marginTop: '4px', fontSize: '6.5px' }}>
                    {capturedSquad.length > 0 ? (
                      capturedSquad.map((c, i) => (
                        <div key={i} style={{ color: '#4dfa4d' }}>&gt; SQUAD #{i+1}: {c.name.toUpperCase()}</div>
                      ))
                    ) : (
                      <div style={{ opacity: 0.4 }}>NO CAPTURED SQUAD LOGS</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Blue numeric keypad keys */}
          <div className="keypad-container">
            {Array.from({ length: 10 }).map((_, idx) => (
              <button 
                key={idx} 
                className="keypad-blue-key" 
                onClick={handleKeypadPress} 
                title="Random Scan"
              />
            ))}
          </div>

          {/* Action Console & Voice Assistant Inputs */}
          <div className="right-wing-controls-bottom">
            {/* Pulsing audio speaker grill */}
            <div className="speaker-grill-container">
              <div className={`speaker-grill ${isSpeaking ? 'speaking-active' : ''}`} title="Speaker">
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
                <span className="speaker-hole" />
              </div>
            </div>

            <div className="actions-button-group">
              {/* Voice Command Button */}
              <button 
                type="button" 
                onClick={startVoiceInput} 
                className={`pokedex-btn-voice ${isListening ? 'active-listening' : ''}`}
              >
                {isListening ? (
                  <>
                    <Mic size={14} className="animate-pulse" />
                    <span>LISTENING...</span>
                  </>
                ) : (
                  <>
                    <MicOff size={14} />
                    <span>TAP TO TALK</span>
                  </>
                )}
              </button>

              {/* Text Query / Manual Input Console */}
              <form onSubmit={handleTextSubmit} className="voice-input-form">
                <input 
                  type="text" 
                  placeholder={gameMode === 'guess' ? "Type guess..." : "Ask Dexter: 'Who is this?'"}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="query-input-field"
                />
                <button 
                  type="submit" 
                  className="query-submit-btn"
                >
                  Send
                </button>
              </form>

              {/* Mode Selectors */}
              <div className="mode-buttons-row">
                <button 
                  onClick={() => setGameMode('scan')}
                  className={`pokedex-btn-mode ${gameMode === 'scan' ? 'active' : ''}`}
                >
                  SCAN
                </button>
                <button 
                  onClick={() => setGameMode('guess')}
                  className={`pokedex-btn-mode ${gameMode === 'guess' ? 'active' : ''}`}
                >
                  GUESS
                </button>
                {gameMode === 'guess' && hasAnsweredGuess && (
                  <button 
                    onClick={startNewGuessRound} 
                    className="pokedex-btn-mode"
                    style={{ background: 'linear-gradient(to bottom, #ffd000, #b39200)', color: '#000' }}
                  >
                    NEXT
                  </button>
                )}
                <button 
                  onClick={() => setGameMode('catch')}
                  className={`pokedex-btn-mode ${gameMode === 'catch' ? 'active' : ''}`}
                >
                  CATCH
                </button>
                {gameMode === 'catch' && catchStatus === 'idle' && (
                  <button 
                    onClick={throwBall} 
                    className="pokedex-btn-mode"
                    style={{ background: 'linear-gradient(to bottom, #ff3355, #99001a)' }}
                  >
                    THROW
                  </button>
                )}
                {gameMode === 'catch' && (catchStatus === 'caught' || catchStatus === 'escaped') && (
                  <button 
                    onClick={spawnWildPokemon} 
                    className="pokedex-btn-mode"
                    style={{ background: 'linear-gradient(to bottom, #4da6ff, #0047b3)' }}
                  >
                    NEXT
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PokedexInterface;
