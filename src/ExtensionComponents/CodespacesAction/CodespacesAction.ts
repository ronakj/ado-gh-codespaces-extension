import { GitPullRequest } from "azure-devops-extension-api/Git/Git";
import * as SDK from "azure-devops-extension-sdk";
import { getCodesacesHubUrl } from "../../Utils/Page";

const autoCreateCodespaceOnBranch = async (branch: string) => {
  const codespacesHubUrl = await getCodesacesHubUrl();
  // randomId is used for duplicate creation prevention
  const randomId = (Math.random() + 1).toString(36).substring(2);
  window.open(
    `${codespacesHubUrl}?branch=${encodeURIComponent(
      branch.replace("refs/heads/", "")
    )}&autoCreate=true&randomId=${encodeURIComponent(randomId)}`,
    "_top"
  );
};

SDK.register("codespaces-create-on-branch", async () => {
  return {
    execute: async (context: {
      name: string;
      fullName: string;
      favorite: boolean;
    }) => {
      await autoCreateCodespaceOnBranch(context.fullName);
    },
  };
});

SDK.register("codespaces-create-on-pr", async () => {
  return {
    execute: async (context: { pullRequest: GitPullRequest }) => {
      await autoCreateCodespaceOnBranch(context.pullRequest.sourceRefName);
    },
  };
});

SDK.init();
