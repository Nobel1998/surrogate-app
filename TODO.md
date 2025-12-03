# 代孕APP 开发任务清单

## 客户需求 (2025-11-22)

### 1. 注册界面字段修改 (RegisterScreen.js)
- [x] Date of Birth 字段格式改为 mm/dd/year 格式
- [x] Address 字段名称改为 Location
- [x] Emergency Contact 字段改为 Race
- [x] 更新表单验证逻辑

### 2. 取消原有Event界面
- [x] 移除或重构原有的管理员后台发布Event的界面 (改为展示界面)
- [x] 确认并备份相关代码（如需保留）

### 3. Register功能重新定义
- [x] 将登录流程中的Register功能改为APPLY（申请做代母）
- [x] 更新按钮文字和界面标签
- [x] 确保APPLY功能链接到代母申请表单（SurrogateApplicationScreen）
- [x] 移除重复的注册功能

### 4. EVENT功能重新定义
- [x] 重新设计EventScreen，改为显示管理员后台发布的公司活动
- [x] 实现EVENT列表展示界面
- [x] 确保会员可以浏览所有公司events
- [x] 与管理员后台的event发布功能对接 (目前使用Mock数据，待对接)

### 5. 实现游客模式和访问权限控制
- [x] 修改APP启动逻辑，未登录用户默认显示EVENT页面
- [x] 实现游客模式：
  - [x] 游客只能浏览EVENT页面
  - [x] 隐藏其他导航选项（Profile、Benefits、Protection等）
  - [x] 在EVENT页面提供"注册"入口
- [x] 实现登录后的完整访问权限：
  - [x] 注册/登录后显示完整导航菜单
  - [x] 允许访问所有会员功能
- [x] 更新导航逻辑（App.js 或导航配置）
- [x] 添加权限检查中间件/HOC

### 6. 测试和验证
- [x] 测试游客模式下的EVENT浏览功能
- [x] 测试注册流程的字段修改
- [x] 测试APPLY功能的跳转和数据提交
- [x] 测试登录后的权限控制
- [x] 测试管理员发布EVENT的功能
- [x] 进行端到端测试

---

## 已有待修复的问题
- [x] [Bug] Fix duplicate email registration issue (Low Priority) - ✅ 修复完成

---

## 新增需求 (2025-11-29)

### 7. 代母帖子云端同步
- [x] 将代母发的帖子上传到云端数据库（Supabase）
  - [x] 在 Supabase 创建 `posts` 表结构 (supabase_posts_setup.sql)
  - [x] 实现帖子创建时上传到云端
  - [x] 实现帖子的云端读取和同步
  - [x] 实现评论数据的云端存储
  - [x] 实现点赞数据的云端存储
  - [x] 确保多设备数据同步（下拉刷新功能）
  - [x] 添加加载状态和错误处理

---

## 实现优先级
1. **高优先级**：游客模式和访问权限控制（需求5） - ✅ 已完成
2. **高优先级**：Register改为APPLY功能（需求3） - ✅ 已完成
3. **中优先级**：注册界面字段修改（需求1） - ✅ 已完成
4. **中优先级**：EVENT功能重新定义（需求4） - ✅ 已完成
5. **低优先级**：取消原有Event界面（需求2） - ✅ 已完成

---

## 技术实现要点

### 游客模式实现方案
1. 在 `AuthContext.js` 中添加游客状态管理
2. 修改 `App.js` 的路由逻辑，未登录时只显示EVENT和登录/注册入口
3. 在各个Screen中添加权限检查

### 字段修改涉及文件
- `src/screens/RegisterScreen.js` - 前端表单
- `lib/supabase.js` - 数据库操作
- Supabase 数据库表结构（可能需要migration）

### EVENT功能涉及文件
- `src/screens/EventScreen.js` - 前端展示
- `admin-dashboard/` - 后台管理
- Supabase events 表结构

---

## 注意事项
- ⚠️ 修改数据库字段前请先备份数据
- ⚠️ 确保所有字段修改在前后端保持一致
- ⚠️ 游客模式需要仔细测试权限控制，防止未授权访问
- ⚠️ APPLY功能需要与现有的代母申请流程整合
