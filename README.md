# ApplyRight AI

自托管的开源简历与岗位 JD 智能匹配工具。在本地运行 Next.js 应用，使用你自己的 AI API Key，数据保存在 `data/` 目录。

## 功能

- 上传 PDF 简历并对照 JD 进行 AI 匹配分析
- 润色结果 Diff、缺口分析与优化建议
- 匹配历史回放
- 多 AI 厂商：OpenAI、DeepSeek、Anthropic、Ollama

## 要求

- Node.js 20+
- npm

## 快速开始

```bash
git clone https://github.com/Rowe83/ApplyRight-AI.git
cd ApplyRight-AI
cp .env.example .env.local
# 编辑 .env.local，填入所选厂商的 API Key
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATA_DIR` | 数据目录，默认 `./data` |
| `AI_PROVIDER` | `openai` \| `deepseek` \| `anthropic` \| `ollama` |
| `AI_MODEL` | 模型名称 |
| `OPENAI_API_KEY` | OpenAI |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` | DeepSeek |
| `ANTHROPIC_API_KEY` | Anthropic |
| `OLLAMA_BASE_URL` | 本地 Ollama，默认 `http://127.0.0.1:11434` |

在应用内 **AI 设置** 可切换厂商与模型（写入 `data/config.json`）。API Key 仅通过 `.env` 配置，不会写入磁盘上的 config 文件。

## 数据备份

所有简历、历史记录与配置位于 `data/`（已加入 `.gitignore`）。备份时复制整个目录即可。

## 安全提示

本应用面向本机或可信内网自托管，**不包含登录与访问控制**。请勿在未加防护的情况下将实例暴露到公网。

## 开发

```bash
npm run lint
npm run build
npm start
```

## License

MIT — 见 [LICENSE](LICENSE)
