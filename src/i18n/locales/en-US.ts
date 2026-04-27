import type { TranslationKeys } from "./zh-CN";

const enUS: TranslationKeys = {
  sidebar: {
    title: "Connections",
    empty: "Click + to add a Redis connection",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    editConnection: "Edit Connection",
    newConnection: "New Connection",
    nameLabel: "Name",
    hostLabel: "Host",
    portLabel: "Port",
    passwordLabel: "Password",
    passwordOptional: "Optional",
    dbLabel: "DB",
    cancel: "Cancel",
    save: "Save",
    connectFail: "Connection failed",
    connecting: "Connecting…",
    connectTimeout: "Connection timed out. Please check your network or Redis address",
    database: "Database",
    testConnection: "Test Connection",
    testSuccess: "Connection successful",
    testFail: "Connection failed",
  },

  keyTree: {
    keys: "Keys",
    searchPlaceholder: "key pattern",
    noData: "No data, try refresh",
    notConnected: "Connect to Redis first",
  },

  detail: {
    selectKey: "Select a key to view details",
    copyKey: "Copy key name",
    loading: "Loading...",
    deleteKey: "Delete Key",
    refresh: "Refresh",
    ttl: "TTL",
    setTTL: "Set",
    neverExpire: "Never expire",
    seconds: "s",
    save: "Save",
    field: "Field",
    value: "Value",
    add: "Add",
    newElement: "New element",
    newMember: "New member",
  },

  types: {
    string: "String",
    hash: "Hash",
    list: "List",
    set: "Set",
    zset: "Sorted Set",
    stream: "Stream",
  },

  addKey: {
    title: "Add Key",
    keyName: "Key Name",
    type: "Type",
    initialValue: "Initial Value",
    create: "Create",
    placeholder: "Value",
    addField: "Add Field",
    addItem: "Add Item",
  },

  terminal: {
    title: "Command Line",
    hint: "Enter Redis command (↑↓ for history)",
    inputPlaceholder: "Enter command...",
    notConnected: "Connect to Redis first",
  },

  statusBar: {
    notConnected: "Not connected",
    keys: "keys",
    memory: "Memory",
  },

  toolbar: {
    addKey: "Add Key",
  },

  welcome: {
    title: "Interedy",
    subtitle: "Redis Manager",
    hint: "Select or add a Redis connection from the sidebar",
  },

  settings: {
    light: "Light",
    dark: "Dark",
    switchToLight: "Switch to Light Mode",
    switchToDark: "Switch to Dark Mode",
    switchToEN: "Switch to English",
    switchToZH: "切换中文",
  },
  about: {
    subtitle: "Redis Desktop Manager",
    version: "Version",
    viewOnGitHub: "View on GitHub",
    license: "Licensed under AGPL-3.0 License",
  },
  update: {
    check: "Check for Updates",
    checking: "Checking...",
    available: "Update Available",
    latest: "You are using the latest version",
    currentVersion: "Current Version",
    latestVersion: "Latest Version",
    download: "Download",
    downloading: "Downloading...",
    downloadComplete: "Download Complete",
    restartToUpdate: "Restart to Update",
    restartConfirm: "The update has been downloaded. Do you want to restart the application now?",
    restartLater: "Restart Later",
    error: "Failed to check for updates",
    errorHint: "Please check your network connection and try again",
    releaseNotes: "Release Notes",
  },
};

export default enUS;
