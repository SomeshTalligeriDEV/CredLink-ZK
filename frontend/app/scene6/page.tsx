'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Scene6() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDialogue, setShowDialogue] = useState(false);
  const [showCollateral, setShowCollateral] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const fullText = '"Tier 3 approved."';

  useEffect(() => {
    setIsLoaded(true);

    // Show dialogue after 1 second
    const dialogueTimer = setTimeout(() => {
      setShowDialogue(true);
    }, 1000);

    // Show collateral animation after 2 seconds
    const collateralTimer = setTimeout(() => {
      setShowCollateral(true);
    }, 2000);

    return () => {
      clearTimeout(dialogueTimer);
      clearTimeout(collateralTimer);
    };
  }, []);

  useEffect(() => {
    if (!showDialogue) return;

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
  }, [showDialogue]);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 6 final.png"
          alt="Scene 6"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Bank Officer Dialogue - Top Right */}
      <div
        className={`absolute top-32 right-12 max-w-xs transition-all duration-500 ${
          showDialogue ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
        }`}
      >
        <div
          className="relative px-5 py-3 rounded-lg"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(245, 166, 35, 0.3)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
          }}
        >
          <p
            className="text-xs font-bold mb-1 uppercase tracking-wider"
            style={{
              color: '#F5A623',
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            Bank Officer
          </p>
          <p
            className="text-base text-white"
            style={{
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            {displayedText}
            {displayedText.length < fullText.length && (
              <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse align-middle"></span>
            )}
          </p>
        </div>
      </div>

      {/* Collateral Requirement Display - Center */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
          showCollateral ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className="flex flex-col items-center gap-6">
          {/* Collateral Percentages */}
          <div className="flex items-center gap-8">
            {/* Old 150% - Crossed Out */}
            <div className="relative">
              <span
                className="text-6xl font-bold"
                style={{
                  color: '#FF4444',
                  fontFamily: "'Orbitron', sans-serif",
                  textShadow: '0 0 20px rgba(255, 68, 68, 0.5)',
                  textDecoration: 'line-through',
                  textDecorationThickness: '4px'
                }}
              >
                150%
              </span>
            </div>

            {/* Arrow */}
            <div>
              <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                <path
                  d="M5 20 L45 20 M45 20 L35 10 M45 20 L35 30"
                  stroke="#F5A623"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* New 110% - Green */}
            <div>
              <span
                className="text-6xl font-bold"
                style={{
                  color: '#4ADE80',
                  fontFamily: "'Orbitron', sans-serif",
                  textShadow: '0 0 20px rgba(74, 222, 128, 0.5)'
                }}
              >
                110%
              </span>
            </div>
          </div>

          {/* Collateral Requirement Label */}
          <div>
            <p
              className="text-lg tracking-widest uppercase"
              style={{
                color: '#888',
                fontFamily: "'Orbitron', sans-serif"
              }}
            >
              Collateral Requirement
            </p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="absolute bottom-8 right-8 z-10">
        <button
          onClick={() => router.push('/scene7')}
          className={`px-6 py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all ${
            displayedText.length === fullText.length && showCollateral ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
