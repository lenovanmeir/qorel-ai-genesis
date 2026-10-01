import type { Lang } from "@/i18n/translations";

// All copy of the Qore Aesthetics site (qoreaesthetics.com) in NL, FR and EN.
// Dutch speaks to the clinic owner with "je", French with "vous", like the intake.

export type DemoKeuze = { id: "book" | "price" | "loc"; label: string; antwoord: string };
export type Pakket = { tag: string; fit: string; punten: string[] };

type Teksten = {
  locale: string;
  nav: { menu: string; how: string; report: string; packages: string; faq: string; cta: string; lang: string };
  hero: { h1a: string; h1b: string; soft: string; lede: string; ctaPrimary: string; ctaSecondary: string; micro: string[] };
  facts: { label: string; items: { b: string; span: string }[] };
  pain: { eyebrow: string; h2a: string; h2b: string; items: { stamp: string; vraag: string; tekst: string }[] };
  how: {
    eyebrow: string;
    h2a: string;
    h2b: string;
    stepLabel: string;
    steps: { h: string; p: string }[];
    guaranteeTitle: string;
    guaranteeText: string;
  };
  report: {
    eyebrow: string;
    h2a: string;
    h2b: string;
    lede: string;
    head: string;
    sample: string;
    website: string;
    rows: { gesprekken: string; buiten: string; agenda: string; doorgestuurd: string };
    unansTitle: string;
    unansItems: string[];
    unansText: string;
    foot: string;
  };
  packages: {
    eyebrow: string;
    h2a: string;
    h2b: string;
    duration: string;
    monthly: string;
    yearly: string;
    saveMonthly: string;
    saveYearly: string;
    perMonth: string;
    setup: string;
    cta: string;
    plans: Pakket[];
    fairTitle: string;
    fairText: string;
  };
  founding: {
    eyebrow: string;
    h2a: string;
    h2b: string;
    lede: string;
    bonus: { l: string; r: string }[];
    seats: string;
    giveTitle: string;
    give: string[];
  };
  faq: { eyebrow: string; h2: string; items: { v: string; a: string }[] };
  final: { eyebrow: string; h2a: string; h2b: string; lede: string };
  form: {
    kliniek: string;
    site: string;
    sitePlaceholder: string;
    contact: string;
    submit: string;
    busy: string;
    done: (kliniek: string) => string;
    errorA: string;
    errorLink: string;
    errorB: string;
    note: string;
    mailSubject: string;
    mailBody: (v: { kliniek: string; site: string; contact: string }) => string;
  };
  demo: {
    aria: string;
    clinic: string;
    sub: string;
    today: string;
    msgIn: string;
    msgOut: string;
    chipsLabel: string;
    keuzes: DemoKeuze[];
    note: string;
  };
  footer: { copy: string; nav: string; privacy: string };
};

const nl: Teksten = {
  locale: "nl-BE",
  nav: {
    menu: "Hoofdmenu",
    how: "Hoe het werkt",
    report: "Rapport",
    packages: "Pakketten",
    faq: "Vragen",
    cta: "Gratis demo",
    lang: "Taal",
  },
  hero: {
    h1a: "Je kliniek is gesloten.",
    h1b: "Je patiënten niet.",
    soft: "Elke vraag binnen een minuut beantwoord, dag en nacht, en omgezet in een ingepland consult.",
    lede: "Een AI-receptioniste die antwoordt op Instagram, WhatsApp, Facebook en je website, met jouw prijzen, jouw behandelingen en in jouw toon. In het Nederlands, Frans en Engels.",
    ctaPrimary: "Vraag je gratis demo aan →",
    ctaSecondary: "Probeer de demo",
    micro: ["Gebouwd met jouw eigen info", "Geen betaalgegevens nodig", "Live binnen 10 werkdagen, of je opstart terug"],
  },
  facts: {
    label: "Kerngegevens",
    items: [
      { b: "< 1 min", span: "antwoord, ook om 21:47" },
      { b: "4 kanalen", span: "Instagram, WhatsApp, Facebook, website" },
      { b: "NL · FR · EN", span: "standaard inbegrepen" },
      { b: "Zelf aanpassen", span: "nieuwe prijs? Opslaan en klaar" },
    ],
  },
  pain: {
    eyebrow: "Herken je dit?",
    h2a: "Je beste klanten stellen hun vraag",
    h2b: "als jij niet kan antwoorden.",
    items: [
      { stamp: "23:14", vraag: "Hoeveel kost Botox bij jullie?", tekst: "Je leest het de volgende ochtend. Zij hebben al elders geboekt." },
      { stamp: "10:30", vraag: "Kan ik deze week nog langskomen?", tekst: "Je telefoon trilt, maar je staat midden in een behandeling." },
      { stamp: "Elke dag", vraag: "Waar zijn jullie? Is er parking?", tekst: "Twintig keer dezelfde vraag, twintig keer typen." },
      { stamp: "Zondag", vraag: "Bonjour, vous parlez français ?", tekst: "Wie geen antwoord krijgt in zijn taal, komt niet terug." },
      { stamp: "19:05", vraag: "Hi! Do you do lip filler? I'm in town for a week.", tekst: "Expats en toeristen boeken waar ze meteen in het Engels geholpen worden." },
      { stamp: "01:20", vraag: "Is deze zwelling normaal na mijn filler?", tekst: "Een medische vraag hoort bij jou. De receptioniste stuurt ze meteen door, in plaats van te gokken." },
    ],
  },
  how: {
    eyebrow: "Hoe het werkt",
    h2a: "Eerst zien.",
    h2b: "Dan pas beslissen.",
    stepLabel: "Stap",
    steps: [
      { h: "Gratis demo", p: "Wij lezen je website in en bouwen een demo met jóuw behandelingen en prijzen. Jij krijgt een link en test zelf." },
      { h: "Jij keurt goed", p: "Je vult je intake aan, test met je team en we passen aan tot alles klopt. Pas na jouw goedkeuring gaan we live." },
      { h: "Live", p: "Op je Instagram, WhatsApp, Facebook en website. Vanaf dan antwoordt je receptioniste dag en nacht." },
    ],
    guaranteeTitle: "Binnen 10 werkdagen live, of je opstart terug.",
    guaranteeText:
      "De termijn start zodra je volledige intake, je betaling en de toegang tot je kanalen binnen zijn. WhatsApp valt erbuiten, omdat Meta dat eerst moet verifiëren. En de eerste 30 dagen na de livegang passen we kosteloos aan tot alles klopt.",
  },
  report: {
    eyebrow: "Maandrapport",
    h2a: "Elke maand zwart op wit",
    h2b: "wat het oplevert.",
    lede: "Per kanaal apart: hoeveel vragen er binnenkwamen, hoeveel daarvan buiten je openingsuren, hoeveel mensen doorklikten om een consult te plannen, en welke vragen je receptioniste nog niet kon beantwoorden.",
    head: "Demokliniek · september",
    sample: "VOORBEELD · fictieve cijfers",
    website: "Website",
    rows: { gesprekken: "Gesprekken", buiten: "Buiten openingsuren", agenda: "Doorgeklikt naar agenda", doorgestuurd: "Doorgestuurd naar jou" },
    unansTitle: "Niet kunnen beantwoorden: 5 vragen",
    unansItems: ["Werken jullie ook met Profhilo?", "Mag ik na een filler sporten?", "Hebben jullie cadeaubonnen?"],
    unansText: "Vul deze antwoorden aan in je formulier, en volgende maand weet je receptioniste het wel.",
    foot: "Bezoekersaantallen van je website kunnen erbij, als je ons toegang geeft tot je websitestatistieken.",
  },
  packages: {
    eyebrow: "Pakketten",
    h2a: "Kies op basis van",
    h2b: "je kliniek.",
    duration: "Contractduur",
    monthly: "Maand-tot-maand",
    yearly: "Jaarcontract",
    saveMonthly: "Bespaar 17% met een jaarcontract",
    saveYearly: "Je bespaart 17% · 12 maanden, maandelijks betaald",
    perMonth: "/ maand",
    setup: "Eenmalige opstart",
    cta: "Start met een gratis demo",
    plans: [
      { tag: "Om te starten", fit: "Voor een praktijk met één behandelaar.", punten: ["1 kanaal naar keuze: Instagram óf website", "Nederlands, Frans en Engels", "Maandrapport", "Zelf je info aanpassen"] },
      { tag: "Meest gekozen", fit: "Voor een kliniek met een team.", punten: ["Instagram, Facebook en website", "Nederlands, Frans en Engels", "Maandrapport per kanaal", "Zelf je info aanpassen"] },
      { tag: "Alles inbegrepen", fit: "Voor meerdere vestigingen of veel vragen.", punten: ["Alles van Groei + WhatsApp", "Voorrang: wijzigingen dezelfde dag", "Maandrapport + kwartaalgesprek", "Een 4e taal inbegrepen"] },
    ],
    fairTitle: "Nooit een verrassing.",
    fairText:
      "Elk pakket is ruim genoeg voor een kliniek van die grootte. Groeit je kliniek erboven uit, dan verwittigen we je eerst en bekijken we samen de volgende stap. Je receptioniste valt nooit stil. Extra taal (bv. Duits of Turks) bij Start en Groei: eenmalig €250, inclusief vertaling en controle van al je info.",
  },
  founding: {
    eyebrow: "Founding clinics",
    h2a: "De eerste drie klinieken",
    h2b: "krijgen meer.",
    lede: "Je betaalt de gewone prijs, maar krijgt dit er gratis bij:",
    bonus: [
      { l: "Een 4e taal", r: "€250" },
      { l: "Instagram-startknoppen en keuzemenu op maat", r: "inbegrepen" },
      { l: "90 dagen wekelijks bijsturen", r: "inbegrepen" },
      { l: "Je maandprijs voor altijd vast, ook als prijzen stijgen", r: "levenslang" },
    ],
    seats: "Nog 3 van 3 plaatsen",
    giveTitle: "Wat we van jou vragen",
    give: ["Eerlijke feedback tijdens de eerste 90 dagen", "Toestemming om je resultaten als case te tonen", "Een korte review als je tevreden bent"],
  },
  faq: {
    eyebrow: "Vragen",
    h2: "Wat klinieken ons vragen.",
    items: [
      { v: "Wat als de receptioniste het antwoord niet weet?", a: "Dan zegt ze dat eerlijk en stuurt ze de vraag door naar jou. Ze verzint niets." },
      { v: "Geeft ze medisch advies?", a: "Nee. Medische vragen gaan altijd naar jou of je team." },
      { v: "Klinkt het niet als een robot?", a: "Nee. Je receptioniste schrijft in jouw toon, met jouw aanspreekvorm en jouw woorden. Je leest en test alles voor we live gaan." },
      { v: "Hoeveel werk is het voor mij?", a: "Weinig. Wij lezen je website in en zetten alles klaar. Jij vult aan wat ontbreekt en test. Daarna pas je zelf aan wanneer je wil." },
      { v: "Werkt het met mijn agenda?", a: "Ja. Je receptioniste stuurt klanten via een link naar de online agenda die je al gebruikt." },
      { v: "Wat als we meer vragen krijgen dan ons pakket?", a: "Dan verwittigen we je eerst. Je receptioniste blijft gewoon antwoorden, en samen kijken we of een groter pakket beter past." },
      { v: "Hoe betaal ik?", a: "De opstart per factuur, via overschrijving of een betaal-QR. We starten zodra je betaling binnen is. Het maandbedrag loopt daarna automatisch via kaart." },
      { v: "Kan ik opzeggen?", a: "Maand-tot-maand: elke maand. Jaarcontract: het loopt tot het einde van de 12 maanden." },
    ],
  },
  final: {
    eyebrow: "Gratis demo",
    h2a: "Zie jouw receptioniste",
    h2b: "vóór je iets betaalt.",
    lede: "Laat je website of Instagram achter. Wij bouwen een demo met jouw eigen info en sturen je de link.",
  },
  form: {
    kliniek: "Naam van je kliniek",
    site: "Website of Instagram",
    sitePlaceholder: "jouwkliniek.be of @jouwkliniek",
    contact: "E-mail of WhatsApp-nummer",
    submit: "Bouw mijn gratis demo →",
    busy: "Even geduld…",
    done: (k) => `Bedankt! We bouwen je demo met de info van ${k || "je kliniek"} en sturen je binnen 48 uur de link.`,
    errorA: "Dat lukte niet. Stuur je gegevens gerust",
    errorLink: "per e-mail",
    errorB: ", dan bouwen we je demo zo.",
    note: "Binnen 48 uur je demo. Geen betaalgegevens. Je spreekt altijd met Leno, de oprichter.",
    mailSubject: "Gratis demo",
    mailBody: (v) => `Graag een gratis demo.\n\nKliniek: ${v.kliniek}\nWebsite of Instagram: ${v.site}\nContact: ${v.contact}`,
  },
  demo: {
    aria: "Demo van een Instagram-gesprek",
    clinic: "Demokliniek",
    sub: "Instagram · antwoordt meteen",
    today: "Vandaag 21:47",
    msgIn: "Hoi! Wat kost een lipfiller bij jullie? En kan ik nog deze week?",
    msgOut: "Hoi! 👋 Een lipfiller (1 ml) kost bij ons €320. Deze week zijn er nog momenten vrij. Waarmee kan ik je helpen?",
    chipsLabel: "Keuzeknoppen",
    keuzes: [
      { id: "book", label: "📅 Gratis intake", antwoord: "Top! Via deze link kies je zelf een moment voor je gratis intake. Tot snel! ✨" },
      { id: "price", label: "💰 Prijzen", antwoord: "Botox vanaf €190, lipfiller vanaf €320. Voor een persoonlijk plan kan je een gratis intake plannen." },
      { id: "loc", label: "📍 Locatie", antwoord: "We zitten in het centrum, met parking om de hoek. Zal ik je de route sturen?" },
    ],
    note: "Demo · fictieve kliniek en voorbeeldprijzen · klik op een knop",
  },
  footer: { copy: "© 2026 Qore Aesthetics · een merk van QoreLabs (Qore LLC)", nav: "Voettekst", privacy: "Privacy" },
};

const fr: Teksten = {
  locale: "fr-BE",
  nav: {
    menu: "Menu principal",
    how: "Fonctionnement",
    report: "Rapport",
    packages: "Formules",
    faq: "Questions",
    cta: "Démo gratuite",
    lang: "Langue",
  },
  hero: {
    h1a: "Votre clinique est fermée.",
    h1b: "Vos patients, non.",
    soft: "Chaque question reçoit une réponse en moins d'une minute, jour et nuit, et devient une consultation planifiée.",
    lede: "Une réceptionniste IA qui répond sur Instagram, WhatsApp, Facebook et votre site, avec vos prix, vos soins et dans votre ton. En néerlandais, en français et en anglais.",
    ctaPrimary: "Demandez votre démo gratuite →",
    ctaSecondary: "Essayer la démo",
    micro: ["Construite avec vos propres infos", "Aucune donnée de paiement", "En ligne en 10 jours ouvrables, ou mise en place remboursée"],
  },
  facts: {
    label: "En bref",
    items: [
      { b: "< 1 min", span: "pour répondre, même à 21h47" },
      { b: "4 canaux", span: "Instagram, WhatsApp, Facebook, site web" },
      { b: "NL · FR · EN", span: "inclus par défaut" },
      { b: "Modifiable", span: "nouveau prix ? Enregistrez, c'est fait" },
    ],
  },
  pain: {
    eyebrow: "Cela vous parle ?",
    h2a: "Vos meilleurs patients posent leur question",
    h2b: "quand vous ne pouvez pas répondre.",
    items: [
      { stamp: "23:14", vraag: "Combien coûte le Botox chez vous ?", tekst: "Vous le lisez le lendemain matin. Entre-temps, ils ont réservé ailleurs." },
      { stamp: "10:30", vraag: "Je peux encore passer cette semaine ?", tekst: "Votre téléphone vibre, mais vous êtes en plein soin." },
      { stamp: "Chaque jour", vraag: "Où êtes-vous ? Il y a un parking ?", tekst: "Vingt fois la même question, vingt fois la même réponse à taper." },
      { stamp: "Dimanche", vraag: "Hallo, spreken jullie Nederlands?", tekst: "Qui n'obtient pas de réponse dans sa langue ne revient pas." },
      { stamp: "19:05", vraag: "Hi! Do you do lip filler? I'm in town for a week.", tekst: "Expatriés et touristes réservent là où on les aide tout de suite en anglais." },
      { stamp: "01:20", vraag: "Ce gonflement est normal après mon filler ?", tekst: "Une question médicale vous revient. La réceptionniste vous la transmet aussitôt, au lieu de deviner." },
    ],
  },
  how: {
    eyebrow: "Fonctionnement",
    h2a: "D'abord voir.",
    h2b: "Ensuite décider.",
    stepLabel: "Étape",
    steps: [
      { h: "Démo gratuite", p: "Nous analysons votre site et construisons une démo avec vos soins et vos prix. Vous recevez un lien et testez vous-même." },
      { h: "Vous validez", p: "Vous complétez votre questionnaire, testez avec votre équipe et nous ajustons jusqu'à ce que tout soit juste. Nous passons en ligne seulement après votre accord." },
      { h: "En ligne", p: "Sur votre Instagram, WhatsApp, Facebook et votre site. Dès ce moment, votre réceptionniste répond jour et nuit." },
    ],
    guaranteeTitle: "En ligne en 10 jours ouvrables, ou la mise en place vous est remboursée.",
    guaranteeText:
      "Le délai démarre dès réception de votre questionnaire complet, de votre paiement et de l'accès à vos canaux. WhatsApp n'est pas compris, car Meta doit d'abord le vérifier. Et pendant les 30 premiers jours après la mise en ligne, nous ajustons gratuitement jusqu'à ce que tout soit juste.",
  },
  report: {
    eyebrow: "Rapport mensuel",
    h2a: "Chaque mois, noir sur blanc,",
    h2b: "ce que cela vous rapporte.",
    lede: "Par canal : combien de questions sont arrivées, combien en dehors de vos heures d'ouverture, combien de personnes ont cliqué pour planifier une consultation, et quelles questions votre réceptionniste n'a pas encore pu traiter.",
    head: "Clinique démo · septembre",
    sample: "EXEMPLE · chiffres fictifs",
    website: "Site web",
    rows: { gesprekken: "Conversations", buiten: "Hors heures d'ouverture", agenda: "Clics vers l'agenda", doorgestuurd: "Transmises à vous" },
    unansTitle: "Questions sans réponse : 5",
    unansItems: ["Vous travaillez aussi avec Profhilo ?", "Je peux faire du sport après un filler ?", "Vous avez des bons cadeaux ?"],
    unansText: "Ajoutez ces réponses dans votre formulaire, et le mois prochain votre réceptionniste les connaîtra.",
    foot: "Le nombre de visiteurs de votre site peut s'y ajouter, si vous nous donnez accès à vos statistiques.",
  },
  packages: {
    eyebrow: "Formules",
    h2a: "Choisissez selon",
    h2b: "votre clinique.",
    duration: "Durée du contrat",
    monthly: "Sans engagement",
    yearly: "Contrat annuel",
    saveMonthly: "Économisez 17 % avec un contrat annuel",
    saveYearly: "Vous économisez 17 % · 12 mois, payés mensuellement",
    perMonth: "/ mois",
    setup: "Mise en place unique",
    cta: "Commencer par une démo gratuite",
    plans: [
      { tag: "Pour démarrer", fit: "Pour un cabinet avec un seul praticien.", punten: ["1 canal au choix : Instagram ou site web", "Néerlandais, français et anglais", "Rapport mensuel", "Vous modifiez vos infos vous-même"] },
      { tag: "Le plus choisi", fit: "Pour une clinique avec une équipe.", punten: ["Instagram, Facebook et site web", "Néerlandais, français et anglais", "Rapport mensuel par canal", "Vous modifiez vos infos vous-même"] },
      { tag: "Tout compris", fit: "Pour plusieurs sites ou beaucoup de questions.", punten: ["Tout Groei + WhatsApp", "Priorité : modifications le jour même", "Rapport mensuel + entretien trimestriel", "Une 4e langue incluse"] },
    ],
    fairTitle: "Jamais de surprise.",
    fairText:
      "Chaque formule est largement suffisante pour une clinique de cette taille. Si votre clinique la dépasse, nous vous prévenons d'abord et voyons ensemble la suite. Votre réceptionniste ne s'arrête jamais. Langue supplémentaire (p. ex. allemand ou turc) avec Start et Groei : 250 € une fois, traduction et vérification de toutes vos infos comprises.",
  },
  founding: {
    eyebrow: "Cliniques fondatrices",
    h2a: "Les trois premières cliniques",
    h2b: "reçoivent plus.",
    lede: "Vous payez le prix normal, mais recevez en plus, gratuitement :",
    bonus: [
      { l: "Une 4e langue", r: "250 €" },
      { l: "Boutons de démarrage Instagram et menu de choix sur mesure", r: "inclus" },
      { l: "90 jours d'ajustements hebdomadaires", r: "inclus" },
      { l: "Votre prix mensuel bloqué pour toujours, même si les prix augmentent", r: "à vie" },
    ],
    seats: "Encore 3 places sur 3",
    giveTitle: "Ce que nous vous demandons",
    give: ["Un retour honnête pendant les 90 premiers jours", "L'autorisation de présenter vos résultats comme étude de cas", "Un court avis si vous êtes satisfait"],
  },
  faq: {
    eyebrow: "Questions",
    h2: "Ce que les cliniques nous demandent.",
    items: [
      { v: "Et si la réceptionniste ne connaît pas la réponse ?", a: "Elle le dit honnêtement et vous transmet la question. Elle n'invente rien." },
      { v: "Donne-t-elle des conseils médicaux ?", a: "Non. Les questions médicales vous sont toujours transmises, à vous ou à votre équipe." },
      { v: "Est-ce que cela sonne comme un robot ?", a: "Non. Votre réceptionniste écrit dans votre ton, avec votre manière de vous adresser aux patients et vos mots. Vous lisez et testez tout avant la mise en ligne." },
      { v: "Combien de travail pour moi ?", a: "Peu. Nous analysons votre site et préparons tout. Vous complétez ce qui manque et testez. Ensuite, vous modifiez vous-même quand vous voulez." },
      { v: "Est-ce que cela fonctionne avec mon agenda ?", a: "Oui. Votre réceptionniste envoie les patients vers l'agenda en ligne que vous utilisez déjà, via un lien." },
      { v: "Et si nous recevons plus de questions que notre formule ?", a: "Nous vous prévenons d'abord. Votre réceptionniste continue de répondre, et nous voyons ensemble si une formule plus grande convient mieux." },
      { v: "Comment je paie ?", a: "La mise en place sur facture, par virement ou QR de paiement. Nous commençons dès réception de votre paiement. Le montant mensuel est ensuite prélevé automatiquement par carte." },
      { v: "Puis-je résilier ?", a: "Sans engagement : chaque mois. Contrat annuel : il court jusqu'à la fin des 12 mois." },
    ],
  },
  final: {
    eyebrow: "Démo gratuite",
    h2a: "Voyez votre réceptionniste",
    h2b: "avant de payer quoi que ce soit.",
    lede: "Laissez-nous votre site ou votre Instagram. Nous construisons une démo avec vos propres infos et vous envoyons le lien.",
  },
  form: {
    kliniek: "Nom de votre clinique",
    site: "Site web ou Instagram",
    sitePlaceholder: "votreclinique.be ou @votreclinique",
    contact: "E-mail ou numéro WhatsApp",
    submit: "Construire ma démo gratuite →",
    busy: "Un instant…",
    done: (k) => `Merci ! Nous construisons votre démo avec les infos de ${k || "votre clinique"} et vous envoyons le lien sous 48 heures.`,
    errorA: "Cela n'a pas fonctionné. Envoyez-nous vos coordonnées",
    errorLink: "par e-mail",
    errorB: ", et nous construisons votre démo.",
    note: "Votre démo sous 48 heures. Aucune donnée de paiement. Vous parlez toujours avec Leno, le fondateur.",
    mailSubject: "Démo gratuite",
    mailBody: (v) => `Je souhaite une démo gratuite.\n\nClinique : ${v.kliniek}\nSite web ou Instagram : ${v.site}\nContact : ${v.contact}`,
  },
  demo: {
    aria: "Démo d'une conversation Instagram",
    clinic: "Clinique démo",
    sub: "Instagram · répond tout de suite",
    today: "Aujourd'hui 21:47",
    msgIn: "Bonjour ! Combien coûte un filler des lèvres chez vous ? Et c'est possible cette semaine ?",
    msgOut: "Bonjour ! 👋 Un filler des lèvres (1 ml) coûte 320 € chez nous. Il reste des créneaux cette semaine. Comment puis-je vous aider ?",
    chipsLabel: "Boutons de choix",
    keuzes: [
      { id: "book", label: "📅 Consultation gratuite", antwoord: "Parfait ! Via ce lien, vous choisissez vous-même un moment pour votre consultation gratuite. À bientôt ! ✨" },
      { id: "price", label: "💰 Prix", antwoord: "Botox à partir de 190 €, filler des lèvres à partir de 320 €. Pour un plan personnalisé, vous pouvez réserver une consultation gratuite." },
      { id: "loc", label: "📍 Adresse", antwoord: "Nous sommes au centre-ville, avec un parking juste à côté. Je vous envoie l'itinéraire ?" },
    ],
    note: "Démo · clinique fictive et prix d'exemple · cliquez sur un bouton",
  },
  footer: { copy: "© 2026 Qore Aesthetics · une marque de QoreLabs (Qore LLC)", nav: "Pied de page", privacy: "Confidentialité" },
};

const en: Teksten = {
  locale: "en-IE",
  nav: {
    menu: "Main menu",
    how: "How it works",
    report: "Report",
    packages: "Packages",
    faq: "Questions",
    cta: "Free demo",
    lang: "Language",
  },
  hero: {
    h1a: "Your clinic is closed.",
    h1b: "Your patients aren't.",
    soft: "Every question answered within a minute, day and night, and turned into a booked consultation.",
    lede: "An AI receptionist that answers on Instagram, WhatsApp, Facebook and your website, with your prices, your treatments and in your tone. In Dutch, French and English.",
    ctaPrimary: "Get your free demo →",
    ctaSecondary: "Try the demo",
    micro: ["Built with your own info", "No payment details needed", "Live within 10 working days, or your setup fee back"],
  },
  facts: {
    label: "Key facts",
    items: [
      { b: "< 1 min", span: "to answer, even at 21:47" },
      { b: "4 channels", span: "Instagram, WhatsApp, Facebook, website" },
      { b: "NL · FR · EN", span: "included as standard" },
      { b: "Edit it yourself", span: "new price? Save and done" },
    ],
  },
  pain: {
    eyebrow: "Sound familiar?",
    h2a: "Your best patients ask their question",
    h2b: "when you can't answer.",
    items: [
      { stamp: "23:14", vraag: "How much is Botox with you?", tekst: "You read it the next morning. They've already booked somewhere else." },
      { stamp: "10:30", vraag: "Can I still come in this week?", tekst: "Your phone buzzes, but you're in the middle of a treatment." },
      { stamp: "Every day", vraag: "Where are you? Is there parking?", tekst: "The same question twenty times, typed out twenty times." },
      { stamp: "Sunday", vraag: "Bonjour, vous parlez français ?", tekst: "If they don't get an answer in their own language, they don't come back." },
      { stamp: "19:05", vraag: "Hallo! Doen jullie lipfillers? Ik ben hier een week.", tekst: "Patients book where they're helped right away, in their own language." },
      { stamp: "01:20", vraag: "Is this swelling normal after my filler?", tekst: "A medical question belongs with you. The receptionist passes it on straight away instead of guessing." },
    ],
  },
  how: {
    eyebrow: "How it works",
    h2a: "See it first.",
    h2b: "Then decide.",
    stepLabel: "Step",
    steps: [
      { h: "Free demo", p: "We read your website and build a demo with your treatments and prices. You get a link and test it yourself." },
      { h: "You approve", p: "You complete your intake, test with your team and we adjust until everything is right. We only go live once you approve." },
      { h: "Live", p: "On your Instagram, WhatsApp, Facebook and website. From then on, your receptionist answers day and night." },
    ],
    guaranteeTitle: "Live within 10 working days, or your setup fee back.",
    guaranteeText:
      "The clock starts once we have your complete intake, your payment and access to your channels. WhatsApp is excluded, because Meta has to verify it first. And for the first 30 days after going live, we adjust free of charge until everything is right.",
  },
  report: {
    eyebrow: "Monthly report",
    h2a: "Every month, in black and white:",
    h2b: "what it brings in.",
    lede: "Per channel: how many questions came in, how many outside your opening hours, how many people clicked through to book a consultation, and which questions your receptionist couldn't answer yet.",
    head: "Demo clinic · September",
    sample: "EXAMPLE · fictional figures",
    website: "Website",
    rows: { gesprekken: "Conversations", buiten: "Outside opening hours", agenda: "Clicked through to booking", doorgestuurd: "Passed on to you" },
    unansTitle: "Couldn't answer: 5 questions",
    unansItems: ["Do you also work with Profhilo?", "Can I exercise after a filler?", "Do you have gift vouchers?"],
    unansText: "Add these answers to your form, and next month your receptionist will know them.",
    foot: "Website visitor numbers can be added if you give us access to your website analytics.",
  },
  packages: {
    eyebrow: "Packages",
    h2a: "Choose based on",
    h2b: "your clinic.",
    duration: "Contract length",
    monthly: "Month-to-month",
    yearly: "Annual contract",
    saveMonthly: "Save 17% with an annual contract",
    saveYearly: "You save 17% · 12 months, paid monthly",
    perMonth: "/ month",
    setup: "One-time setup",
    cta: "Start with a free demo",
    plans: [
      { tag: "To get started", fit: "For a practice with one practitioner.", punten: ["1 channel of your choice: Instagram or website", "Dutch, French and English", "Monthly report", "Edit your info yourself"] },
      { tag: "Most chosen", fit: "For a clinic with a team.", punten: ["Instagram, Facebook and website", "Dutch, French and English", "Monthly report per channel", "Edit your info yourself"] },
      { tag: "All included", fit: "For several locations or a lot of questions.", punten: ["Everything in Groei + WhatsApp", "Priority: changes the same day", "Monthly report + quarterly call", "A 4th language included"] },
    ],
    fairTitle: "Never a surprise.",
    fairText:
      "Every package has plenty of room for a clinic of that size. If your clinic outgrows it, we let you know first and look at the next step together. Your receptionist never goes quiet. Extra language (e.g. German or Turkish) with Start and Groei: €250 one-time, including translation and a check of all your info.",
  },
  founding: {
    eyebrow: "Founding clinics",
    h2a: "The first three clinics",
    h2b: "get more.",
    lede: "You pay the regular price, but get this on top, free:",
    bonus: [
      { l: "A 4th language", r: "€250" },
      { l: "Custom Instagram start buttons and choice menu", r: "included" },
      { l: "90 days of weekly fine-tuning", r: "included" },
      { l: "Your monthly price locked forever, even if prices go up", r: "for life" },
    ],
    seats: "3 of 3 spots left",
    giveTitle: "What we ask of you",
    give: ["Honest feedback during the first 90 days", "Permission to show your results as a case study", "A short review if you're happy"],
  },
  faq: {
    eyebrow: "Questions",
    h2: "What clinics ask us.",
    items: [
      { v: "What if the receptionist doesn't know the answer?", a: "She says so honestly and passes the question on to you. She never makes anything up." },
      { v: "Does she give medical advice?", a: "No. Medical questions always go to you or your team." },
      { v: "Doesn't it sound like a robot?", a: "No. Your receptionist writes in your tone, with your way of addressing patients and your words. You read and test everything before we go live." },
      { v: "How much work is it for me?", a: "Very little. We read your website and set everything up. You fill in what's missing and test. After that, you edit it yourself whenever you like." },
      { v: "Does it work with my booking system?", a: "Yes. Your receptionist sends patients to the online booking system you already use, via a link." },
      { v: "What if we get more questions than our package covers?", a: "We let you know first. Your receptionist keeps answering, and together we look at whether a bigger package fits better." },
      { v: "How do I pay?", a: "The setup by invoice, via bank transfer or a payment QR code. We start once your payment is in. The monthly amount is then charged automatically by card." },
      { v: "Can I cancel?", a: "Month-to-month: every month. Annual contract: it runs until the end of the 12 months." },
    ],
  },
  final: {
    eyebrow: "Free demo",
    h2a: "See your receptionist",
    h2b: "before you pay anything.",
    lede: "Leave your website or Instagram. We build a demo with your own info and send you the link.",
  },
  form: {
    kliniek: "Your clinic's name",
    site: "Website or Instagram",
    sitePlaceholder: "yourclinic.com or @yourclinic",
    contact: "Email or WhatsApp number",
    submit: "Build my free demo →",
    busy: "One moment…",
    done: (k) => `Thank you! We're building your demo with ${k || "your clinic"}'s info and will send you the link within 48 hours.`,
    errorA: "That didn't work. Feel free to send your details",
    errorLink: "by email",
    errorB: " and we'll build your demo.",
    note: "Your demo within 48 hours. No payment details. You always speak with Leno, the founder.",
    mailSubject: "Free demo",
    mailBody: (v) => `I'd like a free demo.\n\nClinic: ${v.kliniek}\nWebsite or Instagram: ${v.site}\nContact: ${v.contact}`,
  },
  demo: {
    aria: "Demo of an Instagram conversation",
    clinic: "Demo clinic",
    sub: "Instagram · replies instantly",
    today: "Today 21:47",
    msgIn: "Hi! How much is a lip filler with you? And is this week still possible?",
    msgOut: "Hi! 👋 A lip filler (1 ml) is €320 with us. There are still slots this week. How can I help you?",
    chipsLabel: "Choice buttons",
    keuzes: [
      { id: "book", label: "📅 Free consultation", antwoord: "Great! Use this link to pick a time for your free consultation yourself. See you soon! ✨" },
      { id: "price", label: "💰 Prices", antwoord: "Botox from €190, lip filler from €320. For a personal plan, you can book a free consultation." },
      { id: "loc", label: "📍 Location", antwoord: "We're in the city centre, with parking around the corner. Shall I send you directions?" },
    ],
    note: "Demo · fictional clinic and example prices · tap a button",
  },
  footer: { copy: "© 2026 Qore Aesthetics · a brand of QoreLabs (Qore LLC)", nav: "Footer", privacy: "Privacy" },
};

export const AESTHETICS_TEKSTEN: Record<Lang, Teksten> = { nl, fr, en };
