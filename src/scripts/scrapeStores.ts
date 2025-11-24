import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

async function fetchStoreList() {
  try {
    // Read from local file provided by user
    const filePath =
      "d:\\Web Development\\Upwork\\better-edibles-frontend\\better-edibles-backend\\Admin_Store Lists.html";

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    const html = fs.readFileSync(filePath, "utf-8");

    const $ = cheerio.load(html);

    const result: any[] = [];

    // Iterate over each store block
    $(".row-fluid.otherZeroOpenBalance").each((i, el) => {
      const $el = $(el);

      // Extract Basic Info
      const name = $el.find('a[title="Edit"]').text().trim();
      const id = $el.find("input.repscheck").val();
      const address = $el.find("p.s-text.text-info").text().trim();

      // Extract Rep
      const repText = $el.find(".special-boxs p").text().trim();
      const rep = repText.replace("Rep : ", "").trim();

      // Extract Contact Info
      const contactBlock = $el.find(".dl-horizontal").first();
      const contactText = contactBlock.find("p.s-text").first().text().trim();

      // Parse "Intake - Name"
      let contactName = "";
      let role = "";
      if (contactText.includes("-")) {
        const parts = contactText.split("-");
        role = parts[0].trim();
        // Remove trailing comma if present in name part
        contactName = parts[1].split(",")[0].trim();
      }

      const phone = contactBlock.find('a[href^="tel:"]').text().trim();
      const email = contactBlock.find('a[href^="mailto:"]').text().trim();

      // Extract Notes
      const notes = contactBlock.find("span.slogan").text().trim();

      const storeData = {
        id,
        name,
        address,
        rep,
        contact: {
          name: contactName,
          role,
          phone,
          email,
        },
        notes,
      };

      result.push(storeData);
    });

    // Write to file instead of console log for large dataset
    const outputPath = path.join(__dirname, "../../stores.json");
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(
      `Successfully scraped ${result.length} stores. Saved to ${outputPath}`
    );
  } catch (error) {
    console.error("Error parsing store list:", error);
  }
}

fetchStoreList();
