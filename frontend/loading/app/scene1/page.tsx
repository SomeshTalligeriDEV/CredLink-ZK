'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Scene1() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  
  const fullText = '"I worked hard for years and built my credit."';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50); // 50ms per character for smooth typing effect

    return () => clearInterval(typingInterval);
  }, [isLoaded]);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 1.png"
          alt="Scene 1"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Typewriter Text - Bottom Left */}
      <div className="absolute bottom-24 left-8 z-10 max-w-2xl">
        <div className="bg-black/60 backdrop-blur-sm px-6 py-4 rounded-lg border border-[#F5A623]/30">
          <p className="text-white text-xl md:text-2xl font-light">
            {displayedText}
            <span className="inline-block w-0.5 h-6 bg-[#F5A623] ml-1 animate-pulse"></span>
          </p>
        </div>
      </div>
      
      {/* Navigation button */}
      <div className="absolute bottom-8 right-8 z-10">
        <button
          onClick={() => router.push('/scene2')}
          className="px-6 py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
