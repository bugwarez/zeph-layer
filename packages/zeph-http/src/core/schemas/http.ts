import { z } from "zod";

const QueryParamValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  z.array(z.boolean()),
]);

export const ZephRequestConfigSchema = z.object({
  path: z
    .string({
      error: "Request config must include a valid 'path' string.",
    })
    .min(1, "Request config must include a valid 'path' string."),
  method: z
    .enum(["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"], {
      error:
        "Request method must be GET | POST | PUT | DELETE | PATCH | OPTIONS | HEAD",
    })
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
  params: z.record(z.string(), QueryParamValue).optional(),
  body: z.any().optional(),
  responseType: z.enum(["json", "text", "blob", "arrayBuffer"]).optional(),
  timeoutMs: z
    .number()
    .int()
    .positive("timeoutMs must be a positive integer")
    .optional(),
});
