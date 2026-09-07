import { useState, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat-test")({
  head: () => ({
    meta: [
      { title: "Qore AI Receptionist — DEV Test" },
      { name: "description", content: "DEV-testpagina voor de Qore AI Receptionist." },
      { property: "og:title", content: "Qore AI Receptionist — DEV Test" },
      { property: "og:description", content: "DEV-testpagina voor de Qore AI Receptionist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ChatTestPage,
});

type Message = {
  id: string;
  role: "user" | "assistant" | "error";
  text: string;
  timestamp: Date;
};

function ChatTestPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hoi! Ik ben de Qore AI Receptionist (DEV-omgeving). Typ een bericht om de n8n-webhook te testen.",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("https://qorelabs.app.n8n.cloud/webhook/qore-website-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: "d3110000-0000-4000-a000-000000000001",
          message: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook gaf status ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && typeof data.reply === "string") {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: data.reply,
            timestamp: new Date(),
          },
        ]);
      } else {
        const fields = data && typeof data === "object" ? Object.keys(data) : [];
        const fieldList = fields.length > 0 ? fields.join(", ") : "(geen velden)";
        throw new Error(
          `Response heeft geen 'reply'-veld. Beschikbare velden: ${fieldList}`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Er is iets misgegaan bij het versturen.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "error",
          text: message,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
        <div className="border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-6 py-5">
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Qore AI Receptionist — DEV Test
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            End-to-end test via n8n-webhook. Geen directe Supabase-verbinding.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="h-[420px] space-y-4 overflow-y-auto bg-background/50 px-6 py-5"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : m.role === "error"
                    ? "border border-destructive/30 bg-destructive/10 text-destructive"
                    : "glass text-foreground"
                }`}
              >
                {m.text}
                <div className="mt-1 text-[10px] opacity-60">
                  {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="glass rounded-2xl px-4 py-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  AI receptionist denkt na…
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-card px-6 py-4">
          {error && (
            <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Typ een testbericht…"
              disabled={isLoading}
              className="flex-1 rounded-full border border-input bg-background px-5 py-3 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "…" : "Verstuur"}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-xl text-center text-xs text-muted-foreground">
        DEV-pagina: alleen zichtbaar voor wie de URL kent. Deze pagina staat niet in de
        navigatie en communiceert uitsluitend met de n8n-webhook.
      </p>
    </main>
  );
}
