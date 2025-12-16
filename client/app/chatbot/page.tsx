"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Loader2 } from "lucide-react";
import SideNavbar from "../components/SideNavbar";
import Navbar from "../components/Navbar";
import { parseRAGResponse } from "@/lib/parseRAGResponse";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function AccountPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>("default-session");
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
    const saved = localStorage.getItem("chat_history");
    if (saved) {
      setMessages(JSON.parse(saved));
    }
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserId(user.userId || user.id);
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("chat_history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !API_URL || !isHydrated) return;

    async function loadMessages() {
      try {
        const res = await fetch(`${API_URL}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

        if (!res.ok) {
          console.error("Failed to fetch messages, status:", res.status);
          return;
        }

        const data = await res.json();
        console.log("Fetched messages from API:", data);

        if (Array.isArray(data) && data.length > 0) {
          const lastConv = data[data.length - 1];
          setConversationId(lastConv.conversationId);

          const apiMessages = lastConv.messages.map((m: any) => ({
            id: m.messageId || m.id,
            role: m.role,
            content: m.content,
          }));

          setMessages(apiMessages);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    }

    loadMessages();
  }, [API_URL, isHydrated]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || !API_URL) return;

    const userMessageContent = input;
    setInput("");
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
    };
    const botMsgId = (Date.now() + 1).toString();
    const botMsgPlaceholder: Message = { id: botMsgId, role: "assistant", content: "Thinking..." };
    setMessages((prev) => [...prev, userMsg, botMsgPlaceholder]);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not logged in");

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ 
          question: userMessageContent, 
          conversationId,
          user_id: userId
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Network error: ${res.status} - ${errText}`);
      }

      const data = await res.json();

      if (data.conversationId) setConversationId(data.conversationId);

      let answer = data.answer;
      const parsed = parseRAGResponse(answer);
      const cleanedAnswer = parsed.answer;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, content: cleanedAnswer } : msg
        )
      );
    } catch (err: any) {
      console.error("Send message error:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, content: "Sorry, I encountered an error connecting to the server." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-white font-sans">
      <Navbar />
      <div className="h-20"></div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#0f0f0f] [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          {!isHydrated ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 opacity-50">
              <Loader2 size={40} className="animate-spin mb-4" />
              <p className="text-zinc-400">Loading...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 opacity-50">
              <img
                src="/phos.png"
                alt="assistant"
                width={90}
                height={90}
                className="rounded-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <p className="text-green-800">Start a conversation...</p>
            </div>
          ) : null}

          {isHydrated && messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${msg.role === "user" ? "bg-zinc-700" : "bg-ocp-green"}`}>
                  {msg.role === "user" ? <User size={16} /> : <img src="/phos.png" alt="assistant" className="rounded-full w-8 h-8 object-cover" />}
                </div>
                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm max-w-[600px] w-full ${msg.role === "user" ? "bg-zinc-800 text-white rounded-tr-none border border-zinc-700" : "bg-[#18181b] text-zinc-100 rounded-tl-none border border-zinc-800"}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <footer className="flex-none p-4 bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto relative group">
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              className="w-full bg-green-800/30 border border-zinc-700 text-white rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:border-white transition-all shadow-lg placeholder:text-zinc-600"
              placeholder="Ask anything about OCP..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-ocp-green hover:bg-green-800 text-gray-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-600 mt-2">
            CHAT OCP can make mistakes. Verify important information.
          </p>
        </div>
      </footer>
    </div>
  );
}
