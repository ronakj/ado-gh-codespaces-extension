export const getVsCodeDesktopUrl = (codespaceName: string) => {
  return `vscode://github.codespaces/connect?name=${codespaceName}&windowId=_blank`;
};
