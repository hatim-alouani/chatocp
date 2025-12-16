'use client';

import { useState, useEffect, useRef } from 'react';
import { User, LogOut, Menu, MessageSquare, Plus, History } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cookieUtils } from '@/lib/cookieUtils';

const useMockRouter = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const push = (href: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  return { push, pathname };
};

export default function Navbar() {
  const { push: routerPush, pathname } = useMockRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const chatHistory = [
    { id: 1, title: 'Project Brainstorming', date: 'Today' },
    { id: 2, title: 'React Component Help', date: 'Yesterday' },
    { id: 3, title: 'Database Schema Design', date: 'Previous 7 Days' },
    { id: 4, title: 'Debugging API Routes', date: 'Previous 7 Days' },
  ];

  if (pathname === '/login' || pathname === '/signup') return null;

  const handleLogout = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    try {
      if (API_URL) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    cookieUtils.clearAll();
    routerPush('/');
    router.push('/');
  };

  return (
    <>
      {/* --- Main Top Navbar --- */}
      <nav className="w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex justify-between items-center fixed top-0 left-0 right-0 z-40 shadow-lg shadow-black/50 h-20">
        
        {/* Left: Hamburger Menu (Triggers Sidebar) */}
        <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
          <Menu size={24} />
        </button>

        {/* Center: Logo (Absolutely Positioned) */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Image
            src='/logo.png'
            alt='Logo'
            width={120}
            height={40}
            className="object-contain cursor-pointer"
            onClick={() => routerPush('/')}
          />
        </div>

        {/* Right: Account Dropdown */}
        <div className="relative">
          <div 
            className="w-10 h-10 bg-zinc-800 text-zinc-300 rounded-full flex items-center justify-center cursor-pointer font-semibold transition hover:bg-zinc-700 ring-2 ring-green-600/50"
            onClick={() => setIsProfileOpen((prev) => !prev)}
          >
            <User size={20} className="text-green-500" />
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 mt-3 w-48 bg-zinc-900 border border-zinc-700 shadow-2xl shadow-black/70 rounded-xl z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-left px-3 py-2 text-red-400 hover:bg-zinc-800 rounded-lg text-sm transition-colors"
                >
                  <LogOut size={16} className="text-red-500" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* --- Sidebar (Chat History Style) --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-zinc-950 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-4">
          
          {/* Sidebar Header: Close & New Chat */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
            >
              <Menu size={24} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(false)} // Add new chat logic here
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-full transition"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* New Chat Big Button */}
          <button className="flex items-center gap-3 w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 rounded-full mb-6 transition-all shadow-sm group">
            <Plus size={18} className="text-green-500 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium">New Chat</span>
          </button>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Recent</h3>
              <div className="space-y-1">
                {chatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 rounded-lg text-sm transition-all group overflow-hidden"
                  >
                    <MessageSquare size={16} className="text-zinc-600 group-hover:text-green-500 shrink-0 transition-colors" />
                    <span className="truncate">{chat.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-zinc-800 mt-auto">
            <button className="flex items-center gap-3 w-full px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg text-sm transition-colors">
              <History size={16} /> 
              <span>View All History</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
