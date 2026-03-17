# 分享链接写入 Supabase 返回 400

## 代码侧（已改）

不再使用 PostgREST 的 `upsert?on_conflict=id`（部分环境下会 **400 Bad Request**），改为：

1. `SELECT` 是否已有该行  
2. 有则 `UPDATE`，无则 `INSERT`（仅 `id` + `data`，`updated_at` 由库默认）

并对 `data` 做 **JSON 序列化清洗**（去掉 JSONB 不接受的 `\u0000` 等）。

部署新版本后再试「生成分享链接」。

## 若仍失败：在 Supabase 自检

在 **SQL Editor** 执行：

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'shared_itineraries';
```

期望至少：`id` = **text**，`data` = **jsonb**。  
若 `id` 是 **uuid**，与当前应用不兼容，需按 `supabase-tables.sql` 用 **text** 主键重建该表（或新建项目）。

再执行（把 `你的tripId` 换成链接里 `trip=` 的值，前 14 位即可测）：

```sql
INSERT INTO public.shared_itineraries (id, data) VALUES ('test_manual_row', '{}'::jsonb);
```

若这里也报错，把报错原文记下，对照 [Supabase 文档](https://supabase.com/docs) 排查表结构/权限。
