# MetaCode Harness

基于 [MetaCode Harness](https://github.com/metacode-ai/metacode-harness) 迁移的 Agent Harness monorepo。命名空间已从 `dsh` / `@metacode/*` 统一改为 **`metacode` / `@metacode/*`**。

与 [MetaCode CLI](https://github.com/metacode-ai/metacode-cli)（Java）同属 MetaCode 产品族：Java 版为终端 REPL，本仓库为 Cordis 插件化 Harness（TypeScript）。

## 命名对照

| MetaCode Harness | MetaCode Harness |
|------------------|------------------|
| `dsh` 命令 | `metacode` |
| `$METACODE_HOME` / `~/.metacode` | `$METACODE_HOME` / `~/.metacode` |
| `@metacode/*` | `@metacode/*` |
| `@metacode/cordis` | `@metacode/cordis` |
| `metacode.profile` / `metacode.bundle` | `metacode.profile` / `metacode.bundle` |

## 快速开始

```powershell
cd E:\project\metacode-harness
pnpm install
pnpm run build
pnpm metacode web
```

开发态直接跑 TypeScript 入口：

```powershell
pnpm metacode --profile web
pnpm metacode --help
pnpm metacode --profile web --dump-config
```

## 目录

| 路径 | 说明 |
|------|------|
| `apps/cli` | `metacode` CLI 入口 |
| `packages/` | 领域包（session、llm、tools、commands…） |
| `vendor/` | Cordis 框架及 Loader/Include 等 |
| `docs/metacode-harness/` | 架构中文导读 |
| `docs/mobile/` | **手机端规划**（二维码扫码连接） |
| `reference/metacode-harness/` | upstream 原文参考（迁移前快照） |
| `scripts/migrate-from-dsh.ps1` | 从 DSH 重新同步并重命名 |
| `scripts/rename-dsh-to-metacode.ps1` | 对已复制树执行 dsh→metacode 替换 |

## 从 upstream 重新同步

```powershell
.\scripts\migrate-from-dsh.ps1 -Source D:\opensource\metacode-harness
```

## 架构文档

- [docs/metacode-harness/README.md](./docs/metacode-harness/README.md)
- [reference/metacode-harness/README.md](./reference/metacode-harness/README.md)

## 手机端规划（Phase 0）

对标 Trae 移动体验，采用 **本地二维码扫码配对、无需账号**。详见：

- [docs/mobile/README.md](./docs/mobile/README.md)

## License

MIT（继承自 MetaCode Harness）
