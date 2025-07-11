import { createZephClient } from "zeph-http";

const client = createZephClient({
  baseURL: "https://jsonplaceholder.typicode.com",
});

async function testGet() {
  client.interceptors.request.use((config) => {
    const token = "<<token>>";
    config.headers["auth"] = token;
    return config;
  });
  client.interceptors.response.use((response) => {
    return response.data;
  });
  const res = await client.request<{ id: number; title: string }>({
    path: "/todos",
  });

  console.log("Response:", res);
}

testGet().catch((err) => console.error("Error:", err));
