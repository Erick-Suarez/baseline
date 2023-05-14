import tar from "tar";
import { Octokit } from "@octokit/core";
import _ from "lodash";
import fs from "fs";
import path from "path";

const github: Record<string, any> = {};

github.authenticate = async function (code: any) {
  const response = await fetch(
    `https://github.com/login/oauth/access_token?client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`,
    {
      method: "post",
      headers: {
        accept: "application/json",
      },
    }
  );

  return await response.json();
};

github.getRepositories = async function (accessToken: string) {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const response = await octokit.request("GET /user/repos", {
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  return response.data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    owner: repo.owner.login,
    default_branch: repo.default_branch,
  })) as Array<{
    id: number;
    name: string;
    full_name: string;
    owner: string;
    default_branch: string;
  }>;
};

github.getHeadSha = async function (
  accessToken: string,
  repo: {
    repo_name: string;
    repo_owner: string;
    default_branch: string;
  }
): Promise<string> {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/heads/{default_branch}",
    {
      owner: repo.repo_owner,
      repo: repo.repo_name,
      default_branch: repo.default_branch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  return response.data.object.sha;
};

github.downloadRepository = async function (
  accessToken: string,
  repo: {
    repo_name: string;
    repo_owner: string;
  },
  sha: string,
  logger: any
) {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const tarball = await octokit.request(
    "GET /repos/{owner}/{repo}/tarball/{sha}",
    {
      owner: repo.repo_owner,
      repo: repo.repo_name,
      sha,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  const tempDir = "temp/repositories";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tarFilepath = path.join(
    "temp/repositories/",
    `${repo.repo_name}_${Date.now()}.tar.gz`
  );

  const extractFilePath = path.join("temp/repositories");

  fs.writeFileSync(tarFilepath, Buffer.from(tarball.data));
  logger.info(`TAR file downloaded and saved to ${tarFilepath}`);
  await tar.extract({ file: tarFilepath, cwd: extractFilePath });
  logger.info("TAR file extracted");
  fs.unlinkSync(tarFilepath);
  logger.info(`TAR file deleted`);

  const filename = extractFilenameFromContentDisposition(
    tarball.headers["content-disposition"] as string
  );

  if (!filename) {
    throw "Content-disposition did not contain filename";
  }

  return path.join("temp/repositories/", filename.replace(".tar.gz", ""));
};

function extractFilenameFromContentDisposition(data: string) {
  const regex = /filename=(.*)/;

  const matches = data.match(regex);

  if (!matches) {
    return null;
  }

  return matches[1];
}

export default github;
