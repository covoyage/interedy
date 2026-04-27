const zhCN = {
  // Sidebar
  sidebar: {
    title: "连接管理",
    empty: "点击 + 添加 Redis 连接",
    collapse: "收起侧边栏",
    expand: "展开侧边栏",
    editConnection: "编辑连接",
    newConnection: "新建连接",
    nameLabel: "名称",
    hostLabel: "主机",
    portLabel: "端口",
    passwordLabel: "密码",
    passwordOptional: "可选",
    dbLabel: "数据库",
    cancel: "取消",
    save: "保存",
    connectFail: "连接失败",
    connecting: "连接中…",
    connectTimeout: "连接超时，请检查网络或 Redis 地址",
    database: "数据库",
    testConnection: "测试连接",
    testSuccess: "连接成功",
    testFail: "连接失败",
  },

  // KeyTree
  keyTree: {
    keys: "键列表",
    searchPlaceholder: "key pattern",
    noData: "无数据，尝试刷新",
    notConnected: "请先连接 Redis",
  },

  // KeyDetailPanel
  detail: {
    selectKey: "选择一个 Key 查看详情",
    copyKey: "复制键名",
    loading: "加载中...",
    deleteKey: "删除 Key",
    refresh: "刷新",
    ttl: "TTL",
    setTTL: "设置",
    neverExpire: "永不过期",
    seconds: "秒",
    save: "保存",
    field: "字段",
    value: "值",
    add: "添加",
    newElement: "新元素",
    newMember: "新成员",
  },

  // Type labels
  types: {
    string: "String",
    hash: "Hash",
    list: "List",
    set: "Set",
    zset: "Sorted Set",
    stream: "Stream",
  },

  // AddKeyModal
  addKey: {
    title: "新增 Key",
    keyName: "Key 名称",
    type: "类型",
    initialValue: "初始值",
    create: "创建",
    placeholder: "值",
    addField: "添加字段",
    addItem: "添加项",
  },

  // TerminalPanel
  terminal: {
    title: "命令行",
    hint: "输入 Redis 命令执行 (↑↓ 浏览历史)",
    inputPlaceholder: "输入命令...",
    notConnected: "请先连接 Redis",
  },

  // StatusBar
  statusBar: {
    notConnected: "未连接",
    keys: "keys",
    memory: "内存",
  },

  // App toolbar
  toolbar: {
    addKey: "新增 Key",
  },

  // Welcome page
  welcome: {
    title: "Interedy",
    subtitle: "Redis 管理工具",
    hint: "从左侧选择或添加一个 Redis 连接",
  },

  // Theme & Locale
  settings: {
    light: "浅色",
    dark: "深色",
    switchToLight: "切换浅色主题",
    switchToDark: "切换深色主题",
    switchToEN: "Switch to English",
    switchToZH: "切换中文",
  },
  about: {
    subtitle: "Redis 桌面管理工具",
    version: "版本",
    viewOnGitHub: "在 GitHub 上查看",
    license: "基于 AGPL-3.0 许可证开源",
  },
  update: {
    check: "检查更新",
    checking: "检查中...",
    available: "有新版本可用",
    latest: "您使用的是最新版本",
    currentVersion: "当前版本",
    latestVersion: "最新版本",
    download: "下载",
    downloading: "正在下载...",
    downloadComplete: "下载完成",
    restartToUpdate: "重启以更新",
    restartConfirm: "更新已下载完成。是否立即重启应用程序？",
    restartLater: "稍后重启",
    error: "检查更新失败",
    errorHint: "请检查网络连接后重试",
    releaseNotes: "更新说明",
  },
};

export default zhCN;
export type TranslationKeys = typeof zhCN;
