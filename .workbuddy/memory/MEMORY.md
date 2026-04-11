# Interedy - Redis Manager

## 项目概况
- 基于 Tauri 2.0 + React + TypeScript + TailwindCSS 的 Redis 管理工具
- 项目路径: /Users/ning/projects/desktop/interedy
- 包管理: pnpm

## 技术架构
- **前端**: React 18 + TypeScript + TailwindCSS, Vite 构建
- **后端**: Rust (Tauri 2.0), redis-rs 0.27 驱动
- **组件**: Sidebar(连接管理), KeyTree(树形浏览), KeyDetailPanel(数据编辑), TerminalPanel(命令行), AddKeyModal(新增), StatusBar(状态栏)
- **数据流**: 前端 invoke → Tauri command → redis-rs 执行

## 功能
- 连接管理: 添加/编辑/删除/连接/断开 Redis 连接，配置持久化到 ~/.config/interedy/connections.json
- Key 浏览: 树形层级展示（按 ":" 分隔），支持 pattern 搜索
- 数据编辑: String/Hash/List/Set/ZSet 五种类型的查看、编辑、增删
- TTL 管理: 查看/设置 TTL，支持 PERSIST
- 命令行终端: 自由执行 Redis 命令，支持上下键浏览历史
- 状态栏: 连接状态、Key 数量、内存使用实时显示
- 主题切换: Light/Dark 双主题，TailwindCSS dark: class 模式，持久化 localStorage
- 国际化: zh-CN / en-US 双语，LocaleContext + 语言文件，右上角一键切换
- 自动更新: tauri-plugin-updater + tauri-plugin-process，UpdateDialog 组件，macOS 菜单 Check for Updates
- GitHub Actions: .github/workflows/build.yml，多平台构建 + updater JSON 生成

## 启动
```bash
cd /Users/ning/projects/desktop/interedy
pnpm tauri dev
```
