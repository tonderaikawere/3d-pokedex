import React, { useState } from 'react';

interface Pokemon {
  id: number;
  name: string;
  types: string[];
  description: string;
  category: string;
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
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

interface PokemonChatProps {
  pokemon: Pokemon;
}

export const PokemonChat: React.FC<PokemonChatProps> = ({ pokemon }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const addMessage = (sender: 'user' | 'bot', text: string) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  const answerQuery = (q: string): string => {
    const lowered = q.toLowerCase();
    if (lowered.includes('type')) {
      return `${pokemon.name} is a ${pokemon.types.join(' / ')} type Pokémon.`;
    }
    if (lowered.includes('height')) {
      return `${pokemon.name} is ${pokemon.height} decimetres tall.`;
    }
    if (lowered.includes('weight')) {
      return `${pokemon.name} weighs ${pokemon.weight} hectograms.`;
    }
    if (lowered.includes('ability')) {
      return `${pokemon.name}'s abilities: ${pokemon.abilities.join(', ')}.`;
    }
    if (lowered.includes('description') || lowered.includes('info')) {
      return pokemon.description;
    }
    if (lowered.includes('stats') || lowered.includes('hp')) {
      const s = pokemon.stats;
      return `${pokemon.name} stats – HP: ${s.hp}, Attack: ${s.attack}, Defense: ${s.defense}, Sp. Attack: ${s.spAttack}, Sp. Defense: ${s.spDefense}, Speed: ${s.speed}.`;
    }
    return "I can answer about type, height, weight, abilities, description, or stats. Please ask a specific question.";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const query = input.trim();
    addMessage('user', query);
    const answer = answerQuery(query);
    addMessage('bot', answer);
    setInput('');
  };

  return (
    <div className="pokemon-chat glassmorphic p-2 rounded-md shadow-lg bg-white/10 backdrop-blur-md">
      <div className="chat-messages h-48 overflow-y-auto mb-2">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.sender} mb-1`}>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          className="flex-grow border border-gray-300 rounded-l-md p-1 focus:outline-none bg-white/20 text-white"
          placeholder="Ask about this Pokémon..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white rounded-r-md px-2">
          Send
        </button>
      </form>
    </div>
  );
};
