import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, Mic, MicOff, Search, ChevronLeft, ChevronRight, 
  Heart, Sword, Shield, Zap, ShieldAlert, Activity, 
  Gamepad2, Sparkles, Trophy, Disc, HelpCircle
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
    
    // Pick correct pokemon randomly
    const correct = pokemonList[Math.floor(Math.random() * pokemonList.length)];
    setCorrectGuessPokemon(correct);
    onSelectPokemon(correct.id);
    setIsSilhouette(true);
    setHasAnsweredGuess(false);
    setGuessFeedback(null);

    // Pick 3 other random options
    const options = [correct];
    while (options.length < 4) {
      const rand = pokemonList[Math.floor(Math.random() * pokemonList.length)];
      if (!options.find(o => o.id === rand.id)) {
        options.push(rand);
      }
    }
    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    setGuessOptions(options);

    // Prompt the user verbally
    setTimeout(() => {
      DexterSpeech.speak("Who is that Pokaymon? Look at the hologram screen and guess!");
    }, 300);
  };

  const handleGuessAttempt = (guessName: string) => {
    if (hasAnsweredGuess || !correctGuessPokemon) return;

    const correctName = correctGuessPokemon.name.toLowerCase();
    const cleanGuess = guessName.toLowerCase().trim();

    setHasAnsweredGuess(true);
    setIsSilhouette(false); // Reveal card!

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

    // Deduct ball
    setBallCounts(prev => ({ ...prev, [selectedBall]: prev[selectedBall] - 1 }));
    setCatchStatus('throwing');
    
    // Speak throw action
    DexterSpeech.speak(`Throwing ${selectedBall}!`);

    // Step 1: Ball hits (1.2 seconds)
    setTimeout(() => {
      setCatchStatus('shaking');
      setShakeCount(1);
      playShakeSound();
      
      // Step 2: Shake 1 (1.0s later)
      setTimeout(() => {
        setShakeCount(2);
        playShakeSound();
        
        // Step 3: Shake 2 (1.0s later)
        setTimeout(() => {
          setShakeCount(3);
          playShakeSound();
          
          // Step 4: Final catch check (1.0s later)
          setTimeout(() => {
            determineCatchResult();
          }, 1000);
        }, 1000);
      }, 1000);
    }, 1200);
  };

  const playShakeSound = () => {
    // Small electronic blip for shaking
    const osc = new AudioContext().createOscillator();
    const gain = new AudioContext().createGain();
    osc.connect(gain);
    gain.connect(new AudioContext().destination);
    osc.frequency.setValueAtTime(220, new AudioContext().currentTime);
    gain.gain.setValueAtTime(0.1, new AudioContext().currentTime);
    osc.start();
    osc.stop(new AudioContext().currentTime + 0.15);
  };

  const determineCatchResult = () => {
    if (!wildPokemon) return;
    
    // Catch rates: Master Ball = 100%, Ultra = 80%, Great = 65%, PokeBall = 45%
    let catchRate = 0.45;
    if (selectedBall === 'greatball') catchRate = 0.65;
    if (selectedBall === 'ultraball') catchRate = 0.80;
    if (selectedBall === 'masterball') catchRate = 1.0;

    const roll = Math.random();
    
    if (roll < catchRate) {
      setCatchStatus('caught');
      setCapturedSquad(prev => {
        // Avoid duplicates in squad logs
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

  // Navigate selection
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

  // Initialize modes
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

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none grid grid-cols-12 grid-rows-12 p-6 gap-6 z-10 font-sans">
      
      {/* Top Header Banner */}
      <header className="col-span-12 row-span-1 pointer-events-auto flex justify-between items-center bg-gradient-to-r from-red-950/80 to-slate-900/80 backdrop-blur-md border-b-2 border-red-500 px-6 py-2 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="relative w-8 h-8 rounded-full bg-blue-500 border-4 border-white flex items-center justify-center shadow-[0_0_15px_#3b82f6]">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-200 absolute top-1 left-1 animate-pulse" />
          </div>
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
            <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
            <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
          <h1 className="font-cyber font-black tracking-widest text-xl text-red-500 glow-text-red ml-4">
            DEXTER <span className="text-cyan-400 font-light">CONSOLE CHAMEBER</span>
          </h1>
        </div>

        {/* Game Mode Tab Selectors */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setGameMode('scan')}
            className={`cyber-btn text-xs font-cyber py-1.5 px-3 ${gameMode === 'scan' ? 'cyber-btn-cyan bg-cyan-500/20' : 'opacity-65'}`}
          >
            Scanner HUD
          </button>
          
          <button 
            onClick={() => setGameMode('guess')}
            className={`cyber-btn text-xs font-cyber py-1.5 px-3 ${gameMode === 'guess' ? 'cyber-btn-cyan bg-cyan-500/20' : 'opacity-65'}`}
          >
            <Gamepad2 size={13} className="inline mr-1" /> Guessing Game
          </button>
          
          <button 
            onClick={() => setGameMode('catch')}
            className={`cyber-btn text-xs font-cyber py-1.5 px-3 ${gameMode === 'catch' ? 'cyber-btn-cyan bg-cyan-500/20' : 'opacity-65'}`}
          >
            <Sparkles size={13} className="inline mr-1" /> Catch Wild
          </button>
        </div>
      </header>

      {/* LEFT PANEL: SCANNER SUMMARY OR STATUS */}
      <section className="col-span-4 row-span-11 pointer-events-auto flex flex-col justify-between cyber-panel p-5 mt-4">
        <div className="corner-decor corner-tl" />
        <div className="corner-decor corner-tr" />
        <div className="corner-decor corner-bl" />
        <div className="corner-decor corner-br" />
        <div className="cyber-grid-bg" />

        {gameMode === 'scan' && selectedPokemon && (
          <div className="flex flex-col gap-3 relative z-10">
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

            {/* Micro artwork preview */}
            <div className="relative w-full aspect-video flex items-center justify-center bg-slate-950/60 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
              <img src={selectedPokemon.imageUrl} alt={selectedPokemon.name} className="w-1/2 h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,243,255,0.2)]" />
            </div>

            <div className="flex gap-2 justify-center">
              {selectedPokemon.types.map(t => (
                <span key={t} className={`type-badge ${t}`}>{t}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1 text-center">
              <div className="bg-slate-950/40 border border-cyan-500/10 rounded-lg p-2">
                <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase">HEIGHT</span>
                <span className="font-cyber text-sm text-white font-bold block">{selectedPokemon.height} m</span>
              </div>
              <div className="bg-slate-950/40 border border-cyan-500/10 rounded-lg p-2">
                <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase">WEIGHT</span>
                <span className="font-cyber text-sm text-white font-bold block">{selectedPokemon.weight} kg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1">
              <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase">Abilities</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedPokemon.abilities.map(ab => (
                  <span key={ab} className="font-cyber text-[9px] text-slate-300 bg-slate-900 border border-slate-700/60 rounded px-2 py-0.5 capitalize">
                    {ab}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="border border-cyan-500/20 rounded-lg p-3 bg-slate-950/40 mt-1">
              <span className="font-cyber text-[8px] text-cyan-400/70 tracking-widest uppercase block mb-1">Pokedex entry</span>
              <p className="text-xs text-slate-300 leading-relaxed max-h-24 overflow-y-auto pr-1">
                {selectedPokemon.description}
              </p>
            </div>
          </div>
        )}

        {gameMode === 'guess' && (
          <div className="flex flex-col gap-4 relative z-10 h-full justify-between">
            <div className="border-b border-cyan-500/30 pb-2">
              <h2 className="font-cyber font-black text-lg tracking-widest text-cyan-400 uppercase flex items-center gap-2">
                <HelpCircle size={18} /> WHO'S THAT POKÉMON?
              </h2>
            </div>

            <div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl p-4 flex flex-col items-center flex-1 justify-center gap-3">
              <Trophy size={42} className="text-yellow-400 glow-text-yellow animate-bounce" />
              <span className="font-cyber text-xs text-slate-400 uppercase tracking-widest">CURRENT SCORE</span>
              <span className="font-cyber text-3xl font-black text-white">{guessScore}</span>
              
              {guessFeedback && (
                <div className={`mt-2 font-cyber text-sm font-bold px-3 py-1 rounded border ${
                  guessFeedback.startsWith('CORRECT') 
                    ? 'border-green-500/30 bg-green-950/20 text-green-400' 
                    : 'border-red-500/30 bg-red-950/20 text-red-400'
                }`}>
                  {guessFeedback}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              {guessOptions.map((opt) => (
                <button
                  key={opt.id}
                  disabled={hasAnsweredGuess}
                  onClick={() => handleGuessAttempt(opt.name)}
                  className={`cyber-btn text-xs font-cyber py-3 capitalize ${
                    hasAnsweredGuess && correctGuessPokemon?.id === opt.id
                      ? 'bg-green-600 border-green-400 text-white'
                      : 'bg-slate-950 border-cyan-500/40'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>

            {hasAnsweredGuess && (
              <button
                onClick={startNewGuessRound}
                className="cyber-btn cyber-btn-cyan text-xs font-cyber py-2 w-full mt-2"
              >
                Next Round
              </button>
            )}
          </div>
        )}

        {gameMode === 'catch' && (
          <div className="flex flex-col gap-4 relative z-10 h-full justify-between">
            <div className="border-b border-cyan-500/30 pb-2">
              <h2 className="font-cyber font-black text-lg tracking-widest text-cyan-400 uppercase">
                🔴 CAPTURE BAY
              </h2>
            </div>

            {wildPokemon && (
              <div className="bg-slate-950/60 border border-cyan-500/20 rounded-xl p-4 flex flex-col items-center flex-1 justify-center gap-3">
                {/* Catching status indicator */}
                {catchStatus === 'idle' && (
                  <>
                    <span className="font-cyber text-[10px] text-red-400 uppercase tracking-widest animate-pulse">WILD POKÉMON ENCOUNTERED</span>
                    <h3 className="font-cyber font-bold text-xl text-white uppercase">{wildPokemon.name}</h3>
                    <div className="flex gap-2 justify-center mt-1">
                      {wildPokemon.types.map(t => (
                        <span key={t} className={`type-badge ${t}`}>{t}</span>
                      ))}
                    </div>
                  </>
                )}

                {catchStatus === 'throwing' && (
                  <div className="flex flex-col items-center gap-2 animate-bounce">
                    <Disc size={40} className="text-red-500 animate-spin" />
                    <span className="font-cyber text-xs text-white uppercase tracking-widest">THROWING BALL...</span>
                  </div>
                )}

                {catchStatus === 'shaking' && (
                  <div className="flex flex-col items-center gap-2 animate-ping" style={{ animationDuration: '2s' }}>
                    <Disc size={40} className="text-yellow-500 animate-bounce" />
                    <span className="font-cyber text-xs text-yellow-400 uppercase tracking-widest">SHAKING ({shakeCount})...</span>
                  </div>
                )}

                {catchStatus === 'caught' && (
                  <div className="flex flex-col items-center gap-2">
                    <Disc size={44} className="text-green-500 glow-text-green" />
                    <span className="font-cyber text-sm font-bold text-green-400 uppercase tracking-widest">GOTCHA!</span>
                    <p className="text-[10px] text-slate-400 text-center uppercase">{wildPokemon.name} is successfully captured!</p>
                  </div>
                )}

                {catchStatus === 'escaped' && (
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-cyber text-sm font-bold text-red-500 uppercase tracking-widest">BROKE FREE!</span>
                    <p className="text-[10px] text-slate-400 text-center uppercase">The wild Pokémon escaped...</p>
                  </div>
                )}
              </div>
            )}

            {/* Ball selector grid */}
            <div className="grid grid-cols-2 gap-2">
              {(['pokeball', 'greatball', 'ultraball', 'masterball'] as const).map((ball) => (
                <button
                  key={ball}
                  disabled={catchStatus !== 'idle'}
                  onClick={() => setSelectedBall(ball)}
                  className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                    selectedBall === ball 
                      ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                      : 'bg-slate-950 border-cyan-500/10 hover:border-cyan-500/30 text-slate-300'
                  }`}
                >
                  <span className="font-cyber text-[10px] capitalize font-bold">{ball.replace('ball', ' Ball')}</span>
                  <span className="font-cyber text-[10px] text-cyan-400/80">x{ballCounts[ball]}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {catchStatus === 'idle' ? (
                <button
                  onClick={throwBall}
                  className="cyber-btn cyber-btn-cyan text-xs font-cyber py-3 w-full"
                >
                  Throw Ball
                </button>
              ) : (
                (catchStatus === 'caught' || catchStatus === 'escaped') && (
                  <button
                    onClick={spawnWildPokemon}
                    className="cyber-btn text-xs font-cyber py-3 w-full"
                  >
                    Find Another
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Play Cry / Re-scan buttons footer */}
        {gameMode === 'scan' && (
          <div className="grid grid-cols-2 gap-2 mt-3 relative z-10">
            <button onClick={handlePlayCry} className="cyber-btn cyber-btn-cyan text-xs py-2 w-full">
              Play Cry
            </button>
            <button 
              onClick={() => selectedPokemon && DexterSpeech.speakPokemonEntry(selectedPokemon.name, selectedPokemon.category, selectedPokemon.description)} 
              className="cyber-btn text-xs py-2 w-full"
            >
              Re-Scan
            </button>
          </div>
        )}
      </section>

      {/* Middle Spacer */}
      <div className="col-span-4 row-span-11 pointer-events-none" />

      {/* RIGHT PANEL: DEXTER VOICE UTTERANCE + STATS OR CAPTURED SQUAD */}
      <section className="col-span-4 row-span-11 pointer-events-auto flex flex-col justify-between cyber-panel p-5 mt-4">
        <div className="corner-decor corner-tl" />
        <div className="corner-decor corner-tr" />
        <div className="corner-decor corner-bl" />
        <div className="corner-decor corner-br" />
        <div className="cyber-grid-bg" />

        {/* Top: Dialogue / Chat Logs */}
        <div className="flex flex-col h-[48%] border-b border-cyan-500/20 pb-4 relative z-10">
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-3">
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

          <form onSubmit={handleTextSubmit} className="flex gap-2 mt-3">
            <input 
              type="text" 
              placeholder={gameMode === 'guess' ? "Type your guess name..." : "Ask Dexter (e.g. 'Who is Pikachu?')..."}
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
              {gameMode === 'guess' ? 'Guess' : 'Send'}
            </button>
          </form>
        </div>

        {/* Bottom: Pokemon Stats OR Captured Squad */}
        <div className="flex flex-col h-[48%] pt-3 relative z-10">
          {gameMode === 'catch' ? (
            <>
              <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-3">
                <span className="font-cyber text-xs text-cyan-400 font-bold tracking-widest">
                  CAPTURED SQUAD LOGS
                </span>
                <span className="font-cyber text-[10px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded">
                  SQUAD SIZE: {capturedSquad.length}
                </span>
              </div>
              
              <div className="flex-1 bg-slate-950/40 border border-cyan-500/10 rounded-xl p-3 overflow-y-auto shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)] flex flex-col gap-2">
                {capturedSquad.length > 0 ? (
                  capturedSquad.map((captured) => (
                    <div 
                      key={captured.id} 
                      onClick={() => onSelectPokemon(captured.id)}
                      className="flex items-center justify-between p-2 bg-slate-900 border border-cyan-500/10 hover:border-cyan-500/45 rounded-lg cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img src={captured.spriteUrl || captured.imageUrl} alt={captured.name} className="w-8 h-8 object-contain" />
                        <div className="flex flex-col">
                          <span className="font-cyber text-xs text-white font-bold">{captured.name}</span>
                          <span className="font-cyber text-[8px] text-cyan-400">#{String(captured.id).padStart(3, '0')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {captured.types.map(t => (
                          <span key={t} className="font-cyber text-[8px] border border-slate-700/60 rounded px-1.5 py-0.2 uppercase text-slate-400 bg-slate-950">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs uppercase tracking-widest text-center">
                    Squad is empty.<br />Throw Pokeballs at wild Pokemon to capture them!
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center border-b border-cyan-500/30 pb-2 mb-3">
                <span className="font-cyber text-xs text-cyan-400 font-bold tracking-widest">
                  COMBAT CAPABILITY SPECS
                </span>
              </div>

              {selectedPokemon ? (
                <div className="flex-1 flex flex-col justify-around gap-2 bg-slate-950/40 border border-cyan-500/10 rounded-xl p-3">
                  {Object.entries(selectedPokemon.stats).map(([key, value]) => {
                    const percentage = Math.min(100, Math.round((value / 180) * 100));
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 w-16">
                          <span className="font-cyber text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            {key === 'spAttack' ? 'SATK' : key === 'spDefense' ? 'SDEF' : key.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-full h-3 overflow-hidden p-[1px]">
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
        </div>
      </section>

      {/* Bottom controls */}
      <footer className="col-span-12 row-span-1 pointer-events-none flex justify-between items-center px-4 relative z-10">
        <button onClick={handlePrev} className="pointer-events-auto cyber-btn cyber-btn-cyan text-xs font-cyber">
          <ChevronLeft size={16} /> Previous Pokemon
        </button>
        <div className="w-1/3 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60 animate-[pulse-glow_2s_infinite_ease-in-out]" />
        <button onClick={handleNext} className="pointer-events-auto cyber-btn cyber-btn-cyan text-xs font-cyber">
          Next Pokemon <ChevronRight size={16} />
        </button>
      </footer>
    </div>
  );
};
export default PokedexInterface;
