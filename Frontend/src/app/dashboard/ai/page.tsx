"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Plus, Search, MessageSquare, Trash2, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const presetAnswers: Record<string, string> = {
  "why did profit drop last week": `profit decline:

1. **Increased Ad Spend (+32%)**
Your Meta Ads spend jumped from ₹45,000 to ₹59,400 last week. While impressions increased, your ROAS dropped from 4.2x to 3.1x, suggesting diminishing returns on the additional spend.

2. **Higher Return Rate**
Your RTO rate increased from 8% to 14%, primarily on the "Wireless Earbuds Pro X" — 23 out of 89 orders were returned. This product alone cost you ₹18,400 in reverse shipping.

3. **Discount Campaign Impact**
The 15% sitewide discount you ran on Wednesday-Thursday drove 180 extra orders but reduced margins from 30% to 22% on those orders.

**Recommendation:** Consider reducing ad spend by 15% and pausing the earbuds campaign until RTO issues are resolved. The discount campaign was net-positive but should be targeted to high-margin products only.`,

  "what products are losing money": `Our product margin audit flags these items:

1. **Wireless Earbuds Pro X**
Carrying a profit margin of **56%** which is operationally lower than beauty cohorts (average **78%**), causing high CPA customer acquisition costs to eat all order profits.

2. **Smart Fitness Band V2**
Gross margin is healthy, but stock is currently **0 units**. Empty shelves are losing active cart checkouts and potential revenue.`,

  "which products should i scale": `I recommend prioritizing marketing budgets on:

1. **Ayurvedic Hair Oil** (SKU: BEA-002) — Margin of **78.2%**, highly stable customer LTV profile, and 512 units of stock cover.
2. **Organic Vitamin C Serum** (SKU: BEA-001) — Margin of **76.6%** with strong organic search traction on Google.`,

  "forecast revenue for next month": `AI models predict next month's gross revenue at **₹3,150,000** (with error bounds of ₹2,850,000 to ₹3,450,000).

If current ad spends hold, net profit margins will hover at **30%** (approx **₹945,000**). Keep CPA below ₹158 to scale this safely.`,
};

const initialConversations: ChatConversation[] = [
  {
    id: "conv-1",
    title: "Profit Analysis — October",
    messages: [
      { id: "m1", role: "user", content: "Why did profit drop last week?", timestamp: "10:00 AM" },
      {
        id: "m2",
        role: "assistant",
        content: `profit decline:

1. **Increased Ad Spend (+32%)**
Your Meta Ads spend jumped from ₹45,000 to ₹59,400 last week. While impressions increased, your ROAS dropped from 4.2x to 3.1x, suggesting diminishing returns on the additional spend.

2. **Higher Return Rate**
Your RTO rate increased from 8% to 14%, primarily on the "Wireless Earbuds Pro X" — 23 out of 89 orders were returned. This product alone cost you ₹18,400 in reverse shipping.

3. **Discount Campaign Impact**
The 15% sitewide discount you ran on Wednesday-Thursday drove 180 extra orders but reduced margins from 30% to 22% on those orders.

**Recommendation:** Consider reducing ad spend by 15% and pausing the earbuds campaign until RTO issues are resolved. The discount campaign was net-positive but should be targeted to high-margin products only.`,
        timestamp: "10:01 AM",
      },
    ],
    createdAt: "2024-10-15",
    updatedAt: "2024-10-15",
  },
  {
    id: "conv-2",
    title: "Product Performance Review",
    messages: [
      { id: "m3", role: "user", content: "What products are losing money?", timestamp: "Yesterday" },
      {
        id: "m4",
        role: "assistant",
        content: `Our product margin audit flags these items:

1. **Wireless Earbuds Pro X**
Carrying a profit margin of **56%** which is operationally lower than beauty cohorts (average **78%**), causing high CPA customer acquisition costs to eat all order profits.

2. **Smart Fitness Band V2**
Gross margin is healthy, but stock is currently **0 units**. Empty shelves are losing active cart checkouts and potential revenue.`,
        timestamp: "Yesterday",
      },
    ],
    createdAt: "2024-10-14",
    updatedAt: "2024-10-14",
  },
  {
    id: "conv-3",
    title: "Scaling Strategy",
    messages: [],
    createdAt: "2024-10-13",
    updatedAt: "2024-10-13",
  },
];

const suggestedChips = [
  "Why did profit drop last week?",
  "What products are losing money?",
  "Which products should I scale?",
  "Forecast revenue for next month",
];

export default function AIChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState("conv-1");
  const [inputVal, setInputVal] = useState("");
  const [typing, setTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, typing]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            messages: [...c.messages, userMessage],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
    setInputVal("");
    setTyping(true);

    // Simulate response delay
    await new Promise((r) => setTimeout(r, 1000));

    const normalizedText = text.toLowerCase().trim().replace(/[?]$/, "");
    let reply =
      "I am scanning your active store integrations. Would you like a product margin forecast, low stock alarm, or an audited ledger summary?";

    for (const key in presetAnswers) {
      if (normalizedText.includes(key) || key.includes(normalizedText)) {
        reply = presetAnswers[key];
        break;
      }
    }

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            messages: [...c.messages, aiMessage],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
    setTyping(false);
  };

  const createNewConversation = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: ChatConversation = {
      id: newId,
      title: "New AI Analysis Session",
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content: "Hi! I'm your AI profit copilot. Ask me any question to audit margins, ad campaigns, or RTO logs.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length === 1) return;
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    if (activeConvId === id) {
      setActiveConvId(remaining[0].id);
    }
  };

  const parseMessageContent = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-4 text-sm text-foreground/90 leading-relaxed font-sans">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Check if recommendation line
          if (trimmed.startsWith("**Recommendation:**") || trimmed.startsWith("Recommendation:")) {
            const content = trimmed.replace(/^\*\*Recommendation:\*\*\s*/, "").replace(/^Recommendation:\s*/, "");
            return (
              <div key={idx} className="mt-4 pt-3 border-t border-border/40 text-xs">
                <span className="font-bold text-foreground block mb-1">Recommendation:</span>
                <span className="text-muted-foreground">{content}</span>
              </div>
            );
          }

          // Check for numbered item header e.g. "1. Increased Ad Spend (+32%)"
          const numberMatch = trimmed.match(/^(\d+)\.\s+\*\*(.*?)\*\*/);
          if (numberMatch) {
            const num = numberMatch[1];
            const heading = numberMatch[2];
            return (
              <h4 key={idx} className="font-bold text-foreground text-sm pt-2 flex gap-1">
                <span>{num}.</span>
                <span>{heading}</span>
              </h4>
            );
          }

          // Bullet styling
          if (trimmed.startsWith("* ")) {
            const content = trimmed.slice(2);
            return (
              <ul key={idx} className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
                <li>{content}</li>
              </ul>
            );
          }

          // Empty line
          if (!trimmed) return <div key={idx} className="h-1" />;

          // Default paragraph
          // Replace bold markdown matches **text**
          const parts = trimmed.split(/(\*\*.*?\*\*)/);
          return (
            <p key={idx} className="text-muted-foreground text-[13px] leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={pIdx} className="font-bold text-foreground">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
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
        {/* New Chat Button */}
        <div className="p-4 border-b border-border/40 space-y-3">
          <button
            onClick={createNewConversation}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>

          {/* Search conversations */}
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

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filteredHistory.map((c) => {
            const active = c.id === activeConvId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`w-full p-3 rounded-xl text-left flex items-start justify-between group transition-all border ${
                  active
                    ? "bg-[#181524]/60 border-violet-500/30 shadow-sm"
                    : "border-transparent hover:bg-muted/10"
                }`}
              >
                <div className="min-w-0 flex items-start gap-3">
                  <MessageSquare className={`w-4 h-4 shrink-0 mt-0.5 ${active ? "text-violet-400" : "text-muted-foreground/80"}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>{c.title}</p>
                    <span className="text-[10px] text-muted-foreground/50 block mt-0.5">
                      {c.messages.length} messages
                    </span>
                  </div>
                </div>

                {conversations.length > 1 && (
                  <button
                    onClick={(e) => deleteConversation(c.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Chat Pane */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/5">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-border/40 bg-[#0d0b14]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
              <Bot className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 leading-none">
                AI Commerce Analyst
              </h2>
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

        {/* Message Log Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          {activeConversation.messages.map((m) => {
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
                  <span className={`text-[9px] text-muted-foreground/40 block mt-1 ${isUser ? "text-right" : "text-left"}`}>
                    {m.timestamp}
                  </span>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing animation */}
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

        {/* Suggested Queries Chips */}
        {activeConversation.messages.length <= 1 && !typing && (
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

        {/* Input area */}
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
            {/* Purple send circle icon inside the input */}
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

