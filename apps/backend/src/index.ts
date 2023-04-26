import express, { Express, Request, Response, NextFunction } from "express";
import { BaselineChatQAModel } from "./lib/models/baselineQA.js";
import morganMiddleware from "./config/morganMiddleware.js";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import chalk from "chalk";
import dataSyncRoute from "./routes/dataSyncRoute.js";
import embeddingIndexRoute from "./routes/EmbeddingIndexRoute.js";
import repositoryRoute from "./routes/repositoryRoute.js";
import {
  ServerAIQueryResponse,
  ServerAIQueryRequest,
  Project,
} from "@baselinedocs/shared";
import { createGithubDataSyncForOrganization } from "./controllers/dataSyncController.js";
import { DefaultChatQAModel } from "./lib/models/defaultQA.js";
import {
  AuthenticatedRequest,
  authenticateToken,
} from "./controllers/authController.js";
import * as dotenv from "dotenv";

dotenv.config();

const port = 3000;

const app: Express = express();

// Configure Middleware
app.use(express.json());
app.use(morganMiddleware);
app.use(
  cors({
    origin: new RegExp(
      process.env.BASELINE_FRONTEND_REGEX ||
        /^https?:\/\/(?:www.)?app.baselinedocs.com$/,
      "i"
    ),
    credentials: true,
  })
);

// Configure Routes
app.use("/data-sync", dataSyncRoute);
app.use("/baseline", embeddingIndexRoute);
app.use("/projects", repositoryRoute);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/test", authenticateToken, (req: Request, res: Response) => {
  const authenticatedRequest = req as AuthenticatedRequest;
  console.log(authenticatedRequest.user);
  console.log("hit test");
  res.status(200).json({ status: "Authenticated" });
});

// Handle the callback from the GitHub OAuth authorization page
app.get("/auth/github/callback", async (req, res) => {
  if (!req.query.state || !req.query.code) {
    console.error("Missing query params from github oauth callback", req.query);
    return res.status(400).json({ message: "Missing query params" });
  }

  const stateObj = JSON.parse(decodeURIComponent(req.query.state as string));
  const organization_id = stateObj.organization_id;

  const { error } = await createGithubDataSyncForOrganization(
    Number(organization_id),
    req.query.code as string
  );

  if (error) {
    console.error(error);
    return res.status(500).send();
  }

  // redirect the user back to the manageData page
  res.redirect(`${process.env.BASELINE_FRONTEND_URL}/manageData`);
});

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500).send({ error: err });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.BASELINE_FRONTEND_URL },
});

io.on("connection", (socket) => {
  console.log(`New client connection: ${socket.id}`);

  const newTokenHandler = (token: string) => {
    socket.emit("query-response-stream-token", token);
  };

  let baselineQAModel: BaselineChatQAModel | DefaultChatQAModel;

  socket.on("health", () => {
    socket.emit("health-response", { staus: "healthy" });
  });

  socket.on("initialize-chat", (data: Project) => {
    // Initialize new BaselineQAModel using project data
    if (data) {
      if (data.id == "-1") {
        // Initialize Default GPT
        baselineQAModel = new DefaultChatQAModel({ newTokenHandler });
      } else {
        baselineQAModel = new BaselineChatQAModel({
          newTokenHandler,
          indexName: data.index_list[0].index_name,
        });
      }

      console.log("Baseline model initialized");
    }
  });

  socket.on("query-request", async (data: ServerAIQueryRequest) => {
    console.log(
      `Query request received for client ${socket.id}: ${data.query}`
    );
    if (!baselineQAModel) {
      console.error("Baseline model not initialized");
    } else {
      try {
        const ModelResponse = await baselineQAModel.query(data.query);

        const queryResponse: ServerAIQueryResponse = {
          original_query: data.query,
          response: ModelResponse.response,
          sources: ModelResponse.sources,
        };

        console.log("emitting done");
        socket.emit("query-response-stream-finished", queryResponse);
      } catch (err) {
        console.error(err);
      }
    }
  });

  socket.on("reset-chat", () => {
    console.log(`Reset chat request received for client ${socket.id}`);
    if (!baselineQAModel) {
      console.error("Baseline model not initialized");
    } else {
      baselineQAModel.resetChatHistory();
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(chalk.green(`${socket.id} disconnected because: ${reason}`));
  });
});

server.listen(port, () => {
  console.log(
    `⚡️[baseline chat backend]: Server is running at http://localhost:${port}`
  );
});
