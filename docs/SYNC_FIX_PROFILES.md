# 为什么手机与电脑不同步 / shared_itineraries 为空

## 已修复的问题（外键）

`itineraries` 表的 `profile_id` 必须对应 `profiles` 表里已有的一行。  
若在你**第一次用 Google 登录后**立刻保存行程，有时 **`profiles` 还没写入完成**，向 `itineraries` 插入就会失败（违反外键），错误又被代码静默忽略，结果：

- Supabase 里 **`itineraries` 可能一直是空的**（或从未更新）
- **`shared_itineraries` 为空**是正常的，除非你点了「旅伴 → 生成分享链接」——个人行程只写在 `itineraries`

修复后，每次写入 `itineraries` 前会先 **确保 `profiles` 存在**；登录时也会先 **upsert profile** 再进入应用状态。

## 部署后请你自测

1. 电脑：用 Google 登录 → 随便改一下行程（触发保存）→ 在 Supabase **Table Editor → itineraries** 是否出现一行。
2. 手机：**同一 Google 账号**登录同一网站 → 应能加载同一行程。
3. 与好友协作：在应用里生成 **带 `?trip=...` 的旅伴链接** → 数据会出现在 **shared_itineraries**。

## 手机与电脑不同步（已修复）

从 **`itineraries` 读出的 JSON** 里若仍带有旧的 **`shareSettings.tripId`**，应用会立刻再去拉 **`shared_itineraries`**，用空或旧数据**覆盖**刚加载的个人行程，手机上就像「永远不同步」。  
修复后：个人云数据会 **强制去掉 tripId 再写入界面**，且保存到 **`itineraries` 时不再把 tripId 写进 JSON**。离开页面超过约 12 秒再回来时，会自动重新拉一次个人行程。

## 僵尸 tripId（已修复）

若你曾点过「旅伴 / 生成链接」，浏览器会记住一个 `tripId`。若云端 **没有** 对应的 `shared_itineraries` 行（链接过期、删库、或从未成功写入），旧逻辑会 **既不写 shared 也不写 itineraries**，看起来像「完全不能同步」。  
新版本会在检测到这种情况时 **自动去掉无效 tripId**，并保留你当前页面上的数据，让下一次保存写入 **`itineraries`**。

## 点了「生成分享链接」但 shared_itineraries 仍是空的（已修复）

旧逻辑用 `decodeInviteToken` 处理 `tripId`，会把类似 `eyJ0cmlwIjoxNz` 的片段误当成 Base64 JSON，解析成数字 id（如 `"17"`），**写入数据库的 id 与链接里 `?trip=` 不一致**，甚至写入失败，表里看起来像「从没成功过」。  
现在：**行 id 固定为 14 位不透明字符串**（与链接完全一致），并 **await upsert**；弹窗会提示「已写入云端」或「未配置 Supabase / 写入失败」。

## 好友打开旅伴链接却是空白页（已修复）

- **个人行程**在表 **`itineraries`**（按 Google 账号）。**旅伴链接**读的是 **`shared_itineraries`**，不是 `itineraries`。好友登录后若仍空白，多半是 **`shared_itineraries` 里没有对应 `trip` id 那一行**（或链接里的 id 被聊天软件截断）。
- Google 登录会回到站点根路径，**不带 `?trip=`**；旧逻辑只靠地址栏，好友会当成「个人行程」加载，看不到共享数据。现在会用 **`pending_trip_id` + 路由上的 `trip`** 一起去拉 **`shared_itineraries`**；登录回调 URL 也会尽量带上 `?trip=`。
- 若登录时报 **redirect_uri 错误**：到 Supabase → **Authentication → URL Configuration**，在 **Redirect URLs** 增加一条通配，例如：  
  `https://monowanderer373.github.io/-travel-planner-/**`  
  （把域名换成你的站点。）

## 关于网址

`https://xxx.github.io/-travel-planner-/itinerary` 对所有人相同，只是「行程页」路由；**数据不按 URL 区分**，而是按 **Google 账号**（个人）或 **`?trip=` 行程 id**（共享）。
