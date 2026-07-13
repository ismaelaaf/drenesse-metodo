import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const SERVER_ENV_KEYS = ["BELLE_API_TOKEN", "BELLE_BASE_URL", "WHATSAPP_NUMBER", "BELLE_ORIGIN_CODE"];

function localVercelApi() {
  return {
    name: "local-vercel-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url || "/", "http://localhost");
        const pathname = requestUrl.pathname;
        const apiModules = {
          "/api/availability": "api/availability.js",
          "/api/submit-booking": "api/submit-booking.js"
        };

        if (!apiModules[pathname]) {
          next();
          return;
        }

        req.query = Object.fromEntries(requestUrl.searchParams.entries());

        try {
          const mod = await import(pathToFileURL(resolve(process.cwd(), apiModules[pathname])).href);
          await mod.default(req, res);
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ message: error.message || "Erro local de API." }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), "");
  SERVER_ENV_KEYS.forEach((key) => {
    if (!process.env[key] && localEnv[key]) process.env[key] = localEnv[key];
  });

  return {
    plugins: [react(), localVercelApi()],
    server: {
      allowedHosts: [".trycloudflare.com"],
      port: 5173
    }
  };
});
