import type { Resolver, FieldError, FieldErrors, FieldValues } from "react-hook-form";
import type { z, ZodType } from "zod";

/**
 * Lightweight Zod resolver for React Hook Form.
 * Avoids extra third-party resolver dependencies while strictly
 * preserving TypeScript schema inference and field validation.
 */
export function zodResolver<T extends ZodType<FieldValues>>(schema: T): Resolver<z.infer<T>> {
  return async (values) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const errors: Record<string, FieldError> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) {
        errors[path] = {
          type: issue.code,
          message: issue.message,
        };
      }
    }

    return {
      values: {},
      errors: errors as unknown as FieldErrors<z.infer<T>>,
    };
  };
}
