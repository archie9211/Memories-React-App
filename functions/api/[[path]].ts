// functions/api/[[path]].ts (in your Pages project)

import { PagesFunction, Fetcher } from "@cloudflare/workers-types";

import type { Response as CfResponse } from "@cloudflare/workers-types";

// Define the bindings expected in the Pages environment for this function
interface Env {
      // Service binding to the backend API worker
      API_WORKER: Fetcher;
}

export const onRequest: PagesFunction<Env> = async (
      context
): Promise<CfResponse> => {
      const { request, env, params } = context;
      const userEmail = request.headers.get(
            "cf-access-authenticated-user-email"
      );

      // 1. Construct the URL for the backend API worker
      const pathSegments = params.path as string[];
      const workerPath = "/" + pathSegments.join("/"); // Reconstruct path (e.g., /api/memories)
      const originalUrl = new URL(request.url); // Get the original URL to preserve search params
      // Use a dummy base, the path and search are what matter for the worker's router
      const workerUrl = `http://image-processor-worker.archie9211.workers.dev${workerPath}${originalUrl.search}`;

      const workerHeaders = new Headers(
            Object.fromEntries(request.headers.entries())
      ); // Convert Cloudflare Headers to plain object
      // Clean up headers not needed/wanted by the backend
      workerHeaders.delete("cookie");
      workerHeaders.delete("cf-connecting-ip");
      workerHeaders.delete("cf-ipcountry");
      workerHeaders.delete("cf-visitor");
      workerHeaders.delete("x-forwarded-for");
      workerHeaders.delete("x-real-ip");
      // Remove the Access header itself
      workerHeaders.delete("cf-access-authenticated-user-email");
      workerHeaders.delete("cf-access-jwt-assertion"); // Remove JWT if present
      // Add the custom header with the authenticated user's email
      if (userEmail) {
            workerHeaders.set("X-Authenticated-User-Email", userEmail);
      }

      // 5. Make the request using the Service Binding
      try {
            const response = await env.API_WORKER.fetch(workerUrl, {
                  // Pass URL string
                  method: request.method,
                  headers: workerHeaders, // Pass prepared headers
                  body: request.body, // Forward body
                  redirect: "manual", // Required for service bindings
            });

            // 6. Return the backend worker's response directly
            // Important: Create a new Response to make headers mutable for CORS
            const newResponse = new Response(response.body, {
                  ...response,
                  headers: new Headers(
                        Object.fromEntries(response.headers.entries())
                  ),
            });

            // 7. Add CORS headers for the BROWSER (responding from Pages origin)
            // Adjust origin as needed, could read from an env var set for Pages
            newResponse.headers.set("Access-Control-Allow-Origin", "*"); // Or your specific Pages domain
            newResponse.headers.set(
                  "Access-Control-Allow-Methods",
                  "GET, POST, PATCH, DELETE, OPTIONS"
            );
            newResponse.headers.set(
                  "Access-Control-Allow-Headers",
                  "Content-Type, Authorization"
            ); // Match what frontend sends/backend expects (via proxy)
            newResponse.headers.set("Access-Control-Allow-Credentials", "true");
            newResponse.headers.set("Access-Control-Max-Age", "86400");

            // Handle OPTIONS preflight requests directly here
            if (request.method === "OPTIONS") {
                  return new Response(null, { headers: newResponse.headers });
            }

            return newResponse;
      } catch (error: any) {
            console.error("Pages Proxy: Error fetching API worker:", error);
            return new Response("Error proxying request to backend API.", {
                  status: 502,
            }); // Bad Gateway
      }
};

// Optional: Define onRequestOptions for preflight handling if needed,
// but the main handler above now handles OPTIONS.
// export const onRequestOptions: PagesFunction = async () => {
//     return new Response(null, {
//         status: 204,
//         headers: {
//             'Access-Control-Allow-Origin': '*', // Or specific domain
//             'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//             'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
//             'Access-Control-Max-Age': '86400',
//             'Access-Control-Allow-Credentials': 'true',
//         },
//     });
// };
