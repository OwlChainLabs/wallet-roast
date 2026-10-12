import { ImageResponse } from "next/og";

// Share image for bingo.owlchainlabs.xyz cards. The bingo worker sends the card as
// ?d=base64url(JSON {c: 24 square texts, m: marked indices 0-24}); this only draws it.

const clean = (s: unknown) =>
  String(s ?? "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);

function parse(d: string | null): { cells: string[]; marked: Set<number> } | null {
  if (!d || d.length > 6000) return null;
  try {
    const json = JSON.parse(Buffer.from(d, "base64url").toString("utf8"));
    if (!Array.isArray(json?.c) || json.c.length !== 24) return null;
    const cells = json.c.map(clean);
    cells.splice(12, 0, "FREE gm");
    const marked = new Set<number>([12]);
    for (const i of Array.isArray(json.m) ? json.m : []) if (Number.isInteger(i) && i >= 0 && i < 25) marked.add(i);
    return { cells, marked };
  } catch {
    return null;
  }
}

const LINES: number[][] = [];
for (let i = 0; i < 5; i++) {
  LINES.push([0, 1, 2, 3, 4].map((c) => i * 5 + c));
  LINES.push([0, 1, 2, 3, 4].map((r) => r * 5 + i));
}
LINES.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);

export async function GET(req: Request) {
  const card = parse(new URL(req.url).searchParams.get("d"));
  if (!card) return new Response("bad card", { status: 400 });
  const { cells, marked } = card;

  const bingos = LINES.filter((l) => l.every((i) => marked.has(i))).length;
  const best = Math.max(...LINES.map((l) => l.filter((i) => marked.has(i)).length));
  const status = bingos ? `BINGO${bingos > 1 ? ` x${bingos}` : ""}` : marked.size > 1 ? `${marked.size - 1} called · ${5 - best} away` : "predictions locked";

  const S = 106, G = 6;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 44, padding: "0 48px",
        background: "linear-gradient(135deg, #0a0d1a, #1b2140)", color: "#f2f2f5" }}>
        <div style={{ display: "flex", flexWrap: "wrap", width: S * 5 + G * 4, gap: G }}>
          {cells.map((t, i) => {
            const on = marked.has(i);
            return (
              <div key={i} style={{ width: S, height: S, display: "flex", alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: 6, borderRadius: 12, fontSize: i === 12 ? 22 : t.length > 40 ? 12 : 14,
                lineHeight: 1.15, fontWeight: on ? 800 : 500,
                background: i === 12 ? "#1b2246" : on ? "linear-gradient(135deg, #9945ff, #14f195)" : "#11162b",
                color: i === 12 ? "#14f195" : on ? "#0a0d1a" : "#e6e8f0",
                border: on ? "0" : "1px solid #232a4a" }}>
                {t}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 24, color: "#9aa0b8" }}>solana breakpoint 2026</div>
          <div style={{ display: "flex", fontSize: 62, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, marginTop: 8 }}>my bingo card</div>
          <div style={{ width: 160, height: 7, borderRadius: 4, margin: "22px 0", background: "linear-gradient(90deg, #9945ff, #14f195)" }} />
          <div style={{ fontSize: 34, fontWeight: 800, color: bingos ? "#14f195" : "#ffc857" }}>{status}</div>
          <div style={{ fontSize: 24, color: "#c3c7dc", marginTop: 26, lineHeight: 1.3 }}>make your own card and mark it live during the keynotes</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#14f195", marginTop: 34 }}>bingo.owlchainlabs.xyz</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=86400" } }
  );
}
