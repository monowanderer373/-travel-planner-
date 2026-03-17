-- 协作者（被邀请用户）编辑后刷新又变回创建者版本？
-- 常见原因：trip_activities 允许插入（所以「行程动态」有记录），但 shared_itineraries 的 UPDATE 被 RLS 拦住（写入失败）。
-- 在 Supabase → SQL Editor 中执行下面语句，确保「任意已登录用户」可读写协作行。

-- 查看现有策略（可选）
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'shared_itineraries';

ALTER TABLE public.shared_itineraries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for shared_itineraries" ON public.shared_itineraries;
DROP POLICY IF EXISTS "shared_itineraries_authenticated_all" ON public.shared_itineraries;
DROP POLICY IF EXISTS "shared_read_authenticated" ON public.shared_itineraries;
DROP POLICY IF EXISTS "shared_write_authenticated" ON public.shared_itineraries;

-- 已登录用户：可读、可写、可更新任意协作行程行（同一 trip id 多人协作）
CREATE POLICY "shared_itineraries_select_auth"
  ON public.shared_itineraries FOR SELECT TO authenticated USING (true);

CREATE POLICY "shared_itineraries_insert_auth"
  ON public.shared_itineraries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "shared_itineraries_update_auth"
  ON public.shared_itineraries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 若希望未登录也能打开链接只读（可选，按需取消注释）
-- CREATE POLICY "shared_itineraries_select_anon"
--   ON public.shared_itineraries FOR SELECT TO anon USING (true);
