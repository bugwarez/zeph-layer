# Error Handling

zeph-http provides robust, developer-friendly, and production-ready error handling that matches or exceeds the best libraries in the ecosystem (including Axios). All errors are consistent, actionable, and easy to debug—whether you use try/catch, lifecycle hooks, or both.

---

## **Error Object: `ZephHttpError`**

All errors thrown by zeph-http are instances of `ZephHttpError`, which extends the native `Error` class and includes rich context for debugging and programmatic handling.

### **Properties**

| Property            | Type                                 | Description                                                                 |
|---------------------|--------------------------------------|-----------------------------------------------------------------------------|
| `name`              | `string`                             | Always `"ZephHttpError"`                                                    |
| `message`           | `string`                             | Human-friendly, actionable error message                                    |
| `status`            | `number \| undefined`                | HTTP status code (if available)                                             |
| `data`              | `any`                                | Response data, raw response, or validation issues (if available)            |
| `headers`           | `Record<string, string> \| undefined`| Response headers (if available)                                             |
| `request`           | `ZephRequestConfig \| undefined`     | The request config that caused the error                                    |
| `cause`             | `unknown`                            | The original error, if any (e.g., network, JSON parse, etc.)                |
| `interceptorType`   | `"request" \| "response" \| undefined`| If error was thrown in an interceptor, which type                           |
| `interceptorIndex`  | `number \| undefined`                | Index of the interceptor that threw the error                               |
| `isZephHttpError`   | `true`                               | Always true for this error type                                             |
| `code`              | `string \| undefined`                 | Error code for programmatic handling (see below)                            |

---

## **Error Codes**

Each error thrown by zeph-http includes a `code` property for robust, programmatic error handling. Here are all possible codes and when they occur:

| Code           | Scenario/When it Occurs                                 | Example Message                              |
|----------------|--------------------------------------------------------|----------------------------------------------|
| `EVALIDATION`  | Request config failed Zod validation                   | "Request config must include a valid 'path' string." |
| `EZODRESPONSE` | Response failed Zod validation (runtime response check)| "Response validation failed"                |
| `EMISUSE`      | Misuse of API (e.g., body with GET/HEAD)               | "A body is not allowed for GET/HEAD requests." |
| `EDUPLICATEHEADER` | Duplicate header in default and per-request config  | Console warning                              |
| `ETIMEDOUT`    | Request timed out (timeoutMs exceeded)                 | "Request timed out after X ms"              |
| `ECANCELLED`   | User cancelled the request via AbortController         | "Request was cancelled by the user."        |
| `ENETWORK`     | Network error, DNS error, or CORS error                | "Network error or CORS error..."            |
| `EHTTP`        | HTTP error (non-2xx status code)                       | "HTTP Error"                                |
| `EINTERCEPTOR` | Error thrown in a request/response interceptor         | "[request interceptor #0] ..."              |
| `EJSONPARSE`   | Response body is not valid JSON                        | "Failed to parse JSON response"             |
| `ETOKENREFRESH`| Token refresh logic failed (if implemented in interceptor) | "Token refresh failed"                  |

---

## **Error Handling Flow: Try/Catch and Lifecycle Hooks**

zeph-http supports both traditional try/catch and global lifecycle hooks for error handling. **All errors (including HTTP, parse, validation, timeout, cancellation, network, and interceptor errors) trigger both the `onError` lifecycle hook and can be caught in try/catch.**

### **Lifecycle Hook: onError**
- Fires for **all error types** (see table above).
- Receives the `ZephHttpError` and the original request config.
- Can be used for global error toasts, logging, analytics, or monitoring.

### **Try/Catch**
- Use try/catch for per-request error handling and recovery.
- Always check `instanceof ZephHttpError` and use the `code` property for robust handling.

### **Retry Logic**
- If you use the `retry` option, errors are retried as configured.
- After all retries are exhausted, the final error is thrown and triggers `onError`.

---

## **Real-World Example: onError + Try/Catch**

```ts
import { createZephClient, ZephHttpError } from "zeph-http";

const client = createZephClient({ baseURL: "https://api.example.com" });

client.onError((error, config) => {
  // Global error logging or toast
  console.error(`[onError] ${config.path}:`, error.message, error.code);
});

async function fetchData() {
  try {
    await client.request({ path: "/status/404" });
  } catch (error) {
    if (error instanceof ZephHttpError) {
      switch (error.code) {
        case "EHTTP":
          // Handle HTTP error (check error.status)
          break;
        case "EJSONPARSE":
          // Handle JSON parse error
          break;
        case "EZODRESPONSE":
          // Handle Zod response validation error
          break;
        case "ETIMEDOUT":
          // Handle timeout
          break;
        case "ECANCELLED":
          // Handle user cancellation
          break;
        case "ENETWORK":
          // Handle network/CORS error
          break;
        case "EINTERCEPTOR":
          // Handle interceptor error
          break;
        // ...other codes
      }
      // Debugging info
      console.error("Status:", error.status);
      console.error("Headers:", error.headers);
      console.error("Request:", error.request);
      console.error("Cause:", error.cause);
      if (error.interceptorType) {
        console.error(
          `Error in ${error.interceptorType} interceptor #${error.interceptorIndex}`
        );
      }
    } else {
      // Handle unexpected errors
      console.error("Unknown error:", error);
    }
  }
}
```

---

## **Error Scenarios and Codes**

| Scenario                        | Error Message / Code                | When it Happens                                |
|----------------------------------|-------------------------------------|-------------------------------------------------|
| **Body with GET/HEAD**           | `"A body is not allowed for GET/HEAD requests."`, code: `"EMISUSE"` | Body sent with GET/HEAD                                    |
| **Duplicate headers**            | Console warning                     | Same header in default and per-request          |
| **Timeout**                      | `"Request timed out after X ms"` | Request exceeded `timeoutMs`                    |
| **User cancellation**            | `"Request was cancelled by the user."`  | User aborted request via `AbortController`      |
| **Network/CORS error**           | `"Network error or CORS error..."`  | Network unreachable, CORS, DNS, etc.            |
| **HTTP error (non-2xx)**         | `"HTTP Error"`     | Server returned non-2xx status                  |
| **Interceptor error**            | `[request interceptor #0] ...` | Error thrown in interceptor                     |
| **JSON parse error**             | `"Failed to parse JSON response"` | Response body is not valid JSON                 |
| **Zod response validation**      | `"Response validation failed"`, code: `"EZODRESPONSE"` | Response did not match Zod schema |
| **Token refresh failure**        | User-defined                        | If implemented in interceptor                   |

---

## **Best Practices**

- Always check for `instanceof ZephHttpError` in your error handling.
- Use the `code` property for programmatic error handling.
- Use the `onError` lifecycle hook for global error handling, logging, and analytics.
- Log or display the `message` for user-friendly feedback.
- Use `data`, `headers`, `status`, and `request` for debugging and advanced handling.
- Combine try/catch and lifecycle hooks for the most robust error handling.
- Use interceptors for advanced flows (e.g., token refresh, retry logic).
- All errors thrown by the client are consistent, serializable, and easy to debug.
- You can add custom error codes or properties as needed for your app.

---

## **Error Serialization: .toJSON()**

Every `ZephHttpError` includes a `.toJSON()` method for easy serialization and logging. This is especially useful for logging errors, sending them to monitoring services, or debugging in distributed systems.

**Example usage:**

```ts
import { ZephHttpError } from "zeph-http";

const client =  createZephClient({
baseURL:  "http://your-api.com",
});

try {
  await client.request({ path: "/api/data" });
} catch (error) {
  if (error instanceof ZephHttpError) {
    console.log(JSON.stringify(error)); // Uses .toJSON()
    // or
    console.log(error.toJSON());
  }
}
```

**Example output:**
```json
{
  "name": "ZephHttpError",
  "message": "Request timed out after 5000 ms",
  "code": "ETIMEDOUT",
  "status": undefined,
  "data": undefined,
  "headers": undefined,
  "request": { "path": "/api/data", ... },
  "cause": { "name": "AbortError", ... },
  "interceptorType": undefined,
  "interceptorIndex": undefined,
  "isZephHttpError": true,
  "stack": "...stack trace..."
}
```

---

## **Troubleshooting & Tips**

- **Multiple requests in parallel:** Each request fires its own lifecycle hooks independently.
- **Want per-request logic?** Use interceptors for request/response transformation; use hooks for global side effects.
- **Error not serializing as expected?** Use `.toJSON()` for safe logging/transport.
- **Custom error codes:** You can extend ZephHttpError for your own app needs.

---
