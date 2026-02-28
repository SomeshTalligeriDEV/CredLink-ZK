'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Scene2() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayedText1, setDisplayedText1] = useState('');
  const [displayedText2, setDisplayedText2] = useState('');
  const [showDialogue2, setShowDialogue2] = useState(false);
  
  const text1 = '"Sorry. You have no Credit History here"';
  const text2 = '"But i have repaid every loan back home"';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // First dialogue typewriter effect (Bank Officer)
  useEffect(() => {
    if (!isLoaded) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= text1.length) {
        setDisplayedText1(text1.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        // Start second dialogue after 500ms pause
        setTimeout(() => setShowDialogue2(true), 500);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [isLoaded]);

  // Second dialogue typewriter effect
  useEffect(() => {
    if (!showDialogue2) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= text2.length) {
        setDisplayedText2(text2.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [showDialogue2]);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 2 final.png"
          alt="Scene 2"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* First Text Box - Bank Officer - Bottom Left */}
      <div className="absolute bottom-8 left-8 z-10 max-w-2xl">
        <div className="bg-black/70 backdrop-blur-sm px-6 py-4 rounded-lg border border-red-500/40">
          <p className="text-red-400 text-sm font-semibold mb-2 uppercase tracking-wider">Bank Officer</p>
          <p className="text-white text-xl md:text-2xl font-light">
            {displayedText1}
            {displayedText1.length < text1.length && (
              <span className="inline-block w-0.5 h-6 bg-red-500 ml-1 animate-pulse"></span>
            )}
          </p>
        </div>
      </div>

      {/* Second Text - Character Response - Right Side */}
      {showDialogue2 && (
        <div className="absolute bottom-8 right-8 z-10 max-w-2xl">
          <div className="bg-black/60 backdrop-blur-sm px-6 py-4 rounded-lg border border-[#F5A623]/30">
            <p className="text-white text-xl md:text-2xl font-light">
              {displayedText2}
              {displayedText2.length < text2.length && (
                <span className="inline-block w-0.5 h-6 bg-[#F5A623] ml-1 animate-pulse"></span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* Navigation button */}
      <div className="absolute top-8 right-8 z-10">
        <button
          onClick={() => router.push('/scene3')}
          className="px-6 py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
