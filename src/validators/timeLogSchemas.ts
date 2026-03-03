import { z } from "zod";
import { dateString } from "./commonSchemas";

export const dateRangeQuery = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});
