# ostquiz multiplayer server

Small WebSocket server (Node.js + `ws`) that synchronizes multiplayer rounds
for the Zelda OST blind test at `/blindtest`. It holds rooms in memory only —
no database, nothing persisted to disk.

## Deploy on Render (free tier)

1. Go to https://render.com, sign in with GitHub, and authorize access to
   the `GLeFeu/Retex4K` repository.
2. **New +** → **Web Service** → pick `GLeFeu/Retex4K`.
3. Settings:
   - **Name**: `ostquiz-mp-server` (or anything — you'll copy the resulting URL either way)
   - **Root Directory**: `mp-server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Create the service. Once it's live, Render gives you a URL like
   `https://ostquiz-mp-server.onrender.com`.
5. In `blindtest/app.js`, find the line:
   ```js
   const MP_SERVER_URL = 'wss://ostquiz-mp-server.onrender.com';
   ```
   and replace the hostname with your actual Render URL (same name, just
   `wss://` instead of `https://`). Commit and push.

Note: Render's free tier spins the service down after ~15 minutes of no
traffic and takes a few seconds to wake back up on the next connection —
the first "Create a game" / "Join" click after a period of inactivity may
take a moment.
