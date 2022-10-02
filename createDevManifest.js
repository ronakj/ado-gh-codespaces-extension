const fs = require("fs");

const manifestPath = "./ado-gh-codespaces-extension.json";
const newManifestPath = "./ado-gh-codespaces-extension-dev.json";

const ExtensionId = "ADOGitHubCodespaces";
const DevExtensionId = "ADOGitHubCodespacesDev";

const manifest = (fs.readFileSync(manifestPath).toString());
const newManifest = JSON.parse(manifest.split(ExtensionId).join(DevExtensionId))

const devManifestData = {
  baseUri: "https://localhost:3000",
  public: false,
  version: "1.0." + Date.now(),
  name: newManifest.name + " (DEV)",
  description: newManifest.description + " (DEV)",
  contributions: newManifest.contributions.map(contribution => ({
    ...contribution,
    description: contribution.description + " (DEV)"
  }))
};

fs.writeFileSync(newManifestPath, JSON.stringify(Object.assign({}, newManifest, devManifestData), null, 2));
