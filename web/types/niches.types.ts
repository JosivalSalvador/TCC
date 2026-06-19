import { z } from "zod";
import {
  nicheInputSchema,
  removeNicheSchema,
  nicheResponseSchema,
} from "../schemas/niches.schema";

export type NicheInput = z.infer<typeof nicheInputSchema>;
export type RemoveNicheInput = z.infer<typeof removeNicheSchema>;
export type NicheResponse = z.infer<typeof nicheResponseSchema>;
