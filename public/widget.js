/*
 * Qore Aesthetics website widget. A clinic adds one line to its site:
 *   <script src="https://qoreaesthetics.com/widget.js" data-kliniek="slug" defer></script>
 * Optional: data-taal="nl|fr|en" (otherwise the page's language, then the browser's).
 *
 * Talks only to the Supabase function "widget", which checks the site belongs to the clinic. Sets no cookies:
 * the conversation lives in sessionStorage, so it survives page changes but is gone when the tab closes.
 * Everything renders inside a Shadow DOM, so the clinic's own CSS can't change the widget and ours can't touch theirs.
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__qoreWidget) return;
  window.__qoreWidget = true;

  var API = "https://gqigmmezcmtwusgbdxny.supabase.co/functions/v1/widget";
  var slug = (script.getAttribute("data-kliniek") || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) return;

  function kiesTaal() {
    var kandidaten = [script.getAttribute("data-taal"), document.documentElement.lang, navigator.language];
    for (var i = 0; i < kandidaten.length; i++) {
      var t = String(kandidaten[i] || "").slice(0, 2).toLowerCase();
      if (t === "nl" || t === "fr" || t === "en") return t;
    }
    return "nl";
  }
  var taal = kiesTaal();
  var vasteTaal = /^(nl|fr|en)$/.test(script.getAttribute("data-taal") || "");

  var TEKST = {
    nl: { open: "Chat openen", sluit: "Chat sluiten", typ: "Typ je vraag…", stuur: "Versturen", status: "Antwoordt meteen, dag en nacht", teaser: "Een vraag? Ik help je meteen.", fout: "Er ging iets mis. Probeer het zo opnieuw.", teVeel: "Even rustig aan: probeer het over een paar minuten opnieuw.", door: "AI-receptioniste door Qore Aesthetics" },
    fr: { open: "Ouvrir le chat", sluit: "Fermer le chat", typ: "Posez votre question…", stuur: "Envoyer", status: "Répond tout de suite, jour et nuit", teaser: "Une question ? Je vous aide tout de suite.", fout: "Un problème est survenu. Réessayez dans un instant.", teVeel: "Un instant : réessayez dans quelques minutes.", door: "Réceptionniste IA par Qore Aesthetics" },
    en: { open: "Open chat", sluit: "Close chat", typ: "Type your question…", stuur: "Send", status: "Replies right away, day and night", teaser: "A question? I'll help you right away.", fout: "Something went wrong. Please try again shortly.", teVeel: "Hold on: please try again in a few minutes.", door: "AI receptionist by Qore Aesthetics" },
  };
  var T = TEKST[taal];

  var OPSLAG = "qore-widget-" + slug;
  function laad() {
    try {
      var s = JSON.parse(sessionStorage.getItem(OPSLAG) || "null");
      if (s && Array.isArray(s.berichten)) return s;
    } catch (e) { /* no storage: start fresh */ }
    return { gesprek: "", berichten: [], open: false, teaser: false };
  }
  var staat = laad();
  function bewaar() {
    try { sessionStorage.setItem(OPSLAG, JSON.stringify(staat)); } catch (e) { /* storage is a bonus */ }
  }

  // Same greeting check as the n8n workflow: a bare greeting brings the choice buttons back.
  function isGroet(tekst) {
    var schoon = tekst.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
    return /^(hallo|hello|hi|hey|hoi|dag|goeiedag|goedendag|goedemorgen|goeiemorgen|goedemiddag|goedenavond|bonjour|bonsoir|salut|coucou|good morning|good afternoon|good evening)( daar| there)?$/.test(schoon);
  }

  // White or near-black text on the clinic's colour, whichever reads better.
  function tekstKleur(hex) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111114" : "#ffffff";
  }

  function el(tag, attrs, kinderen) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kinderen || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  // Message text with clickable https links (booking link) and **bold**, built from text nodes only (no innerHTML).
  function vulTekst(doel, tekst) {
    var delen = String(tekst).split(/(https?:\/\/[^\s<>"')]+[^\s<>"').,!?;:])/g);
    delen.forEach(function (deel, i) {
      if (i % 2 === 1) {
        doel.appendChild(el("a", { href: deel, target: "_blank", rel: "noopener noreferrer", text: deel.replace(/^https?:\/\//, "") }));
        return;
      }
      deel.split(/\*\*(.+?)\*\*/g).forEach(function (stuk, j) {
        if (!stuk) return;
        doel.appendChild(j % 2 === 1 ? el("strong", { text: stuk }) : document.createTextNode(stuk));
      });
    });
  }

  var config = null, bezig = false;
  var host, wortel, paneel, lijst, invoer, knop, teaserKnop, bubbel;

  function css(kleur, opKleur, links) {
    var kant = links ? "left" : "right";
    return [
      ":host{all:initial}",
      "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif}",
      ".wrap{position:fixed;bottom:20px;" + kant + ":20px;z-index:2147483000;display:flex;flex-direction:column;align-items:" + (links ? "flex-start" : "flex-end") + ";gap:12px}",
      ".bubbel{width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:" + kleur + ";color:" + opKleur + ";box-shadow:0 8px 24px rgba(0,0,0,.22);display:grid;place-items:center;transition:transform .15s}",
      ".bubbel:hover{transform:scale(1.06)}.bubbel:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid " + kleur + ";outline-offset:2px}",
      ".bubbel svg{width:26px;height:26px}",
      ".teaser{max-width:260px;background:#fff;color:#16161a;border:1px solid #e6e6ea;border-radius:16px;padding:10px 14px;font-size:14px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.14);cursor:pointer;text-align:left}",
      ".paneel{width:380px;height:600px;max-height:calc(100vh - 110px);background:#fff;color:#16161a;border:1px solid #e6e6ea;border-radius:22px;box-shadow:0 18px 48px rgba(0,0,0,.24);display:flex;flex-direction:column;overflow:hidden}",
      ".kop{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:" + kleur + ";color:" + opKleur + "}",
      ".logo{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.22);display:grid;place-items:center;font-weight:700;font-size:16px;overflow:hidden;flex-shrink:0}",
      ".logo img{width:100%;height:100%;object-fit:cover}",
      ".naam{font-weight:600;font-size:15px;line-height:1.2}.status{font-size:12px;opacity:.85;margin-top:2px}",
      ".dicht{margin-left:auto;background:transparent;border:0;color:inherit;cursor:pointer;width:34px;height:34px;border-radius:50%;display:grid;place-items:center}",
      ".dicht:hover{background:rgba(255,255,255,.18)}",
      ".melding{font-size:12px;line-height:1.4;color:#5b5b66;background:#f5f5f8;padding:8px 14px;border-bottom:1px solid #ececf0}",
      ".lijst{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#fafafb}",
      ".b{max-width:85%;padding:10px 13px;border-radius:16px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}",
      ".b a{color:inherit;text-decoration:underline;word-break:break-all}",
      ".ai{align-self:flex-start;background:#fff;border:1px solid #e6e6ea;border-bottom-left-radius:5px}",
      ".ik{align-self:flex-end;background:" + kleur + ";color:" + opKleur + ";border-bottom-right-radius:5px}",
      ".fout{align-self:flex-start;background:#fff1f1;color:#a3262a;border:1px solid #f3c7c8}",
      ".keuzes{display:flex;flex-direction:column;gap:7px;margin-top:10px}",
      ".keuze{font-size:14px;padding:9px 12px;border-radius:12px;border:1px solid " + kleur + ";background:#fff;color:#16161a;cursor:pointer;text-align:center}",
      ".keuze:hover:not(:disabled){background:" + kleur + "1f}.keuze:disabled{cursor:default;opacity:.5}.keuze.gekozen{opacity:1;background:" + kleur + "26}",
      ".typen{display:inline-flex;gap:4px}.typen i{width:7px;height:7px;border-radius:50%;background:#9a9aa6;animation:q 1s infinite}",
      ".typen i:nth-child(2){animation-delay:.15s}.typen i:nth-child(3){animation-delay:.3s}",
      "@keyframes q{0%,80%,100%{opacity:.3}40%{opacity:1}}",
      ".voet{display:flex;gap:8px;padding:10px;border-top:1px solid #ececf0;background:#fff}",
      ".voet input{flex:1;min-width:0;border:1px solid #dcdce2;border-radius:999px;padding:10px 14px;font-size:16px;color:#16161a;background:#fff;outline:none}",
      ".voet input:focus{border-color:" + kleur + "}",
      ".stuur{width:42px;height:42px;flex-shrink:0;border:0;border-radius:50%;background:" + kleur + ";color:" + opKleur + ";cursor:pointer;display:grid;place-items:center}",
      ".stuur:disabled{opacity:.45;cursor:default}",
      ".door{font-size:11px;text-align:center;color:#8a8a96;padding:0 0 8px;background:#fff}.door a{color:inherit}",
      "@media (max-width:520px){.wrap{bottom:14px;" + kant + ":14px}.paneel{position:fixed;inset:0;width:100%;height:100%;max-height:none;border-radius:0;border:0}}",
      "@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}",
    ].join("");
  }

  var ICOON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICOON_X = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICOON_STUUR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>';

  function bouw() {
    var links = config.positie === "links";
    host = el("div", { id: "qore-widget" });
    wortel = host.attachShadow({ mode: "open" });
    wortel.appendChild(el("style", { text: css(config.kleur, tekstKleur(config.kleur), links) }));

    var logo = el("span", { class: "logo" });
    if (config.logo) logo.appendChild(el("img", { src: config.logo, alt: "" }));
    else logo.textContent = (config.naam || "Q").charAt(0).toUpperCase();
    var dicht = el("button", { class: "dicht", type: "button", "aria-label": T.sluit });
    dicht.innerHTML = ICOON_X;
    dicht.onclick = function () { zetOpen(false); };

    lijst = el("div", { class: "lijst", role: "log", "aria-live": "polite" });
    invoer = el("input", { type: "text", placeholder: T.typ, "aria-label": T.typ, maxlength: "1000", autocomplete: "off" });
    knop = el("button", { class: "stuur", type: "button", "aria-label": T.stuur });
    knop.innerHTML = ICOON_STUUR;
    knop.onclick = function () { stuur(); };
    invoer.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); stuur(); } });
    invoer.addEventListener("input", function () { knop.disabled = bezig || !invoer.value.trim(); });

    var door = el("div", { class: "door" }, [el("a", { href: "https://qoreaesthetics.com/", target: "_blank", rel: "noopener", text: T.door })]);
    paneel = el("div", { class: "paneel", role: "dialog", "aria-label": config.naam }, [
      el("div", { class: "kop" }, [logo, el("div", null, [el("div", { class: "naam", text: config.naam }), el("div", { class: "status", text: T.status })]), dicht]),
      el("div", { class: "melding", text: config.ai_melding[taal] }),
      lijst,
      el("div", { class: "voet" }, [invoer, knop]),
      door,
    ]);
    paneel.addEventListener("keydown", function (e) { if (e.key === "Escape") zetOpen(false); });

    teaserKnop = el("button", { class: "teaser", type: "button", text: T.teaser });
    teaserKnop.onclick = function () { zetOpen(true); };
    bubbel = el("button", { class: "bubbel", type: "button", "aria-label": T.open });
    bubbel.onclick = function () { zetOpen(!staat.open); };

    wortel.appendChild(el("div", { class: "wrap" }, [paneel, teaserKnop, bubbel]));
    document.body.appendChild(host);

    if (!staat.berichten.length) staat.berichten.push({ rol: "ai", welkom: true, tekst: "", keuzes: true });
    teken();
    zetOpen(staat.open, true);
    // A gentle nudge once per tab, never after the visitor already opened the chat.
    // Not on a phone, where it would cover the clinic's own buttons; on a computer it goes away by itself.
    if (!staat.teaser && !staat.open && !teaserGepland && !window.matchMedia("(max-width:520px)").matches) {
      teaserGepland = true;
      setTimeout(function () {
        if (staat.open) return;
        staat.teaser = true;
        bewaar();
        teaserKnop.style.display = "";
        setTimeout(function () { teaserKnop.style.display = "none"; }, 12000);
      }, 4000);
    }
  }
  var teaserGepland = false;

  // Sites with a language switch (like qoreaesthetics.com) change <html lang> after loading: the widget follows.
  function volgTaal() {
    if (vasteTaal || !window.MutationObserver) return;
    new MutationObserver(function () {
      var nieuw = kiesTaal();
      if (nieuw === taal) return;
      taal = nieuw;
      T = TEKST[taal];
      if (host) { host.remove(); bouw(); }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  function zetOpen(open, stil) {
    staat.open = open;
    if (open) staat.teaser = true;
    bewaar();
    paneel.style.display = open ? "" : "none";
    teaserKnop.style.display = "none";
    bubbel.innerHTML = open ? ICOON_X : ICOON_CHAT;
    bubbel.setAttribute("aria-label", open ? T.sluit : T.open);
    bubbel.setAttribute("aria-expanded", String(open));
    // On a phone the open panel covers the page, so the round button would sit on top of the input.
    bubbel.style.display = open && window.matchMedia("(max-width:520px)").matches ? "none" : "";
    if (open) { lijst.scrollTop = lijst.scrollHeight; if (!stil) setTimeout(function () { invoer.focus(); }, 50); }
    else if (!stil) bubbel.focus();
  }

  function teken() {
    lijst.textContent = "";
    var laatste = staat.berichten.length - 1;
    staat.berichten.forEach(function (m, i) {
      var b = el("div", { class: "b " + m.rol });
      vulTekst(b, m.welkom ? config.welkom[taal] : m.tekst);
      if (m.keuzes && config.keuzes.length) {
        var rij = el("div", { class: "keuzes" });
        config.keuzes.forEach(function (k) {
          var kb = el("button", { class: "keuze" + (m.gekozen === k.code ? " gekozen" : ""), type: "button", text: k.label[taal] || k.label.nl });
          kb.disabled = i !== laatste || bezig;
          kb.onclick = function () { m.gekozen = k.code; stuur(k); };
          rij.appendChild(kb);
        });
        b.appendChild(rij);
      }
      lijst.appendChild(b);
    });
    if (bezig) lijst.appendChild(el("div", { class: "b ai" }, [el("span", { class: "typen", "aria-label": "…" }, [el("i"), el("i"), el("i")])]));
    knop.disabled = bezig || !invoer.value.trim();
    invoer.disabled = bezig;
    lijst.scrollTop = lijst.scrollHeight;
  }

  function stuur(keuze) {
    var tekst = keuze ? (keuze.vraag[taal] || keuze.vraag.nl) : invoer.value.trim();
    if (!tekst || bezig) return;
    var geschiedenis = staat.berichten
      .filter(function (m) { return (m.rol === "ai" && !m.welkom) || m.rol === "ik"; })
      .slice(-10)
      .map(function (m) { return { role: m.rol === "ai" ? "assistant" : "user", content: m.tekst }; });
    staat.berichten.push({ rol: "ik", tekst: keuze ? (keuze.label[taal] || keuze.label.nl) : tekst });
    if (!keuze) invoer.value = "";
    bezig = true;
    bewaar();
    teken();

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kliniek: slug, bericht: tekst, taal: taal, gesprek: staat.gesprek, geschiedenis: geschiedenis,
        keuze: keuze ? keuze.code : null, keuze_actie: keuze ? keuze.actie : null,
      }),
    })
      .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
      .then(function (res) {
        if (res.status === 429) throw new Error("te_veel");
        if (res.status !== 200 || typeof res.data.antwoord !== "string") throw new Error("fout");
        if (res.data.gesprek) staat.gesprek = res.data.gesprek;
        var toonKeuzes = res.data.intent === "UNKNOWN" || (!keuze && isGroet(tekst));
        staat.berichten.push({ rol: "ai", tekst: res.data.antwoord, keuzes: toonKeuzes });
      })
      .catch(function (e) {
        staat.berichten.push({ rol: "fout", tekst: e && e.message === "te_veel" ? T.teVeel : T.fout });
      })
      .then(function () {
        bezig = false;
        bewaar();
        teken();
        if (staat.open) invoer.focus();
      });
  }

  function start() {
    fetch(API + "?kliniek=" + encodeURIComponent(slug))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (c) {
        if (!c || !c.actief) return;
        config = c;
        // The page may have set its language while the settings were loading.
        taal = kiesTaal();
        T = TEKST[taal];
        bouw();
        volgTaal();
      })
      .catch(function () { /* no widget rather than a broken one */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
