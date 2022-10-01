This extension integrates GitHub Codespaces APIs in ADO to provide an almost native GitHub Codespaces experience directly from ADO.

## Prerequisites

There are some permissions required for using this extension -

1. You need to have read access to the ADO repo for which you want to create Codespaces.
2. You need read access to the GitHub repo where Codespaces will be created. This repository will be called the `bridge` repository - as it's purpose is to host Codespaces for our ADO repo.
3. If you are configuring this extension for your users - you will also need Admin access to the ADO org (for installing this extension), and admin access to the GitHub org where you will need to install the GitHub App which allows integration b/w ADO and GitHub.

## How does it work?

There are three components for this integration

1. This ADO Extension - It creates a Codespaces Hub under Repo tab in ADO where users can manage and connect to their codespaces.
2. Stateless Oauth Server - It handles authentication requests by generating access tokens and then sends them back to the extension. It doesn't store any token by itself. The code for the stateless server app is [here](https://github.com/ronakj/ado-gh-codespaces-auth-server).
3. GitHub App - This app is authorized by the GitHub repo admin to the bridge repo. The Oath Server generates user access token for this app. The default GitHub app can be installed from [here](https://github.com/apps/ado-gh-codespaces/installations/new).

While you can use the default stateless server and app without any additional configuration, if you wish to use your own Oauth Server and GitHub App for security reasons, it is possible to do so. See here.

## Configuring this extension

This step needs admin permissions to the GitHub repo and extension install permissions to the ADO org.

1. Install this extension in the ADO org where you want to use codespaces. It is not enabled by default - so nobody in your org should be able see it yet.
2. In your GitHub org create a bridge repo using [this template](https://github.com/ronakj/ado-gh-codespaces-bridge), making sure to substitute the required values in .devcontainer/devcontainer.json. Make sure your ADO users have push access to this repository.
3. Install [this app](https://github.com/apps/ado-gh-codespaces/installations/new) in your GitHub repo. You will need admin permissions to the bridge repo for this.
4. In your ADO repo root create a file called `codespaces.json`. This configuration file looks like this - make sure to update to the correct values.

```
{
    "ghBridgeRepoName": "ado-gh-codespaces-bridge",
    "ghBridgeRepoOwner": "ronakj"
}
```

5. Enable the extension in your ADO project by going to User Settings -> Preview Features -> Project scope -> Enable Codespaces Hub. If you don't want to enable this for every user in your project, you can also have individual users enable it for themselves from Preview Feature pane.

Your ADO users should now be able to see Codespaces in the Repo Hub list.
