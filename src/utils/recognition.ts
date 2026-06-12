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

// 1. Static Type Chart
const TYPE_CHART: Record<string, { strengths: string[]; weaknesses: string[]; immunities: string[] }> = {
  normal: { strengths: [], weaknesses: ['fighting'], immunities: ['ghost'] },
  fire: { strengths: ['grass', 'ice', 'bug', 'steel'], weaknesses: ['water', 'ground', 'rock'], immunities: [] },
  water: { strengths: ['fire', 'ground', 'rock'], weaknesses: ['electric', 'grass'], immunities: [] },
  grass: { strengths: ['water', 'ground', 'rock'], weaknesses: ['fire', 'ice', 'poison', 'flying', 'bug'], immunities: [] },
  electric: { strengths: ['water', 'flying'], weaknesses: ['ground'], immunities: [] },
  ice: { strengths: ['grass', 'ground', 'flying', 'dragon'], weaknesses: ['fire', 'fighting', 'rock', 'steel'], immunities: [] },
  fighting: { strengths: ['normal', 'ice', 'rock', 'steel'], weaknesses: ['flying', 'psychic', 'fairy'], immunities: [] },
  poison: { strengths: ['grass', 'fairy'], weaknesses: ['ground', 'psychic'], immunities: [] },
  ground: { strengths: ['fire', 'electric', 'poison', 'rock', 'steel'], weaknesses: ['water', 'grass', 'ice'], immunities: [] },
  flying: { strengths: ['grass', 'fighting', 'bug'], weaknesses: ['electric', 'ice', 'rock'], immunities: [] },
  psychic: { strengths: ['fighting', 'poison'], weaknesses: ['bug', 'ghost', 'dark'], immunities: [] },
  bug: { strengths: ['grass', 'psychic', 'dark'], weaknesses: ['fire', 'flying', 'rock'], immunities: [] },
  rock: { strengths: ['fire', 'ice', 'flying', 'bug'], weaknesses: ['water', 'grass', 'fighting', 'ground', 'steel'], immunities: [] },
  ghost: { strengths: ['psychic', 'ghost'], weaknesses: ['ghost', 'dark'], immunities: ['normal', 'fighting'] },
  dragon: { strengths: ['dragon'], weaknesses: ['ice', 'dragon', 'fairy'], immunities: [] },
  steel: { strengths: ['ice', 'rock', 'fairy'], weaknesses: ['fire', 'fighting', 'ground'], immunities: ['poison'] },
  fairy: { strengths: ['fighting', 'dragon', 'dark'], weaknesses: ['poison', 'steel'], immunities: ['dragon'] }
};

// Helper to calculate type weaknesses for a list of types
const calculateWeaknesses = (types: string[]): { weaknesses: string[]; resistances: string[]; immunities: string[] } => {
  const chart: Record<string, number> = {};
  
  // Initialize type chart modifiers
  for (const type of Object.keys(TYPE_CHART)) {
    chart[type] = 1.0;
  }

  // Calculate combined multiplier
  for (const pType of types) {
    const t = pType.toLowerCase();
    if (!TYPE_CHART[t]) continue;

    // Apply weaknesses (x2 damage)
    for (const w of TYPE_CHART[t].weaknesses) {
      chart[w] *= 2.0;
    }

    // Apply resistances (x0.5 damage)
    for (const s of TYPE_CHART[t].strengths) {
      // Note: strengths means pType is strong against s, so pType resists s? 
      // Actually, standard type defense: we receive damage.
      // Let's look up standard type chart: e.g. Fire resists Grass, Fire, Ice, Bug, Steel.
      // To simplify, let's look up s in TYPE_CHART. If s's weaknesses contain t, s does half to t.
    }
    
    // We can also hardcode standard defenses. But let's keep it simple: 
    // If a type is weak to X, X does double. If resistant, X does half.
    // Let's hardcode standard resistances for Gen 1:
    const resistancesMap: Record<string, string[]> = {
      normal: [],
      fire: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
      water: ['water', 'fire', 'ice', 'steel'],
      grass: ['water', 'grass', 'electric', 'ground'],
      electric: ['electric', 'flying', 'steel'],
      ice: ['ice'],
      fighting: ['bug', 'rock', 'dark'],
      poison: ['grass', 'fighting', 'poison', 'bug', 'fairy'],
      ground: ['poison', 'rock'],
      flying: ['grass', 'fighting', 'bug'],
      psychic: ['fighting', 'psychic'],
      bug: ['grass', 'fighting', 'ground'],
      rock: ['normal', 'fire', 'poison', 'flying'],
      ghost: ['poison', 'bug'],
      dragon: ['fire', 'water', 'grass', 'electric'],
      steel: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'],
      fairy: ['fighting', 'bug', 'dark']
    };

    if (resistancesMap[t]) {
      for (const res of resistancesMap[t]) {
        chart[res] *= 0.5;
      }
    }

    for (const imm of TYPE_CHART[t].immunities) {
      chart[imm] = 0;
    }
  }

  const weaknesses: string[] = [];
  const resistances: string[] = [];
  const immunities: string[] = [];

  for (const [type, mult] of Object.entries(chart)) {
    if (mult > 1) weaknesses.push(type);
    else if (mult > 0 && mult < 1) resistances.push(type);
    else if (mult === 0) immunities.push(type);
  }

  return { weaknesses, resistances, immunities };
};

// 2. Evolution Mappings
const EVOLUTION_CHAINS: Record<string, string> = {
  bulbasaur: "Bulbasaur evolves into Ivysaur at Level 16, which then evolves into Venusaur at Level 32.",
  ivysaur: "Ivysaur is the second stage, evolving from Bulbasaur at Level 16 and into Venusaur at Level 32.",
  venusaur: "Venusaur is the final evolution of Bulbasaur, reached at Level 32.",
  charmander: "Charmander evolves into Charmeleon at Level 16, which then evolves into Charizard at Level 36.",
  charmeleon: "Charmeleon is the second stage, evolving from Charmander at Level 16 and into Charizard at Level 36.",
  charizard: "Charizard is the final evolution of Charmander, reached at Level 36.",
  squirtle: "Squirtle evolves into Wartortle at Level 16, which then evolves into Blastoise at Level 36.",
  wartortle: "Wartortle is the second stage, evolving from Squirtle at Level 16 and into Blastoise at Level 36.",
  blastoise: "Blastoise is the final evolution of Squirtle, reached at Level 36.",
  caterpie: "Caterpie evolves into Metapod at Level 7, which then evolves into Butterfree at Level 10.",
  metapod: "Metapod evolves from Caterpie at Level 7 and into Butterfree at Level 10.",
  butterfree: "Butterfree is the final stage, evolving from Metapod at Level 10.",
  weedle: "Weedle evolves into Kakuna at Level 7, which then evolves into Beedrill at Level 10.",
  kakuna: "Kakuna evolves from Weedle at Level 7 and into Beedrill at Level 10.",
  beedrill: "Beedrill is the final stage, evolving from Kakuna at Level 10.",
  pidgey: "Pidgey evolves into Pidgeotto at Level 18, which then evolves into Pidgeot at Level 36.",
  pidgeotto: "Pidgeotto evolves from Pidgey at Level 18 and into Pidgeot at Level 36.",
  pidgeot: "Pidgeot is the final stage, evolving from Pidgeotto at Level 36.",
  rattata: "Rattata evolves into Raticate at Level 20.",
  raticate: "Raticate is the final stage, evolving from Rattata at Level 20.",
  spearow: "Spearow evolves into Fearow at Level 20.",
  fearow: "Fearow is the final stage, evolving from Spearow at Level 20.",
  ekans: "Ekans evolves into Arbok at Level 22.",
  arbok: "Arbok is the final stage, evolving from Ekans at Level 22.",
  pikachu: "Pikachu evolves into Raichu when exposed to a Thunder Stone.",
  raichu: "Raichu is the final evolution of Pikachu, achieved using a Thunder Stone.",
  sandshrew: "Sandshrew evolves into Sandslash at Level 22.",
  sandslash: "Sandslash is the final stage, evolving from Sandshrew at Level 22.",
  nidoranf: "Nidoran Female evolves into Nidorina at Level 16, which evolves into Nidoqueen using a Moon Stone.",
  nidorina: "Nidorina evolves from Nidoran Female at Level 16 and into Nidoqueen using a Moon Stone.",
  nidoqueen: "Nidoqueen is the final evolution of Nidoran Female, achieved using a Moon Stone.",
  nidoranm: "Nidoran Male evolves into Nidorino at Level 16, which evolves into Nidoking using a Moon Stone.",
  nidorino: "Nidorino evolves from Nidoran Male at Level 16 and into Nidoking using a Moon Stone.",
  nidoking: "Nidoking is the final evolution of Nidoran Male, achieved using a Moon Stone.",
  clefairy: "Clefairy evolves into Clefable when exposed to a Moon Stone.",
  clefable: "Clefable is the final stage, evolving from Clefairy using a Moon Stone.",
  vulpix: "Vulpix evolves into Ninetales when exposed to a Fire Stone.",
  ninetales: "Ninetales is the final stage, evolving from Vulpix using a Fire Stone.",
  jigglypuff: "Jigglypuff evolves into Wigglytuff when exposed to a Moon Stone.",
  wigglytuff: "Wigglytuff is the final stage, evolving from Jigglypuff using a Moon Stone.",
  zubat: "Zubat evolves into Golbat at Level 22.",
  golbat: "Golbat is the final stage in the Kanto region, evolving from Zubat at Level 22.",
  oddish: "Oddish evolves into Gloom at Level 21, which evolves into Vileplume using a Leaf Stone.",
  gloom: "Gloom evolves from Oddish at Level 21 and into Vileplume using a Leaf Stone.",
  vileplume: "Vileplume is the final stage, evolving from Gloom using a Leaf Stone.",
  paras: "Paras evolves into Parasect at Level 24.",
  parasect: "Parasect is the final stage, evolving from Paras at Level 24.",
  venonat: "Venonat evolves into Venomoth at Level 31.",
  venomoth: "Venomoth is the final stage, evolving from Venonat at Level 31.",
  diglett: "Diglett evolves into Dugtrio at Level 26.",
  dugtrio: "Dugtrio is the final stage, evolving from Diglett at Level 26.",
  meowth: "Meowth evolves into Persian at Level 28.",
  persian: "Persian is the final stage, evolving from Meowth at Level 28.",
  psyduck: "Psyduck evolves into Golduck at Level 33.",
  golduck: "Golduck is the final stage, evolving from Psyduck at Level 33.",
  mankey: "Mankey evolves into Primeape at Level 28.",
  primeape: "Primeape is the final stage, evolving from Mankey at Level 28.",
  growlithe: "Growlithe evolves into Arcanine when exposed to a Fire Stone.",
  arcanine: "Arcanine is the final stage, evolving from Growlithe using a Fire Stone.",
  poliwag: "Poliwag evolves into Poliwhirl at Level 25, which evolves into Poliwrath using a Water Stone.",
  poliwhirl: "Poliwhirl evolves from Poliwag at Level 25 and into Poliwrath using a Water Stone.",
  poliwrath: "Poliwrath is the final evolution of Poliwag, achieved using a Water Stone.",
  abra: "Abra evolves into Kadabra at Level 16, which evolves into Alakazam by trade link.",
  kadabra: "Kadabra evolves from Abra at Level 16 and into Alakazam by trade link.",
  alakazam: "Alakazam is the final evolution of Abra, achieved by trade link.",
  machop: "Machop evolves into Machoke at Level 28, which evolves into Machamp by trade link.",
  machoke: "Machoke evolves from Machop at Level 28 and into Machamp by trade link.",
  machamp: "Machamp is the final evolution of Machop, achieved by trade link.",
  bellsprout: "Bellsprout evolves into Weepinbell at Level 21, which evolves into Victreebel using a Leaf Stone.",
  weepinbell: "Weepinbell evolves from Bellsprout at Level 21 and into Victreebel using a Leaf Stone.",
  victreebel: "Victreebel is the final stage, evolving from Weepinbell using a Leaf Stone.",
  tentacool: "Tentacool evolves into Tentacruel at Level 30.",
  tentacruel: "Tentacruel is the final stage, evolving from Tentacool at Level 30.",
  geodude: "Geodude evolves into Graveler at Level 25, which evolves into Golem by trade link.",
  graveler: "Graveler evolves from Geodude at Level 25 and into Golem by trade link.",
  golem: "Golem is the final evolution of Geodude, achieved by trade link.",
  ponyta: "Ponyta evolves into Rapidash at Level 40.",
  rapidash: "Rapidash is the final stage, evolving from Ponyta at Level 40.",
  slowpoke: "Slowpoke evolves into Slowbro at Level 37.",
  slowbro: "Slowbro is the final stage, evolving from Slowpoke at Level 37.",
  magnemite: "Magnemite evolves into Magneton at Level 30.",
  magneton: "Magneton is the final stage, evolving from Magnemite at Level 30.",
  doduo: "Doduo evolves into Dodrio at Level 31.",
  dodrio: "Dodrio is the final stage, evolving from Doduo at Level 31.",
  seel: "Seel evolves into Dewgong at Level 34.",
  dewgong: "Dewgong is the final stage, evolving from Seel at Level 34.",
  grimer: "Grimer evolves into Muk at Level 38.",
  muk: "Muk is the final stage, evolving from Grimer at Level 38.",
  shellder: "Shellder evolves into Cloyster when exposed to a Water Stone.",
  cloyster: "Cloyster is the final stage, evolving from Shellder using a Water Stone.",
  gastly: "Gastly evolves into Haunter at Level 25, which evolves into Gengar by trade link.",
  haunter: "Haunter evolves from Gastly at Level 25 and into Gengar by trade link.",
  gengar: "Gengar is the final evolution of Gastly, achieved by trade link.",
  drowzee: "Drowzee evolves into Hypno at Level 26.",
  hypno: "Hypno is the final stage, evolving from Drowzee at Level 26.",
  krabby: "Krabby evolves into Kingler at Level 28.",
  kingler: "Kingler is the final stage, evolving from Krabby at Level 28.",
  voltorb: "Voltorb evolves into Electrode at Level 30.",
  electrode: "Electrode is the final stage, evolving from Voltorb at Level 30.",
  exeggcute: "Exeggcute evolves into Exeggutor when exposed to a Leaf Stone.",
  exeggutor: "Exeggutor is the final stage, evolving from Exeggcute using a Leaf Stone.",
  cubone: "Cubone evolves into Marowak at Level 28.",
  marowak: "Marowak is the final stage, evolving from Cubone at Level 28.",
  koffing: "Koffing evolves into Weezing at Level 35.",
  weezing: "Weezing is the final stage, evolving from Koffing at Level 35.",
  rhyhorn: "Rhyhorn evolves into Rhydon at Level 42.",
  rhydon: "Rhydon is the final stage, evolving from Rhyhorn at Level 42.",
  horsea: "Horsea evolves into Seadra at Level 32.",
  seadra: "Seadra is the final stage, evolving from horsea at Level 32.",
  goldeen: "Goldeen evolves into Seaking at Level 33.",
  seaking: "Seaking is the final stage, evolving from Goldeen at Level 33.",
  staryu: "Staryu evolves into Starmie when exposed to a Water Stone.",
  starmie: "Starmie is the final stage, evolving from Staryu using a Water Stone.",
  magikarp: "Magikarp undergoes a dramatic evolution into Gyarados at Level 20.",
  gyarados: "Gyarados is the final evolution of Magikarp, reached at Level 20.",
  eevee: "Eevee has a branching evolution: it evolves into Vaporeon with a Water Stone, Jolteon with a Thunder Stone, or Flareon with a Fire Stone.",
  vaporeon: "Vaporeon is one of Eevee's final stages, achieved using a Water Stone.",
  jolteon: "Jolteon is one of Eevee's final stages, achieved using a Thunder Stone.",
  flareon: "Flareon is one of Eevee's final stages, achieved using a Fire Stone.",
  omanyte: "Omanyte evolves into Omastar at Level 40.",
  omastar: "Omastar is the final stage, evolving from Omanyte at Level 40.",
  kabuto: "Kabuto evolves into Kabutops at Level 40.",
  kabutops: "Kabutops is the final stage, evolving from Kabuto at Level 40.",
  dratini: "Dratini evolves into Dragonair at Level 30, which evolves into Dragonite at Level 55.",
  dragonair: "Dragonair evolves from Dratini at Level 30 and into Dragonite at Level 55.",
  dragonite: "Dragonite is the final evolution of Dratini, reached at Level 55."
};

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
    
    // --- 3. COMPARISON HANDLER (Who is stronger, A or B?) ---
    const isComparisonQuery = text.includes("stronger") || 
                              text.includes("better") || 
                              text.includes("compare") || 
                              text.includes(" vs ") || 
                              text.includes("versus") || 
                              text.includes("who wins");
                              
    if (isComparisonQuery) {
      const foundPokemon: any[] = [];
      for (const p of pokemonList) {
        if (text.includes(p.name.toLowerCase())) {
          foundPokemon.push(p);
        }
      }
      
      // If they say "is it stronger than bulbasaur" and we have activePokemon, compare active vs bulbasaur!
      if (foundPokemon.length === 1 && activePokemon && activePokemon.id !== foundPokemon[0].id) {
        foundPokemon.unshift(activePokemon);
      }
      
      if (foundPokemon.length >= 2) {
        const p1 = foundPokemon[0];
        const p2 = foundPokemon[1];
        
        const sumStats = (p: any) => 
          p.stats.hp + p.stats.attack + p.stats.defense + p.stats.speed + p.stats.spAttack + p.stats.spDefense;
          
        const total1 = sumStats(p1);
        const total2 = sumStats(p2);
        
        let answer = "";
        let winner = null;
        
        if (total1 > total2) {
          winner = p1;
          answer = `${p1.name} is stronger than ${p2.name} in base stats. ${p1.name}'s stat total is ${total1}, compared to ${p2.name}'s total of ${total2}. `;
        } else if (total2 > total1) {
          winner = p2;
          answer = `${p2.name} is stronger than ${p1.name} in base stats. ${p2.name}'s stat total is ${total2}, compared to ${p1.name}'s total of ${total1}. `;
        } else {
          answer = `${p1.name} and ${p2.name} are equal in strength, both having a base stat total of ${total1}. `;
        }
        
        // Add type advantage check
        // Check if winner type has advantage over loser
        let p1HasAdvantage = false;
        let p2HasAdvantage = false;
        
        for (const t1 of p1.types) {
          const c = TYPE_CHART[t1.toLowerCase()];
          if (c) {
            for (const t2 of p2.types) {
              if (c.weaknesses.includes(t2.toLowerCase())) p2HasAdvantage = true; // t2 is strong against t1
              if (c.strengths.includes(t2.toLowerCase())) p1HasAdvantage = true; // t1 is strong against t2
            }
          }
        }
        
        if (p1HasAdvantage && !p2HasAdvantage) {
          answer += `Also, ${p1.name} has a type advantage over ${p2.name}.`;
        } else if (p2HasAdvantage && !p1HasAdvantage) {
          answer += `However, ${p2.name} has a type advantage over ${p1.name}.`;
        } else if (p1HasAdvantage && p2HasAdvantage) {
          answer += `They both have type advantages against each other.`;
        }
        
        return {
          matchedPokemonId: p1.id,
          answerText: answer,
          speakText: answer
        };
      }
    }

    // Identify which Pokemon is mentioned (if any)
    let matchedPokemon: any = null;
    for (const p of pokemonList) {
      const nameLower = p.name.toLowerCase();
      if (text.includes(nameLower)) {
        matchedPokemon = p;
        break;
      }
    }

    // Fallback: if they ask "who is that/this", "what is this", use active selected Pokemon!
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

    if (matchedPokemon) {
      const name = matchedPokemon.name;
      const nameKey = name.toLowerCase();
      
      // --- 4. EVOLUTION CHECK ---
      const isEvoQuery = text.includes("evolve") || 
                         text.includes("evolution") || 
                         text.includes("turn into") || 
                         text.includes("grow into") ||
                         text.includes("next stage");
                         
      if (isEvoQuery) {
        const evoText = EVOLUTION_CHAINS[nameKey] || `${name} has no further evolution recorded in the Kanto region.`;
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: evoText,
          speakText: evoText
        };
      }

      // --- 5. WEAKNESS / MATCHUP CHECK ---
      const isWeakQuery = text.includes("weak") || 
                          text.includes("vulnerable") || 
                          text.includes("counter") || 
                          text.includes("effective") || 
                          text.includes("resist") || 
                          text.includes("strength");
                          
      if (isWeakQuery) {
        const { weaknesses, resistances, immunities } = calculateWeaknesses(matchedPokemon.types);
        
        let responseText = `${name} is a ${matchedPokemon.types.join("/")} type. `;
        if (weaknesses.length > 0) {
          responseText += `It takes double damage from: ${weaknesses.join(", ")}. `;
        } else {
          responseText += `It has no special type weaknesses. `;
        }
        
        if (resistances.length > 0) {
          responseText += `It resists: ${resistances.join(", ")}. `;
        }
        if (immunities.length > 0) {
          responseText += `It is immune to: ${immunities.join(", ")}.`;
        }
        
        return {
          matchedPokemonId: matchedPokemon.id,
          answerText: responseText,
          speakText: responseText
        };
      }
      
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
    const answer = `I heard: "${transcript}". Ask about specific Pokémon, or check Settings to unlock the Gemini AI Core for unlimited questions!`;
    return {
      answerText: answer,
      speakText: "I did not quite catch that. Ask about a specific Pokaymon."
    };
  }
}

export const DexterRecognition = new DexterSpeechRecognition();
