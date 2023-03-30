#!/usr/bin/env node
import fs from "fs";
import ora from "ora";
import chalk from "chalk";

export function initializeBaseline() {
  const spinner = ora("Initializing Baseline").start();
  setTimeout(() => {
    const pathToSettings = `${process.cwd()}/baseline-settings.json`;
    createBaselineSettingsJsonFile(pathToSettings);
    spinner.succeed(
      `${chalk.blue("baseline-settings.json")} created at ${chalk.green(
        process.cwd()
      )}`
    );
  }, 1000);
}

export function createBaselineSettingsJsonFile(pathToSave) {
  const settings = `
  {
    "include": ["."],
    "exclude": [],
    "fileTypes": []
  }
  `;

  fs.writeFileSync(pathToSave, settings, "utf-8");
}
