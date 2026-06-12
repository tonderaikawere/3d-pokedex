import fs from 'fs';
import path from 'path';

// Define directories
const dataDir = './src/data';
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Fetch helper with timeout
async function fetchWithTimeout(url, timeout = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Fetch with retry logic
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.ok) return res;
      console.warn(`[Warning] Status ${res.status} for ${url}, retry ${i + 1}/${retries}...`);
    } catch (err) {
      console.warn(`[Warning] Attempt ${i + 1}/${retries} failed for ${url}: ${err.message}`);
    }
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

async function fetchPokemonData() {
  console.log("Starting robust compilation of Pokemon database (151 Pokemon)...");
  const pokemonList = [];
  const pokemonCount = 151;
  
  // We will run in small concurrency groups of 5
  const concurrencyLimit = 5;
  const ids = Array.from({ length: pokemonCount }, (_, i) => i + 1);
  
  const chunks = [];
  for (let i = 0; i < ids.length; i += concurrencyLimit) {
    chunks.push(ids.slice(i, i + concurrencyLimit));
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing batch ${i + 1}/${chunks.length} (IDs: ${chunk.join(', ')})...`);
    
    const promises = chunk.map(id => getSinglePokemon(id));
    const results = await Promise.all(promises);
    
    results.forEach(p => {
      if (p) {
        pokemonList.push(p);
      }
    });

    // Small delay between batches to respect PokeAPI rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Sort list by ID just in case
  pokemonList.sort((a, b) => a.id - b.id);

  // Write file
  const outputPath = path.join(dataDir, 'pokemon.json');
  fs.writeFileSync(outputPath, JSON.stringify(pokemonList, null, 2));
  console.log(`Successfully compiled and saved ${pokemonList.length} Pokemon to ${outputPath}`);
}

async function getSinglePokemon(id) {
  try {
    // Fetch base data
    const res = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const pokemon = await res.json();

    // Fetch species data for description and genus
    const speciesRes = await fetchWithRetry(pokemon.species.url);
    const species = await speciesRes.json();

    // Find English flavor text description
    const englishDesc = species.flavor_text_entries.find(
      (entry) => entry.language.name === "en"
    );
    const descText = englishDesc 
      ? englishDesc.flavor_text.replace(/\f/g, " ").replace(/\n/g, " ").replace(/\r/g, " ")
      : "No data available.";

    // Find English genus (category)
    const englishGenus = species.genera.find(
      (g) => g.language.name === "en"
    );
    const category = englishGenus ? englishGenus.genus : "Unknown Pokémon";

    // Extract abilities
    const abilities = pokemon.abilities.map((a) => a.ability.name.replace('-', ' '));

    // Extract stats
    const stats = {};
    pokemon.stats.forEach((s) => {
      const name = s.stat.name;
      stats[name] = s.base_stat;
    });

    // Extract types
    const types = pokemon.types.map((t) => t.type.name);

    // Audio cries URL
    const cryUrl = pokemon.cries?.latest || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/cries/${id}.ogg`;

    console.log(`[Success] Loaded #${id} ${pokemon.name.toUpperCase()}`);

    return {
      id: pokemon.id,
      name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
      types: types,
      imageUrl: pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default,
      spriteUrl: pokemon.sprites.other.showdown?.front_default || pokemon.sprites.front_default,
      height: pokemon.height / 10, // decimeters to meters
      weight: pokemon.weight / 10, // hectograms to kg
      abilities: abilities,
      stats: {
        hp: stats['hp'] || 50,
        attack: stats['attack'] || 50,
        defense: stats['defense'] || 50,
        spAttack: stats['special-attack'] || 50,
        spDefense: stats['special-defense'] || 50,
        speed: stats['speed'] || 50
      },
      category: category,
      description: descText,
      cryUrl: cryUrl
    };
  } catch (err) {
    console.error(`[Error] Failed processing ID ${id}:`, err.message);
    return null;
  }
}

fetchPokemonData();
