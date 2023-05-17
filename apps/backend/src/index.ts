import express, { Express, Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

import { logger, loggerMiddleware } from "./lib/logger.js";
import { BaselineChatQAModel } from "./lib/models/baselineQA.js";
import providersRoute from "./routes/providersRoute.js";
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
import { authenticateToken } from "./controllers/authController.js";
import { BasicChatCompletionModel } from "./lib/models/basicChat.js";
import { errorHandler } from './error.js';

dotenv.config();

const port = 3000;

const app: Express = express();

// Configure Middleware
app.use(express.json());
app.use(loggerMiddleware);
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
app.use(errorHandler);

// Configure Routes
app.use("/providers", providersRoute);
app.use("/data-sync", dataSyncRoute);
app.use("/baseline", embeddingIndexRoute);
app.use("/projects", repositoryRoute);
app.use("/user", userRoute);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

app.get("/test", authenticateToken, (req: Request, res: Response) => {
  req.log.info("hit test for authentication");
  res.status(200).json({ status: "Authenticated" });
});

// socket stuff below
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
  let socketLogger = logger.child({ socketId: socket.id });
  socketLogger.info(`New client connection`);

  const newTokenHandler = (token: string) => {
    socket.emit("query-response-stream-token", token);
  };

  const handleError = (type: number, errorMessage: string, logger: any) => {
    logger.info(handleError);
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
            socketLogger.info(err);
            handleError(403, "JWT verification error", socketLogger);
          } else {
            data = data as jwt.JwtPayload;

            socketLogger.info(`client authenticated`);
            socketLogger = socketLogger.child({
              user: {
                userId: data.user_id,
                orgaizationId: data.organization_id,
              },
            });
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

            socketLogger.info("Baseline model initialized");
          }
        });
      }
    }
  );

  socket.on("health", () => {
    socketLogger.info("health-response", { staus: "healthy" });
  });

  socket.on("query-request", async (data: ServerAIQueryRequest) => {
    if (!authenticated) {
      handleError(
        403,
        `client tried to make request: query-request, but is not authorized`,
        socketLogger
      );
    } else if (!baselineQAModel) {
      handleError(500, "Baseline model not initialized", socketLogger);
    } else {
      socketLogger.info(`Query request received: ${data.query}`);

      try {
        const ModelResponse = await baselineQAModel.query(
          data.query,
          socketLogger
        );

        const queryResponse: ServerAIQueryResponse = {
          original_query: data.query,
          response: ModelResponse.response,
          sources: ModelResponse.sources,
        };

        socketLogger.info("emitting done");
        socket.emit("query-response-stream-finished", queryResponse);
      } catch (err) {
        socketLogger.info(err);
        handleError(500, "Server erorr while processing query", socketLogger);
      }
    }
  });

  socket.on("disconnect", (reason) => {
    socketLogger.info(`${socket.id} disconnected because: ${reason}`);
  });
});

server.listen(port, () => {
  logger.info(
    `⚡️[baseline chat backend]: Server is running at http://localhost:${port}`
  );
});
