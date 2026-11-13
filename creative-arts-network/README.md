# Creative Arts Network (2027)

An independent, read-only curriculum network explorer. The code belongs in **your GitHub repository**, runs as a **Cloudflare Worker with static assets**, and reads the **live Google Sheets API**. No ChatGPT infrastructure is required to run it.

## What works

- Search by unit code **or** unit name (a single Unit category), staff, semester, day, unit type, or major.
- Click or keyboard-select a node to recenter; use Back or the Journey history.
- Show direct neighbours (default) or second-degree connections.
- See exact session information in the details panel.
- Refresh the current 2027 spreadsheet without redeploying. All graph traversals are client-side.
- HE and TAFE units stay distinct; no special dual-delivery link is invented.

## Data source

The sheet is configured in `wrangler.jsonc`, key `SHEET_ID`.
The API reads `2027!A1:M210` and `'Vis Arts Dual Delivery'!A1:P120`. It identifies the BA units from the 2027 tab; TAFE units and any extra BA sessions from Dual Delivery. The source spreadsheet is never modified.

**Course/major classification is an initial planning interpretation, not an authoritative set of course rules.** Current major labels are Visual Arts, Screen Media Arts, Music, Storytelling & Writing. Shared `CRA305`, `CRA306` and `CRA300` are connected to all four. Other potential majors can be added when their rules are established. For privacy, the live Google API requires a service account credential held solely as a Cloudflare Worker secret.

## Connect the Google Sheet (one-time)

1. In a Google Cloud project controlled by your organisation or by you, enable **Google Sheets API**. Your organisation may have rules about creating service accounts and sharing Sheets.
2. Create a service account with a JSON key, subject to institutional policy. **Never commit or upload the key into the GitHub repository.** If your institution disallows service-account keys, use a managed credential/OAuth approach instead of bypassing that policy.
3. Share the source Google Sheet with the service account's `client_email` as **Viewer**. A service account cannot read a private spreadsheet unless given permission.
4. In Cloudflare, add a Worker secret named `GOOGLE_SERVICE_ACCOUNT_JSON`, setting its value to the **entire JSON credential object**. With a local Node environment, `npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON` prompts you for its value; use the Cloudflare dashboard instead if easier.
5. Deploy after the key and permissions are configured. `/api/health` reports whether the configuration is present; `/api/graph` retrieves current data.

### Security (do this before making the URL available)

This project contains staff names/codes, schedules, and potential planning data. **Cloudflare Workers URLs are public by default.** Configure **Cloudflare Access** for the whole application (`/*`, including `/api/*`) with a policy that permits only approved users. Test unauthenticated access in a private browser window. Do **not** rely on an unguessable URL, the sheet's private sharing settings, or a secret embedded in browser JavaScript: the Worker can legitimately read private data, and without Access its API could expose that data to anyone with its URL.

Cloudflare Access policy setup is an account-side operation and is not automatically configured by this repository. Consider staff privacy and CDU information-handling policies before sharing. Protect secrets and rotate keys if exposed.

## Deploy using your own systems

1. Create a new **private GitHub repository**, for example `creative-arts-network`, under the account you wish to use.
2. Extract these files into the repository and push to the default branch.
3. In Cloudflare Dashboard → Workers & Pages → Create application → **GitHub**, select this repository. Use `npm run deploy` (or `npx wrangler deploy`) as the deploy command where prompted. The Worker config (`wrangler.jsonc`) includes static assets and an API Worker.
4. Configure the secret and Cloudflare Access policy, then verify the site and click **Refresh from Google Sheets**.
5. Subsequent repository commits can deploy automatically through Cloudflare's Git integration. Changes in Google Sheets appear on refresh without a repository commit.

Local development: `npm install`, create `.dev.vars` with `GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'` (do not commit), then `npm run dev`. Tests: `npm test`.

## Architecture

- `src/worker.js` authenticates to Google Sheets via a short-lived OAuth access token generated from the service account's signed JWT, then reads two ranges.
- `src/graph.js` converts tabular rows to nodes/edges. It keeps every unique **unit code** as one unit node, but retains multiple teaching sessions under that node.
- `public/index.html`, `public/styles.css`, `public/app.js` implement a dependency-free, responsive interactive SVG graph.
- `wrangler.jsonc` deploys everything as a single Cloudflare Worker.

No database, Google Apps Script, hosted ChatGPT server or external graph library is required. The initial SVG radial layout is deliberately simple; a larger curriculum may eventually benefit from Cytoscape.js or a force-directed graph.

## Current limits

- **Not yet deployed**. The project needs a destination GitHub repository, Cloudflare connection, and Google service-account setup.
- Graph loads directly from Google on each refresh, so Google API quotas apply. A short cache can be added later.
- The first implementation uses the existing 2027 tab and the dual-delivery tab. The `Major` relationships use currently listed course pathways and known common units, rather than guessing new programmes.
- Staff values such as `????` are ignored as unknown in a future refinement; currently they appear literally if present in the source sheet.
- This tool supports discovery and planning; it does not validate room clashes or academic rules automatically.
