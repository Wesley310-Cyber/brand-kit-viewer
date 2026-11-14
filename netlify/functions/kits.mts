import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { seedKits } from "../../src/seed.mts";

// Kits are stored one per key ("kit/<id>") in a site-wide store, so they
// survive every redeploy. Reading is open; writing needs the edit passcode
// held in the EDIT_PASSCODE environment variable.
const store = () => getStore({ name: "brand-kits", consistency: "strong" });
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z0-9-]{1,80}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const link = (v: unknown) => {
  const s = str(v, 500);
  return /^https:\/\//.test(s) ? s : "";
};

function clean(body: any) {
  const name = str(body?.name, 60);
  if (!name) return { error: "Give the kit a name." };
  if (!Array.isArray(body.colors)) return { error: "Add at least two colors." };
  const colors = body.colors
    .filter((c: any) => c && HEX.test(String(c.hex)))
    .slice(0, 8)
    .map((c: any) => ({ hex: String(c.hex).toUpperCase(), name: str(c.name, 30) }));
  if (colors.length < 2) return { error: "Add at least two colors, each a 6-digit hex code." };
  const order = Number.isFinite(body.order) ? Number(body.order) : 9999;
  return {
    kit: {
      name,
      tagline: str(body.tagline, 140),
      colors,
      fonts: str(body.fonts, 80),
      notionUrl: link(body.notionUrl),
      designUrl: link(body.designUrl),
      order,
    },
  };
}

// First visit only: copy the starting kits into storage. The marker stops
// deleted kits from coming back on later visits.
async function seedOnce() {
  const s = store();
  if (await s.get("meta/seeded")) return;
  await Promise.all(seedKits.map(({ id, ...kit }) => s.setJSON(`kit/${id}`, kit)));
  await s.set("meta/seeded", new Date().toISOString());
}

function allowed(req: Request) {
  const pass = Netlify.env.get("EDIT_PASSCODE");
  if (!pass) return json({ error: "Editing is not set up yet on this site." }, 503);
  if (req.headers.get("x-edit-passcode") !== pass) return json({ error: "Passcode not accepted." }, 401);
  return null;
}

export default async (req: Request, context: Context) => {
  const id = context.params?.id;
  const s = store();

  if (req.method === "GET" && !id) {
    await seedOnce();
    const { blobs } = await s.list({ prefix: "kit/" });
    const kits = await Promise.all(
      blobs.map(async (b) => {
        const kit = await s.get(b.key, { type: "json" });
        return kit ? { id: b.key.slice(4), ...kit } : null;
      }),
    );
    return json({ kits: kits.filter(Boolean) });
  }

  if ((req.method === "PUT" || req.method === "DELETE") && id) {
    const denied = allowed(req);
    if (denied) return denied;
    if (!ID.test(id)) return json({ error: "That kit id is not valid." }, 400);
    if (req.method === "DELETE") {
      await s.delete(`kit/${id}`);
      return json({ ok: true });
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "The kit could not be read." }, 400);
    }
    const result = clean(body);
    if ("error" in result) return json({ error: result.error }, 400);
    await s.setJSON(`kit/${id}`, result.kit);
    return json({ ok: true, id });
  }

  return json({ error: "Not supported." }, 405);
};

export const config: Config = { path: ["/api/kits", "/api/kits/:id"] };
