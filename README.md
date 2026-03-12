# 🔍 KeyTrack for Obsidian

> 智能关键词追踪器 —— 在你的 Obsidian 知识库中快速定位、汇总和回顾任何提及。

[![GitHub Release](https://img.shields.io/github/v/release/windfsy/keytrack?logo=github&color=2ea043)](https://github.com/windfsy/keytrack/releases/latest)
[![License](https://img.shields.io/github/license/windfsy/keytrack?color=blue)](LICENSE)

[English](#english) | [中文](#中文)

---

<a name="中文"></a>
## 中文介绍

**KeyTrack** 是一款为 [Obsidian](https://obsidian.md) 设计的智能关键词追踪插件。它允许你在笔记中使用简单的代码块语法，自动搜索并汇总整个知识库中提及特定关键词的内容，以优雅的表格形式展示上下文预览。

灵感来源于 DataviewJS，但 KeyTrack 提供了更原生的 Obsidian 体验：无需编写 JavaScript，通过声明式参数即可实现强大的搜索和展示功能。

### ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 🔍 **智能搜索** | 自动识别 `[[关键词]]` 格式的内部链接，支持别名 `[[原名\|别名]]` |
| 📅 **日期提取** | 智能从文件路径提取日期（支持 `YYYY/MM/DD`、`YYYYMMDD` 等多种格式） |
| 🎯 **Glob 匹配** | 支持 `**/*.md`、`日记/2024/*.md` 等通配符精确控制搜索范围 |
| 📊 **分组展示** | 相同文件的多个匹配自动合并，避免重复显示 |
| 🔗 **双向链接** | 表格中的链接可直接点击跳转，完美融入 Obsidian 图谱 |
| ⚡ **性能优化** | 内置结果限制和缓存机制，大型仓库也能流畅运行 |
| 🎨 **美观样式** | 适配 Obsidian 原生主题，支持浅色/深色模式自动切换 |

### 📦 安装方法

#### 方式一：社区插件市场（推荐）

1. 打开 Obsidian 设置 → 社区插件
2. 关闭安全模式（如果尚未关闭）
3. 点击浏览，搜索 **"KeyTrack"**
4. 安装并启用插件

#### 方式二：手动安装

1. 从 [Releases](https://github.com/windfsy/keytrack/releases) 下载最新版本的 `main.js`、`manifest.json` 和 `styles.css`
2. 在你的 Vault 中创建文件夹 `.obsidian/plugins/keytrack/`
3. 将下载的文件复制到该文件夹
4. 重启 Obsidian，在设置 → 社区插件中启用 KeyTrack

### 🚀 快速开始

在任意笔记中插入以下代码块：

````markdown
```keytrack
```
````

保存后切换到阅读模式，即可看到自动生成的汇总表格。

### 📖 完整参数参考

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `queryKey` | 字符串 | 当前文件名 | 要搜索的关键词 |
| `previewLength` | 数字 | `10` | 上下文预览长度（每侧字符数，自动取偶） |
| `maxResults` | 数字 | `200` | 最大结果数（0=无限制，防止卡顿） |
| `pathMode` | 枚举 | `auto` | 路径解析模式：`auto`/`daily`/`custom` |
| `customGlob` | 字符串 | `""` | 自定义文件匹配模式，如 `**/*.md` |
| `firstColumnType` | 枚举 | `auto` | 首列显示：`auto`/`date`/`filename`/`path`/`custom` |
| `customColumnText` | 字符串 | `""` | 自定义列模板，支持 `{{date}}`、`{{filename}}` 等变量 |
| `searchFolder` | 字符串 | `""` | 限制搜索文件夹（如 `000 Daily`） |
| `excludePatterns` | 字符串 | `Templates/, Archive/` | 排除路径（逗号分隔） |
| `showAlias` | 布尔 | `true` | 显示链接别名而非原名 |
| `groupByFile` | 布尔 | `true` | 按文件分组显示 |
| `removeMarkdown` | 布尔 | `true` | 清理粗体、斜体等格式标记 |

### 💡 使用示例

#### 示例 1：追踪人物提及（联系人管理）

创建一个名为 `张三.md` 的文件，内容如下：

````markdown
# 张三

## 相关记录

```keytrack
queryKey=张三
searchFolder=日记
firstColumnType=date
previewLength=12
```
````

效果：自动从 `日记/` 文件夹中找出所有提及"张三"的日记条目，按日期倒序排列。

#### 示例 2：项目文档汇总

````markdown
```keytrack
queryKey=KeyTrack插件
customGlob=**/*.md
excludePatterns=Archive/, Templates/, .obsidian/
maxResults=50
groupByFile=true
```
````

效果：在全库（除排除目录外）搜索项目相关记录，限制 50 条结果。

#### 示例 3：自定义日期格式日记

如果你的日记格式为 `2024-03-15.md`：

````markdown
```keytrack
queryKey=健身打卡
pathMode=daily
searchFolder=日记
firstColumnType=date
```
````

效果：自动识别日期格式，首列显示为 `[[2024-03-15|2024/03/15]]`。

#### 示例 4：物品清单追踪

````markdown
```keytrack
queryKey=机械键盘
customGlob=个人物品/清单/*.md
firstColumnType=filename
previewLength=8
```
````

#### 示例 5：会议记录汇总

````markdown
```keytrack
queryKey=季度规划
customGlob=工作/会议记录/**/*.md
firstColumnType=custom
customColumnText={{date}} {{filename}}
maxResults=30
```
````

### ⚙️ 插件设置

在 Obsidian 设置 → KeyTrack 中，你可以配置全局默认值：

- **默认预览长度**：所有代码块的默认上下文长度
- **默认最大结果数**：防止意外的大量查询导致卡顿
- **默认排除模式**：全局排除的文件夹（如模板、归档）
- **调试模式**：开启后在控制台输出性能日志

### 🛠️ 高级用法

#### 路径模式详解

- **`auto`**：自动识别，如果路径包含日期格式则按日期解析
- **`daily`**：强制按日记格式解析，适用于 `YYYY/MM/DD.md` 结构
- **`custom`**：配合 `customGlob` 使用，完全自定义文件范围

#### 自定义列模板变量

当 `firstColumnType=custom` 时，可用变量：

| 变量 | 说明 | 示例输出 |
|------|------|----------|
| `{{date}}` | 提取的日期 | `2024/03/15` |
| `{{filename}}` | 文件名（无扩展名） | `会议记录` |
| `{{path}}` | 相对路径 | `工作/会议记录.md` |
| `{{title}}` | 同 filename | `会议记录` |

示例：
```keytrack
customColumnText={{date}} 📄 {{filename}}
```

输出：`2024/03/15 📄 会议记录`

### 🔄 与 Dataview 的区别

| 特性 | KeyTrack | Dataview |
|------|----------|----------|
| 学习曲线 | ⭐ 低（声明式参数） | ⭐⭐⭐ 高（需学 JS） |
| 实时渲染 | ✅ 原生支持 | ✅ 支持 |
| 移动端性能 | ✅ 优化 | ⚠️ 可能卡顿 |
| 别名识别 | ✅ 内置 | 需手动编码 |
| 日期提取 | ✅ 智能识别 | 需手动解析 |
| 自定义逻辑 | 预设参数 | 完全可编程 |

**建议**：如果你需要简单的关键词追踪和汇总，KeyTrack 更轻量；如果需要复杂的数据处理和计算，仍可使用 Dataview。

### 🐛 故障排除

#### 搜索结果为空
- 检查 `queryKey` 是否准确（区分大小写）
- 确认关键词在目标文件中以 `[[关键词]]` 格式存在
- 检查 `excludePatterns` 是否误排除了目标文件夹
- 尝试开启 `debugMode` 查看控制台日志

#### 性能缓慢
- 降低 `maxResults` 值
- 缩小 `searchFolder` 范围
- 使用更精确的 `customGlob` 减少扫描文件数

#### 日期识别错误
- 手动指定 `pathMode=daily` 强制日期解析
- 检查文件路径是否包含标准日期格式

### 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

### 📜 许可证

本项目采用 [MIT](LICENSE) 许可证。

### 🙏 致谢

- 灵感来源于 Obsidian 社区优秀的 Dataview 插件
- 感谢Kimi & DeepSeek

---

<a name="english"></a>
## English Introduction

**KeyTrack** is an intelligent keyword tracker plugin for [Obsidian](https://obsidian.md). It allows you to automatically search and aggregate mentions of specific keywords across your entire knowledge base using simple code block syntax, displaying contextual previews in an elegant table format.

Inspired by DataviewJS, KeyTrack provides a more native Obsidian experience: no JavaScript coding required, achieve powerful search and display capabilities through declarative parameters.

### ✨ Key Features

- **Smart Search**: Auto-recognizes internal links `[[keyword]]` and aliases `[[name\|alias]]`
- **Date Extraction**: Intelligently extracts dates from file paths (supports multiple formats)
- **Glob Matching**: Precise control with wildcards like `**/*.md` or `journal/2024/*.md`
- **Grouped Display**: Auto-merges multiple matches from the same file
- **Bidirectional Links**: Clickable links in tables, perfectly integrated with Obsidian graph
- **Performance**: Built-in limits and caching for smooth operation in large vaults
- **Native Styling**: Adapts to Obsidian themes, auto light/dark mode

### 📦 Installation

#### Method 1: Community Plugins (Recommended)

1. Open Obsidian Settings → Community Plugins
2. Turn off Safe Mode (if not already)
3. Browse and search for **"KeyTrack"**
4. Install and enable

#### Method 2: Manual Install

1. Download `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/windfsy/keytrack/releases)
2. Create folder `.obsidian/plugins/keytrack/` in your vault
3. Copy files to the folder
4. Restart Obsidian and enable in settings

### 🚀 Quick Start

Insert in any note:

````markdown
```keytrack
queryKey=Project Management
customGlob=Work/Notes/*.md
maxResults=20
```
````

Switch to Reading view to see the auto-generated table.

### 📖 Parameter Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `queryKey` | string | Current filename | Keyword to search |
| `previewLength` | number | `10` | Context preview length (chars per side, auto-even) |
| `maxResults` | number | `200` | Max results (0=unlimited) |
| `pathMode` | enum | `auto` | Path parsing: `auto`/`daily`/`custom` |
| `customGlob` | string | `""` | File glob pattern, e.g., `**/*.md` |
| `firstColumnType` | enum | `auto` | First column: `auto`/`date`/`filename`/`path`/`custom` |
| `customColumnText` | string | `""` | Custom template with `{{date}}`, `{{filename}}`, etc. |
| `searchFolder` | string | `""` | Limit search scope (e.g., `Journal`) |
| `excludePatterns` | string | `Templates/, Archive/` | Exclude paths (comma-separated) |
| `showAlias` | boolean | `true` | Display link alias instead of original |
| `groupByFile` | boolean | `true` | Group by file |
| `removeMarkdown` | boolean | `true` | Clean bold, italic formatting |

### 💡 Examples

**Track person mentions:**
```keytrack
queryKey=John Doe
searchFolder=Daily
firstColumnType=date
```

**Project documentation:**
```keytrack
queryKey=KeyTrack Plugin
customGlob=**/*.md
excludePatterns=Archive/, Templates/
maxResults=50
```

**Custom date format:**
```keytrack
queryKey=Workout
pathMode=daily
searchFolder=Journal
```

### 🛠️ Advanced Usage

#### Template Variables

When `firstColumnType=custom`:

- `{{date}}` - Extracted date (e.g., `2024/03/15`)
- `{{filename}}` - Filename without extension
- `{{path}}` - Relative path
- `{{title}}` - Same as filename

Example:
```keytrack
customColumnText={{date}} 📄 {{filename}}
```

### 📜 License

[MIT](LICENSE)
