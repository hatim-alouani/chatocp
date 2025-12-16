'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cookieUtils } from '@/lib/cookieUtils';

import {
  User,
  Mail,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

const InputIcon = ({ icon: Icon, position = "left", className = "" }) => (
  <Icon
    size={20}
    className={`absolute top-1/2 -translate-y-1/2 text-zinc-500 ${
      position === "left" ? "left-3" : "right-3"
    } ${className}`}
  />
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Server returned non-JSON response:', text);
        throw new Error('Invalid server response');
      }

      if (!res.ok) {
        setStatus(`❌ ${data.error || 'Login failed.'}`);
      } else {
        // Use cookie utils to store token and user
        cookieUtils.setToken(data.token);
        cookieUtils.setUser(data.user);
        setStatus('✅ Login successful! Redirecting...');
        setTimeout(() => router.push('/chatbot'), 1500);
      }
    } catch (err) {
      console.error('Network error:', err);
      setStatus('❌ Network error. Check connection or server URL.');
    } finally {
      setLoading(false);
    }
  };

 return (
    <main className="flex items-center justify-center min-h-screen bg-[#0f0f0f] text-zinc-100 p-4">
      {/* Login Card - Darkened background, strong shadow, and green ring hover */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-10"
      >
        {/* REPLACE THIS SOURCE WITH YOUR OWN VIDEO FILE */}
        <source src="/videoOCP.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="fixed inset-0 bg-black opacity-80 z-20"></div>
      <div className="flex flex-col items-center gap-4 z-30">
        <div className="flex flex-col justify-center items-center text-center gap-2 mb-5">
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
        <div className="bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl shadow-black/70 border border-zinc-800 p-8 w-full max-w-md hover:shadow-green-900/50 ">
          <div className="flex flex-col items-center mb-3">
            <h2 className="text-2xl font-semibold mb-6 text-center text-green-500">
              Sign in to your account
            </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div className="relative">
              <InputIcon icon={Mail} />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-zinc-500"
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <InputIcon icon={Lock} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-3 pl-10 pr-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-zinc-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-3 text-zinc-500 hover:text-green-500 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Submit Button - Green accent color */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.01] shadow-lg ${
                loading
                  ? "bg-green-700/50 cursor-not-allowed shadow-none"
                  : "bg-green-600 hover:bg-green-700 shadow-green-900/50"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Status Message */}
          {status && (
            <div
              className={`mt-6 p-3 rounded-lg flex items-center gap-2 ${
                // Status colors adjusted for dark background
                status.startsWith("✅")
                  ? "bg-green-900/50 text-green-300 border border-green-700"
                  : "bg-red-900/50 text-red-300 border border-red-700"
              }`}
            >
              {status.startsWith("✅") ? (
                <CheckCircle size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
              <p className="text-sm font-medium">{status}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
