'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Scene8() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0B0D10]">
      <div className={`relative w-full h-full transition-all duration-1000 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
           style={{ clipPath: isLoaded ? 'circle(150% at 50% 50%)' : 'circle(0% at 50% 50%)' }}>
        <Image
          src="/videos/scene 8.png"
          alt="Scene 8"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Main Content - Center */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-1000 ${
          showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Enter Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="px-12 py-4 bg-gradient-to-r from-[#F5A623] to-[#FFD700] text-black font-bold text-lg rounded-md hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-[#F5A623]/50"
          style={{ fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em' }}
        >
          ENTER CREDLINK ZK
        </button>
      </div>
    </div>
  );
}
