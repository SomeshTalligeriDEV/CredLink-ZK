'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Scene5() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  
  const fullText = '"Prove your creditworthiness without revealing your private data."';

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showContent) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [showContent]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0B0D10]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/videos/scene 5.png"
          alt="Scene 5"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Text Box - Center */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-2xl transition-all duration-1000 ${
          showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div 
          className="relative px-6 py-4 rounded-lg"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Text Content with Typewriter Effect */}
          <p 
            className="text-base md:text-lg text-white leading-relaxed text-center"
            style={{
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            {displayedText}
            {displayedText.length < fullText.length && (
              <span className="inline-block w-0.5 h-5 bg-white ml-1 animate-pulse align-middle"></span>
            )}
          </p>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={() => router.push('/scene6')}
        className={`absolute bottom-12 right-12 px-8 py-4 bg-gradient-to-r from-[#F5A623] to-[#FFD700] text-black font-bold rounded-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-[#F5A623]/50 ${
          displayedText.length === fullText.length ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ fontFamily: "'Orbitron', sans-serif" }}
      >
        Continue →
      </button>
    </div>
  );
}
