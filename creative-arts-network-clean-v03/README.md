
# Creative Arts Network — 2027 (clean version 0.3)

An independent, read-only Cloudflare Worker application that reads Google Sheets and displays an interactive curriculum relationship graph. The interface uses clickable, pale-coloured **rectangular labels** rather than circles.

## Replace an existing Codespaces installation safely

**Never delete `.dev.vars`**, which holds your local Google service account credential. Never upload it to GitHub, a chat or another person.

1. Upload `creative-arts-network-clean-v03.zip` into your `creative-arts-network` application folder in Codespaces.
2. From the application folder (`pwd` should end with `/creative-arts-network`), stop the dev server with Ctrl+C, then run:

   ```bash
   unzip -o creative-arts-network-clean-v03.zip
   npm install
   npm test
   node --check public/app.js
   npm run dev
   ```

3. Leave `npm run dev` running and open port 8787 from the Codespaces **Ports** tab. A normal page refresh should show the live app.
4. Commit and push only once the application works. Check `git status --short` and `git check-ignore .dev.vars` first.

If the development server returns to a shell prompt or a port 8787 check fails, inspect Wrangler logs. A browser `502` is generally a server/port-forwarding problem; it is not cured by committing.

## Configuration

- Spreadsheet ID: in `wrangler.jsonc` under `vars.SHEET_ID`.
- Locally, store the full JSON service account credential as the value of `GOOGLE_SERVICE_ACCOUNT_JSON` in an ignored `.dev.vars` file (one-line JSON wrapped in single quotes).
- Never commit `.dev.vars`, service account JSON files or private keys.
- For deployment, set the credential as a **Cloudflare Worker secret**, not a public variable or source file.
- The Google service account must be granted **Viewer** access to the curriculum Google Sheet.

## Commands

```bash
npm install
npm test
npm run dev
npm run deploy
```

The Worker reads the `2027` and `Vis Arts Dual Delivery` tabs from the existing Google Sheet. HE and TAFE units are separate nodes. Selecting a staff member, term, day, major or unit type recentres the network. Second-degree relationships are optional.

**Security:** This app exposes curriculum data through `/api/graph` to anyone who can access the deployed website. Before deploying publicly, protect the Cloudflare application with Cloudflare Access or another authentication layer. Do not assume that keeping a GitHub repository private also makes the deployed site private.
