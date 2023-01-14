import * as SDK from "azure-devops-extension-sdk";
import { getCodesacesHubUrl } from "../../Utils/Page";

SDK.register("codespaces-create-on-branch", async () => {
  return {
    execute: async (context: {
      name: string;
      fullName: string;
      isFolder: boolean;
      comment: string;
      commitId: string;
      isUserCreated: boolean;
      isDefault: boolean;
      isCompare: boolean;
      lastUpdatedBy: string;
      aheadCount: number;
      behindCount: number;
      favorite: boolean;
    }) => {
      const codespacesHubUrl = await getCodesacesHubUrl();
      // randomId is used for duplicate creation prevention
      const randomId = (Math.random() + 1).toString(36).substring(2);
      window.open(
        `${codespacesHubUrl}?branch=${encodeURIComponent(
          context.fullName.replace("refs/heads/", "")
        )}&autoCreate=true&randomId=${encodeURIComponent(randomId)}`,
        "_top"
      );
    },
  };
});

SDK.register("codespaces-create-on-pr", async () => {
  return {
    execute: async (context: unknown) => {
      console.log(context);
      // const codespacesHubUrl = await getCodesacesHubUrl();
      // // randomId is used for duplicate creation prevention
      // const randomId = (Math.random() + 1).toString(36).substring(2);
      // window.open(
      //   `${codespacesHubUrl}?branch=${encodeURIComponent(
      //     context.fullName.replace("refs/heads/", "")
      //   )}&autoCreate=true&randomId=${encodeURIComponent(randomId)}`,
      //   "_top"
      // );
    },
  };
});

SDK.init();
