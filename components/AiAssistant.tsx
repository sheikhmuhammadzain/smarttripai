"use client";

import { MessageSquare, X, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  agent?: {
    intent: "recommendation" | "booking" | "general";
    recommendations: Array<{
      productId: string;
      title: string;
      location: string;
      price: number;
      currency: string;
      rating: number;
      reason: string;
      url: string;
    }>;
    booking: {
      productId: string;
      title: string;
      quantity: number;
      estimatedTotal: number;
      currency: string;
      checkoutUrl: string;
    } | null;
  };
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Merhaba. I am your Turkey travel assistant. Tell me destination, days, and budget and I will tailor your plan.",
};

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const SESSION_STORAGE_KEY = "gyg_assistant_session_id_v1";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) {
      setSessionId(existing);
      return;
    }
    const generated = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    setSessionId(generated);
  }, []);

  useEffect(() => {
    if (!isOpen || historyLoaded || !sessionId) return;
    const sid = sessionId;

    let cancelled = false;
    async function loadHistory() {
      try {
        const response = await fetch(`/api/v1/assistant/chat?sessionId=${encodeURIComponent(sid)}`, {
          cache: "no-store",
        });
        if (response.status === 401 || !response.ok) {
          setHistoryLoaded(true);
          return;
        }

        const payload = (await response.json()) as {
          messages?: Array<{ role: "assistant" | "user"; content: string; createdAt: string }>;
        };

        if (cancelled) return;
        if (!payload.messages || payload.messages.length === 0) {
          setMessages([WELCOME_MESSAGE]);
          setHistoryLoaded(true);
          return;
        }

        setMessages(
          payload.messages.map((item, index) => ({
            id: `${item.role}-${index}-${item.createdAt}`,
            role: item.role,
            content: item.content,
          })),
        );
        setHistoryLoaded(true);
      } catch {
        if (!cancelled) setHistoryLoaded(true);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [historyLoaded, isOpen, sessionId]);

  function appendToMessage(messageId: string, delta: string) {
    setMessages((prev) =>
      prev.map((item) => (item.id === messageId ? { ...item, content: `${item.content}${delta}` } : item)),
    );
  }

  function replaceMessage(messageId: string, content: string) {
    setMessages((prev) => prev.map((item) => (item.id === messageId ? { ...item, content } : item)));
  }

  function patchMessageAgent(messageId: string, agent: ChatMessage["agent"]) {
    setMessages((prev) => prev.map((item) => (item.id === messageId ? { ...item, agent } : item)));
  }

  function parseSseChunk(chunk: string) {
    let event = "message";
    const dataLines: string[] = [];

    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    return { event, data: dataLines.join("\n") };
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isSending || !sessionId) {
      return;
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = { id: assistantMessageId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/v1/assistant/chat/stream", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          message: trimmed,
        }),
      });

      if (response.status === 401) {
        replaceMessage(
          assistantMessageId,
          "Sign in to use the persistent AI assistant. You can still use the itinerary generator without sign-in.",
        );
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error("Assistant failed to respond");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completedReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const delimiterIndex = buffer.indexOf("\n\n");
          if (delimiterIndex === -1) break;

          const rawChunk = buffer.slice(0, delimiterIndex);
          buffer = buffer.slice(delimiterIndex + 2);
          const parsed = parseSseChunk(rawChunk);

          if (parsed.event === "token") {
            try {
              const payload = JSON.parse(parsed.data) as { delta?: string };
              if (payload.delta) {
                completedReply += payload.delta;
                appendToMessage(assistantMessageId, payload.delta);
              }
            } catch {
              // ignore malformed token payload
            }
            continue;
          }

          if (parsed.event === "done") {
            try {
              const payload = JSON.parse(parsed.data) as {
                reply?: string;
                agent?: ChatMessage["agent"];
              };
              if (payload.reply) {
                completedReply = payload.reply;
                replaceMessage(assistantMessageId, payload.reply);
              }
              if (payload.agent) {
                patchMessageAgent(assistantMessageId, payload.agent);
              }
            } catch {
              // ignore malformed done payload
            }
            continue;
          }

          if (parsed.event === "error") {
            try {
              const payload = JSON.parse(parsed.data) as { message?: string };
              replaceMessage(assistantMessageId, payload.message ?? "Assistant stream failed");
            } catch {
              replaceMessage(assistantMessageId, "Assistant stream failed");
            }
          }
        }
      }

      if (!completedReply.trim()) {
        replaceMessage(assistantMessageId, "I could not reach the assistant endpoint. Please try again.");
      }
    } catch {
      replaceMessage(assistantMessageId, "I could not reach the assistant endpoint. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 sm:gap-4">
      {isOpen && (
        <div className="h-[72vh] max-h-[680px] w-[min(92vw,430px)] rounded-3xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.24)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-200">
          <div className="bg-gradient-to-r from-brand to-blue-500 px-4 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-none">Turkey AI Agent</h3>
                <p className="mt-1 text-xs opacity-95">Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 bg-gradient-to-b from-slate-50 to-slate-100/60 px-3 py-4 sm:px-4 overflow-y-auto flex flex-col gap-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === "assistant" ? "max-w-[88%]" : "max-w-[88%] self-end"}>
                <div
                  className={
                    message.role === "assistant"
                      ? "flex gap-2"
                      : "flex gap-2 self-end flex-row-reverse"
                  }
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                      <Sparkles className="w-4 h-4 text-brand" />
                    </div>
                  )}
                  <div
                    className={
                      message.role === "assistant"
                        ? "bg-white px-3.5 py-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm text-[15px] leading-7 text-gray-700"
                        : "bg-brand text-white px-3.5 py-3 rounded-2xl rounded-tr-none shadow-md text-[15px] leading-7"
                    }
                  >
                    {message.content || (message.role === "assistant" && isSending ? "..." : "")}
                  </div>
                </div>

                {message.role === "assistant" && message.agent ? (
                  <div className="ml-10 mt-2 space-y-2">
                    {message.agent.recommendations.length > 0 ? (
                      <div className="grid gap-2">
                        {message.agent.recommendations.slice(0, 3).map((item) => (
                          <a
                            key={`${message.id}-${item.productId}`}
                            href={item.url}
                            className="block rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-sm hover:border-blue-300"
                          >
                            <p className="font-semibold text-text-primary">{item.title}</p>
                            <p className="mt-0.5 text-text-muted">{item.location} • {item.rating.toFixed(1)}★</p>
                            <p className="mt-1 font-semibold text-brand">From {item.price} {item.currency}</p>
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {message.agent.booking ? (
                      <a
                        href={message.agent.booking.checkoutUrl}
                        className="inline-flex items-center rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
                      >
                        Book {message.agent.booking.title} ({message.agent.booking.estimatedTotal} {message.agent.booking.currency})
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="p-3 sm:p-3.5 bg-white border-t border-gray-200">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask anything about Turkey..."
                className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-gray-300 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-blue-100 text-[15px]"
              />
              <button
                disabled={isSending}
                onClick={() => void sendMessage()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-70"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-14 w-14 sm:h-16 sm:w-16 bg-brand hover:bg-brand-hover text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group relative"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7 fill-current" />}
      </button>
    </div>
  );
}

