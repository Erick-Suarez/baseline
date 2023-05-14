import tar from "tar";
import _ from "lodash";
import fs from "fs";
import path from "path";
import axios from "axios";

const gitlab: Record<string, any> = {};

gitlab.authenticate = async function (code: any) {
  const body = new URLSearchParams({
    client_id: process.env.GITLAB_CLIENT_ID!,
    client_secret: process.env.GITLAB_CLIENT_SECRET!,
    code: code,
    grant_type: "authorization_code",
    redirect_uri: process.env.GITLAB_REDIRECT_URI!,
  });
  const response = await fetch(`https://gitlab.com/oauth/token`, {
    method: "post",
    body,
  });
  return await response.json();
};

gitlab.getRepositories = async function (accessToken: string) {
  const currentUser = await getCurrentUser(accessToken);
  const groups = await getCurrentUsersGroups(accessToken, currentUser.id);
  const projects = await getCurrentUsersProjects(accessToken, currentUser.id);
  const repositories: Array<{
    id: number;
    name: string;
    full_name: string;
    owner: string;
    default_branch: string;
  }> = projects.map((project: any) => ({
    id: project.id,
    name: project.path,
    full_name: project.path_with_namespace,
    owner: project.namespace.path,
    default_branch: project.default_branch,
  }));
  for (const group of groups) {
    const groupProjects = await getGroupsProjects(accessToken, group.id);
    repositories.push(
      ...groupProjects.map((project: any) => ({
        id: project.id,
        name: project.path,
        full_name: project.path_with_namespace,
        owner: project.namespace.path,
        default_branch: project.default_branch,
      }))
    );
  }
  return repositories;
};

async function getCurrentUser(accessToken: string) {
  const response = await fetch(`https://gitlab.com/api/v4/user`, {
    method: "get",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
}

async function getCurrentUsersProjects(accessToken: string, userId: string) {
  const response = await fetch(
    `https://gitlab.com/api/v4/users/${userId}/projects?simple=true`,
    {
      method: "get",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.json();
}

async function getCurrentUsersGroups(accessToken: string, userId: string) {
  const response = await fetch(`https://gitlab.com/api/v4/groups`, {
    method: "get",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
}

async function getGroupsProjects(accessToken: string, groupId: string) {
  const response = await fetch(
    `https://gitlab.com/api/v4/groups/${groupId}/projects?simple=true`,
    {
      method: "get",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.json();
}

gitlab.getHeadSha = async function (
  accessToken: string,
  repo: {
    provider_repo_id: string;
    default_branch: string;
  }
) {
  const response = await fetch(
    `https://gitlab.com/api/v4/projects/${repo.provider_repo_id}/repository/branches/${repo.default_branch}`,
    {
      method: "get",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const sha = await response.json();
  return sha.commit.id;
};

gitlab.downloadRepository = async function (
  accessToken: string,
  repo: {
    provider_repo_id: string;
    repo_name: string;
    default_branch: string;
  },
  sha: string,
  logger: any
) {
  //@ts-ignore
  const tarball = await axios.get(
    `https://gitlab.com/api/v4/projects/${repo.provider_repo_id}/repository/archive.tar?sha=${sha}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  const tempDir = "temp/repositories";
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tarFilepath = path.join(
    "temp/repositories/",
    `${repo.repo_name}_${Date.now()}.tar`
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

  return path.join("temp/repositories/", filename.replace(".tar", ""));
};

function extractFilenameFromContentDisposition(data: string) {
  const regex = /filename=(.*)/;

  const matches = data.match(regex);

  if (!matches) {
    return null;
  }
  return JSON.parse(matches[1]);
}

export default gitlab;
