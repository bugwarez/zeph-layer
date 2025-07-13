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

```ts
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
      // ...other codes
    }
    // See ERROR-HANDLING.md for all properties and codes!
  }
}
```

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