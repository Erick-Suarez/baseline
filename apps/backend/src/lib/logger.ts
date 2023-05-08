import { pino } from "pino";
import { pinoHttp } from "pino-http";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

const loggerMiddleware = pinoHttp({
  logger,

  // Define a custom success message
  customSuccessMessage: function (req, res) {
    if (res.statusCode === 404) {
      return "Resource not found";
    }
    return `${req.method} completed`;
  },

  // Define a custom receive message
  customReceivedMessage: function (req, res) {
    return "Request received: " + req.method;
  },

  // Define a custom error message
  customErrorMessage: function (req, res, err) {
    return "Request errored with status code: " + res.statusCode;
  },
});

export { logger, loggerMiddleware };
