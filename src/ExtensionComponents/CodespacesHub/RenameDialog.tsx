import "./CodespacesHub.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IGlobalMessagesService,
} from "azure-devops-extension-api";

import { Button } from "azure-devops-ui/Button";
import { CustomDialog } from "azure-devops-ui/Dialog";
import { Observer } from "azure-devops-ui/Observer";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { CustomHeader, HeaderTitleArea } from "azure-devops-ui/Header";
import { PanelContent, PanelFooter } from "azure-devops-ui/Panel";
import { FormItem } from "azure-devops-ui/FormItem";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";

import { Octokit } from "octokit";
import { GitHubData } from "./types";

export class RenameDialog extends React.Component<
  {
    isDialogOpen: ObservableValue<boolean>;
    githubData: GitHubData;
    codespaceName: string;
    onUpdate: () => Promise<void>;
  },
  {
    newCodespaceName: ObservableValue<string>;
    isUpdating: boolean;
  }
> {
  public async componentDidMount(): Promise<void> {
    this.setState({
      newCodespaceName: new ObservableValue(""),
    });
  }

  public render() {
    const onDismiss = () => {
      this.props.isDialogOpen.value = false;
      this.setState({
        newCodespaceName: new ObservableValue(""),
      });
    };

    const onCodespaceNameChange = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      newVal: string
    ) => {
      this.state.newCodespaceName.value = newVal;
      this.setState({
        newCodespaceName: this.state.newCodespaceName,
      });
    };

    const onUpdate = async () => {
      this.setState({
        isUpdating: true,
      });
      const octokit = new Octokit({ auth: this.props.githubData.accessToken });
      await octokit.rest.codespaces.updateForAuthenticatedUser({
        display_name: this.state.newCodespaceName.value,
        codespace_name: this.props.codespaceName,
      });
      await this.props.onUpdate();
      const globalMessagesSvc = await SDK.getService<IGlobalMessagesService>(
        CommonServiceIds.GlobalMessagesService
      );
      globalMessagesSvc.addToast({
        duration: 2000,
        message: "Codespace renamed",
      });
      this.setState({
        isUpdating: false,
        newCodespaceName: new ObservableValue(""),
      });
      this.props.isDialogOpen.value = false;
    };

    return (
      <div>
        <Observer isDialogOpen={this.props.isDialogOpen}>
          {(props: { isDialogOpen: boolean }) => {
            return props.isDialogOpen ? (
              <CustomDialog onDismiss={onDismiss} modal={true}>
                <CustomHeader className="bolt-header-with-commandbar" separator>
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
                        Rename codespace
                      </div>
                    </div>
                  </HeaderTitleArea>
                </CustomHeader>
                <PanelContent className="flex-container">
                  <FormItem className="flex-column">
                    <Observer newCodespaceName={this.state.newCodespaceName}>
                      {(props: { newCodespaceName: string }) => (
                        <TextField
                          value={props.newCodespaceName}
                          onChange={onCodespaceNameChange}
                          placeholder="New name"
                          width={TextFieldWidth.auto}
                        />
                      )}
                    </Observer>
                  </FormItem>
                </PanelContent>
                <PanelFooter showSeparator className="body-m">
                  <Button
                    text="Rename"
                    primary={true}
                    disabled={this.state.isUpdating}
                    onClick={onUpdate}
                  />
                </PanelFooter>
              </CustomDialog>
            ) : null;
          }}
        </Observer>
      </div>
    );
  }
}
