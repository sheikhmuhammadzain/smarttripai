"use client";

import { MessageSquare, X, Send, Bot, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      const normalizedLine = line.replace(/\r$/, "");
      if (normalizedLine.startsWith(":")) {
        continue;
      }
      if (normalizedLine.startsWith("event:")) {
        event = normalizedLine.slice(6).trim();
        continue;
      }
      if (normalizedLine.startsWith("data:")) {
        dataLines.push(normalizedLine.slice(5).trimStart());
      }
    }

    return { event, data: dataLines.join("\n") };
  }

  function findSseDelimiterIndex(buffer: string) {
    const lf = buffer.indexOf("\n\n");
    const crlf = buffer.indexOf("\r\n\r\n");
    if (lf === -1) return crlf;
    if (crlf === -1) return lf;
    return Math.min(lf, crlf);
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
          const delimiterIndex = findSseDelimiterIndex(buffer);
          if (delimiterIndex === -1) break;

          const rawChunk = buffer.slice(0, delimiterIndex);
          const separatorLength = buffer.startsWith("\r\n\r\n", delimiterIndex) ? 4 : 2;
          buffer = buffer.slice(delimiterIndex + separatorLength);
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

      // Process any trailing event chunk not terminated by double newline.
      if (buffer.trim()) {
        const parsed = parseSseChunk(buffer);
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
            // ignore malformed trailing done payload
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
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{
            width: "min(92vw, 400px)",
            height: "min(80vh, 640px)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-none">Turkey AI Agent</p>
                <p className="mt-0.5 text-xs text-emerald-500 font-medium">● Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2.5 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                    <Bot className="h-3.5 w-3.5 text-brand" />
                  </div>
                )}

                <div className={`flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : "items-start"} max-w-[82%]`}>
                  {/* Bubble */}
                  <div
                    className={
                      message.role === "user"
                        ? "rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2.5 text-sm text-white"
                        : "rounded-2xl rounded-tl-sm border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800"
                    }
                  >
                    {message.role === "assistant" ? (
                      message.content ? (
                        <div className="prose-chat">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : isSending ? (
                        <TypingDots />
                      ) : null
                    ) : (
                      <span>{message.content}</span>
                    )}
                  </div>

                  {/* Product cards */}
                  {message.role === "assistant" && message.agent?.recommendations && message.agent.recommendations.length > 0 && (
                    <div className="w-full space-y-1.5 pt-1">
                      {message.agent.recommendations.slice(0, 3).map((item) => (
                        <a
                          key={`${message.id}-${item.productId}`}
                          href={item.url}
                          className="group flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-2.5 text-xs transition-colors hover:border-brand/40 hover:bg-blue-50/40"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate group-hover:text-brand transition-colors">{item.title}</p>
                            <p className="mt-0.5 text-gray-400">{item.location} · ⭐ {item.rating.toFixed(1)}</p>
                          </div>
                          <p className="shrink-0 font-semibold text-brand">
                            {item.price} {item.currency}
                          </p>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Booking CTA */}
                  {message.role === "assistant" && message.agent?.booking && (
                    <a
                      href={message.agent.booking.checkoutUrl}
                      className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
                    >
                      Book now · {message.agent.booking.estimatedTotal} {message.agent.booking.currency}
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Standalone typing indicator when no placeholder exists yet */}
            {isSending && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
                  <Bot className="h-3.5 w-3.5 text-brand" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-white p-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-brand/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask anything about Turkey…"
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                disabled={isSending || !input.trim()}
                onClick={() => void sendMessage()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-all hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-13 w-13 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all hover:bg-brand-hover hover:shadow-xl active:scale-95"
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5 fill-current" />
        )}
      </button>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

