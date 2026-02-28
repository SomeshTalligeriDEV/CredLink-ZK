'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Scene4() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const text = '"What if your reputation could travel with you?"';

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

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
  }, [isLoaded]);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 4 final.png"
          alt="Scene 4"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Quote Text - Center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 max-w-4xl w-full px-8">
        <div className="text-center">
          <h2
            className="text-3xl md:text-4xl font-bold italic"
            style={{
              color: '#FFD700',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6), 0 0 60px rgba(245, 166, 35, 0.4)',
              letterSpacing: '0.05em'
            }}
          >
            {displayedText}
            {displayedText.length < text.length && (
              <span className="inline-block w-1 h-9 bg-[#FFD700] ml-2 animate-pulse align-middle"></span>
            )}
          </h2>
        </div>
      </div>

      {/* Navigation button */}
      <div className="absolute bottom-8 right-8 z-10">
        <button
          onClick={() => router.push('/scene5')}
          className="px-6 py-3 bg-[#F5A623] text-[#0B0D10] font-semibold rounded-full hover:shadow-gold-glow transition-all"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
