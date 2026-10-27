import type { LucideIcon } from "lucide-react";
import {
  Mail,
  PenLine,
  Search,
  Tag,
  Clock,
  Sparkles,
  Newspaper,
  Bell,
  Shield,
  Calendar,
  Palette,
  UserCircle,
  BookOpen,
  Eye,
  Layout,
  Undo2,
  CalendarClock,
  Archive,
  FileSignature,
  FileText,
  Users,
  Save,
  Keyboard,
  Command,
  FolderSearch,
  Filter,
  Zap,
  Star,
  Trash2,
  MousePointer,
  GripVertical,
  BellRing,
  MessageSquare,
  Wand2,
  Brain,
  MailQuestion,
  MailMinus,
  Monitor,
  Sun,
  Type,
  Columns2,
  Globe,
  Minimize2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  ImageOff,
  LinkIcon,
  MailPlus,
  Server,
  WifiOff,
  CheckSquare,
  ListTodo,
  Repeat,
  PenSquare,
  Printer,
  Code,
  RefreshCw,
  ListFilter,
  Paperclip,
  Tags,
  FolderInput,
} from "lucide-react";

// ---------- Types ----------

export interface HelpTip {
  text: string;
  shortcut?: string;
}

export interface HelpCard {
  id: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  description: string;
  tips?: HelpTip[];
  relatedSettingsTab?: string;
}

export interface HelpCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  cards: HelpCard[];
}

export interface ContextualTip {
  title: string;
  body: string;
  helpTopic: string;
}

// ---------- Valid settings tabs (for type-safe references) ----------

const VALID_SETTINGS_TABS = [
  "general", "notifications", "composing", "mail-rules", "people",
  "accounts", "shortcuts", "ai", "about",
] as const;

export type SettingsTabId = (typeof VALID_SETTINGS_TABS)[number];

// ---------- Help Categories & Cards ----------

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    label: "Per iniziare",
    icon: BookOpen,
    cards: [
      {
        id: "add-account",
        icon: MailPlus,
        title: "Aggiungi il tuo account email",
        summary: "Collega un account Gmail o IMAP/SMTP per iniziare a usare l'app.",
        description:
          "Fai clic sul selettore degli account in cima alla barra laterale per aggiungere un account. Per Gmail, segui l'accesso OAuth usando le tue credenziali Google Cloud. Per gli altri provider (Outlook, Yahoo, iCloud, Fastmail, ecc.), scegli 'Aggiungi account IMAP' e inserisci email e password: le impostazioni del server vengono rilevate automaticamente per i provider più diffusi. Puoi aggiungere più account di qualsiasi tipo e passare dall'uno all'altro all'istante. Ogni account si sincronizza in modo indipendente, con la propria posta in arrivo, le proprie etichette e le proprie impostazioni.",
        tips: [
          { text: "Il selettore degli account è sempre visibile in cima alla barra laterale." },
          { text: "Gli account Gmail usano OAuth; gli account IMAP usano la password o una password per app." },
          { text: "Ogni account ha le proprie etichette, i propri filtri e il proprio stato di sincronizzazione." },
          { text: "Rimuovi o riautorizza gli account in Impostazioni > Account." },
        ],
        relatedSettingsTab: "accounts",
      },
      {
        id: "initial-sync",
        icon: Clock,
        title: "Sincronizzazione iniziale",
        summary: "La prima sincronizzazione scarica la cronologia delle tue email.",
        description:
          "Quando aggiungi un nuovo account, l'app esegue una sincronizzazione iniziale che scarica l'ultimo anno di email (configurabile). Così si crea un database locale per ricercare e sfogliare la posta rapidamente, anche offline. A seconda delle dimensioni della posta in arrivo, può richiedere qualche minuto. Puoi usare l'app normalmente mentre la sincronizzazione prosegue in background: leggi, scrivi e invia senza aspettare. Dopo la sincronizzazione iniziale, l'app passa alla sincronizzazione differenziale (ogni 60 secondi) e scarica solo le novità. Gmail usa l'API History per la sincronizzazione differenziale; IMAP usa il tracciamento basato sugli UID.",
        tips: [
          { text: "Cambia il periodo di sincronizzazione (da 30 giorni a 1 anno) in Impostazioni > Account." },
          { text: "L'app è pienamente utilizzabile durante la sincronizzazione iniziale." },
          { text: "La sincronizzazione differenziale viene eseguita ogni 60 secondi dopo il completamento della prima." },
          { text: "Gmail: se la cronologia di sincronizzazione scade (circa 30 giorni offline), l'app torna automaticamente a una sincronizzazione completa." },
          { text: "IMAP: se l'UIDVALIDITY di una cartella cambia, l'app risincronizza quella cartella automaticamente." },
        ],
        relatedSettingsTab: "accounts",
      },
      {
        id: "client-id-setup",
        icon: Globe,
        title: "Configurazione del Client ID Google",
        summary: "Configura le tue credenziali OAuth di Google Cloud (solo Gmail).",
        description:
          "Questo passaggio serve solo per gli account Gmail. L'app usa il tuo progetto Google Cloud per l'autenticazione OAuth: le tue credenziali restano sul tuo dispositivo e non vengono mai condivise. Quando aggiungi per la prima volta un account Gmail, una procedura guidata ti accompagna nella creazione di un progetto Google Cloud, nell'attivazione delle API di Gmail e Calendar e nella generazione di un Client ID OAuth. Servono circa 5 minuti. L'app usa l'autenticazione PKCE, quindi non serve alcun client secret. Gli account IMAP/SMTP non richiedono un Client ID.",
        tips: [
          { text: "Vai su console.cloud.google.com per creare il tuo progetto." },
          { text: "Attiva sia l'API di Gmail sia l'API di Google Calendar." },
          { text: "Scegli 'Applicazione desktop' quando crei le credenziali OAuth." },
          { text: "Il tuo Client ID è salvato in locale e non viene mai inviato a server esterni." },
          { text: "Aggiorna il Client ID in seguito da Impostazioni > Info." },
          { text: "Gli account IMAP saltano del tutto questo passaggio: non serve alcun progetto Google Cloud." },
        ],
        relatedSettingsTab: "about",
      },
      {
        id: "imap-smtp-setup",
        icon: Server,
        title: "Configurazione di un account IMAP/SMTP",
        summary: "Aggiungi un account email non Gmail tramite IMAP e SMTP.",
        description:
          "Per aggiungere un account IMAP/SMTP, fai clic su 'Aggiungi account IMAP' nel selettore degli account. La procedura guidata ha quattro passaggi: (1) inserisci email, nome visualizzato e password o credenziali OAuth2; (2) configura le impostazioni del server IMAP (host, porta, sicurezza); (3) configura le impostazioni del server SMTP; (4) verifica la connessione. Per i provider più diffusi, come Outlook, Yahoo, iCloud, Fastmail, Zoho, AOL e GMX, le impostazioni del server vengono rilevate automaticamente quando inserisci l'indirizzo email. Gli account Outlook/Hotmail richiedono l'autenticazione OAuth2 (Microsoft ha disattivato l'autenticazione con password semplice). Yahoo supporta sia OAuth2 sia le password per app. Le tue credenziali vengono cifrate con AES-256-GCM prima di essere salvate in locale.",
        tips: [
          { text: "Il rilevamento automatico funziona con Outlook, Yahoo, iCloud, Fastmail, Zoho, AOL e GMX." },
          { text: "Outlook/Hotmail richiede OAuth2: registra un'app nel portale Azure per ottenere un Client ID." },
          { text: "Yahoo supporta OAuth2 o le password per app: si consiglia OAuth2." },
          { text: "Per OAuth2, imposta l'URI di reindirizzamento su http://localhost:17248 nella registrazione dell'app." },
          { text: "Per gli altri provider, consulta la pagina di aiuto del tuo provider per le impostazioni IMAP/SMTP." },
          { text: "Opzioni di sicurezza: SSL/TLS (la più sicura), STARTTLS o Nessuna." },
          { text: "Le connessioni IMAP e SMTP vengono entrambe verificate prima del salvataggio." },
          { text: "Le cartelle IMAP vengono associate automaticamente alle etichette nella barra laterale." },
        ],
        relatedSettingsTab: "accounts",
      },
      {
        id: "outlook-setup",
        icon: Server,
        title: "Configurazione di un account Outlook",
        summary: "Guida passo passo per collegare un account Outlook, Hotmail o Live.",
        description:
          "Microsoft richiede OAuth2 per gli account Outlook/Hotmail/Live: le password semplici sono disattivate. Devi registrare un'app nel portale Azure per ottenere un Client ID. Ecco come fare: (1) Iscriviti al Microsoft 365 Developer Program su developer.microsoft.com/microsoft-365/dev-program per ottenere un tenant Azure gratuito: creare app al di fuori di una directory è obsoleto. (2) Accedi a portal.azure.com con il tuo account sviluppatore M365 (admin@tuonome.onmicrosoft.com), non con il tuo account Outlook personale. (3) Vai su Microsoft Entra ID → Registrazioni app → Nuova registrazione. Dagli un nome qualsiasi, imposta 'Tipi di account supportati' su 'Account in qualsiasi directory organizzativa e account Microsoft personali' e imposta l'URI di reindirizzamento su 'Applicazioni per dispositivi mobili e desktop' → http://localhost:17248. (4) Copia l'ID applicazione (client) dalla pagina Panoramica. (5) Vai su Autorizzazioni API → Aggiungi un'autorizzazione → Microsoft Graph → Autorizzazioni delegate → aggiungi: offline_access, email, openid, profile, User.Read. Se trovi 'Office 365 Exchange Online' in 'API usate dalla mia organizzazione', aggiungi da lì anche IMAP.AccessAsUser.All e SMTP.Send. In caso contrario, aggiungile tramite il JSON del manifesto (vedi i suggerimenti). (6) Vai su Autenticazione (barra laterale sinistra) → scorri fino a 'Impostazioni avanzate' → imposta 'Consenti flussi client pubblici' su Sì → Salva. (7) Nell'app, scegli Aggiungi account IMAP, inserisci la tua email Outlook personale, incolla il Client ID, lascia vuoto il Client Secret e fai clic su 'Accedi con Microsoft'. Le impostazioni del server vengono compilate automaticamente (IMAP: imap-mail.outlook.com:993 SSL, SMTP: smtp-mail.outlook.com:587 STARTTLS). Nota: per i nuovi account Outlook.com possono servire fino a 24 ore prima che Microsoft attivi l'accesso IMAP/SMTP.",
        tips: [
          { text: "Iscriviti al M365 Developer Program per avere un tenant Azure gratuito in cui registrare le app." },
          { text: "Accedi al portale Azure con il tuo account sviluppatore M365, non con quello Outlook personale." },
          { text: "Il tipo di piattaforma deve essere 'Applicazioni per dispositivi mobili e desktop' (non Web né SPA)." },
          { text: "L'URI di reindirizzamento deve essere esattamente: http://localhost:17248" },
          { text: "Il Client Secret è facoltativo: lascialo vuoto per le app desktop (la sicurezza è gestita da PKCE)." },
          { text: "Attiva 'Consenti flussi client pubblici' in Autenticazione → Impostazioni avanzate." },
          { text: "Se 'Office 365 Exchange Online' non compare nelle autorizzazioni API, aggiungilo tramite il manifesto: aggiungi resourceAppId '00000002-0000-0ff1-ce00-000000000000' con l'ID di ambito IMAP '5df07973-7d5d-46ed-f847-aeb6baeacb0b' e l'ID di ambito SMTP '258f6531-ecdc-4944-8c5f-82fee32d369b'." },
          { text: "Funziona solo con gli account Microsoft personali (outlook.com, hotmail.com, live.com)." },
          { text: "Per i nuovi account possono servire fino a 24 ore prima che Microsoft attivi l'accesso IMAP/SMTP." },
          { text: "I token si rinnovano automaticamente: non dovrai accedere di nuovo." },
        ],
        relatedSettingsTab: "accounts",
      },
    ],
  },
  {
    id: "reading-email",
    label: "Lettura della posta",
    icon: Eye,
    cards: [
      {
        id: "thread-view",
        icon: Mail,
        title: "Vista conversazione",
        summary: "Le email raggruppate come conversazioni.",
        description:
          "Tutte le email correlate vengono raggruppate automaticamente in conversazioni. Fai clic su una conversazione nell'elenco per aprirla e vedere ogni messaggio, con il più recente in fondo. Ogni messaggio mostra mittente, data e ora e contenuto formattato completo. Gli allegati e le immagini incorporati vengono mostrati direttamente nel corpo del messaggio. Puoi rispondere direttamente a un singolo messaggio della conversazione senza aprire l'editor completo.",
        tips: [
          { text: "Apri una conversazione", shortcut: "o" },
          { text: "Passa da una conversazione all'altra", shortcut: "j / k" },
          { text: "Torna all'elenco", shortcut: "Escape" },
          { text: "Apri una conversazione in una finestra separata dalla barra delle azioni." },
          { text: "La risposta in linea ti permette di rispondere a un messaggio specifico senza uscire dalla conversazione." },
        ],
      },
      {
        id: "reading-pane",
        icon: Layout,
        title: "Posizioni del pannello di lettura",
        summary: "Scegli il layout a destra, in basso o nascosto.",
        description:
          "Il pannello di lettura mostra il contenuto della conversazione selezionata accanto all'elenco delle email. Puoi posizionarlo a destra dell'elenco (ideale per gli schermi larghi), sotto di esso (adatto agli schermi stretti) oppure nasconderlo del tutto (modalità apri con un clic). Anche la larghezza dell'elenco è regolabile: trascina il divisore per ridimensionarla. La tua preferenza di layout viene salvata e ripristinata automaticamente.",
        tips: [
          { text: "Il pannello a destra funziona meglio su schermi più larghi di 1400 px." },
          { text: "Il pannello in basso lascia più spazio orizzontale per leggere email larghe." },
          { text: "La modalità nascosto mostra solo l'elenco; fai clic su una conversazione per aprirla a tutta larghezza." },
          { text: "Trascina il divisore tra l'elenco e il pannello per regolare le larghezze." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "mark-as-read",
        icon: Eye,
        title: "Comportamento di \"segna come letto\"",
        summary: "Controlla quando i messaggi vengono segnati come letti.",
        description:
          "Scegli quando l'apertura di una conversazione la segna come letta: subito, appena la selezioni; dopo un breve ritardo (per darti il tempo di dare un'occhiata); oppure solo quando lo fai manualmente. Questa impostazione è utile se usi il numero di messaggi non letti come promemoria e non vuoi che le conversazioni risultino lette solo perché le hai aperte per un attimo.",
        tips: [
          { text: "\"Subito\" segna come letta la conversazione appena la apri." },
          { text: "\"Dopo un ritardo\" attende un paio di secondi prima di segnarla." },
          { text: "\"Solo manualmente\" non segna mai nulla in automatico: decidi tu." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "read-filter",
        icon: ListFilter,
        title: "Filtro letti / non letti",
        summary: "Filtra l'elenco per mostrare tutte le conversazioni, quelle non lette o quelle lette.",
        description:
          "Usa il menu del filtro in cima all'elenco delle email per restringere ciò che viene mostrato. Scegli 'Tutte' per vedere ogni conversazione, 'Non lette' per concentrarti su quelle che richiedono ancora attenzione, oppure 'Lette' per rivedere quelle già aperte. Il filtro si applica alla cartella o all'etichetta che stai visualizzando. La tua preferenza viene salvata e ripristinata tra una sessione e l'altra.",
        tips: [
          { text: "Il menu del filtro si trova nell'intestazione dell'elenco, accanto al numero di conversazioni." },
          { text: "Opzioni: Tutte, Non lette, Lette." },
          { text: "Combinalo con etichette o cartelle smart per un filtraggio preciso." },
          { text: "La tua preferenza di filtro resta salvata anche dopo il riavvio." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "print-export",
        icon: Printer,
        title: "Stampa ed esporta le conversazioni",
        summary: "Stampa una conversazione o esportala come file .eml.",
        description:
          "Dalla barra delle azioni puoi stampare l'intera conversazione o esportarla come file .eml. La stampa genera una vista pulita e formattata dell'intera conversazione con intestazioni e orari, poi apre la finestra di stampa del sistema. L'esportazione salva la conversazione come file .eml standard RFC 2822, apribile con qualsiasi client di posta: utile per backup, documentazione legale o per condividerla fuori dall'app.",
        tips: [
          { text: "Fai clic sull'icona Stampa nella barra delle azioni per stampare la conversazione." },
          { text: "Fai clic sull'icona Scarica nella barra delle azioni per esportare come .eml." },
          { text: "Il formato .eml è uno standard universale leggibile da qualsiasi client di posta." },
          { text: "La vista di stampa include tutti i messaggi, i mittenti e gli orari." },
        ],
      },
      {
        id: "raw-message",
        icon: Code,
        title: "Visualizza il sorgente del messaggio",
        summary: "Ispeziona il sorgente MIME grezzo di qualsiasi email.",
        description:
          "Fai clic con il tasto destro su un messaggio di una conversazione e scegli 'Visualizza sorgente' per vedere il codice MIME grezzo completo. Mostra tutte le intestazioni (incluse quelle di instradamento, autenticazione e personalizzate), il corpo grezzo del messaggio e la struttura MIME. È utile per diagnosticare problemi di recapito, verificare le intestazioni di autenticazione o capire come è stata costruita un'email.",
        tips: [
          { text: "Fai clic con il tasto destro su un messaggio e scegli 'Visualizza sorgente'." },
          { text: "Mostra tutte le intestazioni: From, To, Authentication-Results, DKIM, ecc." },
          { text: "Utile per diagnosticare problemi di recapito o dei filtri antispam." },
          { text: "La vista grezza si apre in una finestra modale scorrevole." },
        ],
      },
    ],
  },
  {
    id: "composing",
    label: "Scrittura e invio",
    icon: PenLine,
    cards: [
      {
        id: "new-email",
        icon: PenLine,
        title: "Scrivi una nuova email",
        summary: "Editor di testo formattato con formattazione e allegati.",
        description:
          "L'editor di scrittura è un completo editor di testo formattato basato su TipTap. Puoi formattare il testo (grassetto, corsivo, elenchi, link, blocchi di codice), aggiungere allegati, inserire una firma e scegliere un modello, tutto da un unico posto. L'editor si apre come pannello nella parte bassa dello schermo. Aggiungi i destinatari con il completamento automatico (ordinati in base a quanto spesso scrivi loro), imposta l'oggetto e componi il messaggio.",
        tips: [
          { text: "Apri l'editor di scrittura", shortcut: "c" },
          { text: "Invia l'email", shortcut: "Ctrl+Enter" },
          { text: "Il completamento automatico dei destinatari è ordinato per frequenza di contatto." },
          { text: "Usa la barra degli strumenti o le scorciatoie in stile markdown per formattare." },
          { text: "Chiudi l'editor con Escape (la bozza viene salvata automaticamente)." },
        ],
      },
      {
        id: "reply-forward",
        icon: MessageSquare,
        title: "Rispondi, Rispondi a tutti e Inoltra",
        summary: "Rispondi alle email o inoltrale.",
        description:
          "Rispondi invia la tua risposta solo al mittente originale. Rispondi a tutti include tutti i partecipanti alla conversazione (A e CC). Inoltra ti permette di inviare l'email a un'altra persona con un tuo messaggio. Puoi impostare l'azione di risposta predefinita (Rispondi o Rispondi a tutti) nelle impostazioni di Scrittura, così la scorciatoia di risposta fa ciò che ti aspetti. La risposta in linea ti permette inoltre di rispondere a un messaggio specifico direttamente nella vista conversazione.",
        tips: [
          { text: "Rispondi", shortcut: "r" },
          { text: "Rispondi a tutti", shortcut: "a" },
          { text: "Inoltra", shortcut: "f" },
          { text: "Imposta la modalità di risposta predefinita (Rispondi o Rispondi a tutti) nelle Impostazioni." },
          { text: "La risposta in linea ti permette di rispondere senza aprire l'editor completo." },
        ],
        relatedSettingsTab: "composing",
      },
      {
        id: "undo-send",
        icon: Undo2,
        title: "Annulla invio",
        summary: "Un breve intervallo per annullare l'invio di un'email.",
        description:
          "Dopo aver premuto Invia, compare una notifica con un pulsante \"Annulla\". Fai clic per annullare l'invio prima che l'email venga effettivamente recapitata. Puoi impostare la durata di questo intervallo, da 5 a 30 secondi. Durante l'intervallo, l'email resta in coda in locale e non è ancora stata inviata ai server di Gmail. Una volta scaduto l'intervallo, l'email viene inviata e non può più essere richiamata.",
        tips: [
          { text: "Imposta il ritardo per annullare (5-30 secondi) in Impostazioni > Scrittura." },
          { text: "La notifica di annullamento compare in basso sullo schermo dopo l'invio." },
          { text: "Chiudere l'app durante l'intervallo di annullamento invia comunque l'email." },
        ],
        relatedSettingsTab: "composing",
      },
      {
        id: "schedule-send",
        icon: CalendarClock,
        title: "Invio programmato",
        summary: "Scrivi ora, invia più tardi all'orario scelto.",
        description:
          "Scrivi un'email e programmala per l'invio a una data e un'ora precise. È utile per scrivere email fuori orario, nel fine settimana o in fusi orari diversi senza inviarle subito. Scegli tra le opzioni rapide (domani mattina, lunedì mattina) oppure seleziona data e ora a piacere. Le email programmate compaiono nelle Bozze finché non vengono inviate. Puoi annullarle o riprogrammarle prima dell'orario di invio.",
        tips: [
          { text: "Fai clic sulla freccia accanto al pulsante Invia per programmare." },
          { text: "Opzioni rapide: Domani mattina (9:00), Domani pomeriggio (13:00), Lunedì mattina." },
          { text: "Visualizza e gestisci le email programmate in Impostazioni > Scrittura." },
          { text: "Annulla un'email programmata in qualsiasi momento prima dell'invio." },
        ],
      },
      {
        id: "send-archive",
        icon: Archive,
        title: "Invia e archivia",
        summary: "Archivia automaticamente le conversazioni dopo aver risposto.",
        description:
          "Se attivata, l'invio di una risposta archivia automaticamente la conversazione: la toglie dalla posta in arrivo mantenendola ricercabile in Tutti i messaggi. Così la posta in arrivo resta in ordine, considerando le risposte come \"concluse\" per impostazione predefinita. Se hai bisogno di rivedere la conversazione nella posta in arrivo, puoi sempre annullarne l'archiviazione. Attiva o disattiva questo comportamento nelle impostazioni di Scrittura.",
        tips: [
          { text: "Attiva o disattiva Invia e archivia in Impostazioni > Scrittura." },
          { text: "Le conversazioni archiviate restano ricercabili in Tutti i messaggi." },
          { text: "Se qualcuno risponde, la conversazione torna automaticamente nella posta in arrivo." },
        ],
        relatedSettingsTab: "composing",
      },
      {
        id: "signatures",
        icon: FileSignature,
        title: "Firme",
        summary: "Crea e gestisci le firme email.",
        description:
          "Crea più firme per contesti diversi: lavoro, personale, formale, informale. Le firme supportano la formattazione del testo (grassetto, link, immagini). Imposta una firma come predefinita per inserirla automaticamente in ogni nuovo messaggio, oppure scegline un'altra dal selettore nell'editor di scrittura. Le firme si gestiscono nelle Impostazioni e vengono salvate in locale.",
        tips: [
          { text: "Crea le firme in Impostazioni > Scrittura." },
          { text: "Imposta una firma predefinita che si inserisce automaticamente nelle nuove email." },
          { text: "Cambia firma dal selettore delle firme nell'editor di scrittura." },
          { text: "Supporta il testo formattato: grassetto, link, immagini e altro." },
        ],
        relatedSettingsTab: "composing",
      },
      {
        id: "templates",
        icon: FileText,
        title: "Modelli",
        summary: "Testi riutilizzabili per i messaggi più comuni.",
        description:
          "Salva come modelli i testi delle email che usi più spesso. Quando scrivi, apri il selettore dei modelli per inserire il contenuto di un modello nell'editor con un clic. I modelli sono ideali per email ripetitive come richieste di riunione, aggiornamenti sullo stato o risposte ai clienti. Puoi anche assegnare scorciatoie da tastiera ai modelli più usati per un accesso ancora più rapido. Sono supportate le variabili per i contenuti dinamici.",
        tips: [
          { text: "Crea i modelli in Impostazioni > Scrittura." },
          { text: "Inserisci i modelli dall'icona del selettore nella barra degli strumenti dell'editor." },
          { text: "Assegna scorciatoie da tastiera ai modelli usati di frequente." },
          { text: "I modelli supportano variabili come {{name}} per i contenuti dinamici." },
        ],
        relatedSettingsTab: "composing",
      },
      {
        id: "from-aliases",
        icon: Users,
        title: "Alias del mittente",
        summary: "Invia da indirizzi email diversi.",
        description:
          "Se il tuo account Gmail ha degli alias di invio configurati (ad esempio un alias di lavoro o l'indirizzo di un reparto), nell'editor di scrittura compare un selettore \"Da\" che ti permette di scegliere da quale indirizzo inviare. Gli alias vengono sincronizzati dalle impostazioni di invio di Gmail quando aggiungi l'account. L'alias predefinito viene usato per i nuovi messaggi; le risposte usano per impostazione predefinita l'indirizzo a cui era stata inviata l'email originale. Gli alias di invio sono attualmente una funzione solo di Gmail.",
        tips: [
          { text: "Gli alias vengono recuperati automaticamente dalle impostazioni di invio di Gmail." },
          { text: "Il selettore Da compare solo quando l'account ha più alias." },
          { text: "Le risposte usano per impostazione predefinita l'indirizzo a cui era stata inviata l'email." },
          { text: "Imposta un alias predefinito nelle impostazioni del tuo account Gmail." },
          { text: "Gli alias di invio sono attualmente disponibili solo per gli account Gmail." },
        ],
        relatedSettingsTab: "accounts",
      },
      {
        id: "draft-autosave",
        icon: Save,
        title: "Salvataggio automatico delle bozze",
        summary: "Le bozze vengono salvate automaticamente ogni 3 secondi.",
        description:
          "Mentre scrivi, la bozza viene salvata automaticamente ogni 3 secondi. Se l'app si chiude, il computer si riavvia o cambi schermata, la bozza viene conservata. Per gli account Gmail, le bozze si sincronizzano tra i dispositivi. Per gli account IMAP, le bozze vengono salvate nella cartella Bozze del server. Il salvataggio avviene in silenzio in background: non devi mai salvare manualmente. Trovi le tue bozze nella cartella Bozze della barra laterale.",
        tips: [
          { text: "Le bozze vengono salvate automaticamente ogni 3 secondi durante la scrittura." },
          { text: "Le bozze Gmail si sincronizzano tra i dispositivi; quelle IMAP vengono salvate nella cartella Bozze del server." },
          { text: "Puoi cambiare schermata in tranquillità: la bozza è già salvata." },
          { text: "Trova le bozze salvate nella cartella Bozze della barra laterale." },
        ],
      },
    ],
  },
  {
    id: "search-navigation",
    label: "Ricerca e navigazione",
    icon: Search,
    cards: [
      {
        id: "search-operators",
        icon: Search,
        title: "Operatori di ricerca",
        summary: "Operatori in stile Gmail per affinare i risultati della ricerca.",
        description:
          "La ricerca usa operatori in stile Gmail per un filtraggio preciso. Combina più operatori per trovare esattamente ciò che ti serve. Tutte le ricerche vengono eseguite sul database locale con l'indicizzazione full-text FTS5, quindi i risultati sono istantanei. Gli operatori si possono combinare liberamente: usano la logica AND, quindi ogni operatore aggiunto restringe ulteriormente i risultati.",
        tips: [
          { text: "from:jane — email di un mittente specifico" },
          { text: "to:team@ — email inviate a un indirizzo specifico" },
          { text: "subject:quarterly report — corrispondenza nell'oggetto" },
          { text: "has:attachment — solo email con allegati" },
          { text: "is:unread / is:starred / is:read — filtra per stato" },
          { text: "before:2024-06-01 / after:2024-01-01 — filtri per intervallo di date" },
          { text: "label:work — filtra per etichetta" },
          { text: "Combina liberamente: from:jane subject:report has:attachment after:2024-01-01" },
        ],
      },
      {
        id: "command-palette",
        icon: Command,
        title: "Riquadro comandi",
        summary: "Ricerca, navigazione e azioni da tastiera.",
        description:
          "Il riquadro comandi è il modo più veloce per fare qualsiasi cosa nell'app. Aprilo con una scorciatoia e inizia a digitare per cercare nella posta, passare a qualsiasi etichetta o cartella, cambiare account o eseguire azioni. I risultati si aggiornano mentre scrivi. Il riquadro cerca nel contenuto delle email, nei nomi dei mittenti, negli oggetti, nelle etichette e nelle cartelle, tutto da un unico campo.",
        tips: [
          { text: "Apri il riquadro comandi", shortcut: "Ctrl+K" },
          { text: "Si apre anche con", shortcut: "/" },
          { text: "Digita per cercare email, etichette, cartelle e azioni." },
          { text: "I risultati si aggiornano all'istante mentre scrivi." },
          { text: "Premi Invio per aprire il primo risultato, oppure usa le frecce per spostarti." },
        ],
      },
      {
        id: "keyboard-shortcuts",
        icon: Keyboard,
        title: "Scorciatoie da tastiera",
        summary: "Naviga e agisci sulla posta senza usare il mouse.",
        description:
          "Quasi ogni azione ha una scorciatoia da tastiera, ispirata al design di Superhuman pensato per la tastiera. Le scorciatoie sono disattivate quando scrivi in un campo di testo, in un'area di testo o nell'editor di testo formattato, per evitare conflitti. L'app supporta le sequenze di due tasti (premi g e poi un altro tasto entro 1 secondo) per i comandi di navigazione. Tutte le scorciatoie sono completamente personalizzabili: riassegna qualsiasi tasto nelle Impostazioni.",
        tips: [
          { text: "Visualizza tutte le scorciatoie", shortcut: "?" },
          { text: "Navigazione: j/k (su/giù), o (apri), Escape (indietro)" },
          { text: "Nella conversazione: Freccia su/giù per spostarti tra i messaggi" },
          { text: "Azioni: e (archivia), s (stella), # (cestino), r (rispondi)" },
          { text: "Due tasti: g poi i (Posta in arrivo), g poi s (Speciali), g poi t (Posta inviata)" },
          { text: "Chiedi alla Posta in arrivo (IA)", shortcut: "i" },
          { text: "Sincronizza la cartella corrente", shortcut: "F5" },
          { text: "Personalizza tutte le scorciatoie in Impostazioni > Scorciatoie." },
          { text: "Le scorciatoie sono disattivate nei campi di testo per evitare conflitti." },
        ],
        relatedSettingsTab: "shortcuts",
      },
    ],
  },
  {
    id: "organization",
    label: "Organizzazione",
    icon: Tag,
    cards: [
      {
        id: "labels",
        icon: Tag,
        title: "Etichette",
        summary: "Tag colorati per organizzare la tua posta.",
        description:
          "Le etichette funzionano come i tag: applica più etichette a una stessa conversazione per classificarla in vari modi. Crea etichette personalizzate con dei colori per distinguere visivamente le categorie. Le etichette compaiono nella barra laterale per un filtraggio rapido. Puoi creare, modificare, rinominare, cambiare colore ed eliminare le etichette dalla barra laterale o dalle Impostazioni. Per gli account Gmail, le etichette si sincronizzano tra i dispositivi. Per gli account IMAP, le cartelle del server vengono associate automaticamente alle etichette nella barra laterale (ad esempio Posta in arrivo, Posta inviata, Bozze, Cestino), mentre le cartelle personalizzate compaiono come etichette personali.",
        tips: [
          { text: "Trascina le conversazioni sulle etichette della barra laterale per applicarle." },
          { text: "Fai clic con il tasto destro su un'etichetta nella barra laterale per modificarla o eliminarla." },
          { text: "Fai clic sul pulsante + nella sezione Etichette della barra laterale per crearne una." },
          { text: "Una conversazione può avere più etichette contemporaneamente." },
          { text: "Le etichette Gmail si sincronizzano tra i dispositivi; le cartelle IMAP vengono associate alle etichette automaticamente." },
        ],
        relatedSettingsTab: "mail-rules",
      },
      {
        id: "smart-folders",
        icon: FolderSearch,
        title: "Cartelle smart",
        summary: "Ricerche salvate che funzionano come cartelle dinamiche.",
        description:
          "Le cartelle smart sono query di ricerca salvate che compaiono nella barra laterale come cartelle normali. Mostrano dinamicamente le conversazioni che corrispondono alla query: i risultati si aggiornano automaticamente all'arrivo di nuova posta. Nella query puoi usare qualsiasi operatore di ricerca. I token di data dinamici (come __LAST_7_DAYS__ o __TODAY__) mantengono i risultati relativi alla data corrente. Le cartelle smart mostrano un badge con il numero di messaggi non letti, proprio come le cartelle normali.",
        tips: [
          { text: "Fai clic sul pulsante + nella sezione Cartelle smart della barra laterale." },
          { text: "Usa gli operatori di ricerca: is:unread from:boss" },
          { text: "Token dinamici: __LAST_7_DAYS__, __LAST_30_DAYS__, __TODAY__" },
          { text: "Ogni cartella smart mostra nella barra laterale il numero di messaggi non letti." },
          { text: "Modifica o elimina le cartelle smart in Impostazioni > Regole posta." },
        ],
        relatedSettingsTab: "mail-rules",
      },
      {
        id: "filters",
        icon: Filter,
        title: "Filtri e regole",
        summary: "Ordina automaticamente la posta in arrivo per mittente, oggetto o contenuto.",
        description:
          "Crea regole di filtro che elaborano automaticamente la posta in arrivo. Imposta i criteri (corrispondenza per indirizzo del mittente, oggetto o contenuto del messaggio) e assegna le azioni (applica un'etichetta, archivia, sposta nel Cestino, contrassegna con la stella o segna come letto). I criteri usano la corrispondenza di sottostringhe senza distinzione tra maiuscole e minuscole, con logica AND: tutti i criteri devono essere soddisfatti. Quando più filtri corrispondono allo stesso messaggio, le loro azioni vengono unite. I filtri vengono eseguiti automaticamente su ogni nuovo messaggio durante la sincronizzazione.",
        tips: [
          { text: "Crea i filtri in Impostazioni > Regole posta." },
          { text: "Criteri: corrispondenza per Da, Oggetto o Contenuto (logica AND)." },
          { text: "Azioni: applica etichetta, archivia, sposta nel Cestino, aggiungi stella, segna come letto." },
          { text: "Se più filtri corrispondono, le loro azioni vengono unite." },
          { text: "I filtri vengono eseguiti su ogni nuovo messaggio durante la sincronizzazione in background." },
        ],
        relatedSettingsTab: "mail-rules",
      },
      {
        id: "smart-labels",
        icon: Tags,
        title: "Etichette smart",
        summary: "Etichettatura automatica con IA tramite descrizioni in linguaggio naturale.",
        description:
          "Descrivi con parole tue quali email devono ricevere un'etichetta, ad esempio 'Candidature di lavoro e opportunità di carriera', e l'IA etichetta automaticamente le email corrispondenti a ogni sincronizzazione. Puoi anche aggiungere criteri tradizionali facoltativi (mittente, oggetto, ecc.) per una corrispondenza deterministica immediata prima di ricorrere all'IA. Le etichette smart supportano l'assegnazione di più etichette, quindi una stessa conversazione può corrispondere a più regole contemporaneamente. Usa il pulsante 'Applica alle email esistenti' per applicare le etichette alla posta in arrivo attuale.",
        tips: [
          { text: "Crea le etichette smart in Impostazioni > Regole posta > Etichette smart." },
          { text: "Scrivi una descrizione in linguaggio naturale di ciò che l'etichetta deve riconoscere." },
          { text: "Facoltativo: aggiungi criteri tradizionali (mittente, oggetto) per una corrispondenza immediata senza IA." },
          { text: "Fai clic su 'Applica alle email esistenti' per etichettare retroattivamente la posta in arrivo attuale." },
          { text: "Le etichette smart vengono eseguite automaticamente su ogni nuova email durante la sincronizzazione." },
          { text: "Richiede un provider IA attivo (Claude, GPT o Gemini)." },
        ],
        relatedSettingsTab: "mail-rules",
      },
      {
        id: "quick-steps",
        icon: Zap,
        title: "Passaggi rapidi",
        summary: "Concatena più azioni in un solo clic.",
        description:
          "I passaggi rapidi permettono di riunire più azioni in una sola. Ad esempio, puoi creare un passaggio rapido che applica un'etichetta, archivia la conversazione e la segna come letta, tutto con un solo clic. Sono disponibili 18 tipi di azione, tra cui etichettare, archiviare, spostare nel Cestino, aggiungere la stella, segnare come letto/non letto, rispondere, inoltrare e altro. I modelli predefiniti aiutano a iniziare e puoi crearne di personalizzati per il tuo flusso di lavoro.",
        tips: [
          { text: "Accedi ai passaggi rapidi dalla barra delle azioni di una conversazione." },
          { text: "18 tipi di azione disponibili: etichetta, archivia, cestino, stella, segna come letto, rispondi, inoltra e altro." },
          { text: "Crea e gestisci i passaggi rapidi in Impostazioni > Regole posta." },
          { text: "Sono disponibili modelli predefiniti come punto di partenza." },
        ],
        relatedSettingsTab: "mail-rules",
      },
      {
        id: "star-pin-mute",
        icon: Star,
        title: "Stella, Fissa e Silenzia",
        summary: "Contrassegna, dai priorità o silenzia le conversazioni.",
        description:
          "Aggiungi la stella alle conversazioni per contrassegnarle da riprendere: le conversazioni con la stella hanno una vista dedicata nella barra laterale. Fissa le conversazioni per tenerle in cima all'elenco delle email, a prescindere dalla data. Silenzia le conversazioni per non essere più disturbato: le conversazioni silenziate vengono archiviate automaticamente e le risposte successive non compariranno nella posta in arrivo né genereranno notifiche.",
        tips: [
          { text: "Aggiungi / rimuovi la stella", shortcut: "s" },
          { text: "Fissa / rimuovi dai fissati", shortcut: "p" },
          { text: "Silenzia / riattiva", shortcut: "m" },
          { text: "Le conversazioni con la stella compaiono nella vista Speciali della barra laterale." },
          { text: "Le conversazioni fissate restano in cima all'elenco a prescindere dalla data." },
          { text: "Le conversazioni silenziate vengono archiviate automaticamente e non generano notifiche." },
        ],
      },
      {
        id: "archive-trash",
        icon: Trash2,
        title: "Archivia e Cestino",
        summary: "Togli dalla posta in arrivo o elimina definitivamente.",
        description:
          "Archivia toglie una conversazione dalla posta in arrivo ma la mantiene in Tutti i messaggi, dove resta ricercabile e accessibile. Cestino sposta una conversazione nella cartella Cestino. Eliminare una conversazione già nel Cestino la rimuove definitivamente dal database. Questa eliminazione in due fasi evita cancellazioni definitive accidentali. Le conversazioni archiviate tornano nella posta in arrivo se qualcuno risponde.",
        tips: [
          { text: "Archivia", shortcut: "e" },
          { text: "Cestino", shortcut: "#" },
          { text: "Funziona anche con i tasti Canc o Backspace." },
          { text: "Eliminare dal Cestino rimuove definitivamente la conversazione." },
          { text: "Le conversazioni archiviate tornano nella posta in arrivo quando arrivano nuove risposte." },
        ],
      },
      {
        id: "move-to-folder",
        icon: FolderInput,
        title: "Sposta in una cartella",
        summary: "Sposta rapidamente le conversazioni in qualsiasi cartella o etichetta.",
        description:
          "Premi V per aprire un riquadro con ricerca in cui scegliere la cartella o l'etichetta di destinazione. Digita per filtrare l'elenco, usa le frecce per spostarti e premi Invio per spostare la conversazione. Per Gmail, lo spostamento aggiunge l'etichetta di destinazione e toglie la conversazione dalla posizione attuale. Per gli account IMAP, la conversazione viene spostata nella cartella selezionata sul server. Funziona con la selezione multipla: sposta più conversazioni insieme.",
        tips: [
          { text: "Apri la finestra Sposta in", shortcut: "v" },
          { text: "Digita per cercare e filtrare le destinazioni." },
          { text: "Spostati con le frecce, seleziona con Invio." },
          { text: "Disponibile anche dalla barra delle azioni e dal menu contestuale." },
          { text: "Funziona con le conversazioni selezionate in blocco, per spostamenti multipli." },
        ],
      },
      {
        id: "multi-select",
        icon: MousePointer,
        title: "Selezione multipla e azioni di gruppo",
        summary: "Seleziona più conversazioni per eseguire operazioni in blocco.",
        description:
          "Fai clic sulle conversazioni per attivare o disattivare la selezione. Maiusc+clic seleziona un intervallo dall'ultima conversazione selezionata a quella cliccata. Con più conversazioni selezionate, qualsiasi azione (archivia, cestino, stella, etichetta, ecc.) si applica a tutte contemporaneamente. Anche le scorciatoie da tastiera funzionano sulla selezione: premi e per archiviare tutte le conversazioni selezionate, # per spostarle nel Cestino, ecc.",
        tips: [
          { text: "Seleziona tutte le conversazioni", shortcut: "Ctrl+A" },
          { text: "Seleziona un intervallo dalla posizione corrente", shortcut: "Ctrl+Shift+A" },
          { text: "Fai clic per attivare o disattivare la selezione di una singola conversazione." },
          { text: "Maiusc+clic per selezionare un intervallo di conversazioni." },
          { text: "Tutte le azioni da tastiera (archivia, cestino, stella) funzionano sulla selezione." },
          { text: "Premi Escape per annullare la selezione." },
        ],
      },
      {
        id: "bulk-actions",
        icon: ListFilter,
        title: "Barra delle azioni di gruppo",
        summary: "Una barra degli strumenti compare quando sono selezionate più conversazioni.",
        description:
          "Quando selezioni due o più conversazioni, in cima all'elenco delle email compare una barra delle azioni di gruppo. Offre pulsanti a un clic per le operazioni in blocco più comuni: Archivia, Elimina, Segnala come indesiderata e Annulla selezione. È più rapida delle scorciatoie da tastiera quando vuoi controllare visivamente la selezione prima di agire. La barra mostra anche quante conversazioni sono selezionate.",
        tips: [
          { text: "Seleziona più conversazioni, poi usa la barra per eseguire rapidamente azioni di gruppo." },
          { text: "Azioni disponibili: Archivia, Elimina, Indesiderata, Annulla selezione." },
          { text: "La barra mostra il numero di conversazioni selezionate." },
          { text: "Anche le scorciatoie da tastiera funzionano sulla selezione, insieme alla barra." },
        ],
      },
      {
        id: "attachment-library",
        icon: Paperclip,
        title: "Libreria degli allegati",
        summary: "Sfoglia e cerca tutti i tuoi allegati in un unico posto.",
        description:
          "La Libreria degli allegati offre una vista ricercabile e filtrabile di tutti gli allegati di tutte le tue email. Trova i file senza ricordare in quale email si trovavano. Filtra per tipo di file (immagini, PDF, documenti, fogli di calcolo, archivi), mittente, intervallo di date o dimensione. Passa dalla vista a griglia a quella a elenco. Visualizza in anteprima immagini e PDF direttamente, scarica i file o vai subito alla conversazione originale.",
        tips: [
          { text: "Vai agli Allegati", shortcut: "g a" },
          { text: "Apri gli Allegati dalla navigazione della barra laterale (icona della graffetta)." },
          { text: "Cerca per nome del file, oggetto o nome del mittente." },
          { text: "Filtra per tipo, mittente, intervallo di date o dimensione del file." },
          { text: "Fai clic su un allegato per visualizzarlo in anteprima, scaricarlo o andare all'email." },
          { text: "Passa dalla vista a griglia a quella a elenco con il selettore nell'intestazione." },
        ],
      },
      {
        id: "drag-drop",
        icon: GripVertical,
        title: "Trascinamento",
        summary: "Trascina le conversazioni sulle etichette della barra laterale per applicarle.",
        description:
          "Afferra una conversazione (o più conversazioni selezionate) dall'elenco delle email e trascinala su una qualsiasi etichetta della barra laterale per applicare quell'etichetta. La destinazione si evidenzia quando ci passi sopra. Funziona sia con le etichette personalizzate sia con le cartelle di sistema come il Cestino. Le conversazioni selezionate in blocco vengono etichettate tutte insieme al rilascio.",
        tips: [
          { text: "Tieni premuto su una conversazione per iniziare a trascinarla." },
          { text: "Rilascia su una qualsiasi etichetta della barra laterale per applicarla." },
          { text: "Funziona con le conversazioni selezionate in blocco: tutte vengono etichettate." },
          { text: "L'etichetta della barra laterale si evidenzia quando viene rilevata una destinazione valida." },
        ],
      },
    ],
  },
  {
    id: "productivity",
    label: "Produttività",
    icon: Clock,
    cards: [
      {
        id: "snooze",
        icon: Clock,
        title: "Posticipa",
        summary: "Nascondi temporaneamente una conversazione e falla riapparire più tardi.",
        description:
          "Posticipa toglie una conversazione dalla posta in arrivo e la riporta alla data e all'ora che scegli. Così puoi rimandare le email che non puoi gestire subito senza perderle di vista. Quando arriva l'ora, la conversazione riappare nella posta in arrivo come se fosse appena arrivata. Le conversazioni posticipate sono visibili nella cartella Posticipate della barra laterale. Tecnicamente, posticipare rimuove l'etichetta INBOX e aggiunge un'etichetta SNOOZED.",
        tips: [
          { text: "Fai clic sull'icona Posticipa nella barra delle azioni della conversazione." },
          { text: "Scegli tra le opzioni rapide (più tardi oggi, domani, la prossima settimana) o imposta un orario personalizzato." },
          { text: "Visualizza tutte le conversazioni posticipate nella cartella Posticipate della barra laterale." },
          { text: "Annulla in anticipo il posticipo aprendo la conversazione e facendo clic su Annulla posticipo." },
        ],
      },
      {
        id: "follow-up-reminders",
        icon: BellRing,
        title: "Promemoria di sollecito",
        summary: "Ricevi un promemoria se non arriva una risposta.",
        description:
          "Dopo aver inviato un'email importante, imposta un promemoria di sollecito. Se nessuno risponde entro il periodo scelto (ad esempio 2 giorni, 1 settimana), riceverai una notifica che ti ricorda di sollecitare. Il promemoria scatta solo se la conversazione non ha nuove risposte: se qualcuno risponde prima della scadenza, il promemoria viene annullato automaticamente. I promemoria di sollecito vengono controllati in background ogni 60 secondi.",
        tips: [
          { text: "Imposta un promemoria di sollecito dalla barra delle azioni della conversazione." },
          { text: "Scegli un periodo: 1 giorno, 2 giorni, 1 settimana o personalizzato." },
          { text: "I promemoria si annullano automaticamente se arriva una risposta prima della scadenza." },
          { text: "Riceverai una notifica sul desktop quando il sollecito è in scadenza." },
        ],
      },
      {
        id: "split-inbox",
        icon: Columns2,
        title: "Posta in arrivo divisa",
        summary: "Dividi la posta in arrivo in schede per categoria.",
        description:
          "La posta in arrivo divisa organizza la posta in cinque schede per categoria: Principale, Aggiornamenti, Promozioni, Social e Newsletter. Ogni scheda mostra solo le conversazioni di quella categoria, così puoi concentrarti su ciò che conta. Le nuove email vengono categorizzate automaticamente con l'IA (o, in alternativa, con regole). Attiva o disattiva la divisione dall'icona accanto a Posta in arrivo nella barra laterale. Quando la modalità divisa è disattivata, tutte le categorie vengono mostrate insieme.",
        tips: [
          { text: "Attiva la posta in arrivo divisa dall'icona delle colonne accanto a Posta in arrivo nella barra laterale." },
          { text: "Categorie: Principale, Aggiornamenti, Promozioni, Social, Newsletter." },
          { text: "L'IA categorizza automaticamente le nuove email durante la sincronizzazione." },
          { text: "Prima viene applicata la categorizzazione basata su regole, poi l'IA completa il resto." },
          { text: "Puoi archiviare automaticamente le categorie diverse da Principale nelle Impostazioni." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "spam",
        icon: AlertTriangle,
        title: "Posta indesiderata",
        summary: "Segnala la posta indesiderata o recupera le email legittime.",
        description:
          "Segna le email indesiderate come spam per spostarle nella cartella Posta indesiderata. L'azione dipende dal contesto: quando visualizzi la cartella Posta indesiderata, il pulsante diventa \"Non è indesiderata\" così puoi recuperare le email legittime segnalate per errore. Per gli account Gmail, le segnalazioni si sincronizzano con Gmail per migliorarne il filtro antispam. Per gli account IMAP, i messaggi vengono spostati nella cartella Junk/Spam del server.",
        tips: [
          { text: "Segnala come indesiderata / Non è indesiderata", shortcut: "!" },
          { text: "Nella cartella Posta indesiderata, la scorciatoia segna le conversazioni come non indesiderate." },
          { text: "Account Gmail: le segnalazioni contribuiscono a migliorare nel tempo il filtro di Gmail." },
          { text: "Account IMAP: i messaggi vengono spostati nella cartella Junk/Spam sul server." },
        ],
      },
    ],
  },
  {
    id: "ai-features",
    label: "Funzioni IA",
    icon: Sparkles,
    cards: [
      {
        id: "ai-overview",
        icon: Brain,
        title: "Panoramica dell'IA",
        summary: "Scegli il tuo provider IA e usa la tua chiave.",
        description:
          "L'app supporta tre provider IA: Anthropic Claude, OpenAI GPT e Google Gemini. Usi la tua chiave API, quindi i dati delle tue email vengono inviati direttamente all'API del provider, senza intermediari né server di terze parti. Le chiavi API sono conservate in modo sicuro nel tuo database locale. Le funzioni IA comprendono riassunti delle conversazioni, risposte intelligenti, assistenza alla scrittura, trasformazione del testo e interrogazioni della posta in linguaggio naturale. Puoi attivare o disattivare le funzioni IA a livello globale e scegliere quale provider usare.",
        tips: [
          { text: "Aggiungi la tua chiave API in Impostazioni > IA." },
          { text: "Provider supportati: Claude, OpenAI e Gemini." },
          {
            text: "Scegli il modello da usare per ogni provider nelle Impostazioni (ad esempio Claude Haiku 4.5, GPT-4o Mini, Gemini 2.5 Flash).",
          },
          { text: "I tuoi dati vanno direttamente all'API del provider, senza intermediari." },
          { text: "Le chiavi API sono conservate in modo sicuro nel tuo database locale." },
          { text: "I risultati dell'IA vengono memorizzati in locale per ridurre le chiamate API." },
          { text: "Disattiva l'IA a livello globale con un solo interruttore nelle Impostazioni." },
        ],
        relatedSettingsTab: "ai",
      },
      {
        id: "thread-summaries",
        icon: FileText,
        title: "Riassunti delle conversazioni",
        summary: "Riassunto generato dall'IA delle conversazioni lunghe.",
        description:
          "Per le conversazioni con molti messaggi, fai clic sul pulsante del riassunto per ottenere una sintesi concisa generata dall'IA. Il riassunto raccoglie i punti chiave, le decisioni e le azioni da compiere dell'intera conversazione, risparmiandoti la lettura di decine di messaggi. I riassunti vengono memorizzati in locale, quindi paghi la chiamata API una sola volta. È particolarmente utile per le conversazioni in cui sei in copia o che devi recuperare dopo un'assenza.",
        tips: [
          { text: "Fai clic sull'icona del riassunto nell'intestazione della vista conversazione." },
          { text: "I riassunti sono memorizzati: le visualizzazioni successive sono istantanee e gratuite." },
          { text: "Ideale per le conversazioni lunghe con più di 5 messaggi." },
          { text: "Raccoglie decisioni chiave, azioni da compiere e conclusioni." },
        ],
      },
      {
        id: "smart-replies",
        icon: MessageSquare,
        title: "Risposte intelligenti",
        summary: "Risposte rapide suggerite dall'IA.",
        description:
          "Quando visualizzi una conversazione, l'IA analizza l'ultimo messaggio e suggerisce 2-3 brevi opzioni di risposta, come \"Va bene, grazie!\", \"Controllo e ti faccio sapere.\" oppure \"Sono disponibile martedì prossimo.\" Fai clic su un suggerimento per inserirlo nell'editor di risposta, poi modificalo prima di inviare. Le risposte intelligenti fanno risparmiare tempo per le risposte rapide e di routine.",
        tips: [
          { text: "I suggerimenti di risposta intelligente compaiono sotto l'ultimo messaggio di una conversazione." },
          { text: "Fai clic su un suggerimento per inserirlo nell'editor di risposta." },
          { text: "Modifica il suggerimento prima di inviare: è un punto di partenza, non una versione definitiva." },
          { text: "I suggerimenti tengono conto del contesto, in base al contenuto dell'email." },
        ],
      },
      {
        id: "ai-compose",
        icon: Wand2,
        title: "Scrittura e trasformazione con l'IA",
        summary: "Scrivi email o riscrivi il testo con l'aiuto dell'IA.",
        description:
          "Apri il pannello Assistente IA nell'editor di scrittura per ricevere aiuto nella stesura delle email. Descrivi cosa vuoi dire e l'IA genera una bozza. Puoi anche selezionare un testo esistente e trasformarlo: cambiare il tono (formale, informale, amichevole), correggere grammatica e ortografia, tradurlo in un'altra lingua, accorciarlo o espanderlo, oppure semplificare un linguaggio complesso. Tutte le trasformazioni avvengono direttamente nell'editor.",
        tips: [
          { text: "Apri l'Assistente IA dall'icona a scintilla nella barra degli strumenti dell'editor." },
          { text: "Descrivi la tua email e l'IA genera una bozza." },
          { text: "Seleziona il testo da trasformare: tono, grammatica, traduzione, accorciamento, espansione." },
          { text: "Le trasformazioni sostituiscono direttamente il testo selezionato." },
          { text: "Rivedi e modifica il risultato dell'IA prima di inviare." },
        ],
      },
      {
        id: "auto-drafts",
        icon: PenSquare,
        title: "Bozze di risposta automatiche con l'IA",
        summary: "L'editor di risposta si compila con una bozza generata dall'IA nel tuo stile di scrittura.",
        description:
          "Quando fai clic su Rispondi o Rispondi a tutti, l'editor viene compilato automaticamente con una bozza generata dall'IA che rispecchia il tuo stile. L'IA impara il tuo stile analizzando le 15 email inviate più recenti: coglie il tono, il modo di salutare, la formula di chiusura e le espressioni tipiche. Il profilo dello stile viene memorizzato per ogni account, quindi l'analisi avviene una sola volta. Anche le bozze vengono memorizzate per conversazione e modalità di risposta. Puoi rigenerare la bozza, cancellarla e ricominciare da capo, oppure semplicemente modificarla. Se inizi a scrivere prima che la bozza si carichi, la compilazione automatica viene annullata, così non vieni mai interrotto. Le bozze automatiche funzionano per Rispondi e Rispondi a tutti, non per Inoltra.",
        tips: [
          { text: "Attiva o disattiva le bozze automatiche in Impostazioni > IA > Bozze di risposta automatiche." },
          { text: "Lo stile di scrittura viene appreso dalle tue 15 email inviate più recenti." },
          { text: "Fai clic su Rigenera per ottenere una nuova bozza per la stessa conversazione." },
          { text: "Fai clic su Cancella per eliminare la bozza e scrivere da zero." },
          { text: "Scrivere prima che la bozza si carichi annulla la compilazione automatica." },
          { text: "Le bozze sono memorizzate: riaprire la stessa risposta è istantaneo." },
          { text: "Fai clic su Rianalizza nelle Impostazioni per aggiornare il profilo del tuo stile di scrittura." },
        ],
        relatedSettingsTab: "ai",
      },
      {
        id: "ask-inbox",
        icon: MailQuestion,
        title: "Chiedi alla Posta in arrivo",
        summary: "Fai domande sulla tua posta in linguaggio naturale.",
        description:
          "Fai domande in linguaggio naturale sulla tua posta in arrivo e ottieni risposte generate dall'IA. Ad esempio: \"Cosa ha detto Marco sulla scadenza del terzo trimestre?\", \"Mostrami tutte le ricevute del mese scorso\" oppure \"Riassumi le mie email non lette di oggi.\" L'IA cerca nel database locale delle tue email, trova le conversazioni pertinenti e genera una risposta completa con riferimenti a email specifiche.",
        tips: [
          { text: "Apri Chiedi alla Posta in arrivo dall'area di ricerca o dal riquadro comandi." },
          { text: "Chiedi in linguaggio naturale: non servono operatori di ricerca." },
          { text: "Esempi: \"Qual è lo stato dell'accordo con Rossi?\"" },
          { text: "L'IA cerca le email pertinenti nel tuo database locale." },
          { text: "Le risposte includono riferimenti a conversazioni specifiche su cui puoi fare clic per aprirle." },
        ],
      },
    ],
  },
  {
    id: "newsletters",
    label: "Newsletter e iscrizioni",
    icon: Newspaper,
    cards: [
      {
        id: "newsletter-bundles",
        icon: Newspaper,
        title: "Raggruppamenti di newsletter",
        summary: "Raggruppa le newsletter per mittente con consegna programmata.",
        description:
          "Raggruppa le newsletter dello stesso mittente in modo che arrivino secondo un programma a tua scelta: ogni giorno, ogni settimana o in giorni specifici. Invece di distrarti con le newsletter durante la giornata, vengono trattenute e consegnate in blocco. Ogni raggruppamento riunisce tutte le email di quel mittente in un'unica voce della barra laterale. Puoi creare raggruppamenti per singolo mittente e impostare orari di consegna diversi per ciascuno.",
        tips: [
          { text: "Gestisci i raggruppamenti in Impostazioni > Persone." },
          { text: "Scegli la frequenza di consegna: ogni giorno, ogni settimana o in giorni specifici." },
          { text: "Le newsletter raggruppate vengono trattenute fino alla successiva consegna." },
          { text: "Ogni mittente può avere un proprio orario di consegna." },
        ],
        relatedSettingsTab: "people",
      },
      {
        id: "unsubscribe",
        icon: MailMinus,
        title: "Annulla iscrizione",
        summary: "Annulla l'iscrizione alle mailing list con un clic.",
        description:
          "Quando visualizzi una newsletter o un'email promozionale, fai clic su Annulla iscrizione (o premi u) per annullare subito l'iscrizione. L'app rileva l'intestazione List-Unsubscribe e gestisce la procedura automaticamente con il metodo POST a un clic RFC 8058, quando disponibile, oppure ricorre a un annullamento tramite mailto:. Le tue azioni di annullamento vengono registrate, così puoi tenere traccia delle iscrizioni annullate.",
        tips: [
          { text: "Annulla l'iscrizione dalla conversazione corrente", shortcut: "u" },
          { text: "Usa l'annullamento a un clic RFC 8058 quando disponibile." },
          { text: "Ricorre all'annullamento tramite mailto: se il metodo a un clic non è supportato." },
          { text: "Visualizza la cronologia degli annullamenti in Impostazioni > Persone." },
        ],
        relatedSettingsTab: "people",
      },
    ],
  },
  {
    id: "notifications-contacts",
    label: "Notifiche e contatti",
    icon: Bell,
    cards: [
      {
        id: "notifications-vip",
        icon: Bell,
        title: "Notifiche e mittenti VIP",
        summary: "Notifiche sul desktop con filtraggio intelligente.",
        description:
          "Ricevi notifiche sul desktop quando arriva nuova posta. Le notifiche intelligenti ti permettono di scegliere quali categorie della posta in arrivo generano notifiche (ad esempio solo Principale), riducendo il rumore di aggiornamenti e promozioni. Aggiungi i mittenti VIP che generano sempre una notifica a prescindere dalla categoria: utile per il tuo capo, i clienti chiave o la famiglia. Le conversazioni silenziate non generano mai notifiche. Le notifiche usano il sistema di notifica nativo del tuo sistema operativo.",
        tips: [
          { text: "Attiva le notifiche in Impostazioni > Notifiche." },
          { text: "Notifiche intelligenti: scegli quali categorie generano avvisi." },
          { text: "Aggiungi mittenti VIP che notificano sempre, a prescindere dalla categoria." },
          { text: "Le conversazioni silenziate non generano mai notifiche." },
          { text: "Usa il sistema di notifica nativo del tuo sistema operativo (Windows, macOS, Linux)." },
        ],
        relatedSettingsTab: "notifications",
      },
      {
        id: "contact-sidebar",
        icon: Users,
        title: "Barra laterale del contatto",
        summary: "Visualizza i dettagli del contatto, la cronologia e le azioni rapide.",
        description:
          "Fai clic sul nome o sull'avatar di un mittente per aprire la barra laterale del contatto. Mostra la foto del profilo (tramite Gravatar), l'indirizzo email, quanto spesso gli hai scritto, quando vi siete messi in contatto la prima volta, le conversazioni recenti, gli allegati condivisi e le azioni rapide (scrivi una nuova email, copia l'indirizzo). La barra laterale ti dà il contesto su chi stai scrivendo senza uscire dalla posta in arrivo.",
        tips: [
          { text: "Fai clic sul nome o sull'avatar di un mittente per aprire la barra laterale del contatto." },
          { text: "Mostra foto del profilo, email, frequenza dei contatti e data del primo contatto." },
          { text: "Azioni rapide: scrivi una nuova email, copia l'indirizzo." },
          { text: "Sfoglia le conversazioni e gli allegati condivisi di recente." },
          { text: "Aggiungi note sui contatti per tuo riferimento." },
        ],
        relatedSettingsTab: "people",
      },
    ],
  },
  {
    id: "security",
    label: "Sicurezza e privacy",
    icon: Shield,
    cards: [
      {
        id: "phishing-detection",
        icon: AlertTriangle,
        title: "Rilevamento del phishing",
        summary: "Analisi automatica dei link delle email alla ricerca di minacce.",
        description:
          "I link di ogni email vengono analizzati con 10 regole euristiche che individuano i più comuni schemi di phishing: URL basati su indirizzi IP, attacchi omografici/punycode, TLD sospetti, abbreviatori di URL, differenze tra il testo visualizzato e l'URL reale, percorsi sospetti, imitazione di nomi di marchi, protocolli pericolosi (javascript:, data:), indirizzi email gratuiti che si spacciano per aziende e falsificazione dei sottodomini. Le email a rischio mostrano un banner di avviso. Puoi regolare la sensibilità (bassa, predefinita, alta) e aggiungere alla lista consentita i mittenti attendibili per eliminare gli avvisi.",
        tips: [
          { text: "Regola la sensibilità (bassa / predefinita / alta) nelle Impostazioni." },
          { text: "Bassa: rileva solo le minacce evidenti. Alta: più aggressiva, può dare falsi positivi." },
          { text: "Aggiungi alla lista consentita i mittenti attendibili per eliminare gli avvisi." },
          { text: "10 regole euristiche coprono i più comuni schemi di phishing." },
          { text: "Il banner di avviso compare in cima alle email a rischio." },
          { text: "I risultati dell'analisi sono memorizzati: ogni link viene analizzato una sola volta." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "auth-badges",
        icon: CheckCircle,
        title: "Badge di autenticazione (SPF/DKIM/DMARC)",
        summary: "Verifica se l'identità del mittente è confermata.",
        description:
          "Ogni email mostra un badge di autenticazione che indica se il mittente ha superato i controlli SPF (verifica dell'IP del mittente), DKIM (firma del messaggio) e DMARC (criterio di allineamento). Un badge verde significa che tutti i controlli sono stati superati: l'email proviene davvero da chi dice di essere. Un badge rosso indica controlli falliti, il che potrebbe significare che l'email è contraffatta. Arancione indica un superamento parziale. Queste informazioni vengono ricavate dall'intestazione Authentication-Results dell'email.",
        tips: [
          { text: "Badge verde: tutti i controlli di autenticazione sono stati superati." },
          { text: "Badge rosso: uno o più controlli falliti, possibile falsificazione." },
          { text: "Badge arancione: superamento parziale, alcuni controlli non conclusivi." },
          { text: "Fai clic sul badge per vedere i risultati dettagliati di SPF, DKIM e DMARC." },
          { text: "I dati di autenticazione provengono dalle intestazioni dell'email." },
        ],
      },
      {
        id: "remote-image-blocking",
        icon: ImageOff,
        title: "Blocco delle immagini remote",
        summary: "Blocca per impostazione predefinita i pixel di tracciamento e le immagini remote.",
        description:
          "Le immagini remote (caricate da server esterni) sono bloccate per impostazione predefinita per proteggere la tua privacy. Molte email promozionali usano pixel di tracciamento invisibili che avvisano il mittente quando apri la sua email. Quando le immagini sono bloccate, vedrai dei segnaposto al loro posto. Puoi consentire le immagini per mittenti specifici (vengono aggiunti a una lista consentita) oppure disattivare il blocco a livello globale nelle Impostazioni. Le immagini dei mittenti consentiti si caricano automaticamente nelle email future.",
        tips: [
          { text: "Le immagini sono bloccate per impostazione predefinita a tutela della privacy." },
          { text: "Fai clic su \"Mostra immagini\" in un'email per caricare le immagini di quel mittente." },
          { text: "I mittenti consentiti vengono ricordati: la volta successiva le immagini si caricano automaticamente." },
          { text: "Disattiva il blocco a livello globale in Impostazioni > Generale." },
          { text: "Blocca i pixel di tracciamento che segnalano quando apri un'email." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "link-confirmation",
        icon: LinkIcon,
        title: "Conferma dei link",
        summary: "Controlla gli URL prima di aprirli nel browser.",
        description:
          "Quando fai clic su un link in un'email, una finestra di conferma mostra l'URL di destinazione reale prima di aprirlo. Così eviti di visitare per errore siti dannosi che mascherano i loro URL con un testo dall'aspetto innocuo. La finestra mostra l'URL completo per verificare che sembri legittimo. Puoi scegliere di procedere, copiare l'URL o annullare. È particolarmente utile in combinazione con il rilevamento del phishing.",
        tips: [
          { text: "Ogni clic su un link mostra una conferma con l'URL reale." },
          { text: "Verifica che il dominio sembri legittimo prima di procedere." },
          { text: "Copia l'URL per esaminarlo meglio se hai dei dubbi." },
          { text: "Funziona insieme al rilevamento del phishing per una protezione a più livelli." },
        ],
      },
    ],
  },
  {
    id: "calendar",
    label: "Calendario",
    icon: Calendar,
    cards: [
      {
        id: "calendar-integration",
        icon: Calendar,
        title: "Integrazione con Google Calendar",
        summary: "Visualizza e gestisci il calendario insieme alla posta.",
        description:
          "Accedi al tuo Google Calendar direttamente dalla barra laterale. Passa tra le viste giorno, settimana e mese. Vedi tutti i tuoi eventi con il supporto dei calendari colorati (se hai più calendari Google). Crea nuovi eventi direttamente dall'app senza passare al browser. Il calendario usa lo stesso account Google della tua posta e si aggiorna automaticamente. Spostati tra le date con i controlli della barra degli strumenti.",
        tips: [
          { text: "Apri Calendario dalla navigazione della barra laterale." },
          { text: "Passa tra le viste Giorno, Settimana e Mese dalla barra degli strumenti." },
          { text: "Fai clic su una fascia oraria per creare un nuovo evento." },
          { text: "Supporta più calendari Google con codifica a colori." },
          { text: "Il calendario usa lo stesso OAuth di Google della tua posta." },
          { text: "Gli eventi si aggiornano automaticamente in background." },
        ],
      },
    ],
  },
  {
    id: "tasks",
    label: "Attività",
    icon: CheckSquare,
    cards: [
      {
        id: "task-manager",
        icon: ListTodo,
        title: "Gestione delle attività",
        summary: "Gestione completa delle attività con priorità, scadenze e sottoattività.",
        description:
          "Velo include un gestore di attività integrato, accessibile dalla barra laterale o con la scorciatoia g poi k. Crea attività con titolo, descrizione, priorità (nessuna, bassa, media, alta, urgente), scadenza e tag. Le attività possono avere un livello di sottoattività per suddividere gli elementi complessi. Trascina per riordinare le attività, filtra per stato o priorità e raggruppa per priorità, scadenza o tag. Le attività completate possono essere mostrate o nascoste. Il pannello laterale delle attività mostra quelle collegate alla conversazione corrente.",
        tips: [
          { text: "Vai alla pagina Attività", shortcut: "g k" },
          { text: "Apri le attività dalla voce Attività della barra laterale." },
          { text: "Aggiungi rapidamente un'attività dal campo in fondo al pannello laterale delle attività." },
          { text: "Il badge nella barra laterale mostra il numero di attività da completare." },
          { text: "Filtra le attività per stato (tutte, attive, completate) o per priorità." },
          { text: "Raggruppa le attività per priorità, scadenza o tag." },
        ],
      },
      {
        id: "ai-task-extraction",
        icon: Sparkles,
        title: "Estrazione di attività con l'IA",
        summary: "Premi t per estrarre un'attività dall'email corrente con l'IA.",
        description:
          "Quando visualizzi una conversazione, premi t per far analizzare all'IA la conversazione ed estrarne un'attività concreta. L'IA individua titolo, descrizione, scadenza suggerita e priorità dal contenuto dell'email. Una finestra mostra l'attività estratta con campi modificabili: regola titolo, descrizione, priorità o scadenza prima di crearla. L'attività è collegata alla conversazione, così puoi sempre tornare al contesto originale. È disponibile anche dal riquadro comandi come 'Crea attività dall'email (IA)'.",
        tips: [
          { text: "Estrai un'attività dall'email", shortcut: "t" },
          { text: "Disponibile anche nel riquadro comandi (Ctrl+K → 'Crea attività dall'email')." },
          { text: "Modifica i campi estratti prima di creare l'attività." },
          { text: "L'attività rimanda alla conversazione email originale." },
          { text: "Richiede un provider IA attivo (Claude, GPT o Gemini)." },
        ],
        relatedSettingsTab: "ai",
      },
      {
        id: "task-sidebar",
        icon: ListTodo,
        title: "Pannello laterale delle attività",
        summary: "Visualizza e gestisci le attività collegate alla conversazione corrente.",
        description:
          "Attiva il pannello laterale delle attività dalla barra delle azioni (icona ListTodo) per vedere le attività associate alla conversazione corrente. Il pannello mostra le attività collegate con stato, priorità e scadenza. Puoi aggiungere rapidamente nuove attività dal pannello, segnarle come completate o passare alla pagina Attività completa. Le attività create con l'estrazione IA vengono collegate automaticamente alla conversazione di origine.",
        tips: [
          { text: "Attiva il pannello delle attività dal pulsante nella barra delle azioni." },
          { text: "Aggiungi rapidamente attività con il campo in fondo al pannello." },
          { text: "Fai clic su 'Vedi tutte le attività' per aprire la pagina Attività completa." },
          { text: "Le attività estratte dall'IA vengono collegate automaticamente all'email." },
        ],
      },
      {
        id: "recurring-tasks",
        icon: Repeat,
        title: "Attività ricorrenti",
        summary: "Attività che si ripetono automaticamente secondo una pianificazione.",
        description:
          "Crea attività che si ripetono secondo una pianificazione: ogni giorno, settimana, mese o anno, con intervalli configurabili. Quando completi un'attività ricorrente, l'occorrenza successiva viene creata automaticamente con la scadenza spostata in avanti dell'intervallo di ricorrenza. È utile per revisioni periodiche, report settimanali, aggiornamenti mensili o qualsiasi responsabilità ripetitiva. L'icona di ricorrenza compare sulle attività con una pianificazione impostata.",
        tips: [
          { text: "Imposta la ricorrenza quando crei o modifichi un'attività." },
          { text: "Opzioni: giornaliera, settimanale, mensile, annuale con intervallo." },
          { text: "Completare un'attività ricorrente crea l'occorrenza successiva." },
          { text: "L'icona di ricorrenza indica che l'attività ha una pianificazione." },
        ],
      },
    ],
  },
  {
    id: "appearance",
    label: "Aspetto e layout",
    icon: Palette,
    cards: [
      {
        id: "theme",
        icon: Sun,
        title: "Modalità chiara e scura",
        summary: "Passa tra tema chiaro, scuro o di sistema.",
        description:
          "Scegli tra modalità chiara, modalità scura o in linea con il sistema (segue l'impostazione del tuo sistema operativo). La modalità scura usa colori scelti con cura per una lettura confortevole in ambienti poco luminosi, con uno sfondo più scuro e un testo più morbido. Il tema cambia all'istante e resta salvato dopo il riavvio. Anche lo sfondo sfumato animato si adatta: la modalità chiara usa blu/viola/rosa, la modalità scura usa blu e viola più profondi.",
        tips: [
          { text: "Cambia il tema in Impostazioni > Generale." },
          { text: "\"Sistema\" segue la preferenza chiaro/scuro del tuo sistema operativo." },
          { text: "La modalità scura è ottimizzata per gli ambienti poco luminosi." },
          { text: "Lo sfondo sfumato animato si adatta alla modalità chiara/scura." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "accent-colors",
        icon: Palette,
        title: "Colori principali",
        summary: "Temi colore predefiniti per personalizzare l'app.",
        description:
          "Scegli tra i temi colore predefiniti per personalizzare l'aspetto dell'app: Mail (predefinito), Grafite, Carta, Nord, Salvia o Notte. Ogni tema ha varianti separate per la modalità chiara e scura, ottimizzate per la leggibilità. Il colore principale viene usato per pulsanti, stati attivi, link, badge ed evidenziazioni in tutta l'app. I colori principali sono indipendenti dal tema chiaro/scuro.",
        tips: [
          { text: "Cambia il colore principale in Impostazioni > Generale." },
          { text: "Temi predefiniti: Mail, Grafite, Carta, Nord, Salvia, Notte." },
          { text: "Ogni colore ha varianti chiara e scura ottimizzate." },
          { text: "Il colore principale è indipendente dal tema chiaro/scuro." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "font-density",
        icon: Type,
        title: "Dimensione del carattere e densità delle email",
        summary: "Regola la dimensione del testo e la spaziatura dell'elenco.",
        description:
          "La scala del carattere regola la dimensione complessiva del testo nell'app: Piccola, Predefinita, Grande o Molto grande. La densità delle email controlla la spaziatura nell'elenco: Compatta (più conversazioni visibili), Predefinita (equilibrata) o Ampia (più spazio). Le due impostazioni si combinano: usa un carattere grande con densità ampia per l'accessibilità, oppure un carattere piccolo con densità compatta per vedere di più in un colpo d'occhio.",
        tips: [
          { text: "Dimensioni del carattere: Piccola, Predefinita, Grande, Molto grande." },
          { text: "Opzioni di densità: Compatta, Predefinita, Ampia." },
          { text: "La densità compatta mostra più conversazioni nell'elenco delle email." },
          { text: "Carattere grande + densità ampia è ottimo per l'accessibilità." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "layout-customization",
        icon: Columns2,
        title: "Personalizzazione del layout",
        summary: "Regola la barra laterale, il pannello di lettura e la larghezza dell'elenco.",
        description:
          "Personalizza il layout del tuo spazio di lavoro: comprimi la barra laterale in modalità solo icone per avere più spazio sullo schermo, scegli la posizione del pannello di lettura (destra, in basso o nascosto), trascina il divisore per ridimensionare la larghezza dell'elenco delle email e attiva o disattiva la barra laterale del contatto. Tutte le preferenze di layout vengono salvate e ripristinate automaticamente all'avvio. Anche per la barra laterale esiste una scorciatoia da tastiera per un accesso rapido.",
        tips: [
          { text: "Mostra/nascondi la barra laterale", shortcut: "Ctrl+Shift+E" },
          { text: "Comprimi la barra laterale in sole icone per avere più spazio sullo schermo." },
          { text: "Trascina il divisore tra elenco e pannello per regolare le larghezze." },
          { text: "Tutte le preferenze di layout restano salvate dopo il riavvio." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "sidebar-customization",
        icon: Layout,
        title: "Personalizzazione della barra laterale",
        summary: "Nascondi, mostra e riordina le voci di navigazione della barra laterale.",
        description:
          "Controlla quali voci compaiono nella barra laterale e in che ordine. Vai in Impostazioni > Generale > Barra laterale per attivare o disattivare la visibilità di qualsiasi voce di navigazione (Speciali, Posticipate, Posta inviata, Bozze, Cestino, Posta indesiderata, Tutti i messaggi, Attività, Calendario, Allegati) e riordinarle con le frecce su/giù. Puoi anche nascondere del tutto le sezioni Cartelle smart ed Etichette. La Posta in arrivo è sempre visibile e non può essere nascosta. Usa \"Ripristina predefiniti\" per ripristinare il layout originale. Le modifiche hanno effetto immediato e restano salvate dopo il riavvio.",
        tips: [
          { text: "Nascondi le voci che usi di rado per ridurre il disordine nella barra laterale." },
          { text: "Riordina le voci per mettere in cima le cartelle che usi di più." },
          { text: "Disattiva Cartelle smart o Etichette per nascondere quelle sezioni." },
          { text: "La Posta in arrivo è sempre visibile e non può essere nascosta." },
          { text: "Fai clic su \"Ripristina predefiniti\" per ripristinare l'ordine originale." },
        ],
        relatedSettingsTab: "general",
      },
    ],
  },
  {
    id: "accounts-system",
    label: "Account e sistema",
    icon: UserCircle,
    cards: [
      {
        id: "multi-account",
        icon: Users,
        title: "Account multipli",
        summary: "Gestisci account Gmail e IMAP affiancati.",
        description:
          "Aggiungi e gestisci più account email: puoi mescolare liberamente account Gmail (OAuth) e IMAP/SMTP. Ogni account ha la propria posta in arrivo, le proprie etichette, i propri filtri e il proprio stato di sincronizzazione. Passa da un account all'altro con il selettore in cima alla barra laterale. L'email dell'account attivo è mostrata nella vista principale. Puoi aggiungere, riautorizzare o rimuovere gli account nelle Impostazioni. Ogni account si sincronizza in modo indipendente con un proprio ciclo di 60 secondi.",
        tips: [
          { text: "Fai clic sul selettore degli account in cima alla barra laterale per cambiare account." },
          { text: "Mescola account Gmail e IMAP: funzionano affiancati." },
          { text: "Ogni account ha posta in arrivo, etichette e sincronizzazione indipendenti." },
          { text: "Aggiungi o rimuovi gli account in Impostazioni > Account." },
          { text: "Riautorizza un account Gmail se il token scade." },
        ],
        relatedSettingsTab: "accounts",
      },
      {
        id: "system-tray",
        icon: Minimize2,
        title: "Area di notifica e avvio automatico",
        summary: "Riduci nell'area di notifica e apri all'avvio.",
        description:
          "Quando chiudi la finestra dell'app, questa si riduce nell'area di notifica invece di uscire: l'app resta in esecuzione in background, continuando a sincronizzare la posta e a controllare le notifiche. Fai clic sull'icona nell'area di notifica per mostrare di nuovo la finestra, oppure clic destro per un menu (mostra, controlla la posta, esci). Attiva l'avvio automatico per aprire l'app all'accensione del computer: parte ridotta nell'area di notifica, pronta all'uso senza ingombrare la barra delle applicazioni.",
        tips: [
          { text: "Chiudere la finestra riduce l'app nell'area di notifica (non esce)." },
          { text: "Clic destro sull'icona nell'area di notifica per: Mostra, Controlla posta, Esci." },
          { text: "Attiva l'avvio automatico in Impostazioni > Generale." },
          { text: "L'avvio automatico parte ridotto a icona: l'app è pronta in background." },
          { text: "L'app continua a sincronizzare e a notificare mentre è nell'area di notifica." },
        ],
        relatedSettingsTab: "general",
      },
      {
        id: "global-compose",
        icon: Monitor,
        title: "Scorciatoia globale di scrittura",
        summary: "Scrivi da qualsiasi punto con una scorciatoia valida in tutto il sistema.",
        description:
          "Registra una scorciatoia da tastiera valida in tutto il sistema che apre la finestra di scrittura da qualsiasi punto del computer, anche quando l'app è ridotta nell'area di notifica o è in primo piano un'altra app. Così puoi inviare subito un'email senza cambiare finestra. La scorciatoia è personalizzabile in Impostazioni > Scorciatoie. La finestra dell'app comparirà con l'editor di scrittura aperto e pronto.",
        tips: [
          { text: "Imposta la scorciatoia globale di scrittura in Impostazioni > Scorciatoie." },
          { text: "Funziona anche quando l'app è ridotta nell'area di notifica." },
          { text: "La finestra di scrittura si apre subito quando premi la scorciatoia." },
          { text: "Funziona da qualsiasi applicazione, senza bisogno di passare prima all'app." },
        ],
        relatedSettingsTab: "shortcuts",
      },
      {
        id: "pop-out-windows",
        icon: ExternalLink,
        title: "Finestre separate",
        summary: "Apri le conversazioni in finestre separate.",
        description:
          "Apri qualsiasi conversazione in una finestra indipendente per leggere affiancando più contenuti, consultarla o lavorare su più cose insieme. Le finestre separate hanno una propria vista conversazione con tutte le funzioni: puoi leggere, rispondere, inoltrare ed eseguire azioni senza tornare alla finestra principale. Ogni finestra separata è di 800x700 pixel per impostazione predefinita e può essere ridimensionata. Più conversazioni possono essere aperte contemporaneamente.",
        tips: [
          { text: "Fai clic sull'icona della finestra separata nella barra delle azioni della conversazione." },
          { text: "Le finestre separate sono pienamente funzionanti: leggi, rispondi e agisci." },
          { text: "Più conversazioni possono essere aperte in finestre separate." },
          { text: "Le finestre separate sono indipendenti dalla finestra principale dell'app." },
        ],
      },
      {
        id: "manual-sync",
        icon: RefreshCw,
        title: "Sincronizzazione manuale",
        summary: "Avvia subito la sincronizzazione della cartella corrente.",
        description:
          "Premi F5 per sincronizzare subito la cartella o l'etichetta corrente invece di attendere il successivo ciclo di sincronizzazione in background di 60 secondi. È utile quando aspetti un'email e non vuoi attendere, oppure dopo aver fatto modifiche in un altro client. Per Gmail, scarica le nuove modifiche della cronologia; per IMAP, controlla la presenza di nuovi UID nella cartella corrente.",
        tips: [
          { text: "Sincronizza la cartella corrente", shortcut: "F5" },
          { text: "La sincronizzazione in background viene eseguita automaticamente ogni 60 secondi." },
          { text: "La sincronizzazione manuale è utile quando aspetti una nuova email." },
        ],
      },
      {
        id: "offline-mode",
        icon: WifiOff,
        title: "Modalità offline",
        summary: "Continua a lavorare senza connessione a Internet.",
        description:
          "Archivia, aggiungi la stella, sposta nel Cestino, sposta, etichetta e scrivi email anche quando sei offline. Le modifiche vengono messe in coda in locale e si sincronizzano automaticamente al ritorno della connessione. Quando sei offline compare un banner in cima allo schermo e la barra laterale mostra quante operazioni sono in sospeso. Le azioni ridondanti (come aggiungere e poi togliere la stella) vengono compattate automaticamente, così si sincronizza solo il risultato finale.",
        tips: [
          { text: "Tutte le azioni funzionano offline: archivia, stella, cestino, etichette, scrittura." },
          { text: "Le modifiche in sospeso si sincronizzano automaticamente alla riconnessione." },
          { text: "Controlla le operazioni in sospeso e non riuscite in Impostazioni > Account." },
          { text: "Le operazioni non riuscite possono essere riprovate o cancellate dalle Impostazioni." },
        ],
        relatedSettingsTab: "accounts",
      },
    ],
  },
];

// ---------- Contextual Tips ----------

export const CONTEXTUAL_TIPS: Record<string, ContextualTip> = {
  "reading-pane": {
    title: "Pannello di lettura",
    body: "Scegli dove mostrare il pannello di lettura: a destra, in basso o nascosto. La posizione a destra funziona meglio sugli schermi larghi.",
    helpTopic: "reading-email",
  },
  "split-inbox": {
    title: "Posta in arrivo divisa",
    body: "Dividi la posta in arrivo in categorie (Principale, Aggiornamenti, Promozioni, Social, Newsletter) per concentrarti su ciò che conta di più.",
    helpTopic: "productivity",
  },
  "undo-send": {
    title: "Annulla invio",
    body: "Imposta di quanti secondi disponi per annullare l'invio di un'email. Puoi scegliere fino a 30 secondi.",
    helpTopic: "composing",
  },
  "smart-notifications": {
    title: "Notifiche intelligenti",
    body: "Ricevi notifiche solo per le categorie che ti interessano. Aggiungi i mittenti VIP che generano sempre una notifica a prescindere dalla categoria.",
    helpTopic: "notifications-contacts",
  },
  "phishing-sensitivity": {
    title: "Sensibilità del rilevamento del phishing",
    body: "Bassa rileva solo le minacce evidenti. Predefinita è equilibrata. Alta segnala in modo più aggressivo ma può dare falsi positivi.",
    helpTopic: "security",
  },
  "ai-provider": {
    title: "Provider IA",
    body: "Scegli tra Claude, OpenAI o Gemini. Usi la tua chiave API: i tuoi dati vengono inviati direttamente al provider, mai tramite intermediari.",
    helpTopic: "ai-features",
  },
  "search-operators": {
    title: "Operatori di ricerca",
    body: "Usa from:, to:, subject:, has:attachment, is:unread, before:, after: e label: per restringere la ricerca.",
    helpTopic: "search-navigation",
  },
  "filters": {
    title: "Filtri automatici",
    body: "I filtri vengono eseguiti su ogni nuovo messaggio durante la sincronizzazione. I criteri usano la logica AND e, quando più filtri corrispondono, le loro azioni vengono unite.",
    helpTopic: "organization",
  },
  "smart-labels": {
    title: "Etichette smart",
    body: "Descrivi con parole tue quali email devono ricevere un'etichetta. L'IA etichetta automaticamente le email corrispondenti durante la sincronizzazione. I criteri facoltativi offrono una corrispondenza immediata senza IA.",
    helpTopic: "organization",
  },
};

// ---------- Helpers ----------

/** Get all cards across all categories (for search) */
export function getAllCards(): (HelpCard & { categoryId: string; categoryLabel: string })[] {
  return HELP_CATEGORIES.flatMap((cat) =>
    cat.cards.map((card) => ({
      ...card,
      categoryId: cat.id,
      categoryLabel: cat.label,
    })),
  );
}

/** Find a category by its ID */
export function getCategoryById(id: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((cat) => cat.id === id);
}
