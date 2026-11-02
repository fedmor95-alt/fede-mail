<p align="center">
  <img src="assets/icon.png?v1" alt="Velo Fedmor" width="160" height="160" />
</p>

<h1 align="center">Velo Fedmor</h1>

<p align="center">
  Client di posta desktop per Windows, Fedora e macOS, con push, inbox unificata e PEC.<br />
  Basato su <a href="https://github.com/avihaymenahem/velo">Velo</a> (Apache-2.0), costruito con Tauri, React e Rust.
</p>

---

## Cosa fa

- **Inbox unificata.** «Tutte le caselle» mostra la posta di tutti gli account in un'unica lista. Ricerca e composizione lavorano sulla stessa vista: la ricerca guarda in tutte le caselle e nel campo «Da» si sceglie l'account da cui inviare.
- **Push.** Ogni account tiene aperta una connessione IMAP IDLE sulla Posta in arrivo e la posta nuova arriva in pochi secondi. Se la connessione cade, si ricollega da sola. Se il server non supporta IDLE, l'app controlla la posta ogni 20 secondi.
- **Gmail leggero.** Scarica solo intestazioni e anteprime dei 1.500 thread più recenti. Il testo di un messaggio si scarica quando lo apri, insieme ai messaggi vicini. La posta più vecchia si trova con la ricerca, che interroga anche i server di Gmail.
- **PEC.**
  - La busta di trasporto viene aperta e il messaggio originale (`postacert.eml`) è mostrato con i suoi allegati e l'etichetta «PEC».
  - Le ricevute di accettazione, consegna e mancata consegna vengono collegate al messaggio inviato tramite il `msgid` di `daticert.xml` / `X-Riferimento-Message-ID`.
  - La lista mostra lo stato: Accettata, Consegnata o Errore.
  - Le ricevute non compaiono in Posta in arrivo. Per mostrarle: Impostazioni → «Mostra ricevute PEC in Posta in arrivo».
- **Aspetto.** Pannelli pieni, tema predefinito «Windows 11» (Fluent; su macOS il predefinito è «Mail») più Mail, Grafite, Carta, Nord, Salvia e Notte. Ogni tema ha una variante chiara e una scura, che segue il sistema.

### Scorciatoie principali

| Windows / Linux | macOS | Azione |
|---|---|---|
| ↑ / ↓ (o J / K) | ↑ / ↓ (o J / K) | Messaggio precedente / successivo |
| Invio (o O) | ↩ (o O) | Apri conversazione |
| Canc / Backspace | ⌫ | Elimina |
| E | E | Archivia |
| Ctrl+Z | ⌘Z | Annulla l'ultima azione: eliminazione, archiviazione o posticipo (funziona anche quando il cursore è nel testo dell'email) |
| M (o Shift+U) | M (o ⇧U) | Segna come letto / da leggere |
| Ctrl+N (o C) | ⌘N (o C) | Scrivi nuova email |
| Ctrl+R (o R) | ⌘R (o R) | Rispondi |
| Ctrl+Shift+R (o A) | ⇧⌘R (o A) | Rispondi a tutti |
| Ctrl+L (o F) | ⌘L (o F) | Inoltra |
| Ctrl+J (o !) | ⌘J (o !) | Posta indesiderata |
| Ctrl+F (o /) | ⌘F (o /) | Cerca |
| Ctrl+K | ⌘K | Riquadro comandi |
| Ctrl+, | ⌘, | Impostazioni |
| Ctrl+Shift+E | ⇧⌘E | Mostra / nasconde la barra laterale |
| Ctrl+Shift + / − / 0 | ⇧⌘ + / − / 0 | Testo più grande / più piccolo / normale |
| ? (o F1) | ? (o F1) | Elenco delle scorciatoie |

Su Mac il tasto Ctrl delle combinazioni diventa ⌘ (Cmd), e la guida dell'app (?) e Impostazioni → Scorciatoie mostrano già i tasti Mac. L'elenco completo è in Impostazioni → Scorciatoie.

## Configurazione

### Google (Gmail e Google Workspace)

L'app usa un client OAuth «Desktop» di un progetto Google Cloud:

1. Il progetto deve avere attive la **Gmail API** (e la **Calendar API**, se serve il calendario).
2. La schermata di consenso deve essere **In produzione**: in modalità Test i token scadono dopo 7 giorni.
3. Al primo avvio si incollano in Velo l'ID client e il client secret: Impostazioni → Account → Google.
4. Si aggiunge l'account con «Aggiungi account» → Google.

Il push di Gmail usa l'ambito `https://mail.google.com/`. Gli account aggiunti prima di questa modifica vanno ri-autorizzati da Impostazioni → Account → «Riautorizza».

### PEC Aruba

Si aggiunge con «Aggiungi account» → IMAP (il dominio `pec.it` viene riconosciuto automaticamente):

| | Server | Porta | Sicurezza |
|---|---|---|---|
| IMAP | `imaps.pec.aruba.it` | 993 | SSL/TLS |
| SMTP | `smtps.pec.aruba.it` | 465 | SSL/TLS |

Nome utente: l'indirizzo PEC completo. La password resta cifrata nel database locale.

### Dove stanno i dati

- Database e cache: `%APPDATA%\com.velomail.app\` (Windows), `~/.local/share/com.velomail.app/` (Linux), `~/Library/Application Support/com.velomail.app/` (macOS)
- Log, compresi gli errori dell'interfaccia: `%LOCALAPPDATA%\com.velomail.app\logs\` (Windows), `~/Library/Logs/com.velomail.app/` (macOS)

## macOS

La release contiene un'app universale (Apple Silicon e Intel) per macOS 10.15 o successivo: il file `.dmg` da installare e il `.app.tar.gz` usato dagli aggiornamenti automatici.

### Installazione

1. Apri il `.dmg` e trascina l'app nella cartella Applicazioni.
2. L'app non è firmata con un certificato Apple né notarizzata (non c'è un account Apple Developer), quindi al primo avvio macOS la blocca. Per aprirla:
   - in Finder, **tasto destro sull'app → Apri**, poi conferma con «Apri». Su macOS 15 o successivo, se manca il pulsante: Impostazioni di Sistema → Privacy e sicurezza → «Apri comunque»;
   - oppure, da Terminale, togli la quarantena:

     ```bash
     xattr -dr com.apple.quarantine /Applications/Velo*.app
     ```

     Il nome dell'app è quello che vedi in Applicazioni: se non inizia con «Velo», sostituisci `Velo*.app` con il nome esatto, tra virgolette. Se macOS dice che l'app «è danneggiata», si risolve con lo stesso comando.

Serve una volta sola: dopo, l'app si apre normalmente.

### Aggiornamenti

L'aggiornamento automatico sostituisce il `.app` installato con quello nuovo, scaricato dalla release (`.app.tar.gz` firmato con la chiave dell'updater). Il `.dmg` serve solo per la prima installazione. Gli aggiornamenti arrivano dall'app già autorizzata, quindi non serve ripetere «Apri» o `xattr`.

### Su Mac è diverso

- Le scorciatoie usano ⌘ al posto di Ctrl (vedi la tabella sopra).
- I pulsanti della finestra sono quelli nativi a sinistra (i «semafori»).
- Chiudendo la finestra l'app resta attiva nella barra dei menu; si riapre dall'icona nel Dock o nella barra dei menu.
- Il tema predefinito per una nuova installazione è «Mail».

## Sviluppo

Servono Node 20+, Rust stable e i [prerequisiti di Tauri](https://tauri.app/start/prerequisites/).

```bash
npm ci
npm run tauri dev      # app in sviluppo
npm run test           # test frontend (vitest)
cargo test --manifest-path src-tauri/Cargo.toml --lib   # test Rust
npm run tauri build    # installer locale
```

Su Windows, prima di ricompilare va chiusa del tutto l'app (anche dall'icona di notifica): altrimenti `velo.exe` resta bloccato.

Una build avviata da `src-tauri/target` non propone aggiornamenti automatici: l'aggiornamento installerebbe la nuova versione nella cartella dell'app installata, e la build locale continuerebbe a chiederlo. Si aggiorna ricompilando. Per ricevere gli aggiornamenti usa l'app installata (`%LOCALAPPDATA%\Velo Fedmor\velo.exe` su Windows).

## Rilascio e aggiornamenti automatici

L'app installata controlla `https://github.com/fedmor95-alt/fede-mail/releases/latest/download/latest.json`. Quando trova una versione più nuova, la scarica, verifica la firma e propone di installarla.

### Chiave di firma (una volta sola)

La chiave è stata generata in locale con:

```bash
openssl rand -hex 24 > ~/.tauri/fede-mail.key.password
npx tauri signer generate --ci -p "$(cat ~/.tauri/fede-mail.key.password)" -w ~/.tauri/fede-mail.key
```

- **Chiave privata e password:** `%USERPROFILE%\.tauri\fede-mail.key` e `fede-mail.key.password`. Non vanno mai nel repository, perché chi le ha può distribuire aggiornamenti. Tienine una copia di sicurezza, per esempio nel gestore di password.
- **Chiave pubblica:** è in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
- **Segreti GitHub:** `TAURI_SIGNING_PRIVATE_KEY` con il contenuto della chiave privata e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` con la password. Si impostano da Settings → Secrets and variables → Actions, oppure da terminale:

  ```bash
  gh secret set TAURI_SIGNING_PRIVATE_KEY --repo fedmor95-alt/fede-mail < ~/.tauri/fede-mail.key
  gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo fedmor95-alt/fede-mail < ~/.tauri/fede-mail.key.password
  ```

Se la chiave privata va persa, le versioni già installate non accettano più aggiornamenti. In quel caso bisogna generare una nuova chiave e reinstallare l'app a mano.

### Pubblicare una versione

La versione si legge solo da `package.json`.

```bash
npm version patch            # oppure minor / major: crea il commit e il tag vX.Y.Z
git push --follow-tags
```

Il tag avvia `.github/workflows/release.yml`, che:

1. esegue i test;
2. compila l'installer Windows (NSIS), i pacchetti Linux (rpm per Fedora, più AppImage) e l'app macOS universale (`.dmg` e `.app.tar.gz`);
3. firma gli artefatti di aggiornamento;
4. pubblica la release su GitHub con `latest.json`;
5. controlla che `latest.json` contenga Windows, Linux e macOS (`darwin-aarch64`, `darwin-x86_64`).

Per firmare e notarizzare l'app Mac servirà un account Apple Developer: i passi sono già pronti, commentati, in `release.yml` (segreti `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`).

Dopo qualche minuto le app installate si aggiornano da sole.

Su Fedora l'rpm si installa con `sudo dnf install ./Velo*Fedmor*.rpm`. L'aggiornamento automatico di Tauri funziona per l'installer Windows, per l'AppImage e per l'app macOS. L'rpm si aggiorna reinstallando il nuovo pacchetto.

## Crediti e licenza

Velo Fedmor è una versione modificata di [Velo](https://github.com/avihaymenahem/velo) di Avihay Menahem e dei contributori di Velo. Come l'originale, è distribuita con licenza [Apache 2.0](LICENSE). Le modifiche sono elencate in [NOTICE](NOTICE). Il README originale di Velo, con la documentazione completa delle funzioni ereditate, è in [docs/README-velo.md](docs/README-velo.md).
