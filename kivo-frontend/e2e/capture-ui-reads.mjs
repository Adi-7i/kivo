/** Capture owned GET responses for isolated layout QA; never write to Django. */
import { readFile, writeFile } from "node:fs/promises";
const origin = "http://127.0.0.1:8001";
const storage = JSON.parse(await readFile(".playwright-auth/session.json", "utf8"));
const cookie = storage.cookies
  .filter((row) => ["sessionid", "csrftoken"].includes(row.name))
  .map((row) => `${row.name}=${row.value}`)
  .join("; ");
let entries = {};
let previousOwner;
try {
  const previous = JSON.parse(
    await readFile(".playwright-auth/bug02-read-snapshot-progress.json", "utf8")
  );
  if (Date.now() - Date.parse(previous.captured_at) < 1_800_000) {
    entries = previous.entries;
    previousOwner = previous.owner_id;
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
export function key(path) {
  const url = new URL(path, "http://snapshot.invalid");
  if (url.searchParams.get("page") === "1") url.searchParams.delete("page");
  url.searchParams.sort();
  return url.pathname.replace(/\/$/, "") + url.search;
}
async function get(path) {
  if (path !== "/api/v1/auth/me/" && entries[key(path)]) {
    console.log(JSON.stringify({ path: path.split("?")[0], recorded_read_reused: true }));
    return JSON.parse(entries[key(path)].body);
  }
  const start = Date.now();
  const response = await fetch(origin + path, {
    headers: { Cookie: cookie, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error(`Read-only capture stopped at ${path.split("?")[0]}: HTTP ${response.status}`);
  const body = await response.text();
  const value = JSON.parse(body);
  entries[key(path)] = { status: response.status, body, ms: Date.now() - start };
  console.log(
    JSON.stringify({ path: path.split("?")[0], status: response.status, ms: Date.now() - start })
  );
  if (path === "/api/v1/auth/me/" && previousOwner != null && previousOwner !== value.id)
    throw new Error("Recorded read owner differs; capture must not mix users");
  const owner = JSON.parse(entries[key("/api/v1/auth/me/")].body).id;
  await writeFile(
    ".playwright-auth/bug02-read-snapshot-progress.json",
    JSON.stringify({ captured_at: new Date().toISOString(), owner_id: owner, entries }),
    { mode: 0o600 }
  );
  return value;
}
const profile = await get("/api/v1/auth/me/");
if (typeof profile.id !== "number") throw new Error("Verified owned profile required");
const accounts = await get("/api/v1/accounts/"),
  categories = await get("/api/v1/categories/"),
  transactions = await get("/api/v1/transactions/");
await get("/api/v1/transactions/?page=1&period=month&sort=newest");
const contacts = await get("/api/v1/contacts/"),
  bills = await get("/api/v1/shared-bills/");
for (const path of [
  "claims",
  "loans",
  "settlements",
  "rent/plans",
  "rent/obligations",
  "rent/reserves",
  "rent/spending-capacity",
])
  await get(`/api/v1/${path}/`);
await get("/api/v1/budgets/?archived=false");
await get("/api/v1/dashboard/?period=month");
await get("/api/v1/reports/summary/?period=month");
await get("/api/v1/reports/trends/?period=last_seven_days&interval=day");
await get("/api/v1/reports/trends/?period=month&interval=day");
for (const dimension of ["category", "account"])
  await get(`/api/v1/reports/breakdown/?period=month&dimension=${dimension}`);
const funds = await get("/api/v1/funds/batches/"),
  summary = await get("/api/v1/funds/summary/");
const run = summary.run_id;
if (!run) throw new Error("Pinned funding response required");
await get(`/api/v1/reports/funds/?run=${run}`);
for (const [list, route] of [
  [accounts, "accounts"],
  [transactions, "transactions"],
  [contacts, "contacts"],
  [bills, "shared-bills"],
]) {
  const id = list.results[0]?.id;
  if (!id) throw new Error(`Existing ${route} detail fixture required`);
  await get(`/api/v1/${route}/${id}/`);
  if (route === "contacts")
    for (const sub of ["history"]) await get(`/api/v1/${route}/${id}/${sub}/`);
}
const fund = funds.results[0]?.id;
if (!fund) throw new Error("Existing funding fixture required");
for (const sub of ["", "journey/", "breakdown/"])
  await get(`/api/v1/funds/batches/${fund}/${sub}?run=${run}`);
if (!categories.results.length) throw new Error("Existing category fixture required");
await writeFile(
  ".playwright-auth/bug02-read-snapshot.json",
  JSON.stringify({ captured_at: new Date().toISOString(), owner_id: profile.id, entries }),
  { mode: 0o600, flag: "wx" }
);
console.log(JSON.stringify({ captured: Object.keys(entries).length, writes: 0 }));
