# zeph-http

> ⚠️ **Warning:**  Please keep in mind that zeph-http is still under development.
Feel free contribute and open issue tickets to suggest features and report bugs.


> **A modern, type-safe, developer-first HTTP client for TypeScript & JavaScript.**
>
> Robust error handling, Zod-powered validation, interceptors, cancellation, and more—out of the box.

---

## 🚀 Quick Access

- [Why zeph-http?](#-why-zeph-http)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Type-Safe Request Configs](#-type-safe-request-configs)
- [Zod-powered Response Validation](#-zod-powered-response-validation-optional)
- [Tree-shakable Exports](#-tree-shakable-exports)
- [TypeScript & JSDoc Support](#-typescript--jsdoc-support)
- [Ergonomic Per-Request Cancellation](#-ergonomic-per-request-cancellation-withcancel)
- [Retry Support](#-retry-support)
- [Flexible Response Type Handling](#-flexible-response-type-handling)
- [Per-Request Base URL Override](#-per-request-base-url-override)
- [Request Lifecycle Hooks](#-request-lifecycle-hooks-onrequeststart-onrequestend-onerror)
- [Error Handling](#-error-handling)
- [Documentation](#-documentation)
- [Comparison with Axios](#-comparison-with-axios)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Why zeph-http?

- **TypeScript-first:** All APIs are fully typed, with strict type safety and autocompletion.
- **Zod-powered validation:** Catch config errors before they hit the network.
- **Best-in-class error handling:** Every error is actionable, debuggable, and consistent.
- **Interceptors:** Powerful request/response hooks, just like Axios—but with better DX.
- **Cancellation & timeouts:** Modern fetch-based cancellation and timeout support.
- **DX-focused:** Designed for real-world apps, with clear error messages and extensibility.
- **Lightweight & modular:** No heavy dependencies, tree-shakable, and easy to extend.

---

## ✨ Features

- ✅ **Type-safe API** with strict TypeScript support
- ✅ **Zod validation** for request configs
- ✅ **Request & response interceptors** (with error context)
- ✅ **Timeouts** and **user-initiated cancellation**
- ✅ **Ergonomic per-request cancellation handles** (`withCancel`)
- ✅ **Automatic Content-Type detection**
- ✅ **Duplicate header warnings**
- ✅ **Comprehensive error objects** (`ZephHttpError`)
- ✅ **JSON parse error handling** (with raw response)
- ✅ **Easy error serialization**
- ✅ **DX-focused error messages**
- ✅ **Composable, modular utilities**

---

## 🌲 Tree-shakable Exports

zeph-http is designed from the ground up to be fully tree-shakable. This means that when you import only the features you use, your final bundle will include only the code you actually need—nothing more.

### What is tree-shaking?
Tree-shaking is a feature of modern JavaScript bundlers (like Vite, Rollup, Webpack) that removes unused code from your final bundle. This keeps your app fast and your bundle size small.

### Why does it matter?
- **Performance:** Smaller bundles load faster and use less bandwidth.
- **Best practice:** Only ship the code your users need.
- **Modern DX:** Works seamlessly with ESM imports and TypeScript.

### How does zeph-http achieve this?
- All exports are explicit and modular—no side effects or global code.
- ESM build is provided out of the box (see `package.json` and `dist/`).
- No polyfills or patches are applied globally.
- You can import just what you need:
  ```ts
  import { createZephClient } from "zeph-http";
  // Only the code for createZephClient and its dependencies will be included in your bundle.
  ```

**Tip:** If you use a modern bundler, you get these benefits automatically—no extra config needed!

---

## 📝 TypeScript & JSDoc Support

zeph-http is built for the best possible developer experience. All public APIs, types, and interfaces are fully documented with comprehensive JSDoc comments. This means:
- **Best-in-class IDE support:** Hover for instant documentation, parameter info, and usage examples.
- **Autocompletion:** Get smart suggestions for every option, method, and type.
- **Discoverability:** Find out what every function, config, and error does—right in your editor.

### Example: JSDoc in Action
```ts
/**
 * Creates a new Zeph HTTP client instance.
 *
 * @param defaultConfig Default configuration for all requests from this client.
 * @returns A client instance with request, interceptors, cancellation, and lifecycle hooks.
 *
 * @example
 * const client = createZephClient({ baseURL: "https://api.example.com" });
 * const res = await client.request({ path: "/todos/1" });
 */
function createZephClient(defaultConfig?: ZephClientConfig): ZephClient { ... }
```

> **Tip:** Try hovering over any exported function or type in your editor to see full docs and usage notes!

### Why does this matter?
- **Faster development:** No need to leave your editor to look up docs.
- **Fewer mistakes:** Clear parameter/return info and examples reduce bugs.
- **Easier onboarding:** New team members can learn the API from their IDE.

**Best Practice:**
- Always check the JSDoc for config options, error codes, and advanced usage.
- If you contribute, follow the existing JSDoc style for all new public APIs.

---

## 📦 Installation

```bash
npm install zeph-http
# or
yarn add zeph-http
# or
pnpm install zeph-http
```

---

## 🛠️ Quick Start

```ts
import { createZephClient } from "zeph-http";

const client = createZephClient({
  baseURL: "https://jsonplaceholder.typicode.com",
  headers: { "X-Default": "yes" },
});

async function fetchTodo() {
  try {
    const res = await client.request<{ id: number; title: string }>({
      path: "/todos/1",
      method: "GET",
    });
    console.log("Todo:", res.data);
  } catch (error) {
    // See error handling readme
  }
}

fetchTodo();
```

---

## 🔒 Type-Safe Request Configs

All request configs are validated with [Zod](https://zod.dev/) at runtime.  
You’ll get clear, actionable errors for missing/invalid fields—before any network call is made.

---

## 🧪 Zod-powered Response Validation (Optional)

zeph-http lets you validate API responses at runtime using [Zod](https://zod.dev/) schemas—giving you both compile-time and runtime safety. This is a major DX and reliability win, especially for apps that rely on external APIs or microservices.

### Why validate responses?
- **TypeScript only checks types at compile time.** APIs can still return unexpected or malformed data at runtime.
- **Zod validation ensures your app only works with valid, expected data.**
- **Fail fast:** Catch backend bugs, contract mismatches, or API changes instantly—with clear, actionable errors.

### Real-World Example

#### Without Zod Validation
```ts
// You expect this from the API:
type Todo = { id: number; title: string };

// But the backend returns:
{ id: "oops", title: 123 } // (wrong types!)

const res = await client.request<Todo>({ path: "/todos/1" });
// TypeScript thinks res.data.id is a number, but at runtime it's a string!
// This can cause subtle bugs, crashes, or data corruption.
```

#### With Zod Validation
```ts
import { z } from "zod";
const todoSchema = z.object({ id: z.number(), title: z.string() });

const res = await client.request({
  path: "/todos/1",
  responseSchema: todoSchema,
});
// If the backend returns the wrong types, you get a clear error immediately:
// "Response validation failed: ... expected number, received string ..."
// No more silent bugs!
```

### Usage
Pass a Zod schema as `responseSchema` in your request config. If the response doesn't match, zeph-http throws a detailed error.

```ts
import { z } from "zod";

const todoSchema = z.object({
  id: z.number(),
  title: z.string(),
});

const res = await client.request({
  path: "/todos/1",
  responseType: "json",
  responseSchema: todoSchema, // <--- validate response at runtime!
});
// If the response doesn't match, throws a ZephHttpError with validation details.
```

### Example: Success & Failure
```ts
const matchingSchema = z.object({
  slideshow: z.object({
    author: z.string(),
    date: z.string(),
    slides: z.array(z.any()),
    title: z.string(),
  })
});

// Passes validation
await client.request({ path: "/json", responseSchema: matchingSchema });

// Fails validation (field missing)
const failSchema = z.object({ notAField: z.string() });
try {
  await client.request({ path: "/json", responseSchema: failSchema });
} catch (e) {
  // e.code === 'EZODRESPONSE', e.data.issues contains Zod errors
  console.error(e.message, e.data);
}
```

### DX & Best Practices
- **Optional:** Only add `responseSchema` when you want runtime validation.
- **Actionable errors:** If validation fails, you get a clear error message, the received data, and all Zod issues.
- **Combine with TypeScript:** Use both for maximum safety and confidence.
- **Great for public APIs, microservices, or any app where backend contracts can change.**

---

## 🔄 Interceptors

Add request/response interceptors for auth, logging, token refresh, and more:

```ts
client.interceptors.request.use((config) => {
  config.headers["Authorization"] = "Bearer " + getToken();
  return config;
});

client.interceptors.response.use((response) => {
  // Transform or log responses
  return response;
});
```

### ⚠️ Important: Response Interceptor Signature

The `interceptors.response.use` method **requires two function arguments**:
- The first handles successful responses.
- The second handles errors.

**Do not pass `undefined` as the first argument.**
If you only want to handle errors, use a "pass-through" function for the first argument:

```ts
// ❌ Incorrect: This will throw a runtime error!
client.interceptors.response.use(
  undefined,
  (error) => {
    // error handling
  }
);

// ✅ Correct: Use a pass-through for the first argument
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // error handling
    throw error;
  }
);
```

### Real-World Example: Auth, Logging, and Error Handling

```ts
client.interceptors.request.use((config) => {
  // Add auth token
  const token = getToken();
  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    },
  };
});

client.interceptors.response.use(
  (response) => {
    // Log all responses
    console.log("Response received:", response);
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized globally
    if (error instanceof ZephHttpError && error.status === 401) {
      redirectToLogin();
    }
    throw error;
  }
);
```

> **Tip:** Always return or throw from your interceptors to ensure the request chain continues as expected.

---

**Why?**
This pattern matches Axios, but is stricter for type safety and DX.
Passing `undefined` as the first argument will cause a runtime error:
`TypeError: t is not a function`

---

### Summary Table

| Argument Position | Purpose                | Example                        |
|-------------------|------------------------|--------------------------------|
| 1st               | Success handler        | `(response) => response`       |
| 2nd               | Error handler (optional) | `(error) => { ... }`           |

---

## ⏱️ Timeouts & Cancellation

```ts
const controller = new AbortController();
setTimeout(() => controller.abort(), 100); // Cancel after 100ms

await client.request({
  path: "/slow-endpoint",
  timeoutMs: 5000, // Timeout after 5s
  signal: controller.signal, // User cancellation
});
```

---

### 🚦 Ergonomic Per-Request Cancellation: `withCancel`

For even better DX, zeph-http provides an ergonomic handle for per-request cancellation—no need to manually create an AbortController:

```ts
const { promise, cancel, signal } = client.request.withCancel({
  path: "/slow-endpoint",
  timeoutMs: 5000,
});

// Cancel the request at any time:
cancel();

// Or just await the result:
const result = await promise;
```

**Why is this better?**
- No manual AbortController boilerplate
- Cleaner, more discoverable API
- Still supports advanced use (access to the signal)
- Works seamlessly with timeouts and all other features

**Comparison:**

| Approach                | Code Example                                                                 |
|-------------------------|------------------------------------------------------------------------------|
| Manual AbortController  |  `const controller = new AbortController();`<br>`client.request({ signal: controller.signal })`<br>`controller.abort();` |
| `withCancel` handle     | `const { promise, cancel } = client.request.withCancel(config);`<br>`cancel();`                |

**Note:** You can use either approach—choose what fits your style and use case!

---

## 🔁 Retry Support

zeph-http supports robust, configurable retry logic for failed requests—out of the box.

### Usage Example

```ts
const client = createZephClient({ baseURL: "https://httpbin.org" });

try {
  await client.request({
    path: "/delay/3", // This endpoint waits 3 seconds
    timeoutMs: 500,    // Force a timeout quickly
    retry: 2,          // Retry 2 times (3 total attempts)
    retryDelay: (attempt, error) => {
      console.log(`Retry attempt #${attempt} after error:`, error.message);
      return 300; // 300ms between retries
    },
  });
} catch (error) {
  // After all retries, error is thrown
  if (error instanceof ZephHttpError) {
    console.error("Final error after retries:", error.message, error.code);
  }
}
```

### How It Works
- **retry:** Number of retry attempts for failed requests (default: 0)
- **retryDelay:** Delay between retries (ms), or a function `(attempt, error) => ms` for custom logic (e.g., exponential backoff)
- **Retries on:**
  - Network errors
  - Timeouts
  - 5xx HTTP errors
- **Does NOT retry on:**
  - 4xx HTTP errors (client errors)
  - User cancellation
- **Each retry is a real new attempt** (fresh timeout/cancellation signals)
- **Error handling:** After all retries, the last error is thrown (with full context and cause chain)



**Why is this better?**
- No plugins or wrappers needed—retry is first-class
- Full TypeScript support and DX
- Handles timeouts, network errors, and 5xx out of the box
- Customizable retry strategies (static, exponential, etc.)
- Clear error codes and context after all retries

---

## 🧩 Flexible Response Type Handling

zeph-http lets you control how the response body is parsed for each request, just like Axios. This gives you more flexibility and can improve performance by avoiding unnecessary parsing.

### Usage

Add the `responseType` field to your request config. Supported values:
- `"json"` (default)
- `"text"`
- `"blob"` (browser only)
- `"arrayBuffer"`

```ts
// JSON (default)
const jsonRes = await client.request<{ url: string }>({
  path: "/json",
  responseType: "json",
});
console.log(jsonRes.data);

// Text
const textRes = await client.request<string>({
  path: "/html",
  responseType: "text",
});
console.log(textRes.data);

// Blob (browser only)
const blobRes = await client.request<Blob>({
  path: "/image/png",
  responseType: "blob",
});
console.log(blobRes.data instanceof Blob); // true

// ArrayBuffer (for binary data)
const abRes = await client.request<ArrayBuffer>({
  path: "/image/png",
  responseType: "arrayBuffer",
});
console.log(abRes.data instanceof ArrayBuffer); // true
```

### Why is this useful?
- **Performance:** Avoids unnecessary JSON parsing for text or binary data.
- **Flexibility:** Download files, images, or handle plain text easily.
- **Type Safety:** Use TypeScript generics to specify the expected data type for each response type.

**Note:**
- The default is `"json"` for backward compatibility.
- `"blob"` is only supported in browser environments.
- If the server returns an unexpected content type, you may get a parsing error (e.g., requesting `json` but receiving HTML).

---

## 🌐 Per-Request Base URL Override

zeph-http lets you override the base URL for any individual request, just like Axios. This is useful when you need to hit different APIs or endpoints from the same client instance.

### Usage

You can set a `baseURL` when creating the client, and override it per request:

```ts
const client = createZephClient({ baseURL: "https://jsonplaceholder.typicode.com" });

// Uses instance baseURL
const res1 = await client.request({ path: "/todos/1" }); // https://jsonplaceholder.typicode.com/todos/1

// Override baseURL per request
const res2 = await client.request({
  path: "/get",
  baseURL: "https://httpbin.org",
  responseType: "json"
}); // https://httpbin.org/get
```

**How it works:**
- If you specify `baseURL` in the request config, it takes precedence over the client’s default.
- This matches Axios’s behavior for maximum compatibility and DX.
- TypeScript will autocomplete and validate `baseURL` in both places.

**Best Practice:**
- Use per-request `baseURL` only when you need to override the default for a specific call.
- For most requests, set the default at the client level for clarity and maintainability.

---

## 🚦 Request Lifecycle Hooks (onRequestStart, onRequestEnd, onError)

zeph-http provides **first-class lifecycle hooks** to track every HTTP request globally. These hooks are a major DX win for modern apps, devtools, analytics, and robust error handling. Unlike Axios, zeph-http's hooks are built-in and type-safe.

### What are the lifecycle hooks?

| Hook             | When it Fires                                                                 | Arguments                                 |
|------------------|-------------------------------------------------------------------------------|-------------------------------------------|
| onRequestStart   | Immediately before any request is sent                                        | (config)                                  |
| onRequestEnd     | After a request completes successfully (2xx response, after all interceptors) | (response, config)                        |
| onError          | When a request fails for **any reason** (see below)                           | (error, config)                           |

**onError fires for:**
- HTTP errors (non-2xx, e.g. 404, 500)
- JSON parse errors
- Timeouts
- User cancellations
- Network/CORS errors
- Interceptor errors
- Zod validation errors

### Real-World Use Cases
- **Global loading indicators:** Show/hide a spinner or progress bar for all network activity.
- **Devtools:** Track all requests, responses, and errors for debugging and performance analysis.
- **Analytics/monitoring:** Log API usage, slow requests, or error rates to analytics services.
- **Global error handling:** Show a toast or notification for any failed request.
- **Request/response logging:** Audit or debug all network activity in production.
- **Testing:** Track requests in end-to-end tests.

### Usage Example
```ts
const client = createZephClient({ baseURL: "https://api.example.com" });

client.onRequestStart((config) => {
  // Show global loader, log, or track analytics
  console.log("[onRequestStart]", config.path, config);
});

client.onRequestEnd((response, config) => {
  // Hide loader, log response, etc.
  console.log("[onRequestEnd]", config.path, response.status);
});

client.onError((error, config) => {
  // Show error toast, log to Sentry, etc.
  if (error instanceof ZephHttpError) {
    console.error(
      `[onError] ${config.path} ZephHttpError: ${error.message} (status: ${error.status}, code: ${error.code})`
    );
  } else {
    console.error("[onError]", config.path, "Unknown error:", error);
  }
});

// Example requests
client.request({ path: "/get" })
  .then((res) => console.log("[then] /get data:", res.data))
  .catch((err) => console.log("[catch] /get error:", err));

client.request({ path: "/status/404" })
  .then((res) => console.log("[then] /status/404 data:", res.data))
  .catch((err) => console.log("[catch] /status/404 error:", err));
```

### Example Output
```
[onRequestStart] /get { ... }
[onRequestStart] /status/404 { ... }
[onRequestEnd] /get 200
[then] /get data: { ... }
[onError] /status/404 ZephHttpError: Failed to parse JSON response (status: 404, code: EJSONPARSE)
[catch] /status/404 ZephHttpError: Failed to parse JSON response (status: 404, code: EJSONPARSE)
```

### Best Practices & Tips
- Use `onRequestStart`/`onRequestEnd` for global loading UX (show/hide spinner).
- Use `onError` for global error toasts, Sentry logging, or analytics.
- Combine with interceptors for per-request logic (e.g., auth, response transforms).
- All hooks are **zero overhead** if unused—register only what you need.
- All errors passed to `onError` are guaranteed to be `ZephHttpError` (with code, status, etc.).
- You can register multiple handlers for each hook.
- Use these hooks for devtools, debugging, or to build custom request monitors.

### Advanced Usage
- Track request durations by storing a timestamp in `onRequestStart` and comparing in `onRequestEnd`/`onError`.
- Use `onError` to trigger retries, fallback UIs, or advanced error recovery.
- Integrate with analytics or monitoring tools for full API observability.

### Troubleshooting
- **Multiple requests in parallel:** Each request fires its own lifecycle hooks independently.
- **Want per-request logic?** Use interceptors for request/response transformation; use hooks for global side effects.

> **Tip:** Lifecycle hooks are global to the client instance. For per-request logic, use interceptors.

---

## 🛡️ Error Handling

All errors thrown are instances of `ZephHttpError`—see [ERROR-HANDLING.md](./ERROR-HANDLING.md) for full details.

### Error Codes for Programmatic Handling

Every error includes a `code` property for robust, programmatic error handling. Example codes:
- `EVALIDATION` – Config validation error
- `EJSONPARSE` – JSON parse error
- `EHTTP` – HTTP error (non-2xx)
- `ETIMEDOUT` – Timeout
- `ECANCELLED` – User cancellation
- `ENETWORK` – Network/CORS error
- `EINTERCEPTOR` – Interceptor error
- ...and more (see docs)

#### Error Serialization

Every `ZephHttpError` includes a `.toJSON()` method for easy logging and transport:

```ts
try {
  await client.request({ path: "/api/data" });
} catch (error) {
  if (error instanceof ZephHttpError) {
    console.log(JSON.stringify(error)); // Uses .toJSON()
  }
}
```

See [ERROR-HANDLING.md](./ERROR-HANDLING.md) for all properties, codes, and serialization details.

---

## 📚 Documentation

- [Error Handling (full details)](./ERROR-HANDLING.md)
- [API Reference (coming soon)]
- [Examples (coming soon)]

---

## 🏆 Comparison with Axios

| Feature/Scenario         | zeph-http      | Axios      |
|-------------------------|----------------|------------|
| TypeScript-first        | ✔️             | Partial    |
| Zod validation          | ✔️             | ❌         |
| Interceptor error DX    | ✔️ (context)   | ❌         |
| JSON parse error DX     | ✔️ (raw text)  | ❌         |
| Error codes             | ✔️             | ✔️         |
| Error serialization     | ✔️             | ✔️         |
| Duplicate header warn   | ✔️             | ❌         |
| Per-request retry      | ✔️ (`retry`)      | ❌ (needs plugin or manual) |
| Custom retry delay     | ✔️ (`retryDelay`) | ❌ (needs plugin or manual) |
| Exponential backoff    | ✔️ (function)     | ❌ (needs plugin or manual) |
| Timeout retry support  | ✔️ (built-in)     | ❌ (manual)      |
| Error context/cause    | ✔️                | ❌              |

---

## 🤝 Contributing

PRs, issues, and suggestions are welcome!
---

## 📄 License

MIT

---

**zeph-http**: The HTTP client you always wanted for TypeScript & JavaScript.  
Fast, safe, and built for the modern web.

---
