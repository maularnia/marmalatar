# Marmalatar

Marmalatar is a .srt/.ass subtitles editor with subtitle synchronization and AI automated translation functionality.

Marmalatar is built and maintained by Maularnia project. If you'd like to support development, visit the [Patreon page](https://www.patreon.com/maularnia).

## General information

Main program feature set is:

- **Subtitle Editor** create/delete/update/remove .srt, .ass subtitles lines in a convenient table representation.
- **Subtitle Sync** synchronize video and subtitles
- **AI integration** automate initial translation step using cloud or self-hosted AI instances.
- **Editing** provide spellcheck for all supported languages and useful subtitle translation tooling.
- **Conversion** allows exporting project as custom .json and csv files and .ass, .srt.

Everybody is welcome here to develop and support the project as well as using it for any suitable purpose, but initially the **Marmalatar is Belarusian dubbing community-first** and exists to streamline and simplify their work, improve speed and quality of translations through Belarusian spellcheck and self-hosted AI translation support.

Feel free adding your native language support for interface or editing.
Russian language support will not be added until the end of the war. Fork-off.

The program is free for all and will always stay free.

AI disclaimer: AI was used during development and will be used in the future.

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

Windows application is supposed to update itself automatically. For Linux distros, you will need to update it manually, installing newer packages on top of the old ones.

## Supported formats

| Format                             | Import | Export |
| ---------------------------------- | ------ | ------ |
| SubRip (`.srt`)                    | ✅     | ✅     |
| Advanced SubStation Alpha (`.ass`) | ✅     | ✅     |
| CSV                                | ❌     | ✅     |
| JSON                               | ❌     | ✅     |

## Build your own

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
