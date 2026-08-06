# Marmalatar

Marmalatar is a subtitle translation editor for people who translate subtitles.

## General information

Marmalatar exists to strip the extra functionality out of existing subtitle tooling and simplify the process of bringing AI into the translation workflow. It focuses on doing one modern format well instead of dragging along support for every legacy subtitle format under the sun, and it's built so that Belarusian subtitle translators have a tool of their own that they can shape to their own needs, with native support for the Belarusian language throughout the UI.

The editor is built keystroke-first: creating, deleting, and exporting a translation is a workflow you can drive entirely from the keyboard, without ever having to reach for the mouse.

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
| CSV | ✅ | ✅ |
| JSON | ✅ | ✅ |

## License

GPL-3.0 — see [LICENSE](LICENSE).
