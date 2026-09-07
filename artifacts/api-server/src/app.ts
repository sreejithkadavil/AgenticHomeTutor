import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: true }));
// Large PDFs are sent as raw bytes so they do not incur base64/JSON overhead.
// Keep the 50 MB parser isolated to this authenticated curriculum route.
app.post(
  "/api/curricula/extract-file",
  express.raw({ type: "application/pdf", limit: "50mb" }),
);
// Photo extraction still uses the existing base64 JSON contract.
app.post("/api/curricula/extract-text", express.json({ limit: "12mb" }));
// Extracted text from a large syllabus PDF can exceed Express's default
// 100 KB JSON limit. Keep the larger parser isolated to curriculum imports.
app.post("/api/curricula/uploads", express.json({ limit: "10mb" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
