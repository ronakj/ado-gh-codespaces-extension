import type { Octokit } from "octokit";

export interface GitHubData {
  accessToken: string;
  login: string;
  avatarUrl: string;
  isSecretPresent?: boolean;
  hasAccess?: boolean;
  codespacesData?: Awaited<
    ReturnType<Octokit["rest"]["codespaces"]["listForAuthenticatedUser"]>
  >["data"];
}

export interface CodespacesConfig {
  ghBridgeRepoName?: string;
  ghBridgeRepoOwner?: string;
  workspaceFolder: string;
  authServerUrl: string;
  patOrg: string;
  patScopes: string[];
  patSecret: string;
}

export const enum Editor {
  VSCodeDesktop = "VSCodeDesktop",
  VSCodeWeb = "VSCodeWeb",
}
