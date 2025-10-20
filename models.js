/**
 * 数据模型定义
 * 可扩展的事件系统，支持自定义事件类型
 */

// 敌人类型定义注册表
class EnemyTypeRegistry {
    constructor() {
        this.enemies = new Map();
        this.registerDefaultEnemies();
    }

    // 注册默认敌人类型（现在为空，用户自行添加）
    registerDefaultEnemies() {
        // 不再注册预设敌人，用户可以自行添加
        // 尝试从localStorage加载已保存的敌人数据
        this.loadFromStorage();
    }

    // 从localStorage加载敌人数据
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('wave_creator_enemies');
            if (saved) {
                const enemies = JSON.parse(saved);
                enemies.forEach(enemy => {
                    // 直接设置，不触发保存
                    this.enemies.set(enemy.id, enemy);
                });
            }
        } catch (error) {
            console.error('加载敌人数据失败:', error);
        }
    }

    // 保存到localStorage
    saveToStorage() {
        try {
            const enemies = this.getAll();
            localStorage.setItem('wave_creator_enemies', JSON.stringify(enemies));
        } catch (error) {
            console.error('保存敌人数据失败:', error);
        }
    }

    // 注册新的敌人类型
    register(id, config) {
        this.enemies.set(id, {
            id,
            name: config.name || id,
            icon: config.icon || '👾',
            scenePath: config.scenePath || '',
            uid: config.uid || '',
        });
        // 每次注册后自动保存
        this.saveToStorage();
    }

    // 获取敌人类型
    get(id) {
        // 如果指定ID存在，返回它
        if (this.enemies.has(id)) {
            return this.enemies.get(id);
        }
        // 否则返回第一个可用的敌人，如果没有敌人则返回null
        const firstEnemy = this.enemies.values().next().value;
        return firstEnemy || null;
    }

    // 获取所有敌人类型
    getAll() {
        return Array.from(this.enemies.values());
    }

    // 删除敌人类型
    remove(id) {
        if (this.enemies.has(id)) {
            this.enemies.delete(id);
            this.saveToStorage(); // 删除后保存
            return true;
        }
        return false;
    }

    // 检查敌人是否配置完整（用于烘焙时验证）
    validate(id) {
        const enemy = this.get(id);
        const warnings = [];
        
        if (!enemy.scenePath) {
            warnings.push(`敌人 "${enemy.name}" (${id}) 缺少场景路径 (scenePath)`);
        }
        if (!enemy.uid) {
            warnings.push(`敌人 "${enemy.name}" (${id}) 缺少资源UID (uid)`);
        }
        
        return {
            valid: warnings.length === 0,
            warnings
        };
    }

    // 验证所有敌人配置
    validateAll() {
        const allWarnings = [];
        this.enemies.forEach((enemy, id) => {
            const result = this.validate(id);
            if (!result.valid) {
                allWarnings.push(...result.warnings);
            }
        });
        return {
            valid: allWarnings.length === 0,
            warnings: allWarnings
        };
    }
}

// 全局敌人类型注册表实例
const enemyTypeRegistry = new EnemyTypeRegistry();

// 事件类型注册表
class EventTypeRegistry {
    constructor() {
        this.types = new Map();
        this.registerDefaultTypes();
    }

    // 注册默认事件类型
    registerDefaultTypes() {
        this.register('spawn_enemy', {
            name: '生成敌人',
            color: '#e74c3c',
            icon: '👾',
            fields: {
                enemyType: 'basic_enemy',  // 敌人ID
                count: 1,                   // 生成数量
                spawnPosition: 'random',    // 生成位置: random, left, right, top, bottom, center
                formationType: 'single',    // 编队: single, line, circle, grid
            }
        });

        this.register('marker', {
            name: '标记点',
            color: '#95a5a6',
            icon: '🚩',
            fields: {
                label: '',
                note: '',
            }
        });
    }

    // 注册新的事件类型
    register(id, config) {
        this.types.set(id, config);
    }

    // 获取事件类型
    get(id) {
        return this.types.get(id) || this.types.get('default');
    }

    // 获取所有事件类型
    getAll() {
        return Array.from(this.types.entries()).map(([id, config]) => ({
            id,
            ...config
        }));
    }
}

// 全局事件类型注册表实例
const eventTypeRegistry = new EventTypeRegistry();

// 事件基类
class TimelineEvent {
    constructor(time, type = 'default', customData = {}) {
        this.id = this.generateId();
        this.time = time; // 触发时间点（秒）
        this.type = type; // 事件类型
        this.customData = customData; // 自定义数据
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    generateId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 更新事件
    update(data) {
        Object.assign(this, data);
        this.updatedAt = new Date();
    }

    // 获取事件类型配置
    getTypeConfig() {
        return eventTypeRegistry.get(this.type);
    }

    // 序列化
    toJSON() {
        return {
            id: this.id,
            time: this.time,
            type: this.type,
            customData: this.customData,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }

    // 从JSON恢复
    static fromJSON(json) {
        const event = new TimelineEvent(json.time, json.type, json.customData);
        event.id = json.id;
        event.createdAt = new Date(json.createdAt);
        event.updatedAt = new Date(json.updatedAt);
        return event;
    }
}

// 轨道类
class Track {
    constructor(name = '新轨道') {
        this.id = this.generateId();
        this.name = name;
        this.events = []; // 事件数组
        this.color = this.randomColor();
        this.visible = true;
        this.locked = false;
    }

    generateId() {
        return 'track_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    randomColor() {
        const colors = ['#007acc', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 添加事件
    addEvent(event) {
        this.events.push(event);
        this.sortEvents();
        return event;
    }

    // 删除事件
    removeEvent(eventId) {
        const index = this.events.findIndex(e => e.id === eventId);
        if (index > -1) {
            this.events.splice(index, 1);
            return true;
        }
        return false;
    }

    // 获取事件
    getEvent(eventId) {
        return this.events.find(e => e.id === eventId);
    }

    // 按时间排序事件
    sortEvents() {
        this.events.sort((a, b) => a.time - b.time);
    }

    // 获取指定时间范围内的事件
    getEventsInRange(startTime, endTime) {
        return this.events.filter(e => e.time >= startTime && e.time <= endTime);
    }

    // 序列化
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            events: this.events.map(e => e.toJSON()),
            color: this.color,
            visible: this.visible,
            locked: this.locked,
        };
    }

    // 从JSON恢复
    static fromJSON(json) {
        const track = new Track(json.name);
        track.id = json.id;
        track.color = json.color;
        track.visible = json.visible;
        track.locked = json.locked;
        track.events = json.events.map(e => TimelineEvent.fromJSON(e));
        return track;
    }
}

// 时间轴类
class Timeline {
    constructor(duration = 60) {
        this.id = this.generateId();
        this.duration = duration; // 总时长（秒）
        this.tracks = [];
        this.currentTime = 0; // 当前播放时间
        this.zoom = 10; // 缩放级别（像素/秒）
        this.name = '未命名时间轴';
        this.createdAt = new Date();
    }

    generateId() {
        return 'timeline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 添加轨道
    addTrack(track) {
        this.tracks.push(track);
        return track;
    }

    // 删除轨道
    removeTrack(trackId) {
        const index = this.tracks.findIndex(t => t.id === trackId);
        if (index > -1) {
            this.tracks.splice(index, 1);
            return true;
        }
        return false;
    }

    // 获取轨道
    getTrack(trackId) {
        return this.tracks.find(t => t.id === trackId);
    }

    // 设置时长
    setDuration(duration) {
        this.duration = Math.max(10, duration);
    }

    // 获取所有事件
    getAllEvents() {
        return this.tracks.flatMap(track => 
            track.events.map(event => ({
                track,
                event
            }))
        );
    }

    // 获取指定时间点的所有事件
    getEventsAtTime(time, tolerance = 0.1) {
        return this.getAllEvents().filter(({ event }) => 
            Math.abs(event.time - time) <= tolerance
        );
    }

    // 序列化
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            duration: this.duration,
            tracks: this.tracks.map(t => t.toJSON()),
            currentTime: this.currentTime,
            zoom: this.zoom,
            createdAt: this.createdAt,
        };
    }

    // 从JSON恢复
    static fromJSON(json) {
        const timeline = new Timeline(json.duration);
        timeline.id = json.id;
        timeline.name = json.name;
        timeline.currentTime = json.currentTime;
        timeline.zoom = json.zoom;
        timeline.createdAt = new Date(json.createdAt);
        timeline.tracks = json.tracks.map(t => Track.fromJSON(t));
        return timeline;
    }

    // 导出为JSON字符串
    export() {
        return JSON.stringify(this.toJSON(), null, 2);
    }

    // 从JSON字符串导入
    static import(jsonString) {
        try {
            const json = JSON.parse(jsonString);
            return Timeline.fromJSON(json);
        } catch (error) {
            console.error('导入失败:', error);
            return null;
        }
    }
}
