'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Scene3() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [showText, setShowText] = useState(false);
  
  const text = '"Traditional systems don\'t recognize cross-border reputation."';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Show stamp after 800ms
    const stampTimer = setTimeout(() => {
      setShowStamp(true);
      // Show text after stamp animation completes (1200ms)
      setTimeout(() => setShowText(true), 1200);
    }, 800);

    return () => clearTimeout(stampTimer);
  }, [isLoaded]);

  // Typewriter effect for text
  useEffect(() => {
    if (!showText) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayedText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [showText]);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 3.png"
          alt="Scene 3"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* REJECTED Stamp */}
      {showStamp && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
          style={{
            animation: 'stamp 0.6s cubic-bezier(0.36, 0, 0.66, -0.56) forwards'
          }}
        >
          <div 
            className="relative"
            style={{
              transform: 'rotate(-15deg)',
            }}
          >
            {/* Stamp Box */}
            <div 
              className="border-8 border-red-600 px-16 py-8 bg-red-600/10 backdrop-blur-sm"
              style={{
                boxShadow: '0 0 0 4px rgba(220, 38, 38, 0.3), 0 0 60px rgba(220, 38, 38, 0.5)',
              }}
            >
              <div className="text-center">
                <p className="text-red-600 text-2xl font-bold tracking-wider mb-2">150% COLLATERAL REQUIRED</p>
                <p className="text-red-600 text-7xl font-black tracking-[0.3em]">REJECTED</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Box - Top Right */}
      {showText && (
        <div className="absolute top-24 right-8 z-10 max-w-xl">
          <div className="bg-black/70 backdrop-blur-sm px-6 py-4 rounded-lg border border-red-500/40">
            <p className="text-white text-lg md:text-xl font-light">
              {displayedText}
              {displayedText.length < text.length && (
                <span className="inline-block w-0.5 h-5 bg-red-500 ml-1 animate-pulse"></span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* Navigation button */}
      <div className="absolute bottom-8 right-8 z-10">
        <button
          onClick={() => router.push('/scene4')}
          className="px-6 py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all"
        >
          Continue
        </button>
      </div>

      <style jsx>{`
        @keyframes stamp {
          0% {
            transform: translate(-50%, -300%) scale(1.5) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(0.8) rotate(-15deg);
            opacity: 1;
          }
          70% {
            transform: translate(-50%, -50%) scale(1.1) rotate(-15deg);
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(-15deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
