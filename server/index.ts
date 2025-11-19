import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// ============================================
// GLOBAL ERROR HANDLERS
// ============================================

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️  Unhandled Rejection at:", promise, "reason:", reason);
  // Log but don't crash - let PM2 or similar handle restarts if needed
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  // Log but don't crash - in production you might want graceful shutdown
});

// ============================================
// ENVIRONMENT VALIDATION
// ============================================

if (process.env.NODE_ENV === "production") {
  // Validate critical environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "SESSION_SECRET",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error("❌ FATAL: Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`  - ${varName}`));
    process.exit(1);
  }
}

// ============================================
// PROXY CONFIGURATION
// ============================================

if (process.env.NODE_ENV === "production") {
  // Trust proxy for secure cookies behind HTTPS reverse proxy
  app.set("trust proxy", 1);
  log("✓ Trust proxy enabled for production");
}

// ============================================
// BODY PARSERS
// ============================================

app.use(express.json({ limit: "10mb" })); // Increase limit for photo uploads
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ============================================
// SESSION CONFIGURATION
// ============================================

// Ensure SESSION_SECRET is configured
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "❌ FATAL: SESSION_SECRET environment variable is required in production",
    );
    process.exit(1);
  } else {
    console.warn("⚠️  WARNING: Using default SESSION_SECRET in development");
    process.env.SESSION_SECRET =
      "dev-secret-key-not-for-production-" + Math.random();
  }
}

// Session store configuration
const PgSession = connectPgSimple(session);
const sessionStore =
  process.env.NODE_ENV === "production" && process.env.DATABASE_URL
    ? new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "session",
        createTableIfMissing: true,
        pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      })
    : undefined; // Use memory store in development

if (sessionStore) {
  log("✓ Using PostgreSQL session store");
} else {
  log("⚠️  Using memory session store (development only)");
}

// Session middleware - optimized for iOS Safari compatibility
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: "metaltec.sid", // Custom session name
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // CSRF protection
    },
    rolling: true, // Reset maxAge on every response
  }),
);

// ============================================
// REQUEST LOGGING MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Only log response body in development
      if (process.env.NODE_ENV === "development" && capturedJsonResponse) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length < 100) {
          logLine += ` :: ${responseStr}`;
        }
      }

      // Truncate long log lines
      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      // Color code by status
      if (res.statusCode >= 500) {
        console.error(`❌ ${logLine}`);
      } else if (res.statusCode >= 400) {
        console.warn(`⚠️  ${logLine}`);
      } else if (process.env.NODE_ENV === "development") {
        log(logLine);
      }
    }
  });

  next();
});

// ============================================
// SECURITY HEADERS
// ============================================

app.use((req, res, next) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Only set CSP in production
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.anthropic.com https://storage.googleapis.com;",
    );
  }

  next();
});

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================

(async () => {
  try {
    log("🚀 Starting Metaltec Rapportini Server...");

    // Register API routes
    const server = await registerRoutes(app);
    log("✓ API routes registered");

    // Global error handler (must be after routes)
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error for debugging
      console.error("❌ Express error handler:", {
        status,
        message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });

      // Send error response to client (never expose stack trace in production)
      res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      });
    });

    // Setup Vite dev server (development) or static file serving (production)
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("✓ Vite development server configured");
    } else {
      serveStatic(app);
      log("✓ Static file serving configured");
    }

    // Start HTTP server
    const port = parseInt(process.env.PORT || "5000", 10);

    server.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`✅ Server running on port ${port}`);
        log(`   Environment: ${process.env.NODE_ENV || "development"}`);
        log(`   URL: http://localhost:${port}`);

        if (process.env.NODE_ENV === "production") {
          log("   🔒 Security features enabled");
          log("   🔄 Rate limiting active");
          log("   📊 PostgreSQL session store active");
        }
      },
    );

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      log(`\n⚠️  ${signal} received, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(() => {
        log("✓ HTTP server closed");
      });

      // Give time for in-flight requests to complete
      setTimeout(() => {
        log("✅ Graceful shutdown complete");
        process.exit(0);
      }, 5000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ FATAL: Failed to start server:", error);
    process.exit(1);
  }
})();
