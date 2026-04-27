# ChatClaw UI

ChatClaw UI 是一个基于 `uni-app` 和 `Vue 3` 构建的移动端客户端，用于连接 `openclaw-chatclaw` 网关，并与 OpenClaw 智能体进行实时交互。项目聚焦聊天、语音备忘、云文档和 AI 小程序等移动场景，以 App 端体验为核心，同时支持多端编译。

## 项目定位

- 移动端智能体客户端，负责用户登录、会话展示、消息发送和工作台交互
- 通过 WebSocket 接收实时消息，通过 HTTP API 完成认证、历史记录查询、文件上传和工作台操作
- 与服务端项目 `openclaw-chatclaw` 配套使用，不直接内置 OpenClaw 服务端能力

## 配套项目

本仓库是前端客户端，服务端网关请参考：

- `openclaw-chatclaw` 服务端仓库: <https://github.com/xbos1314/openclaw-chatclaw.git>

系统职责划分如下：

- `chatclaw-ui`：登录、会话、聊天界面、媒体预览、工作台页面、本地状态管理
- `openclaw-chatclaw`：账号认证、WebSocket 网关、消息存储、文件服务、语音备忘、云文档、小程序管理、与 OpenClaw 智能体通信

## 核心能力

### 聊天与会话

- 连接 `openclaw-chatclaw` 的 WebSocket 网关，默认端口 `9788`，默认路径 `/ws`
- 支持文本消息实时收发与智能体流式回复
- 支持消息历史、未读计数、已读状态、会话恢复
- 支持 Markdown 内容展示

### 媒体与文件

- 支持图片、音频、视频和普通文件消息
- 支持文件上传、下载与应用内预览
- 内置音视频播放页
- 文件访问支持下载 token 刷新机制

### 工作台

- 语音备忘：录音上传、备忘列表、详情查看、再次发送给智能体
- 云文档：文档列表、详情、正文编辑、任务记录查看
- AI 小程序：创建、构建、修改、任务历史、项目文件浏览与编辑

### 账户与设备能力

- 用户名/密码登录
- 本地保存会话信息与服务端地址
- 支持头像同步
- App 侧使用摄像头、录音、通知等系统能力

## 系统架构

```text
┌──────────────────────┐    WebSocket / HTTP    ┌──────────────────────────┐
│     ChatClaw UI      │  <------------------>  │    openclaw-chatclaw     │
│   uni-app client     │                        │   gateway / REST / WS    │
└──────────────────────┘                        └──────────────┬───────────┘
                                                               │
                                                               ▼
                                                         OpenClaw Agents
```

前端不直接连接 OpenClaw Agent，而是统一通过 `openclaw-chatclaw` 提供的 API 与网关通信。客户端负责界面与交互，服务端负责认证、消息、文件和工作台数据能力。

## 技术栈

- `uni-app`
- `Vue 3`
- JavaScript
- SCSS
- 自定义 store 与服务层封装

## 目录结构

```text
.
├── App.vue
├── main.js
├── pages.json
├── manifest.json
├── common/
│   ├── chat.js
│   └── config.js
├── components/
│   ├── chat-composer.vue
│   ├── connection-chip.vue
│   ├── confirm-dialog.vue
│   ├── download-action.vue
│   ├── markdown-preview.vue
│   └── message-bubble.vue
├── pages/
│   ├── chat/
│   ├── common/
│   ├── login/
│   ├── player/
│   ├── profile/
│   ├── session/
│   └── workspace/
├── services/
│   ├── download.js
│   ├── http.js
│   ├── notification.js
│   ├── storage.js
│   └── workspace.js
└── store/
    └── chat.js
```

## 页面说明

| 页面 | 说明 |
| --- | --- |
| `pages/login/index` | 登录页，配置服务端地址并完成认证 |
| `pages/session/index` | 会话首页，展示智能体列表与最近消息 |
| `pages/chat/index` | 聊天详情页，支持文本、媒体和卡片消息 |
| `pages/workspace/index` | 工作台首页，统一进入备忘、文档、小程序 |
| `pages/workspace/memo-detail` | 语音备忘详情 |
| `pages/workspace/document-detail` | 云文档详情与内容编辑 |
| `pages/workspace/miniprogram-detail` | AI 小程序详情与任务状态 |
| `pages/workspace/miniprogram-files` | 小程序工程文件浏览与编辑 |
| `pages/player/index` | 音视频播放页 |
| `pages/profile/index` | 个人中心 |
| `pages/common/browser` | 应用内浏览器 |

## 服务端接口依赖

客户端依赖以下服务端能力：

- `POST /auth`
- `GET /agents`
- `GET /messages`
- `POST /messages/read`
- `DELETE /messages`
- `PATCH /messages/:id`
- `GET /files`
- `POST /files/upload`
- `POST /files/refresh-download-token`
- `POST /users/avatar`
- `GET /memo/list` 及 `POST /memo/voice`
- `GET /document/list`、`/document/:id/file`、`/document/:id/tasks`
- `GET /api/miniprogram/list` 及创建、构建、修改、项目文件相关接口

以上能力由 `openclaw-chatclaw` 服务端提供，前端负责界面呈现、交互流程和本地状态管理。

## 开发要求

- Node.js
- HBuilderX 或支持 `uni-app` 的开发环境
- 可用的 `openclaw-chatclaw` 服务端实例

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务端

先在 `openclaw-chatclaw` 仓库完成：

- OpenClaw 环境准备
- 网关插件安装与配置
- 账号创建
- HTTP / WebSocket 服务启动

默认情况下，前端会将空地址解析为：

- HTTP: `http://localhost:9788`
- WebSocket: `ws://localhost:9788/ws`

如果移动设备无法直接访问本机地址，需要在登录页填写可被手机访问的局域网 IP 或实际部署地址。

### 3. 运行客户端

- 使用 HBuilderX 导入本项目
- 选择运行到 Android/iOS 模拟器或真机
- 也可按需编译到微信小程序、支付宝小程序、百度小程序、抖音小程序

## 平台支持

项目基于 `uni-app` 开发，支持多端编译。

当前已完成测试的平台：

- H5
- Android App

其余平台已保留编译配置，但尚未进行完整测试。
