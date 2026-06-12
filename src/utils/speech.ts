class DexterSpeechSystem {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private rate: number = 1.05; // Slightly faster to sound like a digital device
  private pitch: number = 0.95; // Slightly lower pitch for that classic robotic tone
  private isSpeakingState: boolean = false;
  private onStateChange: ((speaking: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synth = window.speechSynthesis;
    }
  }

  public registerStateListener(listener: (speaking: boolean) => void) {
    this.onStateChange = listener;
  }

  private getVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    
    // Attempt to find a robotic/sci-fi sounding English voice
    // "Google US English" or "Microsoft David" or "Zira" or any English voice
    const preferredVoices = [
      'google us english',
      'microsoft david',
      'microsoft zira',
      'english',
      'en-'
    ];

    for (const pref of preferredVoices) {
      const found = voices.find(v => v.name.toLowerCase().includes(pref) && v.lang.startsWith('en'));
      if (found) return found;
    }

    // Fallback to first English voice
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    return enVoice || voices[0] || null;
  }

  public speak(text: string, onStart?: () => void, onEnd?: () => void) {
    if (!this.synth) {
      console.warn("Speech Synthesis is not supported in this browser.");
      return;
    }

    this.stop();

    // Clean up text for better pronunciation (e.g. replacing pokemon symbols/dashes)
    let cleanedText = text
      .replace(/Pokémon/gi, "Pokaymon") // Help browser pronounce it correctly
      .replace(/stats/gi, "statistics")
      .replace(/HP/g, "H P");

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const voice = this.getVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onstart = () => {
      this.isSpeakingState = true;
      if (this.onStateChange) this.onStateChange(true);
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isSpeakingState = false;
      if (this.onStateChange) this.onStateChange(false);
      if (onEnd) onEnd();
      this.currentUtterance = null;
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      this.isSpeakingState = false;
      if (this.onStateChange) this.onStateChange(false);
      if (onEnd) onEnd();
      this.currentUtterance = null;
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public speakPokemonEntry(name: string, category: string, desc: string, onStart?: () => void, onEnd?: () => void) {
    const textToSpeak = `${name}, the ${category}. ${desc}`;
    this.speak(textToSpeak, onStart, onEnd);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeakingState = false;
      if (this.onStateChange) this.onStateChange(false);
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2, rate));
  }

  public setPitch(pitch: number) {
    this.pitch = Math.max(0.5, Math.min(2, pitch));
  }

  public getRate(): number {
    return this.rate;
  }

  public getPitch(): number {
    return this.pitch;
  }
}

export const DexterSpeech = new DexterSpeechSystem();
