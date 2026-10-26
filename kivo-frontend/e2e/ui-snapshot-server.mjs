/** Explicitly isolated GET replay. Not Django integration or an authentication authority. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
if (process.env.KIVO_UI_REPLAY !== "1")
  throw new Error("Explicit isolated layout replay opt-in required");
const snapshot = JSON.parse(await readFile(".playwright-auth/bug02-read-snapshot.json", "utf8"));
if (Date.now() - Date.parse(snapshot.captured_at) > 86_400_000)
  throw new Error("Layout snapshot is too old; capture again through actual Django GETs");
const storage = JSON.parse(await readFile(".playwright-auth/session.json", "utf8"));
const expected = storage.cookies.find((row) => row.name === "sessionid")?.value;
if (!expected) throw new Error("Private fixture session required");
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Content-Type", "application/json");
  const url = new URL(request.url, "http://snapshot.invalid");
  if (request.method !== "GET") {
    response.writeHead(405);
    response.end(JSON.stringify({ error: { message: "Read-only layout replay rejects writes" } }));
    return;
  }
  if (url.pathname === "/") {
    response.end(JSON.stringify({ isolated_layout_replay: true }));
    return;
  }
  const actual =
    (request.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("sessionid="))
      ?.slice(10) || "";
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  ) {
    response.writeHead(401);
    response.end("{}");
    return;
  }
  if (url.searchParams.get("page") === "1") url.searchParams.delete("page");
  url.searchParams.sort();
  const entry = snapshot.entries[url.pathname.replace(/\/$/, "") + url.search];
  if (!entry) {
    response.writeHead(503);
    response.end(
      JSON.stringify({ error: { message: "This read was not captured for isolated layout QA" } })
    );
    return;
  }
  // Fixed test latency exposes loading geometry. It is not live performance evidence.
  setTimeout(() => {
    response.writeHead(entry.status);
    response.end(entry.body);
  }, 150);
});
server.listen(8002, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
