# MCP Image Generation via OpenRouter (Cursor)

This project uses an MCP server that generates images through **OpenRouter**, so you can use the same API key you already use for chat. OpenRouter gives access to multiple image models (e.g. Google Gemini 2.5 Flash Image, others on their [image models collection](https://openrouter.ai/collections/image-models)).

## 1. Get your OpenRouter API key

If you already use OpenRouter, use your existing key. Otherwise:

1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create or copy an API key (starts with `sk-or-v1-...`)

## 2. Add your key

**Option A – Environment variable (recommended)**

In `~/.zshrc` (or your shell config):

```bash
export OPENROUTER_API_KEY="sk-or-v1-your-key-here"
```

Restart Cursor so it picks up the variable.

**Option B – In this project’s MCP config**

Edit `.cursor/mcp.json` and set the key in the `openrouter-image` server’s `env`:

```json
"env": {
  "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
}
```

Do not commit real keys. Add `.cursor/mcp.json` to `.gitignore` if you store the key there.

## 3. Restart Cursor

Quit Cursor completely and reopen so MCP reloads.

## 4. Use it in chat

In Cursor chat, ask the AI to generate images. The MCP server will call OpenRouter’s image-generation models (e.g. Gemini 2.5 Flash Image) via your existing OpenRouter account.

---

**Server:** `@mindbreaker81/openrouter-image`  
**API:** [OpenRouter image generation](https://openrouter.ai/docs/features/multimodal/image-generation)  
**Config:** `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global)
