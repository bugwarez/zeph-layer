import type { $ZodIssue } from "zod/v4/core";

export function formatZodIssues(issues: $ZodIssue[]): string {
  if (!issues.length) return "Unknown validation error.";
  return issues
    .map((issue, idx) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      let msg = `${
        idx < 1 ? `Invalidity Ocurred => \n` : ""
      } • "${path}" is invalid: ${issue.message}`;

      //! Showing expected/received if available
      if (issue.code === "invalid_type" && "expected" in issue) {
        msg += ` (expected type: ${issue.expected})`;
      }
      //! For union errors, showing a hint
      if (issue.code === "invalid_union") {
        msg +=
          " (value does not match any allowed types, e.g., string, number, boolean, or array of these)";
      }
      return msg;
    })
    .join("\n");
}
