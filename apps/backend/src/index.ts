import express, { Express, Request, Response, NextFunction } from "express";
import { BaselineChatQAModel } from "./lib/models/baselineQA.js";
import * as dotenv from "dotenv";
import morganMiddleware from "./config/morganMiddleware.js";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import chalk from "chalk";

import {
  ServerAIQueryResponse,
  ServerAIQueryRequest,
} from "@baselinedocs/shared";
import { createGithubDataSyncForOrganization } from "./controllers/dataSyncController.js";
interface Session {
  [key: string]: any;
}

dotenv.config();
const port = 3000;
let session: Session = {};
// TODO: Look into why you need createServer
const app: Express = express();

app.use(express.json());
app.use(morganMiddleware);
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.json({ status: "OK" });
});

// Handle the callback from the GitHub OAuth authorization page
app.get("/auth/github/callback", async (req, res) => {
  req.query.organization_id = "1";

  if (!req.query.organization_id || !req.query.code) {
    console.error("Missing query params from github oauth callback");
    return res.status(500);
  }

  const { error } = await createGithubDataSyncForOrganization(
    Number(req.query.organization_id),
    req.query.code as string
  );

  if (error) {
    console.error(error);
    return res.status(500);
  }

  // redirect the user back to the manageData page
  res.redirect("http://localhost:5173/manageData");
});

// app.get("/github/repos/:id", async (req, res) => {
//   if (!session.accessToken) {
//     return res.send("access token not set");
//   }
//   const repo = session.repositories[req.params.id];
//   try {
//     await downlaodRepoisitory(session.accessToken, repo);
//     return res.send("success");
//   } catch (error) {
//     console.log(error);
//     return res.send("error");
//   }
// });

// error handler
app.use(function (err: any, req: Request, res: Response, next: NextFunction) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500).send({ error: err });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173" } });

io.on("connection", (socket) => {
  console.log(`New client connection: ${socket.id}`);

  const newTokenHandler = (token: string) => {
    socket.emit("query-response-stream-token", token);
  };

  const baselineQAModel = new BaselineChatQAModel({ newTokenHandler });

  socket.on("query-request", async (data: ServerAIQueryRequest) => {
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
    }
  });

  socket.on("reset-chat", () => {
    console.log(`Reset chat request received for client ${socket.id}`);
    baselineQAModel.resetChatHistory();
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
