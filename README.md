# Chat demo

This page uses the OpenAI Responses API. The API key is read by the local Node server and is never sent to the browser.

## Run locally

1. Install Node.js 20 or later.
2. Create an API key in the [OpenAI API dashboard](https://platform.openai.com/api-keys).
3. Copy `.env.example` to `.env` and replace `your_api_key_here` with your key.
4. Install the dependencies, then start the app:

```powershell
npm.cmd install
npm.cmd start
```

5. Open <http://localhost:3000> (do not open the HTML file directly or use a separate Live Server port).

Set `OPENAI_MODEL` to another model available to your API project if needed. API usage is billed to the OpenAI API account associated with the key. Keep `.env` private and do not publish the key.
