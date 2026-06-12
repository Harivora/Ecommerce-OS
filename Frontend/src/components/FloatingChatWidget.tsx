"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiApi } from "@/lib/ai-api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  "How is my profit margin today?",
  "Why did profit drop last week?",
  "Show me low stock items",
];

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I'm your Commerce OS AI assistant. Ask me anything about your sales, margins, shipping, or ad spend performance today!",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const res = await aiApi.chat(trimmed, convId);
      setConvId(res.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: res.reply.id, role: "assistant", content: res.reply.content, timestamp: new Date() },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          role: "assistant",
          content:
            e instanceof Error
              ? e.message
              : "I couldn't reach the AI service. Make sure your Anthropic API key is set in Settings → AI.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[500px] rounded-2xl glass-card border border-border shadow-2xl flex flex-col overflow-hidden mb-4 animate-scale-in origin-bottom-right bg-card">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card/95 backdrop-blur-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  AI Store Copilot
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </h3>
                <p className="text-[10px] text-muted-foreground">Ask anything about your store</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2.5 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold",
                    msg.role === "user"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-gradient-to-br from-primary to-accent text-white"
                  )}
                >
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/15"
                      : "bg-muted border border-border text-foreground"
                  )}
                >
                  {msg.content.split("\n").map((line, idx) => {
                    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/);
                    return (
                      <p key={idx} className={idx > 0 ? "mt-1.5" : ""}>
                        {parts.map((part, pIdx) => {
                          if (part.startsWith("**") && part.endsWith("**")) {
                            return (
                              <strong key={pIdx} className="font-semibold text-primary">
                                {part.slice(2, -2)}
                              </strong>
                            );
                          }
                          if (part.startsWith("*") && part.endsWith("*")) {
                            return (
                              <em key={pIdx} className="italic text-foreground">
                                {part.slice(1, -1)}
                              </em>
                            );
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-start gap-2.5 max-w-[85%] animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-muted border border-border rounded-xl px-3 py-2.5 text-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && !isTyping && (
            <div className="px-4 py-2 border-t border-border bg-muted/10">
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase font-medium tracking-wider">Suggested queries:</p>
              <div className="flex flex-col gap-1">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-border bg-muted/20 hover:bg-primary/5 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground truncate"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Input */}
          <div className="p-3 border-t border-border/50 bg-card/95 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)}
              placeholder="Ask about sales, ads, stock..."
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim()}
              className="w-8 h-8 rounded-xl bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-white flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all relative group"
        aria-label="Open AI Assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 animate-scale-in" />
        ) : (
          <>
            <MessageSquare className="w-6 h-6 animate-scale-in" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
