import * as SDK from "azure-devops-extension-sdk";

SDK.register("codespaces-create-on-branch", () => {
  return {
    execute: async (context: unknown) => {
      console.log("unknown", context);
    },
  };
});

SDK.init();
