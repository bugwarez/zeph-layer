import { createZephClient, ZephHttpError } from "zeph-http";

async function testGet() {
  const client = createZephClient({
    baseURL: "http://localhost:9999",
  });
  client.interceptors.request.use((config) => {
    const token = "<<token>>";
    config.headers["auth"] = token;
    return config;
  });
  client.interceptors.request.use(() => {
    throw new Error("Interceptor failed!");
  });
  client.interceptors.response.use((response) => {
    return response;
  });
  try {
    const res = await client.request({
      path: "/todos/1",
      timeoutMs: 10,
    });
    console.log("Response:", res);
    console.log("Response:", res);
  } catch (error: any) {
    if (error instanceof ZephHttpError) {
      console.error("Caught ZephHttpError!");
      console.error("Status:", error.status);
      console.error("Message:", error.message);
      console.error("Data:", error.data);
      console.error("Headers:", error.headers);
      console.error("Request:", error.request);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

//testGet().catch((err) => console.error("Error while running testGet():", err));

async function testInterceptors() {
  const client = createZephClient({
    baseURL: "http://localhost:9999",
  });
  client.interceptors.request.use((config) => {
    throw new Error("Request interceptor failed!");
  });

  client.interceptors.response.use((response) => {
    throw new Error("Response interceptor failed!");
  });
  try {
    await client.request({ path: "/todos/1" });
  } catch (error: any) {
    if (error instanceof ZephHttpError) {
      console.error("Caught ZephHttpError!");
      console.error("Message:", error.message);
      console.error("interceptorType:", error.interceptorType);
      console.error("interceptorIndex:", error.interceptorIndex);
      console.error("Cause:", error.cause);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// testInterceptors().catch((err) =>
//   console.error("Error while running testInterceptors():", err)
// );

async function testJsonParseError() {
  const client = createZephClient({
    baseURL: "https://httpbin.org",
  });
  try {
    await client.request({ path: "/html" });
  } catch (error: any) {
    if (error instanceof ZephHttpError) {
      console.error("Caught ZephHttpError!");
      console.error("Message:", error.message);
      console.error("Status:", error.status);
      console.error("Headers:", error.headers);
      console.error("Request:", error.request);
      console.error("Raw response (data):", error.data);
      console.error("Cause:", error.cause);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// testJsonParseError().catch((err) =>
//   console.error("Error while running testJsonParseError():", err)
// );

async function testUserCancellation() {
  const client = createZephClient({
    baseURL: "https://httpbin.org", // or any slow endpoint
  });
  const controller = new AbortController();

  setTimeout(() => {
    controller.abort();
    console.log("Request aborted by user!");
  }, 50); // abort after 50ms

  try {
    await client.request({
      path: "/delay/3", // httpbin.org/delay/3 waits 3 seconds
      signal: controller.signal,
    });
    console.log("Request completed (should not happen)");
  } catch (error: any) {
    if (error instanceof ZephHttpError) {
      console.error("Caught ZephHttpError!");
      console.error("Message:", error.message);
      console.error("Cause:", error.cause);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// testUserCancellation().catch((err) =>
//   console.error("Error while running testJsonParseError():", err)
// );

async function testWithCancelHandle() {
  const client = createZephClient({
    baseURL: "https://httpbin.org", // or any slow endpoint
  });
  const { promise, cancel } = client.request.withCancel({
    path: "/delay/3", // httpbin.org/delay/3 waits 3 seconds
  });

  setTimeout(() => {
    cancel();
    console.log("Request cancelled via withCancel handle!");
  }, 50); // cancel after 50ms

  try {
    await promise;
    console.log("Request completed (should not happen)");
  } catch (error: any) {
    if (error instanceof ZephHttpError) {
      console.error("Caught ZephHttpError!");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Cause:", error.cause);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

// testWithCancelHandle().catch((err) =>
//   console.error("Error while running testWithCancelHandle():", err)
// );

async function testRetrySupport() {
  const client = createZephClient({
    baseURL: "https://httpbin.org",
  });
  let attempt = 0;
  const config: {
    path: string;
    timeoutMs: number;
    retry: number;
    retryDelay: (a: number, err: any) => number;
  } = {
    path: "/delay/3", // This endpoint waits 3 seconds
    timeoutMs: 500, // Force a timeout quickly
    retry: 2, // Retry 2 times (3 total attempts)
    retryDelay: (a: number, err: any) => {
      console.log(`Retry attempt #${a} after error:`, err.message);
      return 300; // 300ms between retries
    },
  };
  try {
    await client.request(config);
    console.log("Request unexpectedly succeeded (should not happen)");
  } catch (error: any) {
    if (error instanceof ZephHttpError) {
      console.error("Final error after retries:");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Cause:", error.cause);
    } else {
      console.error("Unknown error:", error);
    }
  }
}

testRetrySupport().catch((err) =>
  console.error("Error while running testRetrySupport():", err)
);
