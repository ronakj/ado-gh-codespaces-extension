import {
  CommonServiceIds,
  ILocationService,
  IProjectPageService,
} from "azure-devops-extension-api";
import {
  GitServiceIds,
  IVersionControlRepositoryService,
} from "azure-devops-extension-api/Git/GitServices";
import * as SDK from "azure-devops-extension-sdk";

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
      const [locationService, projectService] = await Promise.all([
        SDK.getService<ILocationService>(CommonServiceIds.LocationService),
        SDK.getService<IProjectPageService>(
          CommonServiceIds.ProjectPageService
        ),
      ]);
      const [url, project] = await Promise.all([
        locationService.getResourceAreaLocation(
          "79134C72-4A58-4B42-976C-04E7115F32BF" // core resource area id
        ),
        projectService.getProject(),
      ]);
      window.open(
        `${url + project?.name}/_apps/hub/${
          SDK.getExtensionContext().id
        }.codespaces-hub`,
        "_top"
      );
    },
  };
});

SDK.init();
