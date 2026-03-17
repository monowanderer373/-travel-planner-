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

## 关于网址

`https://xxx.github.io/-travel-planner-/itinerary` 对所有人相同，只是「行程页」路由；**数据不按 URL 区分**，而是按 **Google 账号**（个人）或 **`?trip=` 行程 id**（共享）。
