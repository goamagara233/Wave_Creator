# 🔧 图标显示优化修复

## 问题描述

选择框中显示base64图片数据，导致界面显示混乱：
```
data:image/png;base64,iVBORw0KGgo... [很长的字符串]
```

## 解决方案

### 1️⃣ 移除预设敌人的默认图标

将所有预设敌人的图标设置为空字符串，让系统使用统一的默认图标👾：

```javascript
// 之前
this.register('basic_enemy', {
    name: '基础敌人',
    icon: '👾',  // 不同的emoji
    // ...
});

// 现在
this.register('basic_enemy', {
    name: '基础敌人',
    icon: '',    // 空字符串，使用默认
    // ...
});
```

### 2️⃣ 添加选择框专用渲染方法

新增 `renderEnemySelectText()` 方法，专门处理选择框中的显示：

```javascript
renderEnemySelectText(icon, name) {
    if (!icon || icon === '👾' || icon.startsWith('data:image')) {
        if (icon && icon.startsWith('data:image')) {
            return `[图片] ${name}`;  // 图片显示为 [图片] 前缀
        }
        return name;  // 默认图标只显示名称
    }
    return `${icon} ${name}`;  // 自定义Emoji显示emoji + 名称
}
```

### 3️⃣ 更新选择框使用新方法

```javascript
// 之前
<option>${e.icon} ${e.name}</option>

// 现在
<option>${this.renderEnemySelectText(e.icon, e.name)}</option>
```

## 显示效果

### 选择框中的显示

| 图标类型 | 选择框显示 |
|---------|----------|
| 无图标 | `基础敌人` |
| 默认👾 | `基础敌人` |
| 自定义Emoji🔥 | `🔥 火焰恶魔` |
| 上传图片 | `[图片] 龙Boss` |

### 其他位置的显示

- **敌人卡片**：显示完整图标（图片或emoji）
- **事件编辑器**：显示完整图标
- **时间轴事件点**：显示完整图标

## 优势

✅ **选择框清爽**：不再显示长长的base64字符串
✅ **图片有标识**：[图片]前缀让用户知道这是图片图标
✅ **Emoji正常显示**：自定义emoji仍然正常显示
✅ **统一默认值**：所有未设置图标的敌人使用统一的👾
✅ **宁缺毋滥**：预设敌人不带图标，鼓励用户自定义

## 使用建议

### 添加新敌人
1. **不设置图标** → 使用默认👾
2. **输入Emoji** → 显示为 "🔥 名称"
3. **上传图片** → 显示为 "[图片] 名称"

### 最佳实践
- 简单敌人可以不设置图标
- 需要区分的敌人使用Emoji
- 重要的Boss使用专门的图片

---

**修复时间**: 2025-10-19
**影响范围**: 敌人类型选择框、默认敌人定义
