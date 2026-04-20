import fs from "fs";
import path from "path";
import axiosBase from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as dotenv from "dotenv";

dotenv.config();

// ─────────────────────────────
// Setup
// ─────────────────────────────

const BASE_URL = process.env.OLD_BASE_URL?.replace(/\/+$/, "") || "https://better-edibles.com";

const jar = new CookieJar();
const axios = wrapper(
  axiosBase.create({
    baseURL: BASE_URL,
    jar,
    withCredentials: true,
    maxRedirects: 5,
  })
);

const rootDir = path.join(__dirname, "../..");

// ─────────────────────────────
// Login
// ─────────────────────────────

async function loginOldPortal() {
  const username = process.env.OLD_ADMIN_USERNAME;
  const password = process.env.OLD_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("OLD_ADMIN_USERNAME / OLD_ADMIN_PASSWORD not set in .env");
  }

  console.log("🔐 Logging in to old reps portal...");

  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);
  form.set("submit", "Login");

  await axios.post("/reps/index.php", form.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    maxRedirects: 0,
    validateStatus: (s) => s === 302 || s === 200,
  });

  console.log("✅ Login OK (session cookie stored).");
}

// ─────────────────────────────
// Fetch Past Orders with 1000 records
// ─────────────────────────────

async function fetchPastOrders1000() {
  console.log("📡 Fetching past orders with rpage=1000...");

  const form = new URLSearchParams();
  form.set("page", "1");
  form.set("sort", "1");
  form.set("sortorder", "asc");
  form.set("rpage", "1000"); // Request 1000 records instead of 500
  form.set("rep", "");
  form.set("sdate", "01/01/2025");
  form.set("edate", "12/04/2025");
  form.set("search", "");

  const response = await axios.post("/reps/admin/order-lists-past-data.php", form.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  console.log("✅ Received response from server");
  return response.data;
}

// ─────────────────────────────
// Main
// ─────────────────────────────

async function main() {
  try {
    await loginOldPortal();
    const htmlContent = await fetchPastOrders1000();

    const outputPath = path.join(rootDir, "orders-past-1000.html");
    fs.writeFileSync(outputPath, htmlContent, "utf8");

    console.log(`✅ Saved HTML response to: ${outputPath}`);
    console.log(`📊 File size: ${(htmlContent.length / 1024).toFixed(2)} KB`);
  } catch (err: any) {
    console.error("💥 Script failed:", err?.message || err);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", err.response.data?.substring(0, 500));
    }
    process.exit(1);
  }
}

main();
