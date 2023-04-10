import tar from "tar";
import { Repositories } from "@baselinedocs/shared";
import { Octokit } from "@octokit/core";
import _ from "lodash";
import fs from "fs";
import path from "path";

export async function authGithub(code: any) {
  const response = await fetch(
    `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`,
    {
      method: "post",
      headers: {
        accept: "application/json",
      },
    }
  );
  const data = await response.json();
  return data.access_token;
}

export async function getRepositories(accessToken: string) {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const response = await octokit.request("GET /user/repos", {
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return _.reduce(
    response.data,
    (result: Repositories, { id, name, owner }) => {
      result[id] = { name, owner: owner.login };
      return result;
    },
    {}
  );
}

export async function downlaodRepoisitory(
  accessToken: string,
  repo: {
    name: string;
    owner: string;
  }
) {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const tarball = await octokit.request("GET /repos/{owner}/{repo}/tarball/", {
    owner: repo.owner,
    repo: repo.name,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const tarFilepath = path.join("codebases", `${repo.owner}-${repo.name}.zip`);

  fs.writeFileSync(tarFilepath, Buffer.from(tarball.data));
  console.log(`TAR file downloaded and saved to ${tarFilepath}`);
  await tar.extract({ file: tarFilepath, cwd: "codebases" });
  console.log("TAR file extracted to codebases");
  fs.unlinkSync(tarFilepath);
  console.log(`TAR file deleted`);
}
