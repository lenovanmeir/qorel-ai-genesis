import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacybeleid – QoreLabs" },
      {
        name: "description",
        content:
          "Privacybeleid van QoreLabs: welke gegevens de AI-receptionist verwerkt, waarvoor, hoelang en hoe je ze laat verwijderen.",
      },
      { property: "og:title", content: "Privacybeleid – QoreLabs" },
      {
        property: "og:description",
        content:
          "Privacybeleid van QoreLabs: welke gegevens de AI-receptionist verwerkt, waarvoor, hoelang en hoe je ze laat verwijderen.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

// Verbatim from privacy.html - do not edit the text, only this wrapper.
const PRIVACY_STYLE = `
  :root { color-scheme: light; --ink:#12151a; --muted:#5b6470; --line:#e4e7ec; --accent:#1f6feb; }
  .privacy-page * { box-sizing: border-box; }
  .privacy-page { margin:0; background:#fbfbfc; color:var(--ink);
         font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif; }
  .privacy-page .wrap { max-width:760px; margin:0 auto; padding:48px 20px 96px; }
  .privacy-page header.brand { font-weight:700; letter-spacing:-.01em; font-size:18px; margin-bottom:32px; }
  .privacy-page nav.lang { display:flex; gap:8px; margin-bottom:32px; }
  .privacy-page nav.lang a { font-size:14px; text-decoration:none; color:var(--muted); border:1px solid var(--line);
               padding:6px 12px; border-radius:999px; background:#fff; }
  .privacy-page nav.lang a:hover { color:var(--accent); border-color:var(--accent); }
  .privacy-page h1 { font-size:30px; line-height:1.25; letter-spacing:-.02em; margin:0 0 8px; }
  .privacy-page h2 { font-size:18px; margin:36px 0 8px; letter-spacing:-.01em; }
  .privacy-page p, .privacy-page li { color:#232830; }
  .privacy-page ul { padding-left:20px; }
  .privacy-page li { margin:4px 0; }
  .privacy-page a { color:var(--accent); }
  .privacy-page section + section { margin-top:64px; padding-top:48px; border-top:1px solid var(--line); }
  .privacy-page footer { margin-top:64px; padding-top:24px; border-top:1px solid var(--line); color:var(--muted); font-size:14px; }
  @media (max-width:520px){ .privacy-page .wrap{padding:32px 16px 64px} .privacy-page h1{font-size:25px} }
`;

// Verbatim from privacy.html (contents of <div class="wrap">...</div>) - do not edit the text.
const PRIVACY_BODY = `
<div class="wrap">
  <header class="brand">QoreLabs</header>
  <nav class="lang"><a href="#nl">Nederlands</a><a href="#en">English</a></nav>
  <section id="nl">
<h1>Privacybeleid QoreLabs</h1>
<p>Laatst bijgewerkt: 11 september 2026</p>
<h2>1. Wie zijn wij?</h2>
<p>QoreLabs (qorelabs.io) bouwt websites, automatisaties en AI-receptionisten voor lokale bedrijven, waaronder esthetische klinieken. Voor vragen over privacy kun je ons bereiken via <strong><a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></strong>.</p>
<h2>2. Wanneer verwerken wij persoonsgegevens?</h2>
<ul>
<li>Wanneer je contact met ons opneemt via onze website, e-mail of sociale media.</li>
<li>Wanneer je een bericht stuurt naar een website-chat of Instagram-account dat gekoppeld is aan onze AI-receptionist.</li>
</ul>
<p>Gebruiken wij de AI-receptionist voor een klant (bijvoorbeeld een kliniek)? Dan is die klant verantwoordelijk voor jouw gegevens en verwerken wij ze uitsluitend in opdracht van en volgens de instructies van die klant.</p>
<h2>3. Welke gegevens?</h2>
<ul>
<li>Naam en contactgegevens (e-mail, telefoonnummer) die je zelf deelt</li>
<li>Je Instagram-gebruikersnaam of -ID en de inhoud van je berichten</li>
<li>Afspraakgegevens (gekozen behandeling, datum, locatie)</li>
<li>Technische gegevens die nodig zijn om de dienst te laten werken (tijdstip, kanaal, logbestanden)</li>
</ul>
<p>Deel geen gevoelige medische informatie via chat of DM, tenzij dat echt nodig is voor je vraag.</p>
<h2>4. Waarvoor gebruiken wij ze?</h2>
<ul>
<li>Je vragen beantwoorden</li>
<li>Afspraken inplannen, wijzigen of annuleren</li>
<li>Je doorverwijzen naar een medewerker wanneer de AI je niet verder kan helpen</li>
<li>De dienst veilig houden en verbeteren</li>
</ul>
<p>Wij verkopen je gegevens nooit en gebruiken ze niet voor advertenties.</p>
<h2>5. Rechtsgrond</h2>
<p>Wij verwerken je gegevens omdat dit nodig is om op jouw verzoek stappen te zetten (zoals een afspraak maken), op basis van ons gerechtvaardigd belang om berichten te beantwoorden en onze dienst te beveiligen, of op basis van jouw toestemming wanneer die gevraagd wordt.</p>
<h2>6. Met wie delen wij gegevens?</h2>
<p>Alleen met dienstverleners die nodig zijn om de dienst te leveren, zoals:</p>
<ul>
<li>Meta (Instagram) – voor het ontvangen en versturen van berichten</li>
<li>n8n – voor het automatiseren van de berichtenstroom</li>
<li>Supabase – databankopslag, gehost in de EU (Frankfurt)</li>
<li>AI-aanbieders (zoals Anthropic en OpenAI) – om berichten te begrijpen en te beantwoorden</li>
<li>Google (Agenda) – voor het inplannen van afspraken</li>
</ul>
<p>Sommige van deze partijen kunnen gegevens buiten de Europese Economische Ruimte verwerken. In dat geval gebeurt dat enkel met passende waarborgen, zoals de standaardcontractbepalingen van de Europese Commissie of het EU-VS Data Privacy Framework.</p>
<h2>7. Hoe lang bewaren wij gegevens?</h2>
<p>Niet langer dan nodig voor de doelen hierboven. Gesprekken worden standaard maximaal 12 maanden bewaard en daarna verwijderd, tenzij een wettelijke verplichting langer bewaren vereist.</p>
<h2>8. Jouw rechten</h2>
<p>Je hebt het recht om je gegevens in te zien, te laten verbeteren of verwijderen, de verwerking te beperken, bezwaar te maken en je gegevens over te dragen. Stuur hiervoor een e-mail naar <strong><a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></strong>. Wij antwoorden binnen 30 dagen.</p>
<p>Ben je niet tevreden? Dan kun je klacht indienen bij de Gegevensbeschermingsautoriteit: <a href="https://www.gegevensbeschermingsautoriteit.be" rel="noopener">www.gegevensbeschermingsautoriteit.be</a>.</p>
<h2>9. Gegevens laten verwijderen (id="verwijderen")</h2>
<p>Wil je dat wij alle gegevens verwijderen die via Instagram of onze chat over jou zijn opgeslagen?</p>
<ul>
<li>Stuur een e-mail naar <strong><a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></strong> met als onderwerp <strong>"Verwijder mijn gegevens"</strong>.</li>
<li>Vermeld je Instagram-gebruikersnaam en/of het e-mailadres of telefoonnummer dat je gebruikte.</li>
<li>Wij verwijderen je gegevens binnen 30 dagen en bevestigen dit per e-mail.</li>
</ul>
<p>Je kunt de toegang van onze app ook intrekken via Instagram: Instellingen → Websitemachtigingen → Apps en websites.</p>
<h2>10. Wijzigingen</h2>
<p>Wij kunnen dit privacybeleid aanpassen. De meest recente versie staat altijd op deze pagina.</p>
  </section>
  <section id="en">
<h1>QoreLabs Privacy Policy</h1>
<p>Last updated: 11 September 2026</p>
<h2>1. Who we are</h2>
<p>QoreLabs (qorelabs.io) builds websites, automations and AI receptionists for local businesses, including aesthetic clinics. For privacy questions, contact us at <strong><a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></strong>.</p>
<h2>2. When do we process personal data?</h2>
<ul>
<li>When you contact us via our website, email or social media.</li>
<li>When you send a message to a website chat or Instagram account connected to our AI receptionist.</li>
</ul>
<p>When we run the AI receptionist for a client (for example a clinic), that client is responsible for your data and we process it only on their behalf and according to their instructions.</p>
<h2>3. What data?</h2>
<ul>
<li>Name and contact details (email, phone number) that you share</li>
<li>Your Instagram username or ID and the content of your messages</li>
<li>Appointment details (treatment, date, location)</li>
<li>Technical data needed to run the service (timestamps, channel, logs)</li>
</ul>
<p>Please do not share sensitive medical information via chat or DM unless it is necessary for your question.</p>
<h2>4. What do we use it for?</h2>
<ul>
<li>Answering your questions</li>
<li>Booking, changing or cancelling appointments</li>
<li>Handing you over to a staff member when the AI cannot help further</li>
<li>Keeping the service secure and improving it</li>
</ul>
<p>We never sell your data and do not use it for advertising.</p>
<h2>5. Legal basis</h2>
<p>We process your data because it is necessary to take steps at your request (such as booking an appointment), based on our legitimate interest in answering messages and securing our service, or based on your consent where requested.</p>
<h2>6. Who do we share data with?</h2>
<p>Only with service providers needed to deliver the service, such as:</p>
<ul>
<li>Meta (Instagram) – receiving and sending messages</li>
<li>n8n – automating the message flow</li>
<li>Supabase – database storage hosted in the EU (Frankfurt)</li>
<li>AI providers (such as Anthropic and OpenAI) – understanding and answering messages</li>
<li>Google (Calendar) – scheduling appointments</li>
</ul>
<p>Some of these providers may process data outside the European Economic Area. Where that happens, it is done only with appropriate safeguards, such as the European Commission's Standard Contractual Clauses or the EU-US Data Privacy Framework.</p>
<h2>7. How long do we keep data?</h2>
<p>No longer than necessary for the purposes above. Conversations are kept for a maximum of 12 months by default and then deleted, unless a legal obligation requires longer retention.</p>
<h2>8. Your rights</h2>
<p>You have the right to access, correct or delete your data, restrict processing, object, and receive your data in a portable format. Email <strong><a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></strong>. We respond within 30 days.</p>
<p>You can also lodge a complaint with the Belgian Data Protection Authority: <a href="https://www.dataprotectionauthority.be" rel="noopener">www.dataprotectionauthority.be</a>.</p>
<h2>9. Data deletion (id="delete")</h2>
<p>Want us to delete all data stored about you via Instagram or our chat?</p>
<ul>
<li>Email <strong><a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></strong> with the subject <strong>"Delete my data"</strong>.</li>
<li>Include your Instagram username and/or the email address or phone number you used.</li>
<li>We delete your data within 30 days and confirm by email.</li>
</ul>
<p>You can also remove our app's access in Instagram: Settings → Website permissions → Apps and websites.</p>
<h2>10. Changes</h2>
<p>We may update this privacy policy. The latest version is always available on this page.</p>
  </section>
  <footer>QoreLabs &middot; <a href="https://qorelabs.io">qorelabs.io</a> &middot; <a href="mailto:hello@qorelabs.io">hello@qorelabs.io</a></footer>
</div>
`;

function PrivacyPage() {
  return (
    <div className="privacy-page">
      <style dangerouslySetInnerHTML={{ __html: PRIVACY_STYLE }} />
      <div dangerouslySetInnerHTML={{ __html: PRIVACY_BODY }} />
    </div>
  );
}
