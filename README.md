# 个人脚本集合

这是一个个人实用脚本集合，包含两个主要工具：

## 📋 目录

- [Bilibili 数据管理器](#bilibili-数据管理器)
- [网易云音乐转换器](#网易云音乐转换器)

## 🔧 Bilibili 数据管理器

一个浏览器用户脚本，用于自动提取和管理 Bilibili 的认证数据。

### 功能特性

- ✅ 自动提取 Bilibili 认证数据（cookies 和 localStorage）
- ✅ 支持 SESSDATA、bili_jct、buvid3、DedeUID 等关键数据提取
- ✅ 数据查看器 UI（在指定页面查看提取的数据）
- ✅ 数据导出功能（JSON 格式）
- ✅ 敏感数据脱敏显示
- ✅ 写操作频率限制，防止过度存储

### 安装要求

- **浏览器扩展**: [Tampermonkey](https://www.tampermonkey.net/) 或 Greasemonkey
- **权限要求**:
  - 访问 `*.bilibili.com/*`
  - 访问 `http://192.168.31.173:12345/`
  - GM_cookie、GM_notification、GM_setValue、GM_getValue、GM_deleteValue 权限

### 使用方法

1. 在 Tampermonkey 中安装脚本
2. 访问 Bilibili 网页，按 `Alt+B` 提取数据
3. 在查看页面按 `Alt+V` 显示数据查看器

## 🎵 网易云音乐转换器

一个 Shell 脚本，用于将网易云音乐（NCM）格式文件转换为 MP3 格式。

### 功能特性

- ✅ 批量转换 .ncm 文件为 .mp3 格式
- ✅ 智能文件等待机制，确保文件写入完成
- ✅ 文件完整性验证（大小比较）
- ✅ 转换成功后安全清理原文件
- ✅ 使用 rsync 进行可靠的文件复制

### 安装要求

- **外部工具**: `ncmdump`（需安装在 `/opt/homebrew/bin/ncmdump`）
- **目录权限**:
  - 源目录: `/Users/mumunn/Music/网易云音乐`
  - 目标目录: `/Volumes/音乐/音乐/download`

### 使用方法

```bash
# 确保已安装 ncmdump
brew install ncmdump  # 或其他安装方式

# 运行转换脚本
./convert_and_move.sh
```

## 📦 项目结构

```
.
├── bilibili-data-manager.user.js    # Bilibili 数据管理器脚本
├── convert_and_move.sh              # 音乐转换脚本
└── README.md                        # 项目文档
```

## 🔒 安全与隐私

Bilibili 数据管理器包含重要的安全特性：

- **敏感数据脱敏**: SESSDATA 和 bili_jct 在 UI 中部分隐藏
- **写操作频率限制**: 防止过度存储写入
- **数据完整性检查**: 保存前验证数据完整性

## 📝 版本历史

- **v1.0** - 初始版本
- **最新更新** - 增强安全特性和 UI 优化

## 🤝 贡献

这是个人项目，欢迎提出建议和改进。

## 📄 许可

本项目仅供个人使用。
