import {
  CommonServiceIds,
  ILocationService,
  IProjectPageService,
} from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";

export const getProjectPageUrl = async () => {
  const [locationService, projectService] = await Promise.all([
    SDK.getService<ILocationService>(CommonServiceIds.LocationService),
    SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService),
  ]);
  const [url, project] = await Promise.all([
    locationService.getResourceAreaLocation(
      "79134C72-4A58-4B42-976C-04E7115F32BF" // core resource area id
    ),
    projectService.getProject(),
  ]);
  return url + project?.name;
};

export const getCodesacesHubUrl = async () => {
  return `${await getProjectPageUrl()}/_apps/hub/${
    SDK.getExtensionContext().id
  }.codespaces-hub`;
};
