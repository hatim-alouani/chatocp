'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cookieUtils } from '@/lib/cookieUtils';
import { User, Mail, Loader2 } from 'lucide-react';

type Persona = string;

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [persona, setPersona] = useState<Persona>('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    document.title = 'AI-AUDIT | Sign Up';
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');

    if (!fullName.trim()) return setStatus('Please enter your full name.');
    if (!email) return setStatus('Please enter your email.');
    if (!password || !password2) return setStatus('Please enter your password twice.');
    if (password !== password2) return setStatus('Passwords do not match.');
    if (!persona.trim()) return setStatus('Please enter your role.');

    setSubmitting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          user_role: persona,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch (e) {}

      if (res.ok && data.ok) {
        // Store token and user on successful registration
        cookieUtils.setToken(data.token);
        cookieUtils.setUser(data.user);
        setStatus('✅ Account created successfully! Redirecting to chatbot…');
        setTimeout(() => router.push('/chatbot'), 2000);
      } else {
        setStatus(data.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const routerPush = (url: string) => router.push(url);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-white font-sans p-4">
      
      {/* Title */}
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
      <div className="flex flex-col justify-center items-center text-center gap-2 mb-10 z-30 pt-6">
        <Image
          src='/logo.png'
          alt='Logo'
          width={250}
          height={250}
          className="object-contain cursor-pointer"
          onClick={() => routerPush('/')}
        />
        <p className="text-lg text-zinc-400">Interactive AI for OCP community</p>
      </div>

      {/* Card */}
      <div className="bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl shadow-black/70 border border-zinc-800 p-8 w-full max-w-md z-40">
        <h2 className="text-2xl font-semibold mb-6 text-center text-green-500">Create Your Account</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          
          {/* Full Name Input */}
          <div className="relative">
            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Email Input */}
          <div className="relative">
            <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
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
            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Confirm Password Input */}
          <div className="relative">
            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              placeholder="Confirm password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Role Text Input */}
          <div className="relative">
            <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Your role"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full text-white py-3 rounded-lg font-semibold tracking-wider transition-all shadow-lg ${
              submitting 
                ? 'bg-green-600/50 cursor-not-allowed flex items-center justify-center gap-2' 
                : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Submitting…
              </>
            ) : (
              'Create Account'
            )}
          </button>

          {/* Status Message */}
          {status && (
            <p
              className={`text-sm text-center font-medium p-2 rounded-lg ${
                status.startsWith('✅') ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
              }`}
            >
              {status}
            </p>
          )}
        </form>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => routerPush('/login')}
            className="text-green-500 hover:text-green-400 hover:underline transition-colors text-sm"
          >
            Already have an account? Sign in
          </button>
        </div>

        <p className="text-xs text-zinc-600 mt-6 text-center">
          By continuing you agree to our <a href="#" className="underline hover:text-green-500">Terms</a> and <a href="#" className="underline hover:text-green-500">Privacy Policy</a>.
        </p>
      </div>

      <footer className="text-center py-6 text-sm text-zinc-600">
        © 2025 CHAT OCP — All rights reserved
      </footer>
    </main>
  );
}
