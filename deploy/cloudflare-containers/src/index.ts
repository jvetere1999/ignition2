/**
 * Ignition API Worker - Container Orchestrator
 *
 * This Worker routes incoming requests to the Rust backend Container.
 * It uses Cloudflare Containers (beta) to run the full Rust monolith.
 */

import { Container, getContainer } from "@cloudflare/containers";

export interface Env {
  API_CONTAINER: DurableObjectNamespace<ApiContainer>;
  BLOBS: R2Bucket;

  // Secrets passed to container
  DATABASE_URL: string;
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  AZURE_TENANT_ID: string;
  STORAGE_ENDPOINT: string;
  STORAGE_ACCESS_KEY_ID: string;
  STORAGE_SECRET_ACCESS_KEY: string;

  // Vars
  NODE_ENV: string;
  API_URL: string;
}

/**
 * ApiContainer - Durable Object that manages the Rust API container.
 * Each instance can handle multiple requests.
 */
export class ApiContainer extends Container {
  // Port the Rust server listens on
  defaultPort = 8080;

  // Keep container alive for 4 hours after last request
  sleepAfter = "4h";

  // Environment variables passed to the container at runtime
  envVars = (() => {
    const env = this.env as Env;
    
    // Log DATABASE_URL availability for debugging
    const dbUrl = env.DATABASE_URL;
    if (!dbUrl) {
      console.error("[ApiContainer] DATABASE_URL is undefined/empty in secrets!");
    } else {
      const redacted = dbUrl.substring(0, 30) + "..." + dbUrl.substring(dbUrl.length - 15);
      console.log(`[ApiContainer] DATABASE_URL found: ${redacted}`);
    }
    
    return {
      // Database
      DATABASE_URL: env.DATABASE_URL,

      // Server config
      SERVER_HOST: "0.0.0.0",
      SERVER_PORT: "8080",
      SERVER_ENVIRONMENT: env.NODE_ENV,
      SERVER_PUBLIC_URL: "https://api.ecent.online",

      // Auth
      SESSION_SECRET: env.SESSION_SECRET,
      AUTH_COOKIE_DOMAIN: "ecent.online",
      AUTH_SESSION_TTL_SECONDS: "2592000", // 30 days
      AUTH_DEV_BYPASS: "false",

      // OAuth - use nested format for config crate with _ separator
      AUTH_OAUTH_GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
      AUTH_OAUTH_GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
      AUTH_OAUTH_GOOGLE_REDIRECT_URI: "https://api.ecent.online/auth/callback/google",
      AUTH_OAUTH_AZURE_CLIENT_ID: env.AZURE_CLIENT_ID,
      AUTH_OAUTH_AZURE_CLIENT_SECRET: env.AZURE_CLIENT_SECRET,
      AUTH_OAUTH_AZURE_REDIRECT_URI: "https://api.ecent.online/auth/callback/azure",
      AUTH_OAUTH_AZURE_TENANT_ID: env.AZURE_TENANT_ID,

      // Storage (R2)
      STORAGE_ENDPOINT: env.STORAGE_ENDPOINT,
      STORAGE_ACCESS_KEY_ID: env.STORAGE_ACCESS_KEY_ID,
      STORAGE_SECRET_ACCESS_KEY: env.STORAGE_SECRET_ACCESS_KEY,
      STORAGE_BUCKET: "ignition",
      STORAGE_REGION: "auto",

      // CORS
      CORS_ALLOWED_ORIGINS:
        "https://ignition.ecent.online,https://admin.ignition.ecent.online",
    };
  })();

  override onStart(): void {
    console.log("Ignition API container started");
    const env = this.env as Env;
    
    // Debug: Check if secrets are available
    const hasDbUrl = !!env.DATABASE_URL;
    const hasSessionSecret = !!env.SESSION_SECRET;
    console.log(`[onStart] DATABASE_URL present: ${hasDbUrl}`);
    console.log(`[onStart] SESSION_SECRET present: ${hasSessionSecret}`);
    
    if (!hasDbUrl) {
      console.error("[onStart] CRITICAL: DATABASE_URL secret is missing!");
    }
  }

  override onStop(): void {
    console.log("Ignition API container stopped");
  }

  override onError(error: unknown): void {
    console.error("Container error:", error);
  }
}

/**
 * Helper to get or create a container instance.
 * Uses consistent naming for load balancing across N instances.
 */
function getApiContainer(env: Env, instanceId: number = 0) {
  const id = `api-instance-${instanceId}`;
  return getContainer(env.API_CONTAINER, id);
}

/**
 * Simple round-robin load balancer across container instances.
 */
let requestCounter = 0;
const MAX_INSTANCES = 3;

function loadBalance(env: Env) {
  const instanceId = requestCounter % MAX_INSTANCES;
  requestCounter++;
  return getApiContainer(env, instanceId);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint (handled by Worker, not container)
    if (url.pathname === "/health" || url.pathname === "/") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "ignition-api",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // CORS preflight handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
          "Access-Control-Allow-Methods":
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, Cookie",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    try {
      // Get a container instance (load balanced)
      const container = loadBalance(env);

      // Ensure container is started
      await container.start();

      // Forward the request to the container
      const response = await container.fetch(request);

      // Add CORS headers to response
      const origin = request.headers.get("Origin");
      if (origin) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Access-Control-Allow-Origin", origin);
        newHeaders.set("Access-Control-Allow-Credentials", "true");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      return response;
    } catch (error) {
      console.error("Error forwarding to container:", error);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message:
            error instanceof Error ? error.message : "Container unavailable",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    console.log("Keep-alive ping triggered at:", new Date().toISOString());
    
    try {
      // Ping the health endpoint to keep container warm
      const container = loadBalance(env);
      await container.start();
      
      const response = await container.fetch(
        new Request("https://api.ecent.online/health", {
          method: "GET",
        })
      );
      
      console.log(`Keep-alive ping successful: ${response.status}`);
    } catch (error) {
      console.error("Keep-alive ping failed:", error);
    }
  },
};
