# Phase 1: Home / Dashboard 重构开发清单

基于最终版 UI 重构蓝图，Phase 1 只做 **Home（首页）** 升级为 **Style A: Modern Travel Dashboard**，并引入可复用的 **Dashboard 设计 token**，为后续 Plan / Save 页打基础。

---

## 一、目标与范围

- **目标**：首页第一眼像成熟产品，有 Hero、卡片网格、明确行动入口；摆脱“表单堆叠”感。
- **范围**：仅 `Home` 页 + 新增/拆分的 Home 相关组件 + 全局 Dashboard 用到的 CSS 变量。不改 Itinerary / Saved / Group / Me 页面逻辑。
- **保留**：现有 share/invite URL 处理、replaceItineraryState、Redirect 逻辑全部保留。

---

## 二、设计系统补充（全局）

| 项目 | 说明 | 文件 |
|------|------|------|
| Hero 渐变 | 新增 `--hero-gradient`（light/dark 各一套） | `index.css` 或 `App.css` |
| 卡片圆角 | 大卡片用 `--card-radius-lg: 16px` | `index.css` |
| Dashboard 间距 | `--dashboard-gap` | `Home.css` |

（可选）现有 `--pastel-*`、`--shadow-*` 已够用，Phase 1 可只加 Hero 相关变量。

---

## 三、新增组件

| 组件 | 职责 | 依赖 |
|------|------|------|
| **SmartPasteBar** | 顶部“粘贴链接”输入框 + 按钮，提交后跳转 `/saved` 并传入 `state.pasteUrl` | useNavigate, useLanguage |
| **DashboardHero** | 行程名、日期、目的地、天气占位、“Continue planning”按钮 | trip, Link, useLanguage |
| **TodayAgendaCard** | 今日/第一天行程摘要，最多 3 条，链接到 `/itinerary` | days, trip, formatHour, useLanguage |
| **UnplannedSavesCard** | 展示前 N 个 savedPlaces，每项可点“Plan it”跳转 `/saved` 或加进某天 | savedPlaces, useLanguage, Link |
| **BudgetSnapshotCard** | 花费摘要（总支出/笔数），链接到 `/cost` | useCost (expenses), useLanguage, Link |
| **DashboardCard** | 通用外壳：标题 + children + 可选“查看全部”链接 | 无 |

现有 **TripmatesBoard**、**ActivityFeed** 不删除，在 Home 中放入 **DashboardCard** 包裹，视觉统一为“卡片”。

---

## 四、修改的页面与文件

| 文件 | 修改内容 |
|------|----------|
| **Home.jsx** | 结构调整为：Hero + SmartPasteBar；下方网格：TodayAgendaCard, UnplannedSavesCard, BudgetSnapshotCard, TripmatesBoard(wrapped), RecentActivity(ActivityFeed wrapped), LeaveSharedTripButton。保留所有 useEffects（share/invite）。 |
| **Home.css** | 重写/扩展：`.home-dashboard` 网格、`.dashboard-hero`、`.dashboard-card`、响应式（手机单列，桌面两列）。 |
| **SavedPlaces.jsx** | 可选：若 `location.state.pasteUrl` 存在，则把 PlaceLinkInput 的 embed 预填为 pasteUrl（Phase 1 可做可不做）。 |

---

## 五、数据与路由

- **TodayAgendaCard**：取 `days[0]` 的 timeline（或“今天”对应 day），前 3 条。无数据时显示“去安排行程” CTA。
- **UnplannedSavesCard**：`savedPlaces.slice(0, 6)`，仅展示；“Plan it” 链到 `/saved`。
- **BudgetSnapshotCard**：`useCost().expenses` 求和 + 笔数，无数据时“去记一笔”。
- **SmartPasteBar**：`navigate('/saved', { state: { pasteUrl: value } })`。

---

## 六、i18n 新增 key

- `home.hero.continuePlanning` / `home.hero.continuePlanning`（中文同）
- `home.paste.placeholder` / `home.paste.button`
- `home.today.title` / `home.today.empty` / `home.today.viewAll`
- `home.unplanned.title` / `home.unplanned.planIt` / `home.unplanned.viewAll`
- `home.budget.title` / `home.budget.viewAll` / `home.budget.empty`
- `home.tripmates.title`（若用统一 card 标题）
- `home.activity.title`（若用统一 card 标题）

（与现有 `home.*`、`summary.*` 等不冲突。）

---

## 七、验收标准

- [x] 进入首页看到 Hero（行程名 + 日期 + 目的地）+ “Continue planning” + Smart paste 条。
- [x] 下方为卡片网格：今日摘要、未安排收藏、预算摘要、旅伴、最近动态；布局在桌面为两列，手机为单列。
- [x] 粘贴链接并点击保存后，跳转到 `/saved` 且（若实现）预填 pasteUrl。
- [x] 现有行为不变：带 `?trip=` / `?invite=` 的 URL 仍正确加载协作行程；无行程时仍重定向到 `/create`。
- [x] Light/Dark（含现有 doodle 等）主题下，新模块均使用 CSS 变量，无硬编码色值。

---

## 八、后续 Phase 2 会用到

- Dashboard 的 `--card-radius-lg`、`.dashboard-card` 可在 Plan 页复用。
- SmartPasteBar 的“识别来源”可扩展到 Instagram / 小红书 / Blog 的解析（Phase 2/3）。
