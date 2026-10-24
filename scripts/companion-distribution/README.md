# Unvibe companion

This source package connects the Unvibe web app to Claude Code sessions on your own computer and renders your chosen lessons to MP4. It is not an installer for Claude Code.

## Start on your computer

1. Install Node.js 24 or later from https://nodejs.org/.
2. Download `unvibe-companion.tar.gz` from https://unvibe-learnagram.web.app/connect. Extract it using your archive app, or run `tar -xzf unvibe-companion.tar.gz` in the download folder.
3. Open a terminal in the extracted `unvibe-companion` folder and run:

   ```sh
   npm install
   npm run companion
   ```

   These commands work in macOS, Linux and PowerShell. The included lockfile pins dependencies; `npm ci` can replace `npm install` for an exact clean installation.

4. Open the private pairing link printed in the terminal, on the same computer. It opens https://unvibe-learnagram.web.app/connect. Keep the terminal running. Allow access to your local network if your browser requests it.
5. Pick a session, review the transcript, then generate a lesson. Claude Code generation requires the official Claude Code CLI installed and signed in: https://code.claude.com/docs/en/setup. Run `claude auth login` in your terminal and create a Claude Code session in your own project first.

If you choose the explicit **Local analysis** option, the companion builds an excerpt-based lesson without calling a model. MP4 rendering runs locally through Remotion; the first export may download its browser. An internet connection is needed for dependencies, the initial renderer download, and web fonts. Claude generation uses your own Claude account and its applicable usage limits. Optional narration uses your own ElevenLabs account.

## Optional voice

Create a new `.env.local` file inside this extracted folder with your own setting:

```text
ELEVENLABS_API_KEY=your_own_key
```

Restart the companion, then enable narration. Do not share this file. No credentials or `.env` files are included in the download.

## Local development or another origin

The included `start.mjs` defaults `LEARNAGRAM_FRONTEND_URL` to `https://unvibe-learnagram.web.app/connect`. To use a local development app, set `LEARNAGRAM_FRONTEND_URL=http://127.0.0.1:5174/connect` in your own `.env.local` and restart. An environment value you set explicitly takes precedence. The companion permits only its configured web app origins and listens on `127.0.0.1`; a phone cannot connect to a different computer's loopback address.

## Your data

The companion discovers session files under your local `~/.claude/projects` directory. Claude authentication stays in Claude Code. A selected, reviewed transcript is sent to Claude only when you choose Claude generation. A selected lesson is sent to ElevenLabs only when you enable narration. Generated lessons and MP4 files remain in the companion's data directory on this computer. Copying a lesson into the web app saves it in that browser's local library.

The pairing link grants access to your local companion: keep it private. Stop the companion with Ctrl+C. The browser cannot generate another lesson while it is stopped. Installed web apps may use separate storage, so open the pairing link in the installed app or paste the token into its connection form when needed.

## Package contents and verification

This archive contains only the companion source, the generated-lesson renderer source, pinned package files, this README and source checksums. It contains no saved sessions, private configuration, cloud functions, generated media, installed dependencies or Claude credentials. `public/README.txt` keeps the renderer's otherwise empty public directory present.

On macOS or Linux, you can check the included files before installing:

```sh
shasum -a 256 -c checksums.sha256
```
