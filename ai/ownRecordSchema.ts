import { z } from "zod"

/** Zod's record parser drops __proto__. Validate without cloning user maps. */
export function ownRecordSchema<T>(valueSchema: z.ZodType<T>) {
  const { $schema: _schema, ...additionalProperties } = z.toJSONSchema(
    valueSchema,
    { io: "input" }
  )
  return z
    .unknown()
    .superRefine((value, ctx) => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        ctx.addIssue({ code: "custom", message: "Expected an object" })
        return
      }
      for (const key of Object.keys(value)) {
        const result = valueSchema.safeParse(
          (value as Record<string, unknown>)[key]
        )
        if (!result.success) {
          for (const issue of result.error.issues) {
            ctx.addIssue({ ...issue, path: [key, ...issue.path] })
          }
        }
      }
    })
    .meta({
      type: "object",
      propertyNames: { type: "string" },
      additionalProperties
    }) as z.ZodType<Record<string, T>>
}
