# Marmalatar

Marmalatar is a subtitle translation editor for people who translate subtitles.

## General information

Marmalatar exists to strip the extra functionality out of existing subtitle tooling and simplify the process of bringing AI into the translation workflow. It focuses on doing one modern format well instead of dragging along support for every legacy subtitle format under the sun, and it's built so that Belarusian subtitle translators have a tool of their own that they can shape to their own needs, with native support for the Belarusian language throughout the UI.

The editor is built keystroke-first: creating, deleting, and exporting a translation is a workflow you can drive entirely from the keyboard, without ever having to reach for the mouse.

## Installation

Download the latest build for your platform from the 
[Releases page](https://github.com/maularnia/marmalatar/releases):
[Maularnia website](https://maularnia.com)

- **Windows** — download the `.exe` installer and run it.
- **Linux (AppImage)** — download the `.AppImage`, make it executable, and run it directly (no install needed):

  ```sh
  chmod +x ./Marmalatar-*.AppImage
  ./Marmalatar-*.AppImage
  ```

- **Debian/Ubuntu** — download the `.deb` package from the Releases page and install it:

  ```sh
  sudo apt install ./Marmalatar_*.deb
  ```

- **Arch Linux** — download the `.pacman` package from the Releases page and install it with `pacman`:

  ```sh
  sudo pacman -U ./Marmalatar-*.pacman
  ```

- **Fedora/RHEL/openSUSE** — download the `.rpm` package from the Releases page and install it:

  ```sh
  sudo rpm -i ./Marmalatar-*.rpm
  ```

Marmalatar checks for updates on launch and installs them automatically in the background, notifying you once a new version is ready (applied the next time you restart the app).

## Support the project

Marmalatar is built and maintained by Maularnia. If you'd like to support development, visit the [Patreon page](https://www.patreon.com/maularnia).

## Features

- **Keystroke-first editing** — create, split, merge, delete, and export subtitle lines entirely from the keyboard via global and zone-scoped keystroke handling.
- **AI-assisted translation** — translate lines using DeepL, a local LM Studio model, or a local Ollama model, with configurable prompts and per-line or batch translation.
- **Glossary support** — maintain a project glossary of terms and apply it consistently across AI-assisted translations.
- **Spellcheck** — built-in Hunspell-based spellchecking with bundled dictionaries for Belarusian, English, German, Spanish, Italian, Polish, and Ukrainian.
- **Video and waveform sync** — attach a source video to a project and edit subtitle timing against an audio waveform, powered by ffmpeg.
- **Line tools** — merge, split, auto-merge, cleanup, and copy-override utilities for shaping subtitle lines during translation.
- **Project files** — save and reload translation projects, independent of the subtitle format being worked on.
- **Native Belarusian UI** — the interface is available in Belarusian (Cyrillic and Latin scripts) alongside English.
- **Theming** — light, dark, and system-driven themes.

## Supported formats

| Format | Import | Export |
| --- | --- | --- |
| SubRip (`.srt`) | ✅ | ✅ |
| Advanced SubStation Alpha (`.ass`) | ✅ | ✅ |
| CSV | ❌ | ✅ |
| JSON | ❌ | ✅ |

## Building from source

Requires [Node.js](https://nodejs.org/) 22+ and npm.

```sh
git clone https://github.com/maularnia/marmalatar.git
cd marmalatar
npm install
```

**Run in development** (hot-reloading dev server + Electron):

```sh
npm start
```

**Build an installable package** for your current platform (output lands in `release/`):

```sh
npm run make
```

## License

GPL-3.0 — see [LICENSE](LICENSE).
