'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingIntro() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#0B0D10] overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-2000 ease-out ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src="/videos/jt7bavdj7drmw0cwmbebm17ztc_result_.mp4" type="video/mp4" />
        </video>
      </div>

      <div className={`relative z-10 h-full flex flex-col items-center justify-center transition-opacity duration-1000 delay-500 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-32">
          <h1 className="text-7xl md:text-8xl font-black text-center select-none"
              style={{
                fontFamily: '"Orbitron", "Exo 2", system-ui, sans-serif',
                letterSpacing: '0.25em',
                color: 'rgba(245, 166, 35, 0.4)',
                textShadow: `
                  0 0 10px rgba(245, 166, 35, 1),
                  0 0 20px rgba(245, 166, 35, 0.9),
                  0 0 30px rgba(245, 166, 35, 0.7),
                  0 0 40px rgba(245, 166, 35, 0.5),
                  0 0 60px rgba(245, 166, 35, 0.4),
                  2px 2px 4px rgba(0, 0, 0, 0.8)
                `,
                WebkitTextStroke: '2.5px rgba(245, 166, 35, 0.6)',
                filter: 'drop-shadow(0 0 30px rgba(245, 166, 35, 0.8))',
                fontWeight: 900
              }}>
            CREDLINK
            <span className="block text-5xl md:text-6xl mt-3 tracking-[0.6em]"
                  style={{
                    fontWeight: 200,
                    color: 'rgba(255, 215, 0, 0.45)',
                    textShadow: `
                      0 0 10px rgba(255, 215, 0, 1),
                      0 0 20px rgba(255, 215, 0, 0.9),
                      0 0 30px rgba(255, 215, 0, 0.7),
                      0 0 40px rgba(245, 166, 35, 0.5),
                      2px 2px 4px rgba(0, 0, 0, 0.8)
                    `,
                    WebkitTextStroke: '2px rgba(255, 215, 0, 0.6)',
                    filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.7))'
                  }}>
              ZK
            </span>
          </h1>
        </div>

        <div className="flex flex-col items-center gap-4 mt-[28rem] ml-8">
          <button
            onClick={() => router.push('/scene1')}
            className="w-24 h-24 rounded-full border-4 border-[#F5A623] bg-[#F5A623]/20 backdrop-blur-md flex items-center justify-center hover:bg-[#F5A623]/30 hover:scale-110 transition-all duration-300 group shadow-[0_0_40px_rgba(245,166,35,0.6)] hover:shadow-[0_0_60px_rgba(245,166,35,0.8)]"
          >
            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-[#F5A623] border-b-[15px] border-b-transparent ml-2 group-hover:border-l-[#FFD700] transition-colors drop-shadow-[0_0_15px_rgba(245,166,35,0.8)]"></div>
          </button>
          <p className="text-[#F5A623] text-base tracking-[0.2em] uppercase font-bold drop-shadow-[0_0_15px_rgba(245,166,35,1)]">CLICK TO BEGIN</p>
        </div>

        <div className="absolute bottom-8 right-8">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-[#F5A623]/20 backdrop-blur-sm border-2 border-[#F5A623] text-[#F5A623] text-sm font-bold rounded-lg hover:bg-[#F5A623]/30 hover:text-[#FFD700] hover:border-[#FFD700] transition-all duration-300 shadow-[0_0_20px_rgba(245,166,35,0.4)] hover:shadow-[0_0_30px_rgba(245,166,35,0.6)]"
          >
            Skip Intro
          </button>
        </div>
      </div>
    </div>
  );
}
