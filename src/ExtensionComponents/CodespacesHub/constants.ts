export const DEFAULT_AUTH_SERVER = window.location.origin.includes("localhost")
  ? "http://localhost:7071"
  : "https://ado-gh-codespaces.azurewebsites.net";

export const DEFAULT_PAT_SCOPES = ["Code: Read & Write"];

export const DEFAULT_PAT_SECRET = "{ORG}_ADO_PAT";

export const ACCESS_TOKEN_KEY = "accessToken";

export const CODESPACES_CONFIG_LOCATION = "/codespaces.json";
