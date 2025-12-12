import * as fs from "fs";
import * as path from "path";
import axiosBase from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Setup Axios with Cookie Jar
const jar = new CookieJar();
const axios = wrapper(
  axiosBase.create({
    baseURL: "https://better-edibles.com",
    jar,
    withCredentials: true,
    maxRedirects: 5,
    headers: {},
  })
);

async function loginAndFetch() {
  const username = process.env.OLD_ADMIN_USERNAME;
  const password = process.env.OLD_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error(
      "❌ Error: OLD_ADMIN_USERNAME / OLD_ADMIN_PASSWORD not set in .env"
    );
    process.exit(1);
  }

  // 1. Perform Login
  console.log("🔐 Logging in to better-edibles.com...");
  try {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);
    form.set("submit", "Login");

    await axios.post("/reps/index.php", form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      // We accept 302 redirects and 200 OK as successful login attempts
      validateStatus: (s) => s === 302 || s === 200,
    });
    console.log("✅ Login successful (session cookie stored).");

    // 2. Fetch Followups
    const fetchUrl = "https://better-edibles.com/reps/admin/followups-ajax.php";
    console.log(`🌐 Fetching followups from: ${fetchUrl}`);

    const response = await axios.get(fetchUrl, {
      responseType: "text",
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch followups. Status: ${response.status}`);
    }

    const html = response.data;
    const outputPath = path.join(__dirname, "../../followups.html");

    // Basic validation
    if (html.includes('<input type="password"') || html.includes("Sign In")) {
      console.warn(
        "⚠️  Warning: The output seems to be a login page. Login might have failed."
      );
    }

    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(`✅ Successfully saved HTML to: ${outputPath}`);
    console.log(`📄 File size: ${(html.length / 1024).toFixed(2)} KB`);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
    }
    process.exit(1);
  }
}

loginAndFetch();
