# SmartForge — Judge Guide & Live Demo

SmartForge is a lightweight, browser-based tool that combines a Sui‑style wallet home with a Move smart contract generator. Everything runs client‑side (static HTML/CSS/JS).

## Live Demo
- Login: https://businessclassforyou.com/SmartForge/Login.html
- Direct Homepage (test bypass): https://businessclassforyou.com/SmartForge/SFHomepage.html?test=1
- Contract Generator: https://businessclassforyou.com/SmartForge/contract-generator/
- Send (Coming Soon): https://businessclassforyou.com/SmartForge/ComingSoon.html

## 90‑Second Evaluation Flow
1) Open the Homepage with test bypass: https://businessclassforyou.com/SmartForge/SFHomepage.html?test=1
   - A temporary local session is created (“TestUser”), no signup required.
2) Click “Create Contract” to go to the generator.
3) Pick a template (Escrow or Fund) → fields appear automatically from `{{placeholders}}`.
4) Click “Generate Contract” → preview updates in place.
5) Use “Copy” or “Download .move” to grab the contract.

Optional: Use the regular Login flow at https://businessclassforyou.com/SmartForge/Login.html (the app reads demo accounts from `Accounts.json`).

## What’s Built
- Responsive dark UI matching the site’s palette (Montserrat + accent `#3c59fa`).
- Wallet‑style homepage (mobile-first, now stretched on desktop).
- Contract Generator (dynamic templates):
  - Scans template text for `{{PLACEHOLDER}}` and renders inputs automatically.
  - Replaces placeholders with user input on Generate.
  - Preview + Copy to clipboard + Download `.move`.
  - Flexible template filenames (supports `Escrow_template.txt`, `Fund_template.txt`, etc.).
- “Send” is intentionally stubbed with a Coming Soon page.

## Technical Highlights
- Pure front‑end (no framework) for portability: HTML + CSS + modular JS.
- Templates fetched from `contract-generator/templates/` (no build step needed).
- Robust placeholder parsing and global replacements.
- Edge cases handled: empty inputs flagged; remaining placeholders listed at the top of the generated code.

## Templates
Location: `contract-generator/templates/`

Supported keys and filename candidates:
- Escrow → `escrow.txt`, `Escrow.txt`, `escrow_template.txt`, `Escrow_template.txt`
- Fundraising → `fundraising.txt`, `Fundraising.txt`, `fund_template.txt`, `Fund_template.txt`, `fund.txt`, `Fund.txt`

Placeholder format: `{{PLACEHOLDER}}`

Example (excerpt):
```txt
module {{PACKAGE_ADDRESS}}::escrow { /* ... */ }
public entry fun tip(...){
  assert!(amount > {{MIN_TIP_AMOUNT}}, 1);
}
```

Add a new template:
1) Drop a `.txt` file into `contract-generator/templates/` using `{{placeholders}}`.
2) Add an `<option>` in `contract-generator/index.html`.
3) Map your key to filename candidates in `TEMPLATE_CANDIDATES` inside `contract-generator/app.js`.

## Security & Notes
- Prototype only; do not store secrets. `Accounts.json` is demo data served to the browser.
- CDN dependencies: Google Fonts and highlight.js.

## Roadmap (post‑hackathon)
- Wire real Sui wallet integration for Send/Receive.
- Publish a curated template gallery and validation per template.
- Add deep‑linking (e.g., preselect template via `?t=escrow`).
- Cloud save/share of generated contracts.

## Repo Structure (top‑level)
```
Accounts.json
Login.html
Relogin.html
SFHomepage.html
SignUp.html
ComingSoon.html
style.css
contract-generator/
  index.html
  style.css
  app.js
  templates/
    Escrow_template.txt
    Fund_template.txt
```
