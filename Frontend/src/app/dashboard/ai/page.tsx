"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bot, User, Send, Plus, Search, MessageSquare, Trash2, ArrowUpRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { aiApi, type ChatConversationSummaryDTO, type ChatMessageDTO } from "@/lib/ai-api";

const suggestedChips = [
  "Why did my profit change this month?",
  "Which products have the worst margins?",
  "Who are my most valuable customers?",
  "What should I focus on to grow?",
];

const WELCOME: ChatMessageDTO = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your AI profit copilot, grounded in your real store data. Ask me anything about your margins, orders, customers, or what to focus on next.",
  timestamp: "",
};

const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function AIChatPage() {
  const [conversations, setConversations] = useState<ChatConversationSummaryDTO[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([WELCOME]);
  const [inputVal, setInputVal] = useState("");
  const [typing, setTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [configured, setConfigured] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await aiApi.conversations();
      setConversations(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setActiveConvId(id);
    setMessages([]);
    setTyping(false);
    try {
      const conv = await aiApi.conversation(id);
      setMessages(conv.messages.length ? conv.messages : [WELCOME]);
    } catch {
      setMessages([WELCOME]);
    }
  }, []);

  // Load config + conversation history on mount.
  useEffect(() => {
    aiApi.getConfig().then((c) => setConfigured(c.configured)).catch(() => setConfigured(false));
    refreshConversations().then((list) => {
      if (list.length) openConversation(list[0].id);
    });
  }, [refreshConversations, openConversation]);

  const createNewConversation = () => {
    setActiveConvId(null);
    setMessages([WELCOME]);
    setInputVal("");
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiApi.deleteConversation(id);
    } catch {
      /* ignore */
    }
    const list = await refreshConversations();
    if (activeConvId === id) {
      if (list.length) openConversation(list[0].id);
      else createNewConversation();
    }
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;

    const userMessage: ChatMessageDTO = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: now(),
    };
    setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), userMessage]);
    setInputVal("");
    setTyping(true);

    try {
      const res = await aiApi.chat(trimmed, activeConvId ?? undefined);
      setMessages((prev) => [...prev, res.reply]);
      if (!activeConvId) setActiveConvId(res.conversationId);
      refreshConversations();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            e instanceof Error
              ? e.message
              : "Sorry, I couldn't reach the AI service. Make sure your Anthropic API key is set in Settings → AI.",
          timestamp: now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const parseMessageContent = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-4 text-sm text-foreground/90 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          if (trimmed.startsWith("**Recommendation:**") || trimmed.startsWith("Recommendation:")) {
            const content = trimmed.replace(/^\*\*Recommendation:\*\*\s*/, "").replace(/^Recommendation:\s*/, "");
            return (
              <div key={idx} className="mt-4 pt-3 border-t border-border/40 text-xs">
                <span className="font-bold text-foreground block mb-1">Recommendation:</span>
                <span className="text-muted-foreground">{content}</span>
              </div>
            );
          }

          const numberMatch = trimmed.match(/^(\d+)\.\s+\*\*(.*?)\*\*/);
          if (numberMatch) {
            return (
              <h4 key={idx} className="font-bold text-foreground text-sm pt-2 flex gap-1">
                <span>{numberMatch[1]}.</span>
                <span>{numberMatch[2]}</span>
              </h4>
            );
          }

          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            return (
              <ul key={idx} className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
                <li>{trimmed.slice(2)}</li>
              </ul>
            );
          }

          if (!trimmed) return <div key={idx} className="h-1" />;

          const parts = trimmed.split(/(\*\*.*?\*\*)/);
          return (
            <p key={idx} className="text-muted-foreground text-[13px] leading-relaxed">
              {parts.map((part, pIdx) =>
                part.startsWith("**") && part.endsWith("**") ? (
                  <strong key={pIdx} className="font-bold text-foreground">
                    {part.slice(2, -2)}
                  </strong>
                ) : (
                  part
                )
              )}
            </p>
          );
        })}
      </div>
    );
  };

  const filteredHistory = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8.5rem)] flex border border-border/60 rounded-2xl overflow-hidden bg-card/10 backdrop-blur-md">
      {/* Left Sidebar */}
      <aside className="w-72 border-r border-border bg-[#0d0b14]/40 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/40 space-y-3">
          <button
            onClick={createNewConversation}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-background/50 border border-border/60 focus:border-violet-500/50 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filteredHistory.map((c) => {
            const active = c.id === activeConvId;
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={`w-full p-3 rounded-xl text-left flex items-start justify-between group transition-all border ${
                  active ? "bg-[#181524]/60 border-violet-500/30 shadow-sm" : "border-transparent hover:bg-muted/10"
                }`}
              >
                <div className="min-w-0 flex items-start gap-3">
                  <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${active ? "text-violet-400" : "text-muted-foreground/80"}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{c.title}</p>
                    <span className="text-[10px] text-muted-foreground/50 block mt-0.5">
                      {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            );
          })}
          {filteredHistory.length === 0 && (
            <p className="text-[11px] text-muted-foreground/50 text-center py-6">No conversations yet.</p>
          )}
        </div>
      </aside>

      {/* Right Chat Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/5">
        <div className="px-6 py-4 border-b border-border/40 bg-[#0d0b14]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 leading-none">AI Commerce Analyst</h2>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] py-0.5 font-medium border-border bg-muted/10 text-muted-foreground/90">
            Powered by Claude
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex items-start gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div className="space-y-1 max-w-[80%]">
                  {isUser ? (
                    <div className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-violet-600/10">
                      {m.content}
                    </div>
                  ) : (
                    <div className="px-5 py-4 rounded-2xl bg-card/60 border border-border/40 shadow-sm">
                      {parseMessageContent(m.content)}
                    </div>
                  )}
                  {m.timestamp && (
                    <span className={`text-[9px] text-muted-foreground/40 block mt-1 ${isUser ? "text-right" : "text-left"}`}>
                      {m.timestamp}
                    </span>
                  )}
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {typing && (
            <div className="flex items-start gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="bg-card/60 border border-border/40 rounded-2xl px-5 py-3.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && !typing && (
          <div className="px-6 py-3 border-t border-border/30 bg-[#0d0b14]/10">
            <div className="flex flex-wrap gap-2">
              {suggestedChips.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-3.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted/10 hover:border-violet-500/30 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
                >
                  {q}
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!configured && (
          <div className="px-6 py-2.5 border-t border-amber-500/20 bg-amber-500/10 text-amber-500 text-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              Add your Anthropic API key in{" "}
              <Link href="/dashboard/settings" className="underline font-semibold">
                Settings → AI
              </Link>{" "}
              to enable the assistant.
            </span>
          </div>
        )}

        <div className="p-4 border-t border-border/40 bg-[#0d0b14]/20 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask about your business..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(inputVal)}
              className="w-full pl-4 pr-12 py-3 rounded-full bg-background border border-border/60 focus:border-violet-500/50 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-all"
            />
            <button
              onClick={() => handleSend(inputVal)}
              disabled={!inputVal.trim() || typing}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white flex items-center justify-center transition-all disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
