import express, { Express, Request, Response, NextFunction } from "express";
import { BaselineChatQAModel } from "./lib/models/baselineQA.js";
import * as dotenv from "dotenv";
import morganMiddleware from "./config/morganMiddleware.js";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  ServerAIQueryResponse,
  ServerAIQueryRequest,
} from "@baselinedocs/shared";
import chalk from "chalk";

dotenv.config();
const port = 3000;

// TODO: Look into why you need createServer
const app: Express = express();

app.use(express.json());
app.use(morganMiddleware);
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.json({ status: "OK" });
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
