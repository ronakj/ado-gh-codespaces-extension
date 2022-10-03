import "./CodespacesHub.scss";

import * as React from "react";

import { Button } from "azure-devops-ui/Button";
import { CustomDialog } from "azure-devops-ui/Dialog";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { CustomHeader, HeaderTitleArea } from "azure-devops-ui/Header";
import { PanelContent, PanelFooter } from "azure-devops-ui/Panel";
import { FormItem } from "azure-devops-ui/FormItem";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { Link } from "azure-devops-ui/Link";

import { Octokit } from "octokit";
import { CodespacesConfig, Editor, GitHubData } from "./types";
import { getVsCodeDesktopUrl } from "./codespacesUtils";

export class CreateCodespaceDialog extends React.Component<
  {
    isDialogOpen: ObservableValue<boolean>;
    githubData: GitHubData;
    codespacesConfig: CodespacesConfig;
    editor: Editor;
    onCreate: () => Promise<void>;
  },
  {
    devContainerData:
      | Awaited<
          ReturnType<
            Octokit["rest"]["codespaces"]["listDevcontainersInRepositoryForAuthenticatedUser"]
          >
        >["data"];
    devContainerSelected: DropdownSelection;
    branchData:
      | Awaited<ReturnType<Octokit["rest"]["repos"]["listBranches"]>>["data"];
    branchSelected: DropdownSelection;
    machineData:
      | Awaited<
          ReturnType<
            Octokit["rest"]["codespaces"]["repoMachinesForAuthenticatedUser"]
          >
        >["data"];
    machineSelected: DropdownSelection;
    defaultData:
      | Awaited<
          ReturnType<
            Octokit["rest"]["codespaces"]["preFlightWithRepoForAuthenticatedUser"]
          >
        >["data"];
    isCreating: boolean;
  }
> {
  public async componentDidMount(): Promise<void> {
    const octokit = new Octokit({ auth: this.props.githubData.accessToken });
    const bridgeRepoName = this.props.codespacesConfig.ghBridgeRepoName;
    const bridgeRepoOwner = this.props.codespacesConfig.ghBridgeRepoOwner;
    if (!bridgeRepoName || !bridgeRepoOwner) {
      return;
    }
    const [
      { data: devContainerData },
      { data: branchData },
      { data: machineData },
      { data: defaultData },
    ] = await Promise.all([
      octokit.rest.codespaces.listDevcontainersInRepositoryForAuthenticatedUser(
        { owner: bridgeRepoOwner, repo: bridgeRepoName }
      ),
      octokit.rest.repos.listBranches({
        owner: bridgeRepoOwner,
        repo: bridgeRepoName,
        per_page: 100,
      }),
      octokit.rest.codespaces.repoMachinesForAuthenticatedUser({
        owner: bridgeRepoOwner,
        repo: bridgeRepoName,
      }),
      octokit.rest.codespaces.preFlightWithRepoForAuthenticatedUser({
        owner: bridgeRepoOwner,
        repo: bridgeRepoName,
      }),
    ]);
    const devContainerSelection = new DropdownSelection();
    const branchSelection = new DropdownSelection();
    const machineSelection = new DropdownSelection();
    devContainerSelection.select(0);
    branchSelection.select(0);
    machineSelection.select(0);
    this.setState({
      devContainerData,
      devContainerSelected: devContainerSelection,
      defaultData,
      branchData,
      branchSelected: branchSelection,
      machineData,
      machineSelected: machineSelection,
    });
  }

  public render() {
    const onDismiss = () => {
      this.props.isDialogOpen.value = false;
    };

    const onCreate = async () => {
      this.setState({
        isCreating: true,
      });
      const octokit = new Octokit({ auth: this.props.githubData.accessToken });
      const bridgeRepoName = this.props.codespacesConfig.ghBridgeRepoName;
      const bridgeRepoOwner = this.props.codespacesConfig.ghBridgeRepoOwner;
      if (!bridgeRepoName || !bridgeRepoOwner) {
        return;
      }
      const result =
        await octokit.rest.codespaces.createWithRepoForAuthenticatedUser({
          repo: bridgeRepoName,
          owner: bridgeRepoOwner,
          ref: this.state.branchData[
            this.state.branchSelected.value[0].beginIndex
          ].name,
          devcontainer_path:
            this.state.devContainerData.devcontainers[
              this.state.devContainerSelected.value[0].beginIndex
            ].path,
          machine:
            this.state.machineData.machines[
              this.state.machineSelected.value[0].beginIndex
            ].name,
        });
      // if (this.props.codespacesConfig.workspaceFolder) {
      //   await octokit.rest.codespaces.updateForAuthenticatedUser({
      //     codespace_name: result.data.name,
      //     recent_folders: [this.props.codespacesConfig.workspaceFolder],
      //   });
      // }
      await this.props.onCreate();
      if (this.props.editor === Editor.VSCodeDesktop) {
        window.open(getVsCodeDesktopUrl(result.data.name), "_top");
      } else {
        window.open(result.data.web_url, "_blank");
      }
      this.setState({
        isCreating: false,
      });
      this.props.isDialogOpen.value = false;
    };

    if (!this.state || !this.state.branchData) {
      return <div />;
    }

    return (
      <div>
        <Observer isDialogOpen={this.props.isDialogOpen}>
          {(props: { isDialogOpen: boolean }) => {
            return props.isDialogOpen ? (
              this.props.githubData.isSecretPresent ? (
                <CustomDialog onDismiss={onDismiss} modal={true}>
                  <CustomHeader
                    className="bolt-header-with-commandbar"
                    separator
                  >
                    <HeaderTitleArea>
                      <div
                        className="flex-grow scroll-hidden"
                        style={{ marginRight: "16px" }}
                      >
                        <div
                          className="title-m"
                          style={{
                            height: "500px",
                            width: "500px",
                            maxHeight: "32px",
                          }}
                        >
                          Create codespace
                        </div>
                      </div>
                    </HeaderTitleArea>
                  </CustomHeader>
                  <PanelContent className="flex-container">
                    <FormItem className="flex-column" label="Select branch">
                      <Dropdown
                        ariaLabel="Single select"
                        placeholder="Select an Option"
                        className=""
                        items={this.state.branchData.map((data) => {
                          return {
                            id: data.name,
                            text: data.name,
                          };
                        })}
                        selection={this.state.branchSelected}
                      />
                    </FormItem>
                    <FormItem
                      className="flex-column"
                      label="Select machine spec"
                    >
                      <Dropdown
                        ariaLabel="Single select"
                        placeholder="Select an Option"
                        items={this.state.machineData.machines.map((data) => {
                          return {
                            id: data.name,
                            text: data.display_name,
                          };
                        })}
                        selection={this.state.machineSelected}
                      />
                    </FormItem>
                    <FormItem
                      className="flex-column"
                      label="Select devcontainer"
                    >
                      <Dropdown
                        ariaLabel="Single select"
                        placeholder="Select an Option"
                        items={this.state.devContainerData.devcontainers.map(
                          (data) => {
                            return {
                              id: data.path,
                              text: data.path,
                            };
                          }
                        )}
                        selection={this.state.devContainerSelected}
                      />
                    </FormItem>
                  </PanelContent>
                  <PanelFooter showSeparator className="body-m">
                    <Button
                      text={
                        this.state.isCreating
                          ? "Creating, please wait"
                          : "Create"
                      }
                      primary={true}
                      disabled={this.state.isCreating}
                      onClick={onCreate}
                    />
                  </PanelFooter>
                </CustomDialog>
              ) : (
                <CustomDialog onDismiss={onDismiss} modal={true}>
                  <CustomHeader
                    className="bolt-header-with-commandbar"
                    separator
                  >
                    <HeaderTitleArea>
                      <div
                        className="flex-grow scroll-hidden"
                        style={{ marginRight: "16px" }}
                      >
                        <div
                          className="title-m"
                          style={{
                            height: "500px",
                            width: "500px",
                            maxHeight: "32px",
                          }}
                        >
                          Create codespaces secret
                        </div>
                      </div>
                    </HeaderTitleArea>
                  </CustomHeader>
                  <PanelContent className="flex-container">
                    <span>
                      Before you can create a codespace you need to create a PAT
                      secret in GitHub settings <br />
                      <br /> 1. Create a PAT with{" "}
                      <b>{this.props.codespacesConfig.patScopes}</b> scope from{" "}
                      <Link
                        href={`https://dev.azure.com/${this.props.codespacesConfig.patOrg}/_usersSettings/tokens`}
                        target="_blank"
                      >
                        ADO settings page
                      </Link>
                      {"."}
                      <br /> 2. Store the PAT in{" "}
                      <Link
                        href={`https://github.com/settings/codespaces`}
                        target="_blank"
                      >
                        Codespace settings
                      </Link>{" "}
                      as <b>{this.props.codespacesConfig.patSecret}</b>.<br />
                      3. Refresh this page and then try creating a codespaces
                      again.
                    </span>
                  </PanelContent>
                  <PanelFooter showSeparator className="body-m">
                    <Button text="Close" primary={true} onClick={onDismiss} />
                  </PanelFooter>
                </CustomDialog>
              )
            ) : null;
          }}
        </Observer>
      </div>
    );
  }
}
