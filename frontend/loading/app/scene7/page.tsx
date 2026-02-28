'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Scene7() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLeftDialogue, setShowLeftDialogue] = useState(false);
  const [showRightDialogue, setShowRightDialogue] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [leftText, setLeftText] = useState('');
  const [rightText, setRightText] = useState('');
  
  const leftFullText = '"I don\'t use crypto... can I still build credit?"';
  const rightFullText = '"CredLink ZK works even if you\'re new to crypto."';

  useEffect(() => {
    setIsLoaded(true);
    
    // Show panel after 0.5 seconds
    const panelTimer = setTimeout(() => {
      setShowPanel(true);
    }, 500);

    // Show left dialogue after 1.5 seconds
    const leftTimer = setTimeout(() => {
      setShowLeftDialogue(true);
    }, 1500);

    // Show right dialogue after 2.5 seconds
    const rightTimer = setTimeout(() => {
      setShowRightDialogue(true);
    }, 2500);

    return () => {
      clearTimeout(panelTimer);
      clearTimeout(leftTimer);
      clearTimeout(rightTimer);
    };
  }, []);

  useEffect(() => {
    if (!showLeftDialogue) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= leftFullText.length) {
        setLeftText(leftFullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [showLeftDialogue]);

  useEffect(() => {
    if (!showRightDialogue) return;

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= rightFullText.length) {
        setRightText(rightFullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [showRightDialogue]);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 7.png"
          alt="Scene 7"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Right Panel - Login with Moca */}
      <div 
        className={`absolute top-1/2 right-12 -translate-y-1/2 transition-all duration-700 ${
          showPanel ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
        }`}
      >
        <div 
          className="relative px-8 py-6 rounded-2xl w-80"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Header */}
          <p 
            className="text-xs font-semibold mb-4 uppercase tracking-wider text-center"
            style={{
              color: '#888',
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            CredLink ZK
          </p>

          {/* Login Button */}
          <button 
            className="w-full px-6 py-4 mb-6 bg-gradient-to-r from-[#F5A623] to-[#FFD700] text-black font-bold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Login with Moca
          </button>

          {/* Verification Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span 
                className="text-sm text-gray-400"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                Identity Verified
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span 
                className="text-sm text-gray-400"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                Passport Activated
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Left Dialogue - Bottom Left */}
      <div 
        className={`absolute bottom-32 left-12 max-w-md transition-all duration-500 ${
          showLeftDialogue ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div 
          className="relative px-6 py-4 rounded-lg"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
          }}
        >
          <p 
            className="text-base text-white"
            style={{
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            {leftText}
            {leftText.length < leftFullText.length && (
              <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse align-middle"></span>
            )}
          </p>
        </div>
      </div>

      {/* Right Dialogue - Bottom Right */}
      <div 
        className={`absolute bottom-32 right-12 max-w-md transition-all duration-500 ${
          showRightDialogue ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div 
          className="relative px-6 py-4 rounded-lg"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
          }}
        >
          <p 
            className="text-base text-white"
            style={{
              fontFamily: "'Orbitron', sans-serif"
            }}
          >
            {rightText}
            {rightText.length < rightFullText.length && (
              <span className="inline-block w-0.5 h-4 bg-white ml-1 animate-pulse align-middle"></span>
            )}
          </p>
        </div>
      </div>

      {/* Continue Button */}
      <div className="absolute bottom-8 right-8 z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className={`px-6 py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all ${
            rightText.length === rightFullText.length ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
