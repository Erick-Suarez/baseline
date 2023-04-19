#!/usr/bin/env node

import chalk from "chalk";
import figlet from "figlet";
// import { ingestDirectory, parseBaselineSettings } from "./lib/ingest.js";
import { initializeBaseline } from "./lib/init.js";

const commands = {
  start: {
    commandName: "start",
    description:
      "Ingest codebase into Baseline embeddings based on provided paths in config",
    action: () => {
      // const settings = parseBaselineSettings();
      // ingestDirectory({
      //   dirPath: settings.include[0],
      //   validExtensions: settings.fileTypes,
      //   excludePaths: settings.exclude,
      // });
    },
  },
  init: {
    commandName: "init",
    description: "Create Baseline config json",
    action: () => {
      initializeBaseline();
    },
  },
  help: {
    commandName: "help",
    description: "Show a list of commands",
    action: () => {
      displayHelpCommads();
    },
  },
};

function displayHelpCommads() {
  const commandStringsToPrint = [];

  for (const key in commands) {
    commandStringsToPrint.push(`${commands[key].commandName}\t${commands[key].description}
    `);
  }

  console.log(`${chalk.blueBright(
    figlet.textSync("Baseline", { verticalLayout: "full" })
  )}
  If this is your first time running Baseline use the init command to get started


  Commands:
    ${commandStringsToPrint.join("")}

  Usage: 
    baseline ${chalk.blue("[command]")}

  Example call
    $npx baseline ${chalk.blue("init")}
  `);
}

const command = process.argv[2] || "";

if (command === "") {
  commands.help.action();
}

const matchingCommandFound =
  Object.keys(commands).filter((key) => {
    if (command === commands[key].commandName) {
      commands[key].action();
      return true;
    }
  }).length > 0;

if (!matchingCommandFound) {
  console.log(
    `Baseline-cli does not recognize the command ${chalk.red(
      command
    )}, type ${chalk.blue("'baseline help'")} for a list of commands`
  );
}
