import mongoose from "mongoose";

// 👉 dotenv should ONLY run in local development
if (process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config();
}

// ─── NEW (mobile hotspot / ISP DNS fix) ──────────────────────────────────────
// Mobile carrier DNS does not support SRV/TXT queries needed by mongodb+srv://
// This resolves them via DNS-over-HTTPS (Google) instead of UDP port 53.
// Only runs in development. Production (DigitalOcean) uses native DNS as before.

async function dohQuery(name: string, type: "SRV" | "TXT"): Promise<any[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: "application/json" } }
    );
    const data = (await res.json()) as any;
    return data.Answer ?? [];
  } catch {
    return [];
  }
}

async function srvToDirectUri(srvUri: string): Promise<string> {
  const url = new URL(srvUri);
  const host = url.hostname;

  const [srvAnswers, txtAnswers] = await Promise.all([
    dohQuery(`_mongodb._tcp.${host}`, "SRV"),
    dohQuery(host, "TXT"),
  ]);

  if (!srvAnswers.length) throw new Error(`Could not resolve SRV records for ${host}`);

  // SRV data format: "0 0 27017 ac-xxx.mongodb.net."
  const hosts = srvAnswers
    .map((r: any) => {
      const parts = (r.data as string).split(" ");
      return `${parts[3].replace(/\.$/, "")}:${parts[2]}`;
    })
    .join(",");

  // TXT data: "authSource=admin&replicaSet=atlas-xxx-shard-0"
  const txtOptions = txtAnswers.map((r: any) => (r.data as string).replace(/"/g, "")).join("&");

  const dbName = url.pathname.slice(1).replace(/\?.*/, "");
  const auth = `${encodeURIComponent(url.username)}:${encodeURIComponent(url.password)}`;
  const extra = url.search.replace("?", "");

  const query = ["ssl=true", txtOptions, extra].filter(Boolean).join("&");
  return `mongodb://${auth}@${hosts}/${dbName}?${query}`;
}
// ─── END NEW ──────────────────────────────────────────────────────────────────

export const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    // ─── NEW: DoH-based SRV resolution for mobile/broken DNS environments ───
    let uri = process.env.MONGO_URI;
    if (process.env.NODE_ENV === "development" && uri.startsWith("mongodb+srv://")) {
      uri = await srvToDirectUri(uri);
    }
    // ─── PREVIOUS (restore when back on regular internet if needed): ─────────
    // const conn = await mongoose.connect(process.env.MONGO_URI);
    // ─────────────────────────────────────────────────────────────────────────

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${(error as Error).message}`);
    process.exit(1);
  }
};
