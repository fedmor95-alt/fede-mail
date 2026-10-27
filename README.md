<p align="center">
  <img src="assets/icon.png?v1" alt="Fede Mail" width="160" height="160" />
</p>

<h1 align="center">Fede Mail</h1>

<p align="center">
  Client di posta desktop per Windows e Fedora, con push, inbox unificata e PEC.<br />
  Basato su <a href="https://github.com/avihaymenahem/velo">Velo</a> (Apache-2.0), costruito con Tauri, React e Rust.
</p>

---

## Cosa fa

- **Inbox unificata.** «Tutte le caselle» mostra la posta di tutti gli account in un'unica lista, con un pallino colorato per account. Ricerca e composizione lavorano sulla stessa vista: la ricerca guarda in tutte le caselle e nel campo «Da» si sceglie l'account da cui inviare.
- **Push.** Ogni account tiene aperta una connessione IMAP IDLE sulla Posta in arrivo e la posta nuova arriva in pochi secondi. Se la connessione cade, si ricollega da sola. Se il server non supporta IDLE, l'app controlla la posta ogni 20 secondi.
- **Gmail leggero.** Scarica solo intestazioni e anteprime dei 1.500 thread più recenti. Il testo di un messaggio si scarica quando lo apri, insieme ai messaggi vicini. La posta più vecchia si trova con la ricerca, che interroga anche i server di Gmail.
- **PEC.**
  - La busta di trasporto viene aperta e il messaggio originale (`postacert.eml`) è mostrato con i suoi allegati e l'etichetta «PEC».
  - Le ricevute di accettazione, consegna e mancata consegna vengono collegate al messaggio inviato tramite il `msgid` di `daticert.xml` / `X-Riferimento-Message-ID`.
  - La lista mostra lo stato: Accettata, Consegnata o Errore.
  - Le ricevute non compaiono in Posta in arrivo. Per mostrarle: Impostazioni → «Mostra ricevute PEC in Posta in arrivo».
- **Aspetto.** Pannelli pieni in stile Apple Mail e sei temi: Mail, Grafite, Carta, Nord, Salvia e Notte. Ogni tema ha una variante chiara e una scura, che segue il sistema.

### Scorciatoie principali

| Tasto | Azione |
|---|---|
| ↑ / ↓ | Messaggio precedente / successivo |
| Backspace / Canc | Elimina |
| E | Archivia |
| Ctrl+Z | Annulla l'ultima eliminazione o archiviazione (entro 6 secondi) |
| Ctrl+Shift + / − / 0 | Testo più grande / più piccolo / normale |
| Ctrl+Shift+E | Mostra / nasconde la barra laterale |
| C, R, A, F | Scrivi, Rispondi, Rispondi a tutti, Inoltra |

L'elenco completo è in Impostazioni → Scorciatoie.

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

- Database e cache: `%APPDATA%\com.velomail.app\` (Windows), `~/.local/share/com.velomail.app/` (Linux)
- Log, compresi gli errori dell'interfaccia: `%LOCALAPPDATA%\com.velomail.app\logs\Velo.log`

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
2. compila l'installer Windows (NSIS) e i pacchetti Linux (rpm per Fedora, più AppImage);
3. firma gli artefatti di aggiornamento;
4. pubblica la release su GitHub con `latest.json`.

Dopo qualche minuto le app installate si aggiornano da sole.

Su Fedora l'rpm si installa con `sudo dnf install ./Fede*.rpm`. L'aggiornamento automatico di Tauri funziona per l'installer Windows e per l'AppImage. L'rpm si aggiorna reinstallando il nuovo pacchetto.

## Crediti e licenza

Fede Mail è una versione modificata di [Velo](https://github.com/avihaymenahem/velo) di Avihay Menahem e dei contributori di Velo. Come l'originale, è distribuita con licenza [Apache 2.0](LICENSE). Le modifiche sono elencate in [NOTICE](NOTICE). Il README originale di Velo, con la documentazione completa delle funzioni ereditate, è in [docs/README-velo.md](docs/README-velo.md).
