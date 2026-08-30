/**
 * End-to-end check that the four roles see what they should — and, crucially,
 * that a customer cannot reach another owner's vehicle.
 *
 * Signed out, every workshop route redirects to /login and the database
 * refuses anonymous reads — run supabase/migration-roles.sql for that to hold.
 *
 * Needs a browser driver, which is not a project dependency:
 *   npm i -D playwright && npx playwright install chromium
 *
 * Then, with the app running (npm run dev) and Supabase seeded (npm run seed):
 *   node scripts/test-roles.mjs
 *
 * Set BASE to point at a deployed URL instead of localhost.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "RideCatalyst!2026";

let failures = 0;
const pass = (m) => console.log(`  PASS  ${m}`);
const fail = (m) => {
  console.log(`  FAIL  ${m}`);
  failures++;
};

/**
 * Polls for the redirect rather than waiting a fixed time. Sign-in runs an
 * auth round trip plus a profile lookup and can take a couple of seconds on a
 * cold route; a fixed timeout races it and every later assertion then fails
 * against the login page instead of the app.
 */
async function signIn(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");

  for (let i = 0; i < 75; i++) {
    if (!new URL(page.url()).pathname.startsWith("/login")) break;
    await page.waitForTimeout(400);
  }
  if (new URL(page.url()).pathname.startsWith("/login")) {
    fail(`sign-in for ${email} never left the login page`);
  }
  await page.waitForLoadState("networkidle");
}

async function vehicleCount(page) {
  await page.goto(`${BASE}/vehicles`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  return page.locator("tbody tr").count();
}

const browser = await chromium.launch();

console.log("\nSIGNED OUT");
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // Every workshop route must bounce to the login page, and the landing page
  // must carry no workshop data at all.
  for (const route of ["/desk", "/vehicles", "/analytics", "/admin", "/bay", "/garage"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    new URL(page.url()).pathname === "/login"
      ? pass(`${route} redirects to /login`)
      : fail(`${route} did not redirect, landed on ${page.url()}`);
  }

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  /Dhaka Metro/.test(await page.textContent("body"))
    ? fail("*** LEAK: the public landing page shows workshop data ***")
    : pass("the landing page carries no workshop data");
  await ctx.close();
}

for (const [role, email] of [
  ["manager", "manager@ridecatalyst.demo"],
  ["technician", "tech@ridecatalyst.demo"],
  ["admin", "admin@ridecatalyst.demo"],
]) {
  console.log(`\n${role.toUpperCase()}`);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, email);
  /Workshop Admin|Workshop Manager|Service Technician/.test(
    await page.textContent("body")
  )
    ? pass("signed in, role shown in the shell")
    : fail("role not shown — sign-in probably failed");
  const n = await vehicleCount(page);
  n === 42 ? pass(`sees all ${n} vehicles`) : fail(`expected 42, saw ${n}`);
  await ctx.close();
}

console.log("\nCUSTOMER (owner@ridecatalyst.demo → O01, Salma Ahmed)");
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, "owner@ridecatalyst.demo");

  const n = await vehicleCount(page);
  n === 3 ? pass(`sees only ${n} own vehicles`) : fail(`expected 3, saw ${n}`);

  await page.goto(`${BASE}/vehicles/V01`, { waitUntil: "networkidle" });
  (await page.textContent("body")).includes("Cha 76-9961")
    ? pass("can open their own vehicle V01")
    : fail("cannot open their own vehicle V01");

  // The one that matters: V02 belongs to a different owner.
  await page.goto(`${BASE}/vehicles/V02`, { waitUntil: "networkidle" });
  (await page.textContent("body")).includes("Ga 13-4185")
    ? fail("*** LEAK: another owner's vehicle V02 is visible ***")
    : pass("another owner's vehicle V02 is not reachable");
  await ctx.close();
}

await browser.close();
console.log(
  failures === 0 ? "\n=== all role checks passed ===" : `\n=== ${failures} FAILURE(S) ===`
);
process.exit(failures ? 1 : 0);
