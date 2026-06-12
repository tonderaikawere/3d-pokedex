// Web Speech API - Speech Recognition Types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechResultAlternative;
  [index: number]: SpeechResultAlternative;
}

interface SpeechResultAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

class DexterSpeechRecognition {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListeningState: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public startListening(
    onResult: (text: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError("Speech recognition is not supported in this browser.");
      return;
    }

    if (this.isListeningState) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech Recognition Error:", event.error);
      onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListeningState = false;
      onEnd();
    };

    try {
      this.recognition.start();
      this.isListeningState = true;
    } catch (e: any) {
      console.error("Failed to start speech recognition:", e);
      onError(e.message || "Failed to start listening.");
      this.isListeningState = false;
      onEnd();
    }
  }

  public stopListening() {
    if (this.recognition && this.isListeningState) {
      this.recognition.stop();
      this.isListeningState = false;
    }
  }

  public isListening(): boolean {
    return this.isListeningState;
  }

  /**
   * Helper to parse user's spoken command and match with Pokemon names and queries.
   */
  public parseCommand(transcript: string, pokemonList: any[], activePokemon: any = null): {
    matchedPokemonId?: number;
    answerText: string;
    speakText: string;
  } {
    const text = transcript.toLowerCase().trim();
    
    // 1. Identify which Pokemon is mentioned (if any)
    let matchedPokemon: any = null;
    for (const p of pokemonList) {
      const nameLower = p.name.toLowerCase();
      // Look for word boundaries or simple inclusion
      if (text.includes(nameLower)) {
        matchedPokemon = p;
        break;
      }
    }

    // Fallback: if they ask "who is that/this", "what is this", etc., use active selected Pokemon!
    if (!matchedPokemon && activePokemon) {
      const isRelativeQuery = text.includes("this") || 
                              text.includes("that") || 
                              text.includes("it") || 
                              text.includes("who is") ||
                              text.includes("describe") ||
                              text.includes("what is");
      if (isRelativeQuery) {
        matchedPokemon = activePokemon;
      }
    }

    // 2. Identify the type of question
    if (matchedPokemon) {
      const name = matchedPokemon.name;
      
      if (text.includes("type") || text.includes("element")) {
        const typesStr = matchedPokemon.types.join(" and ");
        const answer = `${name} is a ${typesStr} type Pokémon.`;
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: answer,
          speakText: answer
        };
      }
      
      if (text.includes("height") || text.includes("tall") || text.includes("size")) {
        const feet = (matchedPokemon.height * 3.28084).toFixed(1);
        const answer = `${name} is ${matchedPokemon.height} meters tall, which is approximately ${feet} feet.`;
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: answer,
          speakText: answer
        };
      }

      if (text.includes("weight") || text.includes("heavy")) {
        const lbs = (matchedPokemon.weight * 2.20462).toFixed(1);
        const answer = `${name} weighs ${matchedPokemon.weight} kilograms, which is approximately ${lbs} pounds.`;
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: answer,
          speakText: answer
        };
      }

      if (text.includes("ability") || text.includes("abilities") || text.includes("skill")) {
        const abStr = matchedPokemon.abilities.join(", ");
        const answer = `${name}'s abilities are: ${abStr}.`;
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: answer,
          speakText: answer
        };
      }

      if (text.includes("stat") || text.includes("power") || text.includes("strong")) {
        const statsStr = `HP: ${matchedPokemon.stats.hp}, Attack: ${matchedPokemon.stats.attack}, Defense: ${matchedPokemon.stats.defense}, Speed: ${matchedPokemon.stats.speed}`;
        const answer = `${name}'s base statistics are: ${statsStr}.`;
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: answer,
          speakText: answer
        };
      }

      // Default to standard description (Who is X / Tell me about X)
      const answer = `${name}, the ${matchedPokemon.category}. ${matchedPokemon.description}`;
      return {
        matchedPokemonId: matchedPokemon.id,
        answerText: answer,
        speakText: `${name}, the ${matchedPokemon.category}. ${matchedPokemon.description}`
      };
    }

    // 3. Fallbacks if no Pokemon was matched but command was recognized
    if (text.includes("hello") || text.includes("hi dexter") || text.includes("who are you")) {
      const answer = "Greetings! I am Dexter, your holographic Pokémon voice assistant. Ask me about any of the original 151 Pokémon. For example, say: 'Who is Pikachu?' or 'What type is Charizard?'.";
      return {
        answerText: answer,
        speakText: "Greetings! I am Dexter, your holographic Pokaymon voice assistant. Ask me about any of the original 151 Pokaymon."
      };
    }

    // Completely unrecognized
    const answer = `I heard: "${transcript}". Please ask a question about a specific Pokémon, like: "Who is Pikachu?" or "How heavy is Snorlax?"`;
    return {
      answerText: answer,
      speakText: "I did not quite catch that. Please ask about a specific Pokaymon."
    };
  }
}

export const DexterRecognition = new DexterSpeechRecognition();
