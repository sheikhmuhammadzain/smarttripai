"use client";

import { MessageSquare, X, Send, ChevronDown, Loader2, CheckCircle2, Sparkles, Trash2, HeadphonesIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  ts: number;
}

interface ToolStatus {
  tool: string;
  label: string;
  summary?: string;
  done: boolean;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "assistant-welcome",
  role: "assistant",
  content:
    "Merhaba! I'm your Turkey travel AI — powered by real data.\n\nAsk me to **plan a trip**, **find tours**, **check availability**, or **save an itinerary**.",
  ts: Date.now(),
};

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [toolStatuses, setToolStatuses] = useState<ToolStatus[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const SESSION_KEY = "gyg_assistant_session_id_v1";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isSending, toolStatuses]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) { setSessionId(existing); return; }
    const generated = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(SESSION_KEY, generated);
    setSessionId(generated);
  }, []);

  useEffect(() => {
    if (!isOpen || historyLoaded || !sessionId) return;
    const sid = sessionId;
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/v1/assistant/chat?sessionId=${encodeURIComponent(sid)}`, { cache: "no-store" });
        if (res.status === 401 || !res.ok) { setHistoryLoaded(true); return; }
        const payload = (await res.json()) as {
          messages?: Array<{ role: "assistant" | "user"; content: string; createdAt: string }>;
        };
        if (cancelled) return;
        if (!payload.messages?.length) { setMessages([WELCOME_MESSAGE]); setHistoryLoaded(true); return; }
        setMessages(payload.messages.map((m, i) => ({
          id: `${m.role}-${i}-${m.createdAt}`,
          role: m.role,
          content: m.content,
          ts: new Date(m.createdAt).getTime(),
        })));
        setHistoryLoaded(true);
      } catch { if (!cancelled) setHistoryLoaded(true); }
    }

    void loadHistory();
    return () => { cancelled = true; };
  }, [historyLoaded, isOpen, sessionId]);

  function appendToMessage(id: string, delta: string) {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: m.content + delta } : m));
  }

  function replaceMessage(id: string, content: string) {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m));
  }

  function parseSseChunk(chunk: string) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of chunk.split("\n")) {
      const l = line.replace(/\r$/, "");
      if (l.startsWith(":")) continue;
      if (l.startsWith("event:")) { event = l.slice(6).trim(); continue; }
      if (l.startsWith("data:")) dataLines.push(l.slice(5).trimStart());
    }
    return { event, data: dataLines.join("\n") };
  }

  function findDelimiter(buf: string) {
    const lf = buf.indexOf("\n\n");
    const crlf = buf.indexOf("\r\n\r\n");
    if (lf === -1) return crlf;
    if (crlf === -1) return lf;
    return Math.min(lf, crlf);
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isSending || !sessionId) return;

    const now = Date.now();
    const userMsg: ChatMessage = { id: `user-${now}`, role: "user", content: trimmed, ts: now };
    const aId = `assistant-${now}`;
    const aPlaceholder: ChatMessage = { id: aId, role: "assistant", content: "", ts: now };
    setMessages((prev) => [...prev, userMsg, aPlaceholder]);
    setToolStatuses([]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/v1/assistant/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, message: trimmed }),
      });

      if (res.status === 401) {
        replaceMessage(aId, "**Sign in** to use the AI assistant. The itinerary generator works without sign-in.");
        return;
      }
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let reply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        while (true) {
          const di = findDelimiter(buf);
          if (di === -1) break;
          const raw = buf.slice(0, di);
          buf = buf.slice(di + (buf.slice(di).startsWith("\r\n\r\n") ? 4 : 2));
          const { event, data } = parseSseChunk(raw);

          if (event === "tool_call") {
            try {
              const p = JSON.parse(data) as { tool: string; label: string };
              setToolStatuses((prev) => [
                ...prev.filter((s) => s.tool !== p.tool),
                { tool: p.tool, label: p.label, done: false },
              ]);
            } catch { /* ignore */ }
            continue;
          }
          if (event === "tool_result") {
            try {
              const p = JSON.parse(data) as { tool: string; summary: string };
              setToolStatuses((prev) =>
                prev.map((s) => s.tool === p.tool ? { ...s, summary: p.summary, done: true } : s),
              );
            } catch { /* ignore */ }
            continue;
          }
          if (event === "token") {
            try {
              const p = JSON.parse(data) as { delta?: string };
              if (p.delta) { reply += p.delta; appendToMessage(aId, p.delta); }
            } catch { /* ignore */ }
            continue;
          }
          if (event === "done") {
            try {
              const p = JSON.parse(data) as { reply?: string };
              if (p.reply) { reply = p.reply; replaceMessage(aId, p.reply); }
            } catch { /* ignore */ }
            setToolStatuses([]);
            continue;
          }
          if (event === "error") {
            try {
              const p = JSON.parse(data) as { message?: string };
              replaceMessage(aId, p.message ?? "Assistant stream failed");
            } catch { replaceMessage(aId, "Assistant stream failed"); }
            setToolStatuses([]);
          }
        }
      }

      if (buf.trim()) {
        const { event, data } = parseSseChunk(buf);
        if (event === "done") {
          try {
            const p = JSON.parse(data) as { reply?: string };
            if (p.reply) { reply = p.reply; replaceMessage(aId, p.reply); }
          } catch { /* ignore */ }
          setToolStatuses([]);
        }
      }

      if (!reply.trim()) replaceMessage(aId, "I could not reach the assistant. Please try again.");
    } catch {
      replaceMessage(aId, "I could not reach the assistant. Please try again.");
      setToolStatuses([]);
    } finally {
      setIsSending(false);
    }
  }

  function clearChat() {
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(SESSION_KEY, newId);
    setSessionId(newId);
    setMessages([WELCOME_MESSAGE]);
    setToolStatuses([]);
    setHistoryLoaded(true);
  }

  const lastMsg = messages[messages.length - 1];
  const showStandaloneTyping = isSending && lastMsg?.role === "user";

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {/* Chat window */}
      {isOpen && (
        <div
          className="flex flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-base
            fixed inset-x-2 bottom-20 top-4
            sm:static sm:inset-auto sm:rounded-3xl sm:w-[min(90vw,820px)] sm:h-[min(85vh,660px)]"
          style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08)" }}
        >
          {/* Header */}
          <div className="relative flex items-center justify-between px-4 py-3.5 bg-linear-to-r from-brand via-brand to-brand-hover">
            {/* Subtle pattern overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                <HeadphonesIcon className="h-5 w-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Turkey AI Agent</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[11px] text-white/70 leading-tight">Powered by real-time data</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={clearChat}
                disabled={isSending}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/15 hover:text-white disabled:opacity-40"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Minimise"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5"
            style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border-default) transparent" }}
          >
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              return (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  {msg.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
                      <HeadphonesIcon className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                    <div
                      className={
                        msg.role === "user"
                          ? "rounded-2xl rounded-tr-md bg-linear-to-br from-brand to-brand-hover px-4 py-2.5 text-sm text-white shadow-md shadow-brand/20"
                          : "rounded-2xl rounded-tl-md border border-border-soft bg-surface-subtle px-4 py-2.5 text-sm text-text-body shadow-sm"
                      }
                    >
                      {msg.role === "assistant" ? (
                        msg.content ? (
                          <div className="prose-chat">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (isLast && isSending) ? (
                          <TypingDots />
                        ) : null
                      ) : (
                        <span>{msg.content}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tool status chips */}
            {toolStatuses.length > 0 && (
              <div className="flex gap-2.5">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
                  <HeadphonesIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {toolStatuses.map((s) => <ToolChip key={s.tool} status={s} />)}
                </div>
              </div>
            )}

            {/* Standalone typing indicator */}
            {showStandaloneTyping && (
              <div className="flex gap-2.5">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand">
                  <HeadphonesIcon className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-md border border-border-soft bg-surface-subtle px-4 py-2.5 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border-soft bg-surface-base px-4 pb-4 pt-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-border-default bg-surface-subtle px-4 py-2.5 transition-all focus-within:border-brand/40 focus-within:bg-surface-base focus-within:ring-2 focus-within:ring-brand/10 focus-within:shadow-sm">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
                }}
                placeholder="Ask about tours, itineraries, tips…"
                disabled={isSending}
                className="flex-1 bg-transparent text-sm text-text-body placeholder:text-text-subtle focus:outline-none disabled:opacity-60"
              />
              <button
                disabled={isSending || !input.trim()}
                onClick={() => void sendMessage()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30 transition-all hover:bg-brand-hover hover:shadow-brand/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                aria-label="Send"
              >
                {isSending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              {["Calls real tools", "Saves itineraries", "Live availability"].map((label) => (
                <span key={label} className="flex items-center gap-1 text-[10px] text-text-subtle">
                  <span className="h-1 w-1 rounded-full bg-brand/40" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center transition-all hover:scale-110 active:scale-95 drop-shadow-2xl"
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
      >
        {isOpen ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-xl ring-2 ring-brand/20">
            <X className="h-5 w-5 text-text-body" />
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand shadow-xl shadow-brand/40 ring-4 ring-brand/20">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
        )}
      </button>
    </div>
  );
}

function ToolChip({ status }: { status: ToolStatus }) {
  return (
    <div
      className={`inline-flex items-center gap-2 self-start rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${status.done
        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700"
        : "bg-brand text-white border border-brand/80 shadow-sm shadow-brand/30"
        }`}
    >
      {status.done
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        : <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
      <span className="leading-none">{status.done && status.summary ? status.summary : status.label}</span>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 py-0.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-brand/40 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1s" }}
        />
      ))}
    </span>
  );
}
