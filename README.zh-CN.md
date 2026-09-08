<div align="center">

# 📡 Demand Radar (需求雷达)

### *别再蒙眼写代码，别再问 ChatGPT “给我想个能赚大钱的点子”。*  
**面向独立开发者（Indie Hacker）、一人公司与敏捷团队的开源证据驱动型需求雷达系统。**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JSON Schema: 2020-12](https://img.shields.io/badge/JSON_Schema-2020--12-blue)](schemas/)
[![Platform](https://img.shields.io/badge/Platform-Local_First_%7C_Self_Hosted-green)](guides/)
[![Methodology](https://img.shields.io/badge/Methodology-6--Step_Demand_Loop-purple)](README.zh-CN.md#二完整-6-步需求闭环方法论)
[![Language: English](https://img.shields.io/badge/Language-English-blue)](README.md)

[English](README.md) · [简体中文](README.zh-CN.md) · [在线控制台 (Live)](https://demand-radar-8n8.pages.dev) · [JSON Schemas](schemas/) · [LLM 提示词](prompts/) · [实战模板](templates/) · [实战指南](guides/)

</div>

---

## 🌐 在线可视化控制台 (ThreeUI 极客暗黑风)

Demand Radar 现已提供开箱即用的前端 Web 应用，参考 **ThreeUI** (`https://threeui.com/browse`) 精致暗黑风格构建，全功能适配 **Cloudflare Pages** 免费托管体系：

- **线上演示地址**: [https://demand-radar-8n8.pages.dev](https://demand-radar-8n8.pages.dev)
- **核心特性**:
  - 🎨 **ThreeUI 调色盘引擎**：支持 `Mono`（纯黑灰阶）、`Azure`（赛博蓝）、`Moss`（苔藓绿）、`Amber`（琥珀金）无缝实时换肤。
  - 📡 **Canvas HUD 雷达扫描**：顶部动态雷达扫描动画与实时信号脉冲微动效。
  - 🕸️ **8 维机会雷达图**：高精度 SVG 动态雷达多边形，涵盖痛点烈度、发生频次、绕路成本、付费意愿、跨源复现、竞品缝隙、单人交付性与冷启动获客 8 大维度。
  - 🔴 **一票否决淘汰机制 (Hard Kill Gates)**：对伪需求（付费意愿 < 5、痛点烈度 < 6 等）实时标红淘汰并直击死因。
  - 💬 **妈妈测试 (The Mom Test) 访谈脚本与一键话术**：自动生成 5 阶段无偏见访谈提纲与 Reddit/GitHub 冷启动私信模版。
  - ⚡ **实时信号挖掘器 (Live Scanner)**：基于 Cloudflare Pages Functions 抓取 Reddit 与 Hacker News 实时帖子，结合 AMD Radeon DeepSeek-V4-Flash / Qwen3.8-Flash 或内置启发式分类器自动化挖掘痛点。

```bash
# 本地运行带 Functions 的全栈开发服务
npm run dev

# 一键部署至 Cloudflare Pages 免费版
npm run deploy
```

---

## 一、为什么需要“需求雷达”？

独立开发者最大的死因从来不是代码不够优美、技术选型不够先进，而是——**费尽心力做出了根本没人愿意付费的东西**。

传统验证想法的方式几乎都是致命的假象：
- 去微信群或推特问朋友：“如果我做一个 X 工具，你们会用吗？”（得到的永远是礼貌但毫无意义的虚假赞美）
- 问 ChatGPT：“帮我构思 10 个年入百万的 Micro-SaaS 点子”（得到的是缺乏一手真实摩擦的同质化平庸概念）
- 凭自己的所谓“灵感”闭门造车 4 个月，上线之后无人问津。

**真实且具备付费意愿的需求，永远不在臆想中，而早已散落在各大开发者与用户社区里。人们每天都在发帖宣泄痛苦、咒骂现成工具的低劣、甚至悬赏求购解决方案。**

需求雷达的核心使命，就是用一套工程化、标准化的闭环工具，把这些散落的“抱怨碎片”自动化转化为高可信度的“商业机会卡片”。

```
                     需求雷达 6 步完整闭环工作流
                     
  [ 1. 信号采集 Signal ] ───> [ 2. 痛点抽取 Pain ] ───> [ 3. 交叉验证 Evidence ]
  多渠道无感监听开发者社区      标准化 Pain Card 抽取       跨源复现与竞品最新补丁排查
            │                                                      │
            ▼                                                      ▼
  [ 6. 靶向交付 Build ]  <─── [ 5. 人工验证 Validation ] <─── [ 4. 机会评分 Opportunity ]
  2 周内交付极窄尖刀 MVP       The Mom Test 访谈与烟雾测试     8 维严苛评分与致命红线一票否决
```

---

## 二、完整 6 步需求闭环方法论

### 1. 🔵 信号采集 (Signal)
- **核心逻辑**：在用户最不设防、最真实抱怨的地方持续监听。
- **数据源阵地**：Reddit（`r/devops`、`r/webdev`、`r/SaaS`、`r/ecommerce` 等）、Hacker News（Ask HN）、GitHub Issues / Discussions、X (Twitter)、App Store / Google Play 1–3 星差评、Discord 技术交流群、V2EX。
- **采集原则**：只捕获“正在遭遇具体卡点、在寻求救命稻草”的有机对话，过滤一切软文宣传与营销帖。

### 2. 🟢 痛点抽取 (Pain)
- **核心逻辑**：将非结构化、长篇大论的用户帖子提炼为标准化的原子“痛点卡片” ([`schemas/pain-card.schema.json`](schemas/pain-card.schema.json))。
- **卡片核心字段**：
  - `target_audience`（目标人群）：具体的角色画像、行业垂直领域与团队体量。
  - `scenario`（痛点场景）：问题爆发的精确工作流节点与触发时刻。
  - `friction`（核心阻碍）：系统崩溃、功能缺失或体验极差的具体机制。
  - `current_workaround`（现有土法）：用户在没有专用工具时所用的“胶水脚本”或手动折腾方法。
  - `cost_or_loss`（代价与损失）：量化的工时损耗、直接资金亏损或精神内耗等级。
  - `paying_intent_clues`（付费意愿线索）：用户提及的明确预算、雇佣外包支出或“求付费工具”的原话。
  - `raw_quote`（原始金句）：100% 还原用户未经润色的一手原话，杜绝大模型臆造。

### 3. 🟡 交叉验证 (Evidence)
- **核心逻辑**：单一用户的抱怨可能是特例，必须寻找多重证据链。
- **多源复现**：同一工作流摩擦是否在 Reddit、HN 和 GitHub Issues 至少两处以上被不同用户独立提起？
- **竞品生态缺口排查**：使用 [Rival](https://github.com/tessak22/rival) 或 [competitor-monitor](https://github.com/Keerthivasan-Venkitajalam/competitor-monitor) 检查主流大厂最近的版本更新日志，确认该痛点没有在最新版本中被顺手修复。

### 4. 🟠 机会评分 (Opportunity)
- **核心逻辑**：聚类相近痛点并使用标准 8 维矩阵进行极其刻薄的对抗性评分 ([`schemas/opportunity-score.schema.json`](schemas/opportunity-score.schema.json) & [`prompts/score.md`](prompts/score.md))。
- **8 维评分标准（满分 100）**：
  1. **痛苦强度** (权重 0.15)：是挠痒痒的维生素，还是不得不治的止痛药？
  2. **爆发频率** (权重 0.08)：是一年遇到一次，还是每天、每轮发版都会卡住？
  3. **现有替代方案折腾度** (权重 0.15)：用现成免费工具就能对付，还是需要写几百行脆弱的脚本维护？
  4. **付费意愿与线索** (权重 0.20)：用户是白嫖党，还是已经为现有替代品掏了真金白银？
  5. **跨源复现度** (权重 0.07)：是孤立偶发个案，还是跨平台普遍现象？
  6. **竞争生态缺口** (权重 0.10)：主流巨头是否由于太臃肿或客单价太高而放弃了这个小众工作流？
  7. **个人技术可实现性** (权重 0.10)：单人全栈开发者是否能在 1–3 周内交付可用 MVP？
  8. **冷启动与分发可触达性** (权重 0.15)：目标买家是否聚集在可免费或低成本触达的水草丰茂之地？
- **致命红线（一票否决）**：只要命中“痛苦强度 $< 6$”、“付费意愿 $< 5$”、“单人不可做”或“无法触达买家”，直接打入死牢（Kill），绝不手软。

### 5. 🔴 人工验证 (Validation)
- **核心逻辑**：代码写出之前，必须与活人进行碰撞。
- **《妈妈测试》访谈**：参考 [`templates/mom-test-questions.md`](templates/mom-test-questions.md)，与 5–10 名发帖用户做 15 分钟深度访谈。绝不向对方兜售你的方案，只挖掘对方过去一周的具体行为与真实支出。
- **48 小时烟雾测试**：上线极简 GitHub 演示仓库或落地页，设定硬指标（预购订单、小额押金或测试申请）。未达预期则依照 [`templates/kill-criteria.md`](templates/kill-criteria.md) 立即果断止损。

### 6. 🚀 靶向交付 (Build)
- **核心逻辑**：一把尖刀，直插心脏。
- **范围铁律**：v0.1 版本严禁构建复杂的企业管理后台、多租户权限或花哨的界面；只做一个 10 天内能交付的命令行（CLI）、GitHub Action、Chrome 插件或轻量桌面组件，100% 彻底解决那一个核心痛点。

---

## 🗂 仓库目录与资产导航

```text
demand-radar/
├── schemas/                            # 标准 JSON Schema 定义 (Draft 2020-12)
│   ├── pain-card.schema.json           # 痛点卡片统一数据结构规范
│   └── opportunity-score.schema.json   # 8 维机会评分与红线一票否决规范
│
├── prompts/                            # 开箱即用的工业级 LLM 提示词 (Ollama/Claude/GPT)
│   ├── extract.md                      # 原始非结构化讨论 -> 结构化痛点卡片
│   ├── cluster.md                      # 多卡片语义聚类与核心机制去重
│   └── score.md                        # 严苛客观的 8 维自动化评分与一票否决
│
├── templates/                          # 独立开发者实战决策模版
│   ├── mom-test-questions.md           # 《妈妈测试》客户挖掘访谈脚本与话术库
│   ├── opportunity-brief.md            # 1 页纸商业机会立项决策备忘录
│   └── kill-criteria.md                # 10 大致命红线预警与杀项目清单
│
├── guides/                             # 落地工程实操指南
│   ├── tool-stack.md                   # 20+ 个开源项目全景图谱与生态组装指南
│   ├── zero-cost-setup.md              # 个人本机零成本方案 (免费 API + Ollama + Obsidian)
│   └── self-hosted-radar.md            # VPS 7x24 小时无人值守部署 (n8n + Telegram/Slack 告警)
│
├── examples/                           # 真实脱敏示范案例库
│   ├── sample-pain-cards/              # B2B、DevTools、创作者痛点卡片范例
│   ├── sample-opportunity-scores/      # 82.6 分极佳机会 vs 57.5 分放弃机会对比
│   └── sample-opportunity-briefs/      # 完整 1 页纸立项 Memo 实录
│
├── scripts/
│   └── validate.js                     # 零外部重依赖的 Schema 与范例校验脚本
├── package.json
└── LICENSE                             # 宽松的 MIT 开源许可证
```

---

## 🛠 开源生态精选与装配推荐

开源社区在 2024–2026 年间涌现了大量细分工具。通过组合积木，你可以迅速拼装出完整的雷达能力（详见 [`guides/tool-stack.md`](guides/tool-stack.md)）：

| 环节 | 推荐开源项目 | 许可 | 核心亮点 |
| :--- | :--- | :---: | :--- |
| **信号采集** | **[Harken](https://github.com/VladUZH/harken)** | MIT | 多源支持，开箱即用，本地 SQLite 存储，极低资源占用。 |
| **即时查询** | **[reddit-research-mcp](https://github.com/dialog-tools/reddit-research-mcp)** | MIT | 专为 Claude Code / Cursor 设计的 MCP 协议，支持 20,000+ 子版块语义查询。 |
| **痛点挖掘** | **[pain-discovery](https://github.com/albertorsesc/pain-discovery)** | Open | Cron 定时任务 + 游标增量追踪 + Ollama 本地模型提取，流程覆盖率达 85%。 |
| **对抗验证** | **[crowdmind](https://github.com/yasintoy/crowdmind)** | MIT | 引入 4 大 AI 角色（怀疑论者、企业买家、省钱开发者、超级用户）进行红队压力测试。 |
| **竞品雷达** | **[Rival](https://github.com/tessak22/rival)** | MIT | Next.js 仪表盘 + 竞品定价与更新日志自动抓取。 |
| **落地闭环** | **Demand Radar Templates** | MIT | 严谨的访谈话术与红线清单，保障人作为最终决策裁判。 |

---

## ⚡ 极速开始

### 方案一：个人本机零成本启动（推荐）
1. 安装 [Ollama](https://ollama.ai) 并拉取中文支持与 JSON 结构化能力优异的 `qwen2.5:7b-instruct`：
   ```bash
   brew install ollama
   ollama pull qwen2.5:7b-instruct
   ```
2. 克隆本仓库：
   ```bash
   git clone https://github.com/ggxx39/demand-radar.git
   cd demand-radar
   ```
3. 运行本地 Schema 校验套件，确认运行环境完备：
   ```bash
   npm test
   ```
4. 按照 [`guides/zero-cost-setup.md`](guides/zero-cost-setup.md) 指引，配置免费的 Reddit/HN 脚本并将数据同步到 Obsidian 知识库。

### 方案二：云端 VPS 7×24 小时无人值守部署
参考 [`guides/self-hosted-radar.md`](guides/self-hosted-radar.md)，通过 Docker Compose 启动定时采集管道，当检测到综合评分 $\ge 75$ 的高价值机会时，自动向你的 Telegram 或企业微信群推送即时告警。

---

## 🤝 参与贡献

欢迎社区共同完善需求雷达！你可以通过以下方式参与：
- 提交脱敏后的真实高质量痛点卡片到 `examples/sample-pain-cards/`。
- 优化 `prompts/` 下的大模型防幻觉与去偏见提取提示词。
- 向 `guides/tool-stack.md` 推荐并补充最新的优质开源数据采集工具。

在提交 Pull Request 前，请务必执行本地校验确保格式无误：
```bash
npm run validate
```

---

## 📄 许可协议

本项目采用 [MIT License](LICENSE)。版权所有 (c) 2026 [ggxx39](https://github.com/ggxx39)。可自由用于个人学习、开源研发与商业化市场洞察。
