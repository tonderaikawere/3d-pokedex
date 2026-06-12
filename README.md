# 🌌 Holographic 3D Pokedex with Dexter Voice Assistant

A state-of-the-art, interactive 3D Pokedex web application built with **React, Vite, Three.js (React Three Fiber), and Framer Motion**. It features a futuristic holographic command center, 3D rotating Pokeball, official Pokemon audio cries, stat capability graphs, and a fully interactive speech console to talk with **Dexter** (the Pokedex voice assistant) using your voice!

![License](https://img.shields.io/github/license/tonderaikawere/3d-pokedex)
![Vite](https://img.shields.io/badge/Vite-5.0+-purple.svg)
![React](https://img.shields.io/badge/React-18.0+-blue.svg)
![ThreeJS](https://img.shields.io/badge/Three.js-0.158+-green.svg)

---

## 🚀 Key Features

*   **🌌 Holographic 3D Stage**: Displays the selected Pokemon on a floating, double-sided 3D card. You can rotate and zoom to inspect official artwork and details from any angle.
*   **🔴 3D Pokeball Scanner**: Features a rotating, fully-detailed 3D Pokeball in the center of the glowing neon scanner platform.
*   **🗣️ Dexter Voice Assistant**: Automatically speaks Pokedex entries with a retro robotic tone. Features an audio visualizer that dances dynamically in sync with Dexter's voice.
*   **🎤 Speech Recognition Commands**: Click the microphone button and ask questions naturally, just like Ash!
    *   *"Who is Charizard?"*
    *   *"What type is Pikachu?"*
    *   *"How heavy is Snorlax?"*
    *   *"What are Mewtwo's stats?"*
    *   *"How tall is Dragonite?"*
*   **🎵 Official Audio Cries**: Plays the official cry audio of each Pokemon when scanned.
*   **⚡ Combat Capability Specs**: Beautiful glowing bar graphs displaying HP, Attack, Defense, Special Attack, Special Defense, and Speed.
*   **📂 Instant Local Database**: Contains a pre-compiled JSON file containing the original 151 Pokemon details, enabling instant loading with zero network lag.

---

## 🛠️ Setup & Installation

### 1. Install Dependencies
Clone the repository, navigate to the folder, and run:
```bash
npm install
```

### 2. Run the Development Server
Start the Vite development server locally:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build
To bundle the application for production:
```bash
npm run build
```

---

## 🎙️ Voice Controls & Microphone Permissions
1. Click the **Microphone** icon in the Speech Utterance Console on the right panel.
2. Allow microphone access in your browser.
3. Speak clearly, saying things like *"Who is Pikachu?"* or *"What type is Blastoise?"*.
4. Dexter will reply vocally and log the transaction in the chat history.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
