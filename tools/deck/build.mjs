#!/usr/bin/env node
// Deck builder. Run from tools/deck:
//   npm run new -- <company>        copy the template into decks/<company>/slides.js
//   npm run preview -- <company>    build decks/<company>/preview.html (plain, local only)
//   npm run encrypt -- <company>    build present/<company>/index.html (encrypted, the only file that goes live)
//   npm run check -- <company>      confirm the live file has no readable slide text, and list what git would publish
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const [cmd, company, ...rest] = process.argv.slice(2);

function die(msg) { console.error("\n  " + msg + "\n"); process.exit(1); }
if (!cmd || !["new", "preview", "encrypt", "check"].includes(cmd)) die("Usage: npm run <new|preview|encrypt|check> -- <company>");
if (!company || !/^[a-z0-9][a-z0-9-]*$/.test(company) || company === "_template") die("Give a company slug in lowercase, e.g. mako or acme-health");

const deckDir = join(root, "decks", company);
const slidesFile = join(deckDir, "slides.js");
const outDir = join(root, "present", company);
const outFile = join(outDir, "index.html");

function loadDeck() {
  if (!existsSync(slidesFile)) die(`No slides at decks/${company}/slides.js. Run: npm run new -- ${company}`);
  const src = readFileSync(slidesFile, "utf8");
  const sandbox = { window: {} };
  try { vm.runInNewContext(src, sandbox, { filename: slidesFile }); } catch (e) { die("slides.js has an error: " + e.message); }
  const deck = sandbox.window.DECK;
  if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) die("slides.js must set window.DECK with a slides list");
  return { src, deck };
}

function buildHtml(src, deck) {
  const shell = readFileSync(join(here, "deck.html"), "utf8");
  const css = readFileSync(join(here, "deck.css"), "utf8");
  const engine = readFileSync(join(here, "deck.js"), "utf8");
  const safe = (s) => s.replace(/<\/script/gi, "<\\/script");
  return shell
    .replace("{{TITLE}}", () => (deck.title || "Slides").replace(/</g, "&lt;"))
    .replace("{{CSS}}", () => css)
    .replace("{{SLIDES}}", () => safe(src))
    .replace("{{ENGINE}}", () => safe(engine));
}

// Every readable string in the deck: used by check to make sure none leak into the live file.
function deckStrings(deck) {
  const out = new Set();
  const walk = (v) => {
    if (typeof v === "string") { if (v.trim().length >= 8 && !v.startsWith("/assets/")) out.add(v.trim()); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(deck);
  return [...out];
}

if (cmd === "new") {
  if (existsSync(slidesFile)) die(`decks/${company}/slides.js already exists. Edit it instead.`);
  mkdirSync(deckDir, { recursive: true });
  const tpl = readFileSync(join(root, "decks", "_template", "slides.js"), "utf8");
  const name = company.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  writeFileSync(slidesFile, tpl.replace(/company: "[^"]*"/, `company: "${name}"`));
  console.log(`\n  Created decks/${company}/slides.js. Edit the slides, then run: npm run preview -- ${company}\n`);
}

if (cmd === "preview") {
  const { src, deck } = loadDeck();
  const file = join(deckDir, "preview.html");
  writeFileSync(file, buildHtml(src, deck));
  console.log(`\n  Built decks/${company}/preview.html (${deck.slides.length} slides). Not encrypted, stays on your computer.`);
  console.log(`  From the repo root run: python3 -m http.server 8765`);
  console.log(`  Then open: http://localhost:8765/decks/${company}/preview.html\n`);
}

if (cmd === "encrypt") {
  const { src, deck } = loadDeck();
  const pwIdx = rest.indexOf("--password");
  const password = pwIdx >= 0 ? rest[pwIdx + 1] : process.env.DECK_PASSWORD;
  const tmp = mkdtempSync(join(tmpdir(), "deck-"));
  const input = join(tmp, "index.html");
  writeFileSync(input, buildHtml(src, deck));
  const bin = join(here, "node_modules", ".bin", "staticrypt");
  const args = [input, "-d", join(tmp, "out"), "-t", join(here, "password.html"), "-c", "false", "--short", "--remember", "0",
    "--template-title", "Private presentation",
    "--template-instructions", "This presentation is private. Enter the password you were given to view it.",
    "--template-placeholder", "Password",
    "--template-button", "Unlock",
    "--template-error", "That password didn't work. Check it and try again."];
  if (password) args.push("-p", password);
  else console.log("\n  No --password given, so StatiCrypt will ask for one.\n");
  const r = spawnSync(bin, args, { stdio: "inherit" });
  if (r.status !== 0) { rmSync(tmp, { recursive: true, force: true }); die("Encryption failed."); }
  mkdirSync(outDir, { recursive: true });
  copyFileSync(join(tmp, "out", "index.html"), outFile);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`\n  Encrypted to present/${company}/index.html. Next: npm run check -- ${company}\n`);
}

if (cmd === "check") {
  const { deck } = loadDeck();
  if (!existsSync(outFile)) die(`No encrypted file yet. Run: npm run encrypt -- ${company}`);
  const live = readFileSync(outFile, "utf8");
  // The author name is on the password screen on purpose, so it's allowed.
  const leaks = deckStrings(deck).filter((s) => s !== deck.author && live.includes(s));
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" });
  let ok = true;

  console.log(`\n  Checking present/${company}/index.html (${(live.length / 1024).toFixed(0)} KB)`);
  if (leaks.length) { ok = false; console.log("  ✗ Readable slide text found in the live file:"); leaks.forEach((s) => console.log("      " + s.slice(0, 80))); }
  else console.log(`  ✓ None of the ${deckStrings(deck).length} slide and notes strings appear in it`);
  if (/name="robots" content="noindex/.test(live)) console.log("  ✓ Has the noindex, nofollow tag"); else { ok = false; console.log("  ✗ Missing the noindex tag"); }

  const ignored = spawnSync("git", ["check-ignore", "-q", `decks/${company}/slides.js`], { cwd: root }).status === 0;
  if (ignored) console.log(`  ✓ decks/ is gitignored, so the plain source can't be committed`); else { ok = false; console.log("  ✗ decks/ is NOT gitignored"); }

  const tracked = git("ls-files", "decks").trim();
  if (tracked) { ok = false; console.log("  ✗ These source files are tracked by git:\n" + tracked); }

  const links = spawnSync("git", ["grep", "-l", `present/${company}`, "--", ":!present", ":!tools", ":!.gitignore"], { cwd: root, encoding: "utf8" }).stdout.trim();
  if (links) { ok = false; console.log("  ✗ Something on the site links to this deck:\n      " + links.split("\n").join("\n      ")); }
  else console.log("  ✓ Nothing on the site links to /present/" + company + "/");

  const status = git("status", "--porcelain", "--untracked-files=all").trim();
  console.log("\n  Files git would publish if you commit everything now:");
  console.log(status ? status.split("\n").map((l) => "      " + l).join("\n") : "      (nothing changed)");
  console.log(ok ? "\n  All clear.\n" : "\n  Fix the items marked ✗ before pushing.\n");
  process.exit(ok ? 0 : 1);
}
