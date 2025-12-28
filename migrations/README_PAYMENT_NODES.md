# Payment Nodes 数据库迁移说明

## 错误信息
如果看到以下错误：
```
{"error":"Could not find the table 'public.payment_nodes' in the schema cache"}
```

这表示 `payment_nodes` 表还没有在 Supabase 数据库中创建。

## 解决步骤

### 1. 登录 Supabase Dashboard
- 访问 https://supabase.com/dashboard
- 选择你的项目

### 2. 打开 SQL Editor
- 在左侧菜单中，点击 "SQL Editor"
- 点击 "New query" 创建新查询

### 3. 运行迁移脚本
- 复制 `migrations/create_payment_nodes_table.sql` 文件的全部内容
- 粘贴到 SQL Editor 中
- 点击 "Run" 按钮执行

### 4. 验证表已创建
运行以下查询确认表已创建：
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'payment_nodes';
```

如果返回一行结果，说明表已成功创建。

### 5. 刷新应用
- 刷新浏览器页面
- 错误应该消失，Payment Nodes 功能应该可以正常使用

## 迁移文件内容
迁移文件位置：`migrations/create_payment_nodes_table.sql`

这个迁移会：
- 创建 `payment_nodes` 表
- 添加必要的索引
- 设置 Row Level Security (RLS) 策略
- 允许管理员用户进行所有操作

## 注意事项
- 这个迁移是安全的，不会删除或修改现有数据
- 如果表已存在，`CREATE TABLE IF NOT EXISTS` 会跳过创建
- 所有索引和策略都使用 `IF NOT EXISTS`，可以安全地重复运行

