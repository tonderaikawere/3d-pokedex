import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

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
}

interface Pokedex3DProps {
  pokemonList: Pokemon[];
  selectedId: number;
  onSelectPokemon: (id: number) => void;
  isSilhouette: boolean;
}

// Custom material for glowing holographic grid lines on the selected card
const hologramShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 glowColor;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      // Create scanlines
      float scanline = sin(vUv.y * 100.0 + time * 5.0) * 0.08 + 0.92;
      
      // Create glowing border effect based on UV coordinates
      float borderDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
      float borderGlow = smoothstep(0.0, 0.05, borderDist);
      
      // Hologram edge glow (Fresnel-like)
      float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
      
      vec3 finalColor = glowColor * scanline;
      float alpha = (1.0 - borderGlow) * 0.8 + intensity * 0.4 + 0.15;
      
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
};

// 3D holographic frame around the active card
const CardFrame: React.FC<{ width: number; height: number; color: string }> = ({ width, height, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms) {
        material.uniforms.time.value = clock.getElapsedTime();
      }
    }
  });

  const uniforms = useMemo(() => ({
    glowColor: { value: new THREE.Color(color) },
    time: { value: 0 }
  }), [color]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[width + 0.1, height + 0.1]} />
      <shaderMaterial
        vertexShader={hologramShader.vertexShader}
        fragmentShader={hologramShader.fragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// 3D rotating Pokeball (Red, White, and Black colors)
const Pokeball3D: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.8;
      // Small bobbing animation
      groupRef.current.position.y = -1.5 + Math.sin(clock.getElapsedTime() * 1.5) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.5, 0]} scale={[0.6, 0.6, 0.6]}>
      {/* Top half (Red) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhongMaterial color="#ff1c46" shininess={100} />
      </mesh>
      
      {/* Bottom half (White) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.5, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshPhongMaterial color="#ffffff" shininess={100} />
      </mesh>
      
      {/* Black middle divider ring */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.52, 1.52, 0.1, 32]} />
        <meshPhongMaterial color="#111111" shininess={50} />
      </mesh>
      
      {/* Center button outline (Black) */}
      <mesh position={[0, 0, 1.45]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.12, 32]} />
        <meshPhongMaterial color="#111111" shininess={50} />
      </mesh>

      {/* Center button (White/Light Cyan glow) */}
      <mesh position={[0, 0, 1.51]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 32]} />
        <meshBasicMaterial color="#e0f7fa" />
      </mesh>
    </group>
  );
};

// Hologram ring at the base of the scanner
const ScannerPlatform: React.FC = () => {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (ringRef1.current) {
      ringRef1.current.rotation.z = elapsed * 0.3;
      ringRef1.current.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.05);
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z = -elapsed * 0.5;
    }
  });

  return (
    <group position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Base platform */}
      <mesh>
        <cylinderGeometry args={[2.5, 2.7, 0.2, 32]} />
        <meshPhongMaterial color="#0f0f1c" shininess={100} />
      </mesh>
      
      {/* Outer Glow Ring */}
      <mesh ref={ringRef1} position={[0, 0, 0.12]}>
        <ringGeometry args={[2.3, 2.5, 32]} />
        <meshBasicMaterial color="#00f3ff" transparent={true} opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Inner Scanner Pattern */}
      <mesh ref={ringRef2} position={[0, 0, 0.14]}>
        <ringGeometry args={[1.8, 2.0, 6, 1]} />
        <meshBasicMaterial color="#ff1c46" transparent={true} opacity={0.4} side={THREE.DoubleSide} wireframe={true} />
      </mesh>

      {/* Hologram cylinder projection lines */}
      <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.2, 1.8, 2.4, 32, 4, true]} />
        <meshBasicMaterial 
          color="#00f3ff" 
          transparent={true} 
          opacity={0.05} 
          wireframe={true} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
};

interface CardProps {
  pokemon: Pokemon;
  isSelected: boolean;
  offsetIndex: number; // Index relative to active (-5 to +5)
  isSilhouette: boolean;
  onClick: () => void;
}

// Scanning horizontal laser sweep line
const ScanningBeam: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const beamRef = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (beamRef.current) {
      const y = Math.sin(clock.getElapsedTime() * 2.2) * (height / 2);
      beamRef.current.position.y = y;
    }
  });

  return (
    <mesh ref={beamRef} position={[0, 0, 0.03]}>
      <planeGeometry args={[width * 1.15, 0.06]} />
      <meshBasicMaterial color="#00f3ff" transparent={true} opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
};

const PokemonCard: React.FC<CardProps> = ({
  pokemon,
  isSelected,
  offsetIndex,
  isSilhouette,
  onClick
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
  
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    // Dynamic texture loading for the Pokemon artwork
    textureLoader.load(
      pokemon.imageUrl,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        setTexture(tex);
      },
      undefined,
      (err) => console.error("Error loading artwork for ", pokemon.name, err)
    );

    // Load card back
    textureLoader.load(
      './pokeball.jpg',
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        setBackTexture(tex);
      },
      undefined,
      () => {}
    );
  }, [pokemon.imageUrl, textureLoader]);

  // Card and Cutout dimensions
  const width = 2.4;
  const height = 3.3;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const targetPos = new THREE.Vector3();
    const targetRot = new THREE.Euler();
    const elapsed = clock.getElapsedTime();

    if (isSelected) {
      // Selected pokemon hovers above the rotating Pokeball on pedestal
      targetPos.set(0, 0.6 + Math.sin(elapsed * 1.5) * 0.12, 0);
      // Slow rotation on Y axis for volumetric inspection
      targetRot.set(0, elapsed * 0.45, 0);
    } else {
      // Spaced out in a curved holographic deck behind/below the scanner platform
      const radius = 9;
      const angle = offsetIndex * (Math.PI / 10);
      
      targetPos.set(
        Math.sin(angle) * radius,
        -1.3 + Math.sin(elapsed * 0.8 + offsetIndex) * 0.05,
        -Math.cos(angle) * radius + 5
      );
      
      targetRot.set(0, angle, 0);
    }

    // Smooth transition using linear interpolation
    meshRef.current.position.lerp(targetPos, 0.1);
    
    // Quaternion slerp for rotation
    const curQ = meshRef.current.quaternion.clone();
    const targetQ = new THREE.Quaternion().setFromEuler(targetRot);
    curQ.slerp(targetQ, 0.1);
    meshRef.current.quaternion.copy(curQ);

    // Scale card/cutout up if selected
    const targetScale = isSelected ? 1.4 : 0.85;
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
  });

  // Render volumetric hologram cutout for selected active Pokemon
  if (isSelected) {
    return (
      <group ref={meshRef} onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}>
        {/* Cylindrical scanning beam projection grid */}
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[1.3, 1.5, 3.2, 16, 3, true]} />
          <meshBasicMaterial 
            color="#00f3ff" 
            wireframe={true} 
            transparent={true} 
            opacity={0.06} 
            side={THREE.DoubleSide} 
          />
        </mesh>

        {/* Small floating ring at the base of the cutout */}
        <mesh position={[0, -height * 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.0, 32]} />
          <meshBasicMaterial color="#00f3ff" side={THREE.DoubleSide} transparent={true} opacity={0.5} />
        </mesh>

        {/* Volumetric Cross-mesh Plane 1 (Front/Back) */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[width * 1.3, height * 1.3]} />
          {texture ? (
            <meshPhongMaterial 
              map={texture} 
              transparent={true} 
              side={THREE.DoubleSide} 
              color={isSilhouette ? "#000000" : "#ffffff"}
              depthWrite={false}
              emissive={isSilhouette ? "#000000" : "#00f3ff"}
              emissiveIntensity={isSilhouette ? 0 : 0.22}
              shininess={30}
            />
          ) : (
            <meshPhongMaterial color="#00f3ff" transparent={true} opacity={0.3} depthWrite={false} />
          )}
        </mesh>

        {/* Volumetric Cross-mesh Plane 2 (Left/Right) */}
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[width * 1.3, height * 1.3]} />
          {texture ? (
            <meshPhongMaterial 
              map={texture} 
              transparent={true} 
              side={THREE.DoubleSide} 
              color={isSilhouette ? "#000000" : "#ffffff"}
              depthWrite={false}
              emissive={isSilhouette ? "#000000" : "#00f3ff"}
              emissiveIntensity={isSilhouette ? 0 : 0.15}
              shininess={30}
              opacity={0.65}
            />
          ) : (
            <meshPhongMaterial color="#00f3ff" transparent={true} opacity={0.2} depthWrite={false} />
          )}
        </mesh>

        {/* Scanning laser beam sweep */}
        <ScanningBeam width={width * 1.3} height={height * 1.3} />
      </group>
    );
  }

  // Render classic database deck card for unselected candidates
  return (
    <group ref={meshRef} onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}>
      {/* Front Face (Artwork) */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        {texture ? (
          <meshPhongMaterial 
            map={texture} 
            transparent={true} 
            side={THREE.DoubleSide} 
            shininess={100}
            color="#ffffff"
            depthWrite={true}
          />
        ) : (
          <meshPhongMaterial color="#1a1a2e" side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Back Face (Pokeball Card Back) */}
      <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        {backTexture ? (
          <meshPhongMaterial map={backTexture} side={THREE.DoubleSide} />
        ) : (
          <meshPhongMaterial color="#ff1c46" side={THREE.DoubleSide} />
        )}
      </mesh>

      {/* Card Border frame */}
      <group position={[0, 0, 0]}>
        <CardFrame 
          width={width} 
          height={height} 
          color="#005577" 
        />
      </group>
    </group>
  );
};

export const Pokedex3D: React.FC<Pokedex3DProps> = ({
  pokemonList,
  selectedId,
  onSelectPokemon,
  isSilhouette
}) => {


  // Find active index in currently filtered pokemon list
  const activeIndex = useMemo(() => {
    const idx = pokemonList.findIndex(p => p.id === selectedId);
    return idx !== -1 ? idx : 0;
  }, [selectedId, pokemonList]);

  // Sliding Window: Only render active card + 5 cards left + 5 cards right
  // This spaces out the Pokemons perfectly, prevents overlapping, and ensures 60fps!
  const windowSize = 11;
  const halfWindow = 5;

  const visibleCards = useMemo(() => {
    if (pokemonList.length === 0) return [];
    
    const cards: { pokemon: Pokemon; offsetIndex: number }[] = [];
    
    for (let i = -halfWindow; i <= halfWindow; i++) {
      let idx = (activeIndex + i) % pokemonList.length;
      if (idx < 0) idx += pokemonList.length;
      
      // Check for bounds if list is very small
      if (pokemonList[idx]) {
        cards.push({
          pokemon: pokemonList[idx],
          offsetIndex: i
        });
      }
    }
    
    return cards;
  }, [activeIndex, pokemonList]);

  // Keyboard navigation for rotation (D-pad support)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pokemonList.length === 0) return;
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const nextIndex = (activeIndex + 1) % pokemonList.length;
        if (pokemonList[nextIndex]) onSelectPokemon(pokemonList[nextIndex].id);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const prevIndex = (activeIndex - 1 + pokemonList.length) % pokemonList.length;
        if (pokemonList[prevIndex]) onSelectPokemon(pokemonList[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, pokemonList, onSelectPokemon]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 1.5, 12], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0f1c24']} />
        <fog attach="fog" args={['#0f1c24', 12, 28]} />

        {/* Lights */}
        <ambientLight intensity={0.65} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f3ff" />
        <pointLight position={[-10, 10, -10]} intensity={1.0} color="#ff1c46" />
        <directionalLight position={[0, 10, 0]} intensity={1.2} color="#ffffff" />
        
        {/* Floating Stars */}
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1.5} />

        {/* 3D concentric holographic scanner platform */}
        <ScannerPlatform />

        {/* Rotating 3D Pokeball (Red, White, Black) in center of scanner platform */}
        <Pokeball3D />

        {/* Conveyor Belt / Spaced Curved Deck */}
        <group>
          {visibleCards.map(({ pokemon, offsetIndex }) => (
            <PokemonCard
              key={pokemon.id}
              pokemon={pokemon}
              isSelected={pokemon.id === selectedId}
              offsetIndex={offsetIndex}
              isSilhouette={isSilhouette}
              onClick={() => onSelectPokemon(pokemon.id)}
            />
          ))}
        </group>

        {/* Orbit controls with full inspection freedom */}
        <OrbitControls 
          enableDamping={true}
          dampingFactor={0.05}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
          minDistance={2.5}
          maxDistance={18}
          enablePan={true}
        />
      </Canvas>

      {/* Floating instructions overlay */}
      <div style={{
        position: 'absolute',
        bottom: '22%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--font-cyber)',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        letterSpacing: '2px',
        pointerEvents: 'none',
        textTransform: 'uppercase',
        textShadow: '0 0 5px rgba(0,0,0,0.9)'
      }}>
        Drag to Orbit • Scroll to Zoom • Click Cards to Scan
      </div>
    </div>
  );
};
export default Pokedex3D;
