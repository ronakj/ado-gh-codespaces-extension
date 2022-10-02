const fs = require("fs");

const manifestPath = "./ado-gh-codespaces-extension.json";
const newManifestPath = "./ado-gh-codespaces-extension-dev.json";

const ExtensionId = "ADOGitHubCodespaces";
const DevExtensionId = "ADOGitHubCodespacesDev";

const manifest = (fs.readFileSync(manifestPath).toString());
const newManifest = JSON.parse(manifest.split(ExtensionId).join(DevExtensionId))

const versionString = Date.now().toString();
const devManifestData = {
  baseUri: "https://localhost:3000",
  public: false,
  version: `${versionString.slice(0, 1)}.${versionString.slice(1, 7)}.${versionString.slice(7, 13)}`,
  name: newManifest.name + " (DEV)",
  description: newManifest.description + " (DEV)",
  contributions: newManifest.contributions.map(contribution => ({
    ...contribution,
    description: contribution.description + " (DEV)"
  }))
};

fs.writeFileSync(newManifestPath, JSON.stringify(Object.assign({}, newManifest, devManifestData), null, 2));
