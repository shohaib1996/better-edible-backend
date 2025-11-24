import * as fs from "fs";
import * as path from "path";

const repMapping: { [key: string]: string } = {
  "Steven Cho": "6913775ecbb69fc48859edbf",
  "Rep One": "69241ed80e46984ac3108572",
  "Sarah Hodges-Moore": "69241f560e46984ac310857a",
  "House Account": "692420060e46984ac3108580",
  "Cody Wright": "692420a60e46984ac3108584",
  "Dannie Condon": "692421070e46984ac310858a",
  desginer: "6924215c0e46984ac310858e",
};

async function mapReps() {
  try {
    const storesPath = path.join(__dirname, "../../stores.json");

    if (!fs.existsSync(storesPath)) {
      console.error("stores.json not found");
      return;
    }

    const storesData = fs.readFileSync(storesPath, "utf-8");
    const stores = JSON.parse(storesData);

    let mappedCount = 0;
    let unmappedCount = 0;
    const unmappedReps = new Set<string>();

    const updatedStores = stores.map((store: any) => {
      const repName = store.rep;
      if (repMapping[repName]) {
        store.rep = repMapping[repName];
        mappedCount++;
      } else {
        // Keep original name if no mapping found, or set to null/undefined if preferred?
        // User asked to replace, implying we should have mappings.
        // If not found, we'll log it.
        unmappedCount++;
        unmappedReps.add(repName);
      }
      return store;
    });

    fs.writeFileSync(storesPath, JSON.stringify(updatedStores, null, 2));

    console.log(`Successfully mapped ${mappedCount} stores.`);
    if (unmappedCount > 0) {
      console.log(
        `Could not map ${unmappedCount} stores. Unmapped Rep Names:`,
        Array.from(unmappedReps)
      );
    }
  } catch (error) {
    console.error("Error mapping reps:", error);
  }
}

mapReps();
