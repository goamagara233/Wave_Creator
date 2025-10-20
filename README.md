# 🎮 Wave Creator - 游戏波次编辑器

一个专为游戏刷怪系统设计的可视化波次编辑器，可以通过时间轴方式创建和编辑敌人生成事件。

## ✨ 功能特性

### 🎯 核心功能
- **多轨道时间轴编辑** - 支持多个轨道同时编辑，组织不同类型的敌人生成
- **可视化事件管理** - 直观的图形界面，拖拽移动事件点
- **敌人类型系统** - 自定义敌人类型，包括属性（生命、速度、攻击力）
- **智能对齐** - 网格对齐功能，确保事件精确放置
- **缩放和平移** - 鼠标滚轮缩放，拖动平移视图

### 👾 敌人生成系统
- **预设敌人类型**：
  - 👾 基础敌人
  - ⚡ 快速敌人
  - 🛡️ 坦克敌人
  - 👹 精英敌人
  - 💀 Boss

- **自定义敌人** - 添加自己的敌人类型，包含：
  - 唯一ID（内部标识符）
  - 显示名称
  - 图标（Emoji）
  - Godot场景路径（如：`res://scenes/enemies/Enemy.tscn`）
  - Godot资源UID（如：`uid://30ktq4nfbdpc`）

- **烘焙验证** - 导出时自动检查Godot资源配置完整性

### 📤 导出功能
- **波次配置导出** - 导出为JSON格式，包含所有生成事件和敌人数据
- **波次统计** - 查看波次的详细统计信息（总敌人数、事件数等）

## 🚀 快速开始

### 1. 打开编辑器
直接在浏览器中打开 `index.html` 文件即可使用。

### 2. 基本操作

#### 添加轨道
- 点击左上角 **"➕ 添加轨道"** 按钮
- 每个轨道可以独立管理一系列事件

#### 添加敌人生成事件
- **右键点击** 轨道上的任意位置
- 会自动创建一个敌人生成事件（默认基础敌人）
- 点击事件点可以编辑详细信息

#### 编辑事件
在右侧编辑面板中可以设置：
- **敌人类型** - 选择要生成的敌人
- **生成数量** - 一次生成多少个敌人
- **生成位置** - 随机、左侧、右侧、顶部、底部、中心
- **编队类型** - 单个、直线、圆形、网格

#### 移动事件
- **拖拽** 事件点可以改变触发时间
- 开启"🧲 对齐刻度"后会自动对齐到时间网格

### 3. 管理敌人类型

点击 **"👾 管理敌人"** 按钮：
- 查看所有已定义的敌人类型及其配置状态
- 添加自定义敌人：
  - **ID**：唯一标识符（如：`chaser_enemy`）
  - **名称**：显示名称（如：追击者）
  - **图标**：Emoji图标（可选）
  - **场景路径**：Godot场景路径（烘焙时需要）
  - **UID**：Godot资源UID（烘焙时需要）
- 编辑现有敌人类型（点击✏️按钮）
- 删除不需要的敌人类型
- 查看配置状态：✅完整配置 / ⚠️需要补充

### 4. 导出波次配置

点击 **"📤 导出配置"** 按钮：
- 自动验证所有敌人的Godot资源配置
- 如有缺失会显示警告（可选择继续导出）
- 生成包含所有敌人和事件的JSON文件
- 包含完整的Godot资源路径，可直接在游戏中使用

### 5. 查看统计

点击 **"📊 波次统计"** 按钮：
- 查看波次总时长
- 生成事件数量
- 敌人总数和分布情况

## 📊 导出的数据格式

```json
{
  "waveName": "未命名时间轴",
  "duration": 60,
  "enemies": [
    {
      "id": "chaser_enemy",
      "name": "追击者",
      "icon": "👾",
      "scenePath": "res://scenes/enemies/ChaserEnemy.tscn",
      "uid": "uid://30ktq4nfbdpc"
    }
  ],
  "spawnEvents": [
    {
      "time": 5.0,
      "enemyId": "chaser_enemy",
      "enemyName": "追击者",
      "count": 3,
      "spawnPosition": "left",
      "formationType": "line",
      "scenePath": "res://scenes/enemies/ChaserEnemy.tscn",
      "uid": "uid://30ktq4nfbdpc",
      "trackName": "轨道 1"
    }
  ]
}
```

## 🎮 Godot引擎集成

导出的JSON文件可以在Godot中这样使用：

```gdscript
# 加载波次配置
func load_wave_config(config_path: String):
    var file = FileAccess.open(config_path, FileAccess.READ)
    var json = JSON.parse_string(file.get_as_text())
    file.close()
    return json

# 执行波次
func start_wave(config_path: String):
    var wave_data = load_wave_config(config_path)
    
    # 预加载所有敌人场景
    var enemy_scenes = {}
    for enemy in wave_data.enemies:
        if enemy.scenePath:
            enemy_scenes[enemy.id] = load(enemy.scenePath)
    
    # 按时间生成敌人
    for event in wave_data.spawnEvents:
        await get_tree().create_timer(event.time).timeout
        
        var enemy_scene = enemy_scenes.get(event.enemyId)
        if enemy_scene:
            spawn_enemies(enemy_scene, event.count, event.spawnPosition, event.formationType)

func spawn_enemies(scene: PackedScene, count: int, position: String, formation: String):
    for i in range(count):
        var enemy = scene.instantiate()
        # 根据position和formation设置生成位置
        var spawn_pos = calculate_spawn_position(position, formation, i, count)
        enemy.global_position = spawn_pos
        add_child(enemy)
```

## ⌨️ 快捷键

- **Delete** - 删除选中的事件
- **鼠标滚轮** - 缩放时间轴
- **左键拖拽** - 平移视图
- **右键点击轨道** - 添加敌人生成事件

## 🎨 界面说明

### 头部工具栏
- 添加轨道、导出配置、管理敌人等功能按钮
- 设置波次总时长
- 对齐开关和缩放显示

### 左侧轨道列表
- 显示所有轨道
- 显示每个轨道的事件数量
- 双击名称可以重命名
- 🗑️ 按钮删除轨道

### 中间时间轴区域
- 顶部显示时间刻度
- 事件点显示敌人图标和生成数量
- 拖拽事件点调整时间

### 右侧编辑面板
- 编辑选中事件的详细信息
- 实时预览敌人属性

## 💡 使用技巧

1. **规划波次结构** - 使用多个轨道来组织不同阶段的敌人生成
2. **合理使用对齐** - 开启对齐功能可以让事件更整齐
3. **预览统计信息** - 导出前先查看统计，确保波次难度合适
4. **自定义敌人** - 根据游戏需求添加特定的敌人类型
5. **编队系统** - 利用不同编队类型创造多样的生成模式

## 📝 注意事项

- 事件时间从0秒开始，不能超过设定的总时长
- 删除敌人类型前，确保没有事件正在使用该类型
- 敌人ID必须唯一，使用小写英文字母和下划线
- **Godot资源信息**可以先留空，后续在"管理敌人"中编辑补充
- 导出时会提示缺失的Godot资源信息，建议补全后再导出
- 场景路径格式：`res://scenes/enemies/EnemyName.tscn`
- UID格式：`uid://` 开头的唯一标识符（可在Godot编辑器中查看）

## 🔧 扩展性

这个编辑器设计为可扩展的：
- 可以添加更多事件类型（不只是敌人生成）
- 可以扩展敌人属性（添加更多自定义字段）
- 可以集成到更大的关卡编辑器中

## 📄 许可证

此项目为开源项目，可自由使用和修改。

---

**祝你设计出精彩的游戏波次！** 🎮✨
