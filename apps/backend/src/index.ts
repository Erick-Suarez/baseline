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
import userRoute from "./routes/userRoute.js";

import {
  ServerAIQueryResponse,
  ServerAIQueryRequest,
  Project,
  ServerSocketError,
} from "@baselinedocs/shared";
import { createGithubDataSyncForOrganization } from "./controllers/dataSyncController.js";
import {
  AuthenticatedRequest,
  authenticateToken,
} from "./controllers/authController.js";
import * as jwt from "jsonwebtoken";

import * as dotenv from "dotenv";
import { BasicChatCompletionModel } from "./lib/models/basicChat.js";

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
app.use("/user", userRoute);

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

  try {
    const stateObj = JSON.parse(decodeURIComponent(req.query.state as string));
    const organization_id = stateObj.organization_id;

    await createGithubDataSyncForOrganization(
      Number(organization_id),
      req.query.code as string
    );

    // redirect the user back to the manageData page
    res.redirect(`${process.env.BASELINE_FRONTEND_URL}/manageData`);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  console.error(err);

  res.status(err.status || 500).json({ error: err });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: new RegExp(
      process.env.BASELINE_FRONTEND_REGEX ||
        /^https?:\/\/(?:www.)?app.baselinedocs.com$/,
      "i"
    ),
  },
});

io.on("connection", (socket) => {
  console.log(`New client connection: ${socket.id}`);

  const newTokenHandler = (token: string) => {
    socket.emit("query-response-stream-token", token);
  };

  const handleError = (type: number, errorMessage: string) => {
    console.error(handleError);
    const error: ServerSocketError = { type, message: errorMessage };
    socket.emit("error", error);
  };

  let baselineQAModel: BaselineChatQAModel | BasicChatCompletionModel;
  let authenticated = false;

  socket.on(
    "auth",
    ({ token, currentProject }: { token: string; currentProject: Project }) => {
      if (token && currentProject) {
        jwt.verify(token, process.env.JWT_SECRET!, (err, data) => {
          if (err || !data) {
            console.log(err);
            handleError(403, "JWT verification error");
          } else {
            data = data as jwt.JwtPayload;

            console.log(`client: ${socket.id} authenticated`);
            authenticated = true;

            const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
            const remainingTime = (data.exp! - currentTime) * 1000; // Convert to milliseconds

            // Disconnect this socket once the jwt expires
            setTimeout(() => socket.disconnect(), remainingTime);

            // Initialize new BaselineQAModel using project data
            if (currentProject.id == "-1") {
              // Initialize Default GPT
              baselineQAModel = new BasicChatCompletionModel({
                newTokenHandler,
              });
            } else {
              baselineQAModel = new BaselineChatQAModel({
                newTokenHandler,
                indexName: currentProject.index_list[0].index_name,
              });
            }

            console.log("Baseline model initialized");
          }
        });
      }
    }
  );

  socket.on("health", () => {
    socket.emit("health-response", { staus: "healthy" });
  });

  socket.on("query-request", async (data: ServerAIQueryRequest) => {
    if (!authenticated) {
      handleError(
        403,
        `client ${socket.id} tried to make request: query-request, but is not authorized`
      );
    } else if (!baselineQAModel) {
      handleError(500, "Baseline model not initialized");
    } else {
      console.log(
        `Query request received for client ${socket.id}: ${data.query}`
      );

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
        handleError(500, "Server erorr while processing query");
      }
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
