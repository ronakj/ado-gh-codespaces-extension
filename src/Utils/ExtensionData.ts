import { Editor } from "../types";
import {
  CommonServiceIds,
  IExtensionDataService,
} from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";

export const EDITOR_CONFIG_KEY = "defaultCodespaceEditor";
export const CODESPACE_CONFIG_KEY = "codespaceConfig";

const getDataManager = async () => {
  const extensionDataService = await SDK.getService<IExtensionDataService>(
    CommonServiceIds.ExtensionDataService
  );
  const accessToken = await SDK.getAccessToken();
  return extensionDataService.getExtensionDataManager(
    SDK.getExtensionContext().id,
    accessToken
  );
};

export const getDefaultEditor = async (): Promise<Editor> => {
  const dataManager = await getDataManager();
  let editor: Editor | undefined = undefined;
  try {
    editor = await dataManager.getValue(EDITOR_CONFIG_KEY, {
      scopeType: "User",
    });
  } catch (err) {}
  return editor || Editor.VSCodeWeb;
};

export const setDefaultEditor = async (editor: Editor) => {
  const dataManager = await getDataManager();
  await dataManager.setValue(EDITOR_CONFIG_KEY, editor, {
    scopeType: "User",
  });
};

export const storeCodespaceConfig = async (
  codespaceId: string,
  config: {
    branch: string | null;
  }
) => {
  const dataManager = await getDataManager();
  console.log("storing");
  await dataManager.setDocument(
    CODESPACE_CONFIG_KEY,
    {
      ...config,
      id: codespaceId,
      expiry: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    },
    {
      scopeType: "User",
    }
  );
  const documents = await dataManager.getDocuments(CODESPACE_CONFIG_KEY, {
    scopeType: "User",
  });
  const expiredDocuments = documents.filter((document) => {
    return new Date(document.expiry) < new Date();
  });
  console.warn("deleting expired documents", expiredDocuments);
  await Promise.all(
    expiredDocuments.map((document) => {
      return dataManager.deleteDocument(CODESPACE_CONFIG_KEY, document.id, {
        scopeType: "User",
      });
    })
  );
};
