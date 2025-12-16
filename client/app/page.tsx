'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'CHATOCP';
  }, []);

  const handleGetStarted = () => {
    setLoading(true);
    setTimeout(() => router.push('/signup'), 1500);
  };

  const handleSignIn = () => {
    setLoading(true);
    setTimeout(() => router.push('/login'), 1500);
  };

  const routerPush = (url: string) => router.push(url);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-zinc-100 p-4">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-10"
      >
        <source src="/videoOCP.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="fixed inset-0 bg-black opacity-80 z-20"></div>

      {/* Main Content Container */}
      <div className="flex flex-col items-center gap-6 z-30 w-full max-w-3xl px-8 py-16">
        {/* Logo & Subtitle */}
        <div className="flex flex-col justify-center items-center text-center gap-2 mb-10">
          <Image
            src="/logo.png"
            alt="Logo"
            width={250}
            height={250}
            className="object-contain cursor-pointer"
            onClick={() => routerPush("/")}
          />
          <p className="text-lg text-zinc-400">
            Interactive AI for OCP community
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-4 items-center w-full max-w-sm">
          <button
            onClick={handleGetStarted}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-lg transition-all transform hover:scale-[1.01] shadow-lg ${
              loading
                ? "bg-green-700/50 cursor-not-allowed shadow-none"
                : "bg-green-600 hover:bg-green-700 shadow-green-900/50"
            }`}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Get Started'}
          </button>

          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-lg border border-zinc-700 hover:bg-zinc-800 transition-all"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
          </button>
        </div>


        {/* Footer */}
        <p className="text-sm text-zinc-500 mt-10 text-center">
          © 2025 CHAT OCP — All rights reserved
        </p>
      </div>
    </main>
  );
}
