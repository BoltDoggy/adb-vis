# ADB Vis

一款基于 [Electrobun](https://electrobun.dev/) 构建的 Android Debug Bridge（ADB）可视化桌面工具。

![ADB Vis 截图](./screenshots/app.png)

## 功能特性

- **设备管理** — 自动发现并列出已连接的 Android 设备，显示连接状态与 ADB 路径
- **实时截图** — 一键截取设备屏幕并预览
- **Shell 终端** — 在图形界面中执行 ADB Shell 命令
- **日志查看器** — 可视化过滤与查看 `logcat`，支持按标签、进程、日志级别筛选
- **应用管理** — 查看与管理设备上的应用包

## 技术栈

- **React 19** + TypeScript 构建 webview UI
- **Vite 6** 提供快速开发与热更新
- **Tailwind CSS 4** 构建界面样式
- **shadcn/ui**（New York 风格，neutral 主题）
- **Biome** 负责代码检查与格式化
- **Bun** 作为运行时与包管理器
- 主进程与 webview 之间通过 `shared/rpc.ts` 实现类型安全的 RPC 通信

## 项目结构

```
src/
  bun/            # 主进程（Bun 运行时）
    index.ts      # 应用入口：窗口创建、RPC 处理、菜单
  mainview/       # Webview UI（React + Vite）
    components/   # React 组件（含 shadcn/ui）
    lib/          # 工具函数（cn()、electrobun RPC 客户端）
    index.html    # HTML 入口
    index.tsx     # React 根节点
    index.css     # Tailwind + 主题变量
shared/
  rpc.ts          # 主进程与 webview 共享的 RPC 类型契约
```

## 开发

### 快速启动

```bash
bun install
bun run start        # 构建 webview 并启动应用
```

### 监听模式开发

```bash
bun run dev          # Electrobun 监听源文件变化并自动重载
```

### 热模块替换（HMR）

```bash
bun run dev:hmr      # 同时运行 Vite 开发服务器与 Electrobun
```

启动时主进程会探测 `localhost:5173`，如果 Vite 开发服务器正在运行，则直接加载开发环境资源，实现 webview UI 的即时热更新。

### 代码检查

```bash
bun run lint         # Biome 检查
bun run lint:fix     # 自动修复
```

## CI / 云端构建

本项目使用 GitHub Actions 在 macOS 云端运行器上自动构建：

- 每次推送到 `main`/`master` 分支或发起 Pull Request 时触发构建
- 每次推送 `v*` 标签时自动创建 GitHub Release 并上传安装包
- 构建产物（`.app.tar.zst`、`.dmg`、更新清单）可在 Actions 运行详情页下载

工作流文件：`.github/workflows/build.yml`

## 构建与发布

Electrobun 使用 `--env` 区分构建渠道：

| 渠道 | 命令 | 用途 |
|---|---|---|
| `dev` | `bun run start` | 本地开发，直接启动 |
| `canary` | `bun run build:canary` | 预发布测试构建 |
| `stable` | `bun run build:stable` | 生产发布构建 |

所有构建脚本都会先执行 `vite build`，再执行 `electrobun build`。`electrobun.config.ts` 中的 `copy` 规则将 Vite 输出映射到应用包内：

```
dist/index.html   → views/mainview/index.html
dist/assets/      → views/mainview/assets/
```

## 关键配置文件

| 文件 | 说明 |
|---|---|
| `electrobun.config.ts` | 应用元数据、构建设置、平台配置、复制规则、发布 URL |
| `vite.config.ts` | Vite 构建配置、开发服务器端口、路径别名 |
| `tsconfig.json` | TypeScript 配置，覆盖 `src/` 与 `shared/` |
| `components.json` | shadcn/ui CLI 配置 |
| `biome.json` | 代码检查与格式化规则 |
| `postcss.config.mjs` | PostCSS + Tailwind CSS 4 插件 |

## 相关文章

- [ADB Vis 开发手记](https://juejin.cn/spost/7649003647238062090)

## 许可证

MIT
