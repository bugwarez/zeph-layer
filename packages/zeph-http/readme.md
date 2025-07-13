# zeph-http

> ⚠️ **Warning:**  Please keep in mind that zeph-http is still under development.
Feel free contribute and open issue tickets to suggest features and report bugs.


> **A modern, type-safe, developer-first HTTP client for TypeScript & JavaScript.**
>
> Robust error handling, Zod-powered validation, interceptors, cancellation, and more—out of the box.

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
- ✅ **Production-ready**

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
| Manual AbortController  | `const controller = new AbortController();`<br>`client.request({ signal: controller.signal })`<br>`controller.abort();` |
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

### Comparison: zeph-http vs Axios

| Feature                | zeph-http         | Axios           |
|------------------------|-------------------|-----------------|
| Per-request retry      | ✔️ (`retry`)      | ❌ (needs plugin or manual) |
| Custom retry delay     | ✔️ (`retryDelay`) | ❌ (needs plugin or manual) |
| Exponential backoff    | ✔️ (function)     | ❌ (needs plugin or manual) |
| Timeout retry support  | ✔️ (built-in)     | ❌ (manual)      |
| Error context/cause    | ✔️                | ❌              |
| TypeScript-first       | ✔️                | Partial         |

**Why is this better?**
- No plugins or wrappers needed—retry is first-class
- Full TypeScript support and DX
- Handles timeouts, network errors, and 5xx out of the box
- Customizable retry strategies (static, exponential, etc.)
- Clear error codes and context after all retries

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

---

## 🤝 Contributing

PRs, issues, and suggestions are welcome!  
Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT

---

**zeph-http**: The HTTP client you always wanted for TypeScript & JavaScript.  
Fast, safe, and built for the modern web.

---