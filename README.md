# Relay Bridge — public version

Bridge **1 USDC on Base (chain 8453) to USDC on Arbitrum One (chain 42161)**, using the Relay API. This is the shareable version: anyone can open its public link in any browser, including a wallet browser (MetaMask, Coinbase Wallet, Rabby), connect a wallet, get a quote and bridge.

It is different from the Muse app: the Muse app only opens inside Muse. This version is a small Node server you deploy on PXXL, so it gets a real public link you can send to people.

## How it works

- `public/index.html` — the bridge page. Connect wallet, amount (defaults to 1 USDC), get a quote, execute the quote's steps in your wallet, track the fill, save a receipt on your own device (localStorage).
- `server.js` — Express server. Serves the page, and proxies two calls to Relay:
  - `POST /api/quote` → `https://api.relay.link/quote/v2`
  - `POST /api/status` → `https://api.relay.link/intents/status/v3`
- The Relay API key lives **only on the server**, in the `RELAY_API_KEY` environment variable. It is never in the frontend code, never in any file in this repo, and never sent to the browser.

## Deploy on PXXL (plain English)

Do this once. You need a GitHub account and a PXXL account (sign in at pxxl.app, "Continue with GitHub" works).

1. **Create a GitHub repo.** On github.com, **+ → New repository**, name it `relay-bridge-public`, set it to **Public**, click **Create repository**.
2. **Upload these files.** In the new repo, use **Add file → Upload files** and upload everything in this folder: `server.js`, `package.json`, `public/index.html`, `.env.example`, `README.md`. Do **not** upload a real `.env` file, and do **not** put your API key in any file. Commit the upload. (If a file arrives with a long name like "Relay Bridge public …", rename it to its exact name in GitHub, as before.)
3. **Deploy on PXXL.** In PXXL, create a new project / Deploy, choose **GitHub** as the source, connect GitHub if asked (install the PXXL GitHub App and give it access to the `relay-bridge-public` repo only), pick the `relay-bridge-public` repo and the `main` branch.
4. **Choose a Node web service, not a static site.** This project has a server (`server.js`), so deploy it as a **Node / web service** (not a static site). Start command: `node server.js`. PXXL will run `npm install` for you; the only dependency is Express.
5. **Set the API key in PXXL — this is the important step.** In the PXXL project, find **Environment variables / Env vars** and add one:
   - Name: `RELAY_API_KEY`
   - Value: paste your Relay API key (copy it from dashboard.relay.link → your Relay Bridge app → API keys).
   - Never paste the key in chat, in GitHub, or in any file.
   - Then deploy / redeploy so the server picks it up.
6. **Get the public link.** PXXL will give you a public URL like `https://relay-bridge-public.pxxlspace.cv` (the exact name may differ). Open it in a normal browser to check it loads, then send that link to people. That is the link to use — not the landing-page link.

## How people use it

1. Open the public link in a browser. For bridging, open it in a **wallet browser**: MetaMask, Coinbase Wallet, or Rabby app → Browser tab → paste the link.
2. Tap **Connect wallet**, approve the connection in the wallet, and make sure the wallet is on **Base** (the page asks it to switch if it is not).
3. Amount is **1 USDC** by default; change it if you want. Tap **Get quote** — it shows about how much USDC you will receive on Arbitrum.
4. Tap **Execute bridge** and confirm each step in your wallet (first an approve, then the deposit). Nothing is spent or signed until you approve it in your wallet.
5. The page polls Relay until the bridge is **success** or **refund**, shows Basescan and Arbiscan links, and saves a receipt on your device.

## What it does NOT do

- **Signature steps are not supported** in this public version. If a quote needs a signature step, the page says so plainly and sends nothing, instead of failing silently.
- It does not hold anyone's funds, seed phrase, or private key. It only asks the wallet to sign the exact steps Relay returns.
- It does not invent quotes, amounts, or success. If Relay returns an error, the page shows Relay's error.

## Security notes

- API key: server-side only, from `RELAY_API_KEY`. Never in `public/index.html`, never committed to GitHub, never shared in chat.
- If the key ever leaks, make a new one in dashboard.relay.link (rotate it), update the PXXL env var, and redeploy.
- Users should always check the amount and the chain in their wallet before confirming a step, and only bridge amounts they are comfortable with.
- This page bridges **only** USDC Base → USDC Arbitrum. It does not do other chains or tokens.

## Run it locally (for testing)

```bash
npm install
RELAY_API_KEY=your_key_here node server.js
# then open http://localhost:3000
```

Without `RELAY_API_KEY`, the page loads but `/api/quote` returns a clear error saying the key is not configured — that is expected, not a crash.
