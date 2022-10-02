const fs = require("fs");

const manifestPath = "./ado-gh-codespaces-extension.json";
const newManifestPath = "./ado-gh-codespaces-extension-dev.json";

const ExtensionId = "ADOGitHubCodespaces";
const DevExtensionId = "ADOGitHubCodespacesDev";

const manifest = (fs.readFileSync(manifestPath).toString());
const newManifest = JSON.parse(manifest.split(ExtensionId).join(DevExtensionId))

newManifest.baseUri = "https://localhost:3000";
newManifest.public = false;

fs.writeFileSync(newManifestPath, JSON.stringify(newManifest, null, 2));
