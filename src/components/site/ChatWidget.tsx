import { useEffect, useRef, useState } from "react";
import { Minus, Send, X, MessageCircle } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { translations, type Lang } from "@/i18n/translations";

const WEBHOOK_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-website-chat";
const TRANSLATE_URL = "https://qorelabs.app.n8n.cloud/webhook/qore-translate";
const CLINIC_ID = "d3110000-0000-4000-a000-000000000001";

type Message = {
  id: string;
  role: "user" | "assistant" | "error";
  // The language the text was originally written in.
  sourceLang: Lang;
  // Cache of the message text per language. Always contains sourceLang;
  // other languages are filled in on demand when the visitor switches.
  byLang: Partial<Record<Lang, string>>;
  timestamp: Date;
};

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Build a message whose text starts out known only in `lang`.
function mk(role: Message["role"], text: string, lang: Lang): Message {
  return { id: uid(), role, sourceLang: lang, byLang: { [lang]: text }, timestamp: new Date() };
}

// The opening greeting is a fixed label, so we already have it in every
// language — seed all three so it never needs translating.
function welcomeMessage(): Message {
  return {
    id: "welcome",
    role: "assistant",
    sourceLang: "nl",
    byLang: { nl: translations.nl.chat.welcome, fr: translations.fr.chat.welcome, en: translations.en.chat.welcome },
    timestamp: new Date(),
  };
}

// What to show for a message in the current language: the cached translation
// if we have it, otherwise fall back to the original text.
function textFor(m: Message, lang: Lang): string {
  return m.byLang[lang] ?? m.byLang[m.sourceLang] ?? "";
}

export function ChatWidget() {
  const { lang, t } = useI18n();
  const c = t.chat;

  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage()]);
  const conversationId = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracks the language a translation pass is aiming for, so a slower response
  // for an earlier language can't overwrite a newer switch.
  const translateTarget = useRef<Lang>(lang);

  if (!conversationId.current) conversationId.current = uid();

  // When the visitor switches language, bring the whole existing conversation
  // into that language: fixed labels come from the cache, and any message we
  // don't yet have translated is sent to the translate endpoint (once) and
  // cached so switching back is instant.
  useEffect(() => {
    translateTarget.current = lang;

    // Messages missing a cached translation for the new language.
    const pending = messages.filter((m) => m.role !== "error" && m.byLang[lang] == null);
    if (pending.length === 0) return;

    let cancelled = false;
    setTranslating(true);
    (async () => {
      try {
        const response = await fetch(TRANSLATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_lang: lang,
            items: pending.map((m) => ({ id: m.id, text: textFor(m, m.sourceLang) })),
          }),
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const data = await response.json();
        const list: Array<{ id: string; text: string }> = Array.isArray(data?.translations)
          ? data.translations
          : [];
        const map = new Map(list.map((x) => [x.id, x.text]));

        // Ignore if the visitor switched again while we were waiting.
        if (cancelled || translateTarget.current !== lang) return;

        setMessages((prev) =>
          prev.map((m) => {
            const translated = map.get(m.id);
            return translated ? { ...m, byLang: { ...m.byLang, [lang]: translated } } : m;
          }),
        );
      } catch {
        // On failure, leave messages in their original language rather than
        // blocking the chat. The visitor can keep talking normally.
      } finally {
        if (!cancelled) setTranslating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run whenever the selected language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const timer = setTimeout(() => setTeaser(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading, translating, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, mk("user", text, lang)]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: CLINIC_ID,
          message: text,
          conversation_id: conversationId.current,
          // Language the visitor selected on the site ("nl" | "fr" | "en").
          // n8n reads this to reply in the same language.
          lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook gaf status ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && typeof data.reply === "string") {
        if (data.conversation_id && typeof data.conversation_id === "string") {
          conversationId.current = data.conversation_id;
        }
        // The reply comes back in the language we asked for, so tag it as such.
        setMessages((prev) => [...prev, mk("assistant", data.reply, lang)]);
      } else {
        const fields = data && typeof data === "object" ? Object.keys(data) : [];
        const fieldList = fields.length > 0 ? fields.join(", ") : "(geen velden)";
        throw new Error(`Response heeft geen 'reply'-veld. Beschikbare velden: ${fieldList}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : c.errorGeneric;
      setError(message);
      setMessages((prev) => [...prev, mk("error", message, lang)]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-elevated animate-fade-up sm:w-[420px] sm:h-[640px] h-[calc(100vh-6rem)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/40 shadow-sm">
                <span className="text-sm font-bold text-primary-foreground">Q</span>
              </span>
              <div>
                <p className="font-display text-sm font-semibold leading-tight text-foreground">{c.title}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {c.status}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                aria-label={c.minimize}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label={c.close}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-background px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex max-w-[85%] flex-col gap-1">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : m.role === "error"
                        ? "border border-destructive/30 bg-destructive/10 text-destructive rounded-bl-md"
                        : "bg-card text-card-foreground rounded-bl-md border border-border"
                    }`}
                  >
                    {textFor(m, lang)}
                  </div>
                  <span
                    className={`text-[10px] text-muted-foreground ${
                      m.role === "user" ? "self-end pr-1" : "self-start pl-1"
                    }`}
                  >
                    {formatTime(m.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {(isLoading || translating) && (
              <div className="flex justify-start">
                <div className="flex max-w-[85%] flex-col gap-1">
                  <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                      {translating ? c.translating : c.typing}
                    </span>
                  </div>
                  <span className="self-start pl-1 text-[10px] text-muted-foreground">{formatTime(new Date())}</span>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-card px-3 py-3">
            {error && (
              <div className="mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={c.placeholder}
                disabled={isLoading}
                className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none ring-ring transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                aria-label={c.send}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!open && teaser && (
        <button
          onClick={() => setOpen(true)}
          className="max-w-[260px] rounded-2xl rounded-br-sm border border-border bg-card px-4 py-2.5 text-left text-sm text-foreground shadow-elevated animate-fade-up"
        >
          {c.teaser}
        </button>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? c.minimize : c.open}
        className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-glow transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
