'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useTexture, Environment, OrbitControls, AccumulativeShadows, RandomizedLight } from '@react-three/drei';

function AlbumCover({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl);
  
  return (
    <mesh castShadow receiveShadow rotation={[0, 0, 0]} scale={[1.5, 1.5, 0.05]}>
      <boxGeometry />
      <meshStandardMaterial 
        map={texture} 
        roughness={0.2}
        metalness={0.8}
        envMapIntensity={1}
      />
    </mesh>
  );
}

interface Album3DProps {
  imageUrl: string;
}

export function Album3D({ imageUrl }: Album3DProps) {
  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden bg-gradient-to-b from-black/20 to-black/10">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4], fov: 45 }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <spotLight
            position={[5, 5, 5]}
            angle={0.15}
            penumbra={1}
            intensity={1}
            castShadow
            shadow-mapSize={[512, 512]}
          />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />

          {/* Environment and Shadows */}
          <AccumulativeShadows
            temporal
            frames={60}
            alphaTest={0.85}
            scale={10}
            position={[0, -0.5, 0]}
          >
            <RandomizedLight
              amount={8}
              radius={5}
              intensity={0.5}
              ambient={0.5}
              position={[5, 5, -5]}
            />
          </AccumulativeShadows>
          <Environment preset="city" />

          {/* Album Cover */}
          <AlbumCover imageUrl={imageUrl} />

          {/* Controls */}
          <OrbitControls 
            enableZoom={false}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate
            autoRotateSpeed={3}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
