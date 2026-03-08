# MCP Sound / Freesound Setup (Cursor)

This project can use a **Freesound** MCP server so you can search [Freesound.org](https://freesound.org) from Cursor chat and find sound effects for your game (combat, ambience, UI, etc.).

## 1. One-time install of the Freesound MCP server

From the **project root** (`monk-journey-v49`), run:

```bash
git clone https://github.com/timjrobinson/FreesoundMCPServer.git tools/freesound-mcp-server
cd tools/freesound-mcp-server
npm install
npm run build
cd ../..
```

## 2. Get a Freesound API key

The MCP server uses **Token** authentication (not OAuth). You use a single API key.

### If you already have an OAuth credential (e.g. "SereneAI Game")

You don’t need to do the OAuth flow. The same credential has a **Client secret / API key** that works as the token:

1. Go to [freesound.org/apiv2/apply](https://freesound.org/apiv2/apply) and log in.
2. In the table of your API credentials, find the row for your app (e.g. "SereneAI Game").
3. In that row, copy the value in the **"Client secret / Api key"** column (long alphanumeric string).
4. Use that value as `FREESOUND_API_KEY` below. No callback, no OAuth steps—just this key.

### If you don’t have a credential yet

1. Create an account at [freesound.org](https://freesound.org) (free).
2. Go to [freesound.org/apiv2/apply](https://freesound.org/apiv2/apply), fill the form (name, URL, callback can be the default `https://freesound.org/home/app_permissions/permission_granted/`), and apply.
3. After approval, in the credentials table copy the **"Client secret / Api key"** for that app.

## 3. Set your API key

**Option A – Environment variable (recommended)**

In `~/.zshrc`:

```bash
export FREESOUND_API_KEY="your-freesound-api-key"
```

Start Cursor from a terminal that has this loaded (or restart Cursor after opening from that terminal).

**Option B – In MCP config**

In `.cursor/mcp.json`, add an `env` block for the `freesound` server:

```json
"freesound": {
  "command": "node",
  "args": ["tools/freesound-mcp-server/dist/index.js"],
  "env": {
    "FREESOUND_API_KEY": "your-freesound-api-key"
  }
}
```

Do not commit the key. Add `.cursor/mcp.json` to `.gitignore` if you store it there.

## 4. Restart Cursor

Quit Cursor completely and reopen so the Freesound MCP server is loaded.

## 5. Use it in chat

In Cursor chat you can ask things like:

- “Find punch and kick sound effects for combat”
- “Search for ambient temple or monastery sounds”
- “Find short UI click sounds”
- “Search for meditation or bell sounds under 10 seconds”

The AI will use the Freesound MCP tools to search, show preview links, duration, license, and metadata so you can pick sounds for Monk Journey.

---

**Server:** [timjrobinson/FreesoundMCPServer](https://github.com/timjrobinson/FreesoundMCPServer)  
**API:** [Freesound API](https://freesound.org/docs/api/)  
**Config:** `.cursor/mcp.json` → `freesound`
