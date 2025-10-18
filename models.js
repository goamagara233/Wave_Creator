/**
 * 数据模型定义
 * 可扩展的事件系统，支持自定义事件类型
 */

// 事件类型注册表
class EventTypeRegistry {
    constructor() {
        this.types = new Map();
        this.registerDefaultTypes();
    }

    // 注册默认事件类型
    registerDefaultTypes() {
        this.register('default', {
            name: '默认事件',
            color: '#3498db',
            fields: {
                description: '',
            }
        });

        this.register('audio', {
            name: '音频事件',
            color: '#e74c3c',
            fields: {
                soundFile: '',
                volume: 1.0,
                loop: false,
            }
        });

        this.register('animation', {
            name: '动画事件',
            color: '#2ecc71',
            fields: {
                animationType: '',
                duration: 1.0,
                easing: 'linear',
            }
        });

        this.register('marker', {
            name: '标记点',
            color: '#f39c12',
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
