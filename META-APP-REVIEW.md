# Meta App Review – Qore AI Receptionist

Voorbereid door Claude op 20/10/2026. Doel: de AI-receptioniste mag DM's beantwoorden van **iedereen** die een kliniek op Instagram een bericht stuurt, en niet alleen van accounts met een rol in de app (zoals nu).

- App: **Qore AI Receptionist**, App ID 1791542565600609
- Instagram-app: Qore AI Receptionist-IG, ID 995831686798984
- Business portfolio: **Beaupalace** (1962742844209380)

---

## 1. Waar we nu staan

| Onderdeel | Stand |
|---|---|
| App gepubliceerd (Live) | ✅ |
| Webhook (callback naar n8n, `messages` en `messaging_postbacks`) | ✅ werkt. Echte DM op 20/10 beantwoord |
| Rechten `instagram_business_basic` en `instagram_business_manage_messages` | Alleen standaardtoegang ("Ready for testing") |
| Privacybeleid met een stuk over gegevens verwijderen | ✅ qoreaesthetics.com/privacy, met de ankers `#verwijderen` en `#delete` (hersteld op 20/10) |
| Privacy-URL in de app | ✅ qoreaesthetics.com/privacy (ingevuld 20/10) |
| URL voor het verwijderen van gegevens | ✅ qoreaesthetics.com/privacy#delete (ingevuld 20/10) |
| URL voor de gebruiksvoorwaarden | ✅ leeggemaakt, want het veld is optioneel |
| App-domein en categorie | ✅ qoreaesthetics.com, Messengerbots voor bedrijven (ingevuld 20/10) |
| Contact-e-mail van de app | ⚠️ staat op een persoonlijk adres |
| App-icoon (1024×1024) | ❌ nog leeg |
| Bedrijfsverificatie van het portfolio | ❌ nog niet gedaan |
| Tech Provider en toegangsverificatie | ❌ nog niet gedaan. Dit is nodig omdat we de accounts van **andere** bedrijven (klinieken) bedienen |
| Aantal API-oproepen per recht | De teller staat op 0, maar we deden op 20/10 echte oproepen. Meta telt die binnen ongeveer 24 uur mee. Meta vraagt minstens 1 geslaagde oproep in de laatste 30 dagen |

---

## 2. Wat we aanvragen (zo klein mogelijk houden)

Vraag **alleen** dit aan:
1. **instagram_business_basic**: Advanced Access
2. **instagram_business_manage_messages**: Advanced Access

Vraag dit **nu niet** aan, zodat de review eenvoudig blijft:
- `instagram_business_manage_comments`, `content_publish` en `insights`: die gebruiken we nog niet.
- **Human Agent** (een medewerker antwoordt tot 7 dagen na het laatste bericht): later, als klinieken buiten de 24-uursregel willen antwoorden.
- Messenger/Facebook (`pages_messaging` en verwante rechten): een aparte review, later.

---

## 3. Wat Leno doet (in deze volgorde)

### Stap A: Bedrijfsverificatie (de grootste stap, 1 tot 5 werkdagen)
1. Ga naar business.facebook.com → **Instellingen** → **Bedrijfsinfo**, en kies het portfolio **Beaupalace**.
2. Hernoem het portfolio naar de echte firma: **Qore LLC**. Gebruik dezelfde naam als op je officiële documenten.
3. Ga naar **Beveiligingscentrum** → **Bedrijfsverificatie starten**. Je hebt nodig:
   - de wettelijke naam **Qore LLC** en het geregistreerde adres in Wyoming, precies zoals op de documenten;
   - een document zoals de **Articles of Organization** of de **IRS EIN-brief (CP 575)**;
   - de website **qoreaesthetics.com**. Claude zet onderaan de site "Qore Aesthetics is een merk van Qore LLC", zodat Meta de link tussen de site en de firma ziet;
   - het bewijs dat qoreaesthetics.com van jou is, via een van deze twee:
     - **domeinverificatie met een meta-tag** (aanbevolen): Meta geeft een code en Claude zet die in de site;
     - **e-mail op het domein**: daarvoor is eerst een adres op qoreaesthetics.com nodig, bv. een gratis doorsturing hello@qoreaesthetics.com bij Namecheap.

### Stap B: Tech Provider worden en toegangsverificatie
1. Ga in de app naar **Dashboard** → "Become a Tech Provider" → **Become a Tech Provider**.
2. Vul de **toegangsverificatie** in. Daarin leg je kort uit dat we een dienst zijn die DM's beantwoordt voor andere bedrijven (klinieken). Gebruik de tekst in sectie 5.

### Stap C: App-instellingen (*App settings → Algemeen*)
Deze velden heeft Claude op 20/10 ingevuld. Alleen het icoon en de contact-e-mail staan nog open:

| Veld | Waarde |
|---|---|
| Contact email | blijft voorlopig je huidige adres. Later een adres op qoreaesthetics.com |
| App domains | qoreaesthetics.com ✅ |
| Privacy policy URL | https://qoreaesthetics.com/privacy ✅ |
| Data deletion instructions URL | https://qoreaesthetics.com/privacy#delete ✅ |
| Terms of Service URL | leeg ✅ |
| Category | Messengerbots voor bedrijven ✅ |
| App icon | het Q-logo van Qore Aesthetics, 1024×1024 PNG. Nog op te laden |

### Stap D: Twee schermopnames (zie sectie 6), elk 1 à 2 minuten

### Stap E: De aanvraag indienen
1. Ga in de app naar **App Review** → **Requests** → **New request**.
2. Kies `instagram_business_basic` en `instagram_business_manage_messages`.
3. Plak per recht de tekst uit sectie 4 en laad de schermopname op.
4. Plak bij de testinstructies de tekst uit sectie 7 en klik op **Submit**.
5. Reken op 2 tot 10 werkdagen. Bij een afwijzing zegt Meta precies wat er ontbreekt. Dan passen we dat aan en dienen we opnieuw in.

---

## 4. Teksten per recht (Engels, zo plakken)

### instagram_business_basic

> **How will your app use this permission?**
> Qore AI Receptionist is an AI receptionist for aesthetic clinics. A clinic connects its Instagram professional account through Instagram Business Login. We use instagram_business_basic to identify the connected account (account ID and username), so that incoming Direct Messages are routed to the right clinic and its own knowledge base (treatments, prices, opening hours, booking link). When a person messages the clinic, we read that person's name and username from the Instagram User Profile API, only to greet them correctly and to show the clinic's staff who they are talking to when a conversation is handed over to a human. We do not read or store media, followers or any other profile data, and we never use the data for advertising.

### instagram_business_manage_messages

> **How will your app use this permission?**
> When someone sends a Direct Message to a connected clinic's Instagram account, our webhook receives the message. Our AI receptionist answers within the 24-hour messaging window, using only that clinic's own approved information (treatments, indicative prices, location, opening hours) and offers the clinic's booking link. The first reply of every conversation clearly says that the person is chatting with an AI assistant and how to reach a human: replying "human" (or "stop") immediately hands the conversation to the clinic's staff, and the AI stops replying in that conversation. When a staff member replies themselves from the Instagram app, the AI also pauses automatically for that conversation. Medical questions and complaints are always handed over to a human. Messages are stored only to keep the conversation context and are deleted on request (see our data deletion instructions). The AI never sends messages first and never sends promotional messages.

---

## 5. Toegangsverificatie / Tech Provider (Engels)

> Qore LLC (brand: Qore Aesthetics) provides an AI receptionist service to aesthetic clinics in Belgium and the Netherlands. Each clinic is a business customer that connects its own Instagram professional account to our app through Instagram Business Login. Our app receives the clinic's incoming Direct Messages via webhooks and replies on the clinic's behalf with the clinic's own information, within Meta's 24-hour messaging window, with an AI disclosure and an immediate hand-off to the clinic's staff on request. We access only the connected clinic's messages and the basic profile of the people who message that clinic. Data is stored in the EU (Supabase, Frankfurt) and deleted on request.

---

## 6. Schermopnames (de draaiboeken)

Neem op met **QuickTime** (Bestand → Nieuwe schermopname) voor het scherm en **iPhone-schermopname** voor de telefoon. Zet de taal van Instagram op **Engels** of voeg Engelse ondertitels toe. Meta-reviewers verwachten Engels. Laat in beeld duidelijk het account en de app-naam zien.

### Opname 1: instagram_business_basic (inloggen en het account koppelen)
1. Toon de Meta-app → *API setup with Instagram login* → **Add account** en log in als de kliniek (gebruik **@qoreaesthetics** als voorbeeldkliniek).
2. Toon het toestemmingsscherm "Qore AI Receptionist-IG wants access to qoreaesthetics" en klik op **Allow**.
3. Toon dat het account nu in de lijst staat, met de webhook op **On**.
4. Vertel of zet in de ondertitels: *"The clinic's account ID and username are used to route its messages to its own knowledge base."*

### Opname 2: instagram_business_manage_messages (de echte werking)
1. Op de telefoon, met een ander Instagram-account (bv. @lenovanmeir): stuur een DM naar @qoreaesthetics, bijvoorbeeld *"How much does the Start package cost?"*.
2. Toon het automatische antwoord, met de **AI-melding** ("You are chatting with the digital assistant (AI)…") en de knoppen.
3. Tik op **📅 Book a call** en toon de agendalink.
4. Typ **"human"** en toon de bevestiging dat een medewerker overneemt. Stuur daarna nog een bericht en toon dat de AI **niet** meer antwoordt.
5. Optioneel: toon de Telegram-melding "Klant wil een medewerker". Zo ziet de reviewer dat een mens verwittigd wordt.

---

## 7. Testinstructies voor de reviewer (Engels)

> Our app has no consumer-facing login; it runs on the Instagram professional account of a connected business. To test:
> 1. From any Instagram account, send a Direct Message to **@qoreaesthetics** (our own business account, connected to the app), for example "What does the Start package cost?".
> 2. You will receive an automated reply within a few seconds. The first reply states that you are chatting with an AI assistant.
> 3. Tap "📅 Book a call" to receive the booking link.
> 4. Type "human" to hand the conversation to a staff member; the AI then stops replying in that conversation.
> The screencasts show how a clinic connects its account through Instagram Business Login and how messages are handled.

---

## 8. Na de goedkeuring

- Andere klinieken kunnen dan hun eigen Instagram koppelen. Dat gebeurt via de knop "Kanaal koppelen" uit fase B (stap 4 van de volgorde).
- **Token vernieuwen:** Instagram-tokens zijn 60 dagen geldig. De automatische vernieuwing staat op de planning.
- **Handtekening controleren:** n8n moet de `X-Hub-Signature-256`-handtekening van Meta nakijken. Daarvoor moet Leno de app secret in een n8n-credential zetten. Dat is een open punt.
