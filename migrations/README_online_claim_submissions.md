# Online Claim Submissions – 必须执行的迁移

如果 App 提交报销时报错 **"Could not find the table 'public.online_claim_submissions' in the schema cache"**，说明数据库里还没有这张表，需要先执行迁移。

## 步骤

1. 打开 **Supabase Dashboard** → 你的项目 → **SQL Editor**。
2. 新建 Query，按下面顺序**复制粘贴并执行**（一次执行一整段即可）：

### 1) 创建表与 RLS

打开本目录下的 `create_online_claim_submissions_table.sql`，复制全部内容到 SQL Editor，点击 **Run**。

### 2) 存储策略（允许孕妈上传报销图片）

打开本目录下的 `online_claim_submissions_storage_policy.sql`，复制全部内容到 SQL Editor，点击 **Run**。

3. 执行成功后，在 **Table Editor** 里应能看到表 `online_claim_submissions`。
4. 回到 App 再次尝试提交报销；若仍有问题，可刷新 Supabase 项目或等待几秒让 schema 缓存更新。

## 依赖

- `create_online_claim_submissions_table.sql` 依赖表 `surrogate_matches` 已存在；若项目已有 Matches 功能，通常已存在。
- 存储策略依赖 bucket `documents` 已存在；若 Admin 已上传过文档，该 bucket 通常已存在。
