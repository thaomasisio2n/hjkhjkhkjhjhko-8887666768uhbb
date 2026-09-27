import type { IconName } from "../lib/icons";
import type { Locale } from "./index";

// Help Center articles. Kept out of the flat UI dictionaries because they're
// long-form, but mirrored per language the same way.

export interface HelpArticle {
  id: string;
  q: string;
  a: string;
}

export interface HelpCollection {
  id: string;
  icon: IconName;
  title: string;
  articles: HelpArticle[];
}

const en: HelpCollection[] = [
  {
    id: "start",
    icon: "sparkle",
    title: "Getting started",
    articles: [
      {
        id: "what",
        q: "What is NovaSpin?",
        a: "An educational demo of a casino-aggregator lobby. Everything is simulated: there are no real games, no real payments and no withdrawals, and balances have no value.",
      },
      {
        id: "demo-login",
        q: "How do I sign in quickly?",
        a: "Use “Continue with demo account” on the sign-in page (demo@novaspin.test / demo1234). Re-running npm start resets that account's break and two-factor settings, so it's always usable for a recording.",
      },
      {
        id: "mobile",
        q: "Does it work on my phone?",
        a: "Yes. On small screens the sidebar becomes a menu and a bottom bar gives you Menu, Casino, Search, Chat and Wallet.",
      },
      {
        id: "language",
        q: "How do I change the language?",
        a: "Use the EN/PL switch in the sidebar, in Settings → General, in the footer, or on the sign-in page. Your choice is remembered in this browser.",
      },
    ],
  },
  {
    id: "security",
    icon: "lock",
    title: "Account & security",
    articles: [
      {
        id: "2fa",
        q: "How do I turn on two-factor authentication?",
        a: "Go to Settings → Security → Set up 2FA. Scan the QR code with an authenticator app (Google Authenticator, 1Password, Authy…) or type in the setup key, then enter the 6-digit code. From then on, signing in asks for a code.",
      },
      {
        id: "2fa-lost",
        q: "I lost access to my authenticator app.",
        a: "This demo has no account recovery by email. Whoever runs the demo can clear the two-factor fields for your account in the database; the shared demo account is reset automatically by npm start.",
      },
      {
        id: "sessions",
        q: "How do I sign out my other devices?",
        a: "Settings → Security → Active sessions lists every signed-in device. Sign out one, or all others at once. Changing your password also signs out every other device.",
      },
      {
        id: "delete",
        q: "Can I delete my account?",
        a: "Yes: Settings → Privacy → Delete account, confirmed with your password. It permanently removes your account, balance, history and chat messages. Friends you invited keep their accounts.",
      },
    ],
  },
  {
    id: "wallet",
    icon: "wallet",
    title: "Wallet & deposits",
    articles: [
      {
        id: "real",
        q: "Are deposits real?",
        a: "No. The deposit window only adds demo credits. No wallet is connected, nothing touches a blockchain or a payment processor, and nothing is charged.",
      },
      {
        id: "withdraw",
        q: "Can I withdraw my balance?",
        a: "No — there's nothing real to withdraw, so the demo has no withdrawals at all.",
      },
      {
        id: "export",
        q: "How do I export my history?",
        a: "Open Wallet → Transactions, pick All, Deposits or Bonuses, and press CSV.",
      },
      {
        id: "streamer",
        q: "How do I hide my balance while recording?",
        a: "Turn on Streamer mode in Settings → General or from the menu under your avatar. Every balance and amount is masked until you turn it off.",
      },
    ],
  },
  {
    id: "refer",
    icon: "users",
    title: "Refer & Earn",
    articles: [
      {
        id: "how",
        q: "How does Refer & Earn work?",
        a: "Share your personal link or code from the Refer & Earn page. A friend who signs up with it gets a demo welcome balance and you get a demo referral bonus. It shows up live in your notifications.",
      },
      {
        id: "code",
        q: "My friend's code doesn't work.",
        a: "Codes aren't case-sensitive. The sign-up form checks the code as you type and shows who invited you; if it says the code doesn't exist, double-check it or leave the field empty.",
      },
    ],
  },
  {
    id: "responsible",
    icon: "shield",
    title: "Responsible play",
    articles: [
      {
        id: "limit",
        q: "How do I set a deposit limit?",
        a: "Settings → Responsible play → Daily deposit limit. It caps deposits in any rolling 24 hours and the API enforces it, so it can't be bypassed from the browser.",
      },
      {
        id: "reality",
        q: "What is a reality check?",
        a: "An optional reminder every 15, 30 or 60 minutes that shows how long you've been signed in and how much you've deposited this session.",
      },
      {
        id: "break",
        q: "How do I take a break?",
        a: "Settings → Responsible play → Take a break. Choose 1 hour to 30 days: you're signed out everywhere and can't sign in until it ends. A break can't be ended early.",
      },
      {
        id: "support",
        q: "Where can I find help with gambling?",
        a: "If gambling is causing you or someone close to you harm in real life, talk to someone you trust and reach out to a local support organisation or your doctor.",
      },
    ],
  },
  {
    id: "chat",
    icon: "chat",
    title: "Chat",
    articles: [
      {
        id: "who",
        q: "Who can see my messages?",
        a: "Everyone signed in to the same room. There's an English and a Polish room — switch between them at the top of the chat.",
      },
      {
        id: "rules",
        q: "What are the chat rules?",
        a: "Be respectful, don't spam or shout in capitals, don't share personal details, no begging, trading or advertising, full links only, and stick to the room's language. Shouting, link shorteners and repeated messages are blocked automatically.",
      },
      {
        id: "ghost",
        q: "Can I hide my name?",
        a: "Yes — turn on Ghost mode in Settings → Privacy. Other players then see “Hidden player” instead of your name and avatar.",
      },
    ],
  },
  {
    id: "about",
    icon: "info",
    title: "About this demo",
    articles: [
      {
        id: "deploy",
        q: "Can I put this online?",
        a: "No. It's an educational demo without a licence, compliance work or payments. Don't deploy it publicly or present it as a real casino.",
      },
      {
        id: "code",
        q: "How is it built?",
        a: "A monorepo with a Vue 3 + Tailwind web app and a Fastify + Prisma + SQLite API, with unit, integration and end-to-end tests. See the README for details.",
      },
    ],
  },
];

const pl: HelpCollection[] = [
  {
    id: "start",
    icon: "sparkle",
    title: "Pierwsze kroki",
    articles: [
      {
        id: "what",
        q: "Czym jest NovaSpin?",
        a: "Edukacyjnym demo lobby agregatora kasynowego. Wszystko jest symulowane: nie ma prawdziwych gier, realnych płatności ani wypłat, a salda nie mają żadnej wartości.",
      },
      {
        id: "demo-login",
        q: "Jak szybko się zalogować?",
        a: "Na stronie logowania kliknij „Kontynuuj z kontem demo” (demo@novaspin.test / demo1234). Ponowne npm start resetuje przerwę i 2FA na tym koncie, więc zawsze nadaje się do nagrania.",
      },
      {
        id: "mobile",
        q: "Czy działa na telefonie?",
        a: "Tak. Na małych ekranach panel boczny zmienia się w menu, a dolny pasek daje dostęp do Menu, Kasyna, Szukaj, Czatu i Portfela.",
      },
      {
        id: "language",
        q: "Jak zmienić język?",
        a: "Przełącznikiem EN/PL w panelu bocznym, w Ustawieniach → Ogólne, w stopce albo na stronie logowania. Wybór jest zapamiętywany w tej przeglądarce.",
      },
    ],
  },
  {
    id: "security",
    icon: "lock",
    title: "Konto i bezpieczeństwo",
    articles: [
      {
        id: "2fa",
        q: "Jak włączyć uwierzytelnianie dwuskładnikowe?",
        a: "Wejdź w Ustawienia → Bezpieczeństwo → Skonfiguruj 2FA. Zeskanuj kod QR w aplikacji (Google Authenticator, 1Password, Authy…) albo wpisz klucz, a potem podaj 6-cyfrowy kod. Od tej pory logowanie poprosi o kod.",
      },
      {
        id: "2fa-lost",
        q: "Straciłem dostęp do aplikacji uwierzytelniającej.",
        a: "To demo nie ma odzyskiwania konta przez email. Osoba, która prowadzi demo, może wyczyścić pola 2FA Twojego konta w bazie; wspólne konto demo resetuje się samo przy npm start.",
      },
      {
        id: "sessions",
        q: "Jak wylogować inne urządzenia?",
        a: "Ustawienia → Bezpieczeństwo → Aktywne sesje pokazuje wszystkie zalogowane urządzenia. Możesz wylogować jedno albo wszystkie pozostałe naraz. Zmiana hasła też wylogowuje wszystkie inne urządzenia.",
      },
      {
        id: "delete",
        q: "Czy mogę usunąć konto?",
        a: "Tak: Ustawienia → Prywatność → Usuń konto, z potwierdzeniem hasłem. Trwale usuwa konto, saldo, historię i wiadomości na czacie. Zaproszeni znajomi zachowują swoje konta.",
      },
    ],
  },
  {
    id: "wallet",
    icon: "wallet",
    title: "Portfel i wpłaty",
    articles: [
      {
        id: "real",
        q: "Czy wpłaty są prawdziwe?",
        a: "Nie. Okno wpłaty dodaje tylko środki demo. Żaden portfel nie jest podłączony, nic nie trafia na blockchain ani do operatora płatności i nic nie jest pobierane.",
      },
      {
        id: "withdraw",
        q: "Czy mogę wypłacić saldo?",
        a: "Nie — nie ma czego wypłacać, więc demo w ogóle nie ma wypłat.",
      },
      {
        id: "export",
        q: "Jak wyeksportować historię?",
        a: "Otwórz Portfel → Transakcje, wybierz Wszystkie, Wpłaty albo Bonusy i kliknij CSV.",
      },
      {
        id: "streamer",
        q: "Jak ukryć saldo podczas nagrywania?",
        a: "Włącz Tryb streamera w Ustawieniach → Ogólne albo w menu pod avatarem. Wszystkie salda i kwoty będą ukryte, dopóki go nie wyłączysz.",
      },
    ],
  },
  {
    id: "refer",
    icon: "users",
    title: "Poleć i zarabiaj",
    articles: [
      {
        id: "how",
        q: "Jak działa program poleceń?",
        a: "Udostępnij swój link albo kod ze strony Poleć i zarabiaj. Znajomy, który się z nim zarejestruje, dostaje powitalne saldo demo, a Ty bonus za polecenie. Zobaczysz to od razu w powiadomieniach.",
      },
      {
        id: "code",
        q: "Kod znajomego nie działa.",
        a: "Wielkość liter nie ma znaczenia. Formularz rejestracji sprawdza kod na bieżąco i pokazuje, kto zaprasza; jeśli pisze, że kod nie istnieje, sprawdź go jeszcze raz albo zostaw pole puste.",
      },
    ],
  },
  {
    id: "responsible",
    icon: "shield",
    title: "Odpowiedzialna gra",
    articles: [
      {
        id: "limit",
        q: "Jak ustawić limit wpłat?",
        a: "Ustawienia → Odpowiedzialna gra → Dzienny limit wpłat. Ogranicza wpłaty w dowolnych 24 godzinach, a pilnuje tego API, więc nie da się go obejść z przeglądarki.",
      },
      {
        id: "reality",
        q: "Czym jest przypomnienie o czasie?",
        a: "Opcjonalnym oknem co 15, 30 lub 60 minut, które pokazuje, jak długo jesteś zalogowany i ile wpłaciłeś w tej sesji.",
      },
      {
        id: "break",
        q: "Jak zrobić sobie przerwę?",
        a: "Ustawienia → Odpowiedzialna gra → Zrób sobie przerwę. Wybierz od 1 godziny do 30 dni: zostaniesz wylogowany wszędzie i nie zalogujesz się, dopóki przerwa się nie skończy. Nie da się jej skrócić.",
      },
      {
        id: "support",
        q: "Gdzie szukać pomocy w sprawie hazardu?",
        a: "Jeśli hazard szkodzi Tobie lub komuś bliskiemu w prawdziwym życiu, porozmawiaj z kimś, komu ufasz, i skontaktuj się z lokalną organizacją pomocową albo lekarzem.",
      },
    ],
  },
  {
    id: "chat",
    icon: "chat",
    title: "Czat",
    articles: [
      {
        id: "who",
        q: "Kto widzi moje wiadomości?",
        a: "Wszyscy zalogowani w tym samym pokoju. Jest pokój angielski i polski — przełączysz je u góry czatu.",
      },
      {
        id: "rules",
        q: "Jakie są zasady czatu?",
        a: "Szanuj innych, nie spamuj i nie krzycz wielkimi literami, nie podawaj danych osobowych, bez żebrania, handlu i reklam, tylko pełne linki i pisz w języku pokoju. Krzyk, skracacze linków i powtarzane wiadomości są blokowane automatycznie.",
      },
      {
        id: "ghost",
        q: "Czy mogę ukryć swój nick?",
        a: "Tak — włącz Tryb ducha w Ustawieniach → Prywatność. Inni gracze zobaczą wtedy „Ukryty gracz” zamiast Twojego nicku i avatara.",
      },
    ],
  },
  {
    id: "about",
    icon: "info",
    title: "O tym demo",
    articles: [
      {
        id: "deploy",
        q: "Czy mogę to wrzucić do internetu?",
        a: "Nie. To demo edukacyjne bez licencji, zgodności z przepisami i płatności. Nie publikuj go ani nie przedstawiaj jako prawdziwego kasyna.",
      },
      {
        id: "code",
        q: "Jak to jest zbudowane?",
        a: "Monorepo z aplikacją Vue 3 + Tailwind i API Fastify + Prisma + SQLite, z testami jednostkowymi, integracyjnymi i end-to-end. Szczegóły w README.",
      },
    ],
  },
];

export const HELP: Record<Locale, HelpCollection[]> = { en, pl };
