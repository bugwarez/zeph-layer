# Error Handling

Your HTTP client provides robust, developer-friendly, and production-ready error handling that matches or exceeds the best libraries in the ecosystem (including Axios). This section documents all error shapes, codes, and best practices for handling errors in your app.

---

## **Error Object: `ZephHttpError`**

All errors thrown by the client are instances of `ZephHttpError`, which extends the native `Error` class and includes rich context for debugging and programmatic handling.

### **Properties**

| Property            | Type                                 | Description                                                                 |
|---------------------|--------------------------------------|-----------------------------------------------------------------------------|
| `name`              | `string`                             | Always `"ZephHttpError"`                                                    |
| `message`           | `string`                             | Human-friendly, actionable error message                                    |
| `status`            | `number | undefined`                | HTTP status code (if available)                                             |
| `data`              | `any`                                | Response data, raw response, or validation issues (if available)            |
| `headers`           | `Record<string, string> | undefined`| Response headers (if available)                                             |
| `request`           | `ZephRequestConfig | undefined`     | The request config that caused the error                                    |
| `cause`             | `unknown`                            | The original error, if any (e.g., network, JSON parse, etc.)                |
| `interceptorType`   | `"request" | "response" | undefined`| If error was thrown in an interceptor, which type                           |
| `interceptorIndex`  | `number | undefined`                | Index of the interceptor that threw the error                               |
| `isZephHttpError`   | `true`                               | Always true for this error type                                             |
| `code`              | `string | undefined`                 | Error code for programmatic handling (see below)                            |

---

## **Error Codes**


Each error thrown by zeph-http includes a `code` property for robust, programmatic error handling. Here are all possible codes and when they occur:
| Code           | Scenario/When it Occurs                                 | Example Message                              |
|----------------|--------------------------------------------------------|----------------------------------------------|
| `EVALIDATION`  | Request config failed Zod validation                   | "Request config must include a valid 'path' string." |
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
| Scenario | Error Message / Code | When it Happens |
|----------|---------------------|-----------------|
| **Body with GET/HEAD** | `"A body is not allowed for GET/HEAD requests."`, code: `"EMISUSE"` | Body sent with GET/HEAD |
| **Duplicate headers** | Console warning | Same header in default and per-request |
| **Timeout** | `"Request timed out after X ms"` | Request exceeded `timeoutMs` | ✔️ |
| **User cancellation** | `"Request was cancelled by the user."` | User aborted request via `AbortController` |
| **Network/CORS error** | `"Network error or CORS error..."` | Network unreachable, CORS, DNS, etc. |
| **HTTP error (non-2xx)** | `"HTTP Error"` | Server returned non-2xx status |
| **Interceptor error** | `[request interceptor #0] ...` | Error thrown in interceptor |
| **JSON parse error** | `"Failed to parse JSON response"` | Response body is not valid JSON |
| **Token refresh failure** | User-defined | If implemented in interceptor | ✔️ (user-defined) |

---

### **How to Handle Errors Programmatically**

```ts
import { ZephHttpError } from "zeph-http";

const client =  createZephClient({
baseURL:  "http://your-api.com",
});

try {
  await client.request({ path: "/api/data" });
} catch (error) {
  if (error instanceof ZephHttpError) {
    switch (error.code) {
      case "EVALIDATION":
        // Handle config validation error
        break;
      case "EJSONPARSE":
        // Handle JSON parse error
        break;
      case "EHTTP":
        // Handle HTTP error (check error.status)
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
      case "ETOKENREFRESH":
        // Handle token refresh failure
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
```

---

## **Error Scenarios and Codes**

| Scenario                        | Error Message / Code                | When it Happens                                
|----------------------------------|-------------------------------------|-------------------------------------------------|
| **Body with GET/HEAD**           | `"A body is not allowed for GET/HEAD requests."`, code: `"EMISUSE"` | Body sent with GET/HEAD                                    |
| **Duplicate headers**            | Console warning                     | Same header in default and per-request          | ❌                |
| **Timeout**                      | `"Request timed out after X ms"` | Request exceeded `timeoutMs`                    | ✔️                |
| **User cancellation**            | `"Request was cancelled by the user."`  | User aborted request via `AbortController`      | ✔️                |
| **Network/CORS error**           | `"Network error or CORS error..."`  | Network unreachable, CORS, DNS, etc.            | ✔️                |
| **HTTP error (non-2xx)**         | `"HTTP Error"`     | Server returned non-2xx status                  | ✔️                |
| **Interceptor error**            | `[request interceptor #0] ...` | Error thrown in interceptor                     | ❌                |
| **JSON parse error**             | `"Failed to parse JSON response"` | Response body is not valid JSON                 | ❌                |
| **Token refresh failure**        | User-defined                        | If implemented in interceptor                   | ✔️ (user-defined) |

---

## **Features**

| Feature/Scenario         | Zeph HTTP Client 
|-------------------------|------------------
| Config validation       | ✔️ (Zod, DX)     
| Body with GET/HEAD      | ✔️ (guard)       
| Duplicate headers warn  | ✔️ (warn)        
| Timeout                 | ✔️               
| User cancellation       | ✔️               
| Network/CORS error DX   | ✔️ (actionable)  
| HTTP error context      | ✔️               
| Interceptor error DX    | ✔️ (context)     
| JSON parse error DX     | ✔️ (raw text)    
| Error codes             | ✔️ (optional)    
| Error serialization     | ✔️               

---

## **Best Practices**

- Always check for `instanceof ZephHttpError` in your error handling.
- Use the `code` property for programmatic error handling.
- Log or display the `message` for user-friendly feedback.
- Use `data`, `headers`, `status`, and `request` for debugging and advanced handling.

---

## **Extending Error Handling**

- Use interceptors to implement advanced flows (e.g., token refresh, retry logic).
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
