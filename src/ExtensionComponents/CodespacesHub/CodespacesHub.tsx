import "./CodespacesHub.scss";

import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  GitServiceIds,
  IVersionControlRepositoryService,
} from "azure-devops-extension-api/Git/GitServices";
import {
  CommonServiceIds,
  IGlobalMessagesService,
} from "azure-devops-extension-api/Common/CommonServices";

import * as ExtensionData from "../../Utils/ExtensionData";

import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { MenuItemType } from "azure-devops-ui/Menu";
import { Page } from "azure-devops-ui/Page";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { Image } from "azure-devops-ui/Image";
import { Pill, PillSize } from "azure-devops-ui/Pill";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { Card } from "azure-devops-ui/Card";
import { Icon, IIconProps } from "azure-devops-ui/Icon";
import { Link } from "azure-devops-ui/Link";
import { css } from "azure-devops-ui/Util";
import { Duration } from "azure-devops-ui/Duration";
import {
  ITableColumn,
  ColumnMore,
  Table,
  TwoLineTableCell,
  ISimpleTableCell,
  SimpleTableCell,
} from "azure-devops-ui/Table";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { IconSize } from "azure-devops-ui/Icon";
import { PillGroup, PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { Ago } from "azure-devops-ui/Ago";

import { Octokit } from "octokit";
import axios from "axios";

import { CodespacesConfig, GitHubData, Editor } from "../../types";
import { showRootComponent } from "../../Common";
import { CreateCodespaceDialog } from "./CreateDialog";
import { RenameDialog } from "./RenameDialog";
import { getClient } from "azure-devops-extension-api";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
  ACCESS_TOKEN_KEY,
  CODESPACES_CONFIG_LOCATION,
  DEFAULT_AUTH_SERVER,
  DEFAULT_PAT_SCOPES,
  DEFAULT_PAT_SECRET,
} from "./constants";
import { getVsCodeDesktopUrl } from "./codespacesUtils";

interface CodespacesHubContentState {
  isLoading: boolean;
  isCreateDialogOpen: ObservableValue<boolean>;
  isUpdateDialogOpen: ObservableValue<boolean>;
  selectedCodespaceName: string;
  gitHubData: GitHubData | null;
  autoCreate: boolean;
  branchName: string | null;
  codespacesConfig: CodespacesConfig;
  defaultEditor: Editor;
}

export interface ICodespaceItem extends ISimpleTableCell {
  displayName: string;
  lastUsedAt: string;
  expiresAt: string;
  machineSpecs: string;
  defaultUrl: string;
  webUrl: string;
  vsCodeUrl: string;
  state: Awaited<
    ReturnType<Octokit["rest"]["codespaces"]["listForAuthenticatedUser"]>
  >["data"]["codespaces"][number]["state"];
  name: string;
}

function WithIcon(props: {
  className?: string;
  iconProps: IIconProps;
  children?: React.ReactNode;
}) {
  return (
    <div className={css(props.className, "flex-row flex-center")}>
      {Icon({ ...props.iconProps, className: "icon-margin" })}
      {props.children}
    </div>
  );
}

function renderNameColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<ICodespaceItem>,
  tableItem: ICodespaceItem
): JSX.Element {
  return (
    <SimpleTableCell
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      key={"col-" + columnIndex}
      contentClassName="fontWeightSemiBold font-weight-semibold fontSizeM font-size-m scroll-hidden"
    >
      <Link
        href={tableItem.defaultUrl}
        target={tableItem.defaultUrl.startsWith("vscode") ? "_top" : "_blank"}
      >
        {tableItem.displayName}
      </Link>
    </SimpleTableCell>
  );
}

function renderDateColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<ICodespaceItem>,
  tableItem: ICodespaceItem
): JSX.Element {
  return (
    <TwoLineTableCell
      key={"col-" + columnIndex}
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      line1={WithIcon({
        className: "fontSize font-size",
        iconProps: { iconName: "Calendar" },
        children: (
          <div>
            Last Used: <Ago date={new Date(tableItem.lastUsedAt)} />
          </div>
        ),
      })}
      line2={WithIcon({
        className: "fontSize font-size",
        iconProps: { iconName: "Clock" },
        children: (
          <div>
            {tableItem.expiresAt ? (
              <div>
                Expires in:{" "}
                <Duration
                  startDate={new Date()}
                  endDate={new Date(tableItem.expiresAt)}
                />
              </div>
            ) : (
              "Active"
            )}
          </div>
        ),
      })}
    />
  );
}

function renderSpecColumn(
  rowIndex: number,
  columnIndex: number,
  tableColumn: ITableColumn<ICodespaceItem>,
  tableItem: ICodespaceItem
): JSX.Element {
  return (
    <SimpleTableCell
      columnIndex={columnIndex}
      tableColumn={tableColumn}
      key={"col-" + columnIndex}
      contentClassName="fontWeightSemiBold font-weight-semibold fontSizeM font-size-m scroll-hidden"
    >
      <PillGroup className="flex-row" overflow={PillGroupOverflow.wrap}>
        {tableItem.machineSpecs.split(",").map((spec) => (
          <Pill key={spec} size={PillSize.compact}>
            {spec.trim()}
          </Pill>
        ))}
      </PillGroup>
    </SimpleTableCell>
  );
}

class CodespacesHubContent extends React.Component<
  {},
  CodespacesHubContentState
> {
  constructor(props: {}) {
    super(props);
    this.state = {
      isLoading: true,
      defaultEditor: Editor.VSCodeWeb,
      isCreateDialogOpen: new ObservableValue(false),
      isUpdateDialogOpen: new ObservableValue(false),
      selectedCodespaceName: "",
      autoCreate: false,
      branchName: null,
      codespacesConfig: {
        authServerUrl: DEFAULT_AUTH_SERVER,
        workspaceFolder: `/workspaces`,
        patOrg: "",
        patSecret: DEFAULT_PAT_SECRET,
        patScopes: DEFAULT_PAT_SCOPES,
      },
      gitHubData: null,
    };
  }

  public async deleteCodespace(codespaceName: string) {
    if (!this.state.gitHubData || !this.state.gitHubData.accessToken) {
      return null;
    }
    const accessToken = this.state.gitHubData.accessToken;
    const bridgeRepoName = this.state.codespacesConfig.ghBridgeRepoName;
    const bridgeRepoOwner = this.state.codespacesConfig.ghBridgeRepoOwner;
    if (!bridgeRepoName || !bridgeRepoOwner) {
      return;
    }
    const octokit = new Octokit({ auth: accessToken });
    const result = confirm("Are you sure you want to delete this codespace");
    if (!result) {
      return;
    }
    await octokit.rest.codespaces.deleteForAuthenticatedUser({
      codespace_name: codespaceName,
    });
    await this.refreshCodespacesData();
    const globalMessagesSvc = await SDK.getService<IGlobalMessagesService>(
      CommonServiceIds.GlobalMessagesService
    );
    globalMessagesSvc.addToast({
      duration: 2000,
      message: "Codespace deleted",
    });
  }

  public renderTable() {
    if (!this.state.gitHubData) {
      return <div />;
    }
    const tableItemProvider = new ArrayItemProvider<ICodespaceItem>(
      this.state.gitHubData.codespacesData
        ? this.state.gitHubData.codespacesData.codespaces
            .map((codespace) => {
              const desktopUrl = getVsCodeDesktopUrl(codespace.name);
              const webUrl = codespace.web_url;
              return {
                name: codespace.name,
                displayName: codespace.display_name || codespace.name,
                lastUsedAt: codespace.last_used_at,
                expiresAt: codespace.retention_expires_at || "",
                machineSpecs: codespace.machine?.display_name || "NA",
                state: codespace.state,
                webUrl: webUrl,
                defaultUrl:
                  this.state.defaultEditor === Editor.VSCodeWeb
                    ? webUrl
                    : desktopUrl,
                vsCodeUrl: desktopUrl,
              };
            })
            .sort(
              (a, b) =>
                new Date(b.lastUsedAt).getTime() -
                new Date(a.lastUsedAt).getTime()
            )
        : []
    );
    return (
      <Card
        className="flex-grow bolt-table-card"
        contentProps={{ contentPadding: false }}
      >
        <Table<ICodespaceItem>
          ariaLabel="Table with links"
          className="table-example"
          columns={[
            {
              id: "displayName",
              name: "Name",
              renderCell: renderNameColumn,
              width: new ObservableValue(-33),
            },
            {
              id: "machineSpecs",
              name: "Machine Specs",
              renderCell: renderSpecColumn,
              width: new ObservableValue(-33),
            },
            {
              id: "lastUsedAt",
              readonly: true,
              renderCell: renderDateColumn,
              width: new ObservableValue(-34),
            },
            new ColumnMore((codespace) => {
              return {
                id: "sub-menu",
                items: [
                  {
                    iconProps: {
                      iconName: "Code",
                    },
                    id: "OpenWith",
                    important: false,
                    subMenuProps: {
                      id: "sub-menu",
                      items: [
                        {
                          id: Editor.VSCodeDesktop,
                          text: "VSCode Desktop",
                          href: codespace.vsCodeUrl,
                          target: "_top",
                        },
                        {
                          id: Editor.VSCodeWeb,
                          text: "VSCode Web",
                          href: codespace.webUrl,
                          target: "_blank",
                        },
                      ],
                    },
                    text: "Open with",
                  },
                  { id: "separator", itemType: MenuItemType.Divider },
                  {
                    id: "renameCodespace",
                    text: "Rename",
                    iconProps: {
                      iconName: "Rename",
                    },
                    onActivate: () => {
                      this.setState({
                        selectedCodespaceName: codespace.name,
                      });
                      this.state.isUpdateDialogOpen.value = true;
                    },
                  },
                  {
                    id: "deleteCodespace",
                    text: "Delete",
                    iconProps: {
                      iconName: "Delete",
                    },
                    onActivate: () => {
                      this.deleteCodespace(codespace.name);
                    },
                  },
                ],
              };
            }),
          ]}
          containerClassName="h-scroll-auto"
          itemProvider={tableItemProvider}
          singleClickActivation={false}
        />
      </Card>
    );
  }

  public async getDefaultEditor(): Promise<Editor> {
    return ExtensionData.getDefaultEditor();
  }

  public async setDefaultEditor(editor: Editor) {
    if (editor === this.state.defaultEditor) {
      return;
    }
    this.setState({
      defaultEditor: editor,
    });
    return ExtensionData.setDefaultEditor(editor);
  }

  public async refreshCodespacesData(): Promise<void> {
    if (
      !this.state.gitHubData ||
      !this.state.gitHubData.accessToken ||
      !this.state.codespacesConfig.ghBridgeRepoName ||
      !this.state.codespacesConfig.ghBridgeRepoOwner
    ) {
      return;
    }
    const octokit = new Octokit({ auth: this.state.gitHubData.accessToken });
    const { data: codeSpacesData } =
      await octokit.rest.codespaces.listInRepositoryForAuthenticatedUser({
        owner: this.state.codespacesConfig.ghBridgeRepoOwner,
        repo: this.state.codespacesConfig.ghBridgeRepoName,
        // Sending a random param to invalidate browser cache as GH seems to be sending
        // wrong cache signals in this API
        test: Math.random().toString(36).slice(2, 12),
      });
    this.setState({
      gitHubData: {
        ...this.state.gitHubData,
        codespacesData: codeSpacesData,
      },
    });
  }

  public async getCodespacesConfig(): Promise<CodespacesConfig> {
    const repoSvc = await SDK.getService<IVersionControlRepositoryService>(
      GitServiceIds.VersionControlRepositoryService
    );
    const gitClient = getClient(GitRestClient);
    const [repository, host] = await Promise.all([
      repoSvc.getCurrentGitRepository(),
      SDK.getHost(),
    ]);
    if (!repository || !host.name) {
      return this.state.codespacesConfig;
    }
    let codespacesConfig: CodespacesConfig | null = null;
    try {
      const configFileData = await gitClient.getItemContent(
        repository.id,
        CODESPACES_CONFIG_LOCATION
      );
      const decoder = new TextDecoder("utf-8");
      const configFile = JSON.parse(decoder.decode(configFileData));
      if (configFile.ghBridgeRepoName && configFile.ghBridgeRepoOwner) {
        codespacesConfig = configFile;
      }
    } catch (err) {
      console.warn("Error while fetching config", err);
    }
    return {
      ...codespacesConfig,
      authServerUrl: codespacesConfig?.authServerUrl || DEFAULT_AUTH_SERVER,
      patScopes: codespacesConfig?.patScopes || DEFAULT_PAT_SCOPES,
      patOrg: host.name,
      patSecret:
        codespacesConfig?.patSecret ||
        DEFAULT_PAT_SECRET.replace("{ORG}", host.name.toUpperCase()),
      workspaceFolder:
        codespacesConfig?.workspaceFolder || `/workspaces/${repository.name}`,
    };
  }

  public async getGitHubData(): Promise<GitHubData | null> {
    const accessToken = this.getGitHubAccessToken();
    if (!accessToken) {
      return null;
    }
    const octokit = new Octokit({ auth: accessToken });
    let userData: Awaited<
      ReturnType<typeof octokit.rest.users.getAuthenticated>
    >["data"];
    try {
      const data = await octokit.rest.users.getAuthenticated();
      userData = data.data;
    } catch (err) {
      return null;
    }

    if (
      !this.state.codespacesConfig.ghBridgeRepoName ||
      !this.state.codespacesConfig.ghBridgeRepoOwner
    ) {
      return {
        login: userData.login,
        accessToken,
        avatarUrl: userData.avatar_url,
      };
    }

    try {
      await octokit.rest.repos.get({
        owner: this.state.codespacesConfig.ghBridgeRepoOwner,
        repo: this.state.codespacesConfig.ghBridgeRepoName,
      });
    } catch (err) {
      console.log("repo get error", err, userData);
      return {
        login: userData.login,
        accessToken,
        avatarUrl: userData.avatar_url,
        hasAccess: false,
      };
    }

    let isSecretPresent = false;
    let isAddedToRepo = false;
    try {
      const [{}, { data: secretRepoData }] = await Promise.all([
        octokit.rest.codespaces.getSecretForAuthenticatedUser({
          secret_name: this.state.codespacesConfig.patSecret,
        }),
        octokit.rest.codespaces.listRepositoriesForSecretForAuthenticatedUser({
          secret_name: this.state.codespacesConfig.patSecret,
        }),
      ]);
      isSecretPresent = true;
      isAddedToRepo = secretRepoData.repositories.some(
        (repo) =>
          repo.full_name ===
          `${this.state.codespacesConfig.ghBridgeRepoOwner}/${this.state.codespacesConfig.ghBridgeRepoName}`
      );
    } catch (err) {
      isSecretPresent = false;
    }

    if (isSecretPresent && !isAddedToRepo) {
      //special case - we add it ourselves
      console.log("adding repo secret");
      const { data: repository } = await octokit.rest.repos.get({
        owner: this.state.codespacesConfig.ghBridgeRepoOwner,
        repo: this.state.codespacesConfig.ghBridgeRepoName,
      });
      await octokit.rest.codespaces.addRepositoryForSecretForAuthenticatedUser({
        secret_name: this.state.codespacesConfig.patSecret,
        repository_id: repository.id,
      });
    }

    const { data: codeSpacesData } =
      await octokit.rest.codespaces.listInRepositoryForAuthenticatedUser({
        owner: this.state.codespacesConfig.ghBridgeRepoOwner,
        repo: this.state.codespacesConfig.ghBridgeRepoName,
        // Sending a random param to invalidate browser cache as GH seems to be sending
        // wrong cache signals in this API
        test: Math.random().toString(36).slice(2, 12),
      });

    return {
      isSecretPresent,
      accessToken,
      avatarUrl: userData.avatar_url,
      codespacesData: codeSpacesData,
      login: userData.login,
    };
  }

  public getAccessTokenKey() {
    return ACCESS_TOKEN_KEY + this.state.codespacesConfig.authServerUrl;
  }

  public getGitHubAccessToken() {
    return window.localStorage.getItem(this.getAccessTokenKey());
  }

  public async setAccessToken(accessToken: string | null) {
    this.setState({
      isLoading: true,
    });
    if (accessToken == null) {
      window.localStorage.removeItem(this.getAccessTokenKey());
    } else {
      window.localStorage.setItem(this.getAccessTokenKey(), accessToken);
    }
    const gitHubData = await this.getGitHubData();
    this.setState({
      isLoading: false,
      gitHubData,
    });
  }

  public async logoutFromGitHub() {
    this.setState({
      isLoading: true,
    });
    const accessToken = this.getGitHubAccessToken();
    this.setAccessToken(null);
    axios.delete(this.state.codespacesConfig.authServerUrl + "/api/logout", {
      data: {
        token: accessToken,
      },
    });
    this.setState({
      isLoading: false,
    });
  }

  public openAuthWindow(): void {
    const eventHandler = (event: MessageEvent<{ token: string }>) => {
      if (event.origin == this.state.codespacesConfig.authServerUrl) {
        this.setAccessToken(event.data.token);
        childWindow?.close();
        window.removeEventListener("message", eventHandler);
      }
    };
    window.addEventListener("message", eventHandler, false);
    const childWindow = window.open(
      this.state.codespacesConfig.authServerUrl +
        "/api/login?state=" +
        encodeURIComponent(JSON.stringify({ origin: window.location.origin })),
      `_blank`
    );

    childWindow?.focus();
  }

  public async refreshGitHubData(): Promise<void> {
    const gitHubData = await this.getGitHubData();
    this.setState({
      gitHubData,
    });
  }

  public async componentDidMount(): Promise<void> {
    await SDK.init();
    let params = new URL(window.location.href).searchParams;
    let autoCreate = params.get("autoCreate") === "true";
    let branchName = params.get("branch");

    // Prevent autoCreate from being triggered multiple times on page refresh
    const randomId = params.get("randomId");
    const autoCreatedCodespaces = window.sessionStorage.getItem(
      "autoCreatedCodespaces"
    );
    if (randomId && autoCreate) {
      if (autoCreatedCodespaces?.includes(randomId)) {
        autoCreate = false;
        branchName = null;
      } else {
        window.sessionStorage.setItem(
          "autoCreatedCodespaces",
          (autoCreatedCodespaces || "") + "," + randomId
        );
      }
    }

    const [editor, codespacesConfig] = await Promise.all([
      this.getDefaultEditor(),
      this.getCodespacesConfig(),
    ]);
    this.setState({
      defaultEditor: editor,
      autoCreate,
      branchName,
      isCreateDialogOpen: new ObservableValue(autoCreate),
      codespacesConfig,
    });
    await this.refreshGitHubData();
    this.setState({
      isLoading: false,
      defaultEditor: editor,
    });
  }

  public renderFilledVisual(avatarUrl: string | undefined): JSX.Element {
    if (!avatarUrl) {
      return <div />;
    }
    return <Image alt="test" src={avatarUrl} containImage={true} />;
  }

  public render(): JSX.Element {
    if (this.state.isLoading) {
      return (
        <Page className="flex-grow">
          <div className="page-content page-content-top">
            <Spinner size={SpinnerSize.large} />
          </div>
        </Page>
      );
    }
    if (
      !this.state.codespacesConfig.ghBridgeRepoName ||
      !this.state.codespacesConfig.ghBridgeRepoOwner
    ) {
      return (
        <Page className="flex-grow">
          <div className="page-content">
            <ZeroData
              primaryText="Codespaces not configured for this repository"
              secondaryText={
                <span>
                  Configure codespaces for this repository by adding
                  codespaces.json to the repository root
                </span>
              }
              imageAltText="Sign In"
              imagePath="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
            />
          </div>
        </Page>
      );
    }
    if (!this.state.gitHubData) {
      return (
        <Page className="flex-grow">
          <div className="page-content">
            <ZeroData
              primaryText="Github Sign in needed"
              secondaryText={
                <span>
                  To allow you to create codepsaces, this ADO extension needs
                  some GitHub permissions
                </span>
              }
              imageAltText="Sign In"
              imagePath="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
              actionText="Sign In"
              actionType={ZeroDataActionType.ctaButton}
              onActionClick={() => this.openAuthWindow()}
            />
          </div>
        </Page>
      );
    }
    if (this.state.gitHubData && this.state.gitHubData.hasAccess === false) {
      return (
        <Page className="flex-grow">
          <div className="page-content">
            <ZeroData
              primaryText="No access"
              secondaryText={
                <span>
                  You don't have access to create codespaces for this
                  repository. Please make sure you are signed in to the correct
                  GitHub account, and the GitHub App has access to the
                  repository.
                </span>
              }
              imageAltText="Sign Out"
              imagePath="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
              actionText="Sign Out"
              actionType={ZeroDataActionType.ctaButton}
              onActionClick={() => this.logoutFromGitHub()}
            />
          </div>
        </Page>
      );
    }
    return (
      <Page>
        <Header
          title={"Codespaces"}
          titleSize={TitleSize.Large}
          commandBarItems={[
            {
              iconProps: {
                iconName: "Add",
              },
              id: "codespaceCreate",
              important: true,
              onActivate: () => {
                this.state.isCreateDialogOpen.value = true;
              },
              text: "Create",
              isPrimary: true,
              tooltipProps: {
                text: "Create a codespace",
              },
            },
            {
              iconProps: {
                iconName: "Code",
              },
              id: "DefaultEditor",
              important: false,
              subMenuProps: {
                id: "sub-menu",
                items: [
                  {
                    id: Editor.VSCodeDesktop,
                    text: "VSCode Desktop",
                    onActivate: () => {
                      this.setDefaultEditor(Editor.VSCodeDesktop);
                    },
                    iconProps: {
                      iconName:
                        this.state.defaultEditor === Editor.VSCodeDesktop
                          ? "CheckMark"
                          : undefined,
                    },
                  },
                  {
                    id: Editor.VSCodeWeb,
                    text: "VSCode Web",
                    onActivate: () => {
                      this.setDefaultEditor(Editor.VSCodeWeb);
                    },
                    iconProps: {
                      iconName:
                        this.state.defaultEditor === Editor.VSCodeWeb
                          ? "CheckMark"
                          : undefined,
                    },
                  },
                ],
              },
              text: "Default Editor",
            },
            { id: "separator", itemType: MenuItemType.Divider },
            {
              iconProps: {
                iconName: "Signin",
              },
              id: "logoutGitHub",
              important: false,
              onActivate: () => {
                this.logoutFromGitHub();
              },
              text: "Logout from GitHub",
            },
          ]}
          titleIconProps={{ iconName: "PC1", size: IconSize.inherit }}
          titleAriaLevel={3}
        />
        <CreateCodespaceDialog
          isDialogOpen={this.state.isCreateDialogOpen}
          githubData={this.state.gitHubData}
          editor={this.state.defaultEditor}
          autoCreate={this.state.autoCreate}
          branchName={this.state.branchName}
          codespacesConfig={this.state.codespacesConfig}
          onCreate={() => this.refreshCodespacesData()}
        />
        <RenameDialog
          isDialogOpen={this.state.isUpdateDialogOpen}
          githubData={this.state.gitHubData}
          codespaceName={this.state.selectedCodespaceName}
          onUpdate={() => this.refreshCodespacesData()}
        />
        <div className="page-content page-content-top">
          {this.renderTable()}
        </div>
      </Page>
    );
  }
}

showRootComponent(<CodespacesHubContent />);
