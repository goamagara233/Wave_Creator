/**
 * 时间轴应用主逻辑
 */

class TimelineApp {
    constructor() {
        this.timeline = new Timeline(60);
        this.selectedTrack = null;
        this.selectedEvent = null;
        this.pixelsPerSecond = 50; // 像素/秒的比例
        this.minZoom = 10; // 最小缩放 (10 px/s)
        this.maxZoom = 200; // 最大缩放 (200 px/s)
        this.snapToGrid = true; // 对齐到刻度
        this.isPanning = false; // 是否正在拖动
        this.panStart = { x: 0, y: 0 };
        this.scrollStart = { left: 0, top: 0 };
        this.currentEditingEnemyId = null; // 当前编辑的敌人ID
        this.currentIconData = null; // 当前选择的图标数据
        
        this.initializeUI();
        this.bindEvents();
        this.addDefaultTrack();
    }

    initializeUI() {
        // 获取DOM元素
        this.trackList = document.getElementById('trackList');
        this.timelineTracks = document.getElementById('timelineTracks');
        this.timelineRuler = document.getElementById('timelineRuler');
        this.timelinePanel = document.querySelector('.timeline-panel');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarContent = document.getElementById('sidebarContent');
        this.durationInput = document.getElementById('durationInput');
        this.snapToGridCheckbox = document.getElementById('snapToGrid');
        this.zoomLevelDisplay = document.getElementById('zoomLevel');
        this.snapLine = document.getElementById('snapLine');

        // 初始化时间轴
        this.updateTimeline();
        this.updateZoomDisplay();
    }

    bindEvents() {
        // 添加轨道按钮
        document.getElementById('addTrackBtn').addEventListener('click', () => {
            this.addTrack();
        });

        // 时长变化
        this.durationInput.addEventListener('change', (e) => {
            const duration = parseInt(e.target.value);
            this.timeline.setDuration(duration);
            this.updateTimeline();
        });

        // 对齐开关
        this.snapToGridCheckbox.addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });

        // 关闭侧边栏
        document.getElementById('closeSidebar').addEventListener('click', () => {
            this.closeSidebar();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedEvent) {
                this.deleteSelectedEvent();
            }
        });

        // 鼠标滚轮缩放 (直接滚轮，无需Ctrl)
        this.timelinePanel.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e);
        }, { passive: false });

        // 左键拖动视图
        this.timelinePanel.addEventListener('mousedown', (e) => {
            // 只在时间轴区域（非轨道项、非事件点）左键拖动
            if (e.button === 0 && !e.target.closest('.event-point') && !e.target.closest('.track-item')) {
                const target = e.target;
                // 允许在 timeline-panel, timeline-ruler, timeline-tracks, timeline-track 上拖动
                if (target === this.timelinePanel || 
                    target === this.timelineRuler || 
                    target === this.timelineTracks ||
                    target.classList.contains('timeline-track')) {
                    e.preventDefault();
                    this.startPanning(e);
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.handlePanning(e);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.stopPanning();
            }
        });

        // 禁用右键菜单
        this.timelinePanel.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    // 添加默认轨道
    addDefaultTrack() {
        const track = new Track('轨道 1');
        this.timeline.addTrack(track);
        this.renderTracks();
    }

    // 处理缩放
    handleZoom(e) {
        const delta = -Math.sign(e.deltaY);
        const zoomFactor = 1.1;
        
        // 获取鼠标相对于视口的位置
        const rect = this.timelinePanel.getBoundingClientRect();
        const mouseViewportX = e.clientX - rect.left;
        
        // 计算鼠标位置对应的时间点（缩放前）
        const timeAtMouse = (mouseViewportX + this.timelinePanel.scrollLeft) / this.pixelsPerSecond;
        
        // 计算新的缩放级别
        let newZoom = this.pixelsPerSecond * (delta > 0 ? zoomFactor : 1 / zoomFactor);
        newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        // 更新缩放级别
        this.pixelsPerSecond = newZoom;
        
        // 更新显示
        this.updateTimeline();
        this.updateZoomDisplay();
        
        // 调整滚动位置，使鼠标下的时间点保持不变
        // 新的鼠标位置 = 时间点 * 新缩放 - 鼠标在视口中的位置
        this.timelinePanel.scrollLeft = timeAtMouse * this.pixelsPerSecond - mouseViewportX;
    }

    // 更新缩放显示
    updateZoomDisplay() {
        const percentage = Math.round((this.pixelsPerSecond / 50) * 100);
        this.zoomLevelDisplay.textContent = percentage + '%';
    }

    // 开始拖动
    startPanning(e) {
        this.isPanning = true;
        this.panStart.x = e.clientX;
        this.panStart.y = e.clientY;
        this.scrollStart.left = this.timelinePanel.scrollLeft;
        this.scrollStart.top = this.timelinePanel.scrollTop;
        this.timelinePanel.classList.add('panning');
    }

    // 处理拖动
    handlePanning(e) {
        const deltaX = this.panStart.x - e.clientX;
        const deltaY = this.panStart.y - e.clientY;
        
        this.timelinePanel.scrollLeft = this.scrollStart.left + deltaX;
        this.timelinePanel.scrollTop = this.scrollStart.top + deltaY;
    }

    // 停止拖动
    stopPanning() {
        this.isPanning = false;
        this.timelinePanel.classList.remove('panning');
    }

    // 计算对齐时间
    snapTime(time) {
        if (!this.snapToGrid) return time;
        
        const interval = this.calculateInterval(this.timeline.duration);
        const snapInterval = interval >= 2 ? interval / 2 : 1; // 如果间隔>=2秒，可以对齐到半格，但最小1秒
        
        return Math.round(time / snapInterval) * snapInterval;
    }

    // 显示对齐参考线
    showSnapLine(time) {
        if (!this.snapToGrid) return;
        
        const x = time * this.pixelsPerSecond;
        this.snapLine.style.left = x + 'px';
        this.snapLine.classList.add('active');
    }

    // 隐藏对齐参考线
    hideSnapLine() {
        this.snapLine.classList.remove('active');
    }

    // 添加新轨道
    addTrack() {
        const trackNumber = this.timeline.tracks.length + 1;
        const track = new Track(`轨道 ${trackNumber}`);
        this.timeline.addTrack(track);
        this.renderTracks();
    }

    // 删除轨道
    deleteTrack(trackId) {
        if (confirm('确定要删除这个轨道吗？')) {
            this.timeline.removeTrack(trackId);
            if (this.selectedTrack?.id === trackId) {
                this.selectedTrack = null;
                this.closeSidebar();
            }
            this.renderTracks();
        }
    }

    // 渲染轨道列表
    renderTracks() {
        // 渲染左侧轨道列表
        this.trackList.innerHTML = '';
        this.timelineTracks.innerHTML = '';
        
        // 设置轨道容器宽度
        const totalWidth = this.timeline.duration * this.pixelsPerSecond;
        this.timelineTracks.style.width = totalWidth + 'px';

        this.timeline.tracks.forEach((track, index) => {
            // 左侧轨道项
            const trackItem = this.createTrackItem(track, index);
            this.trackList.appendChild(trackItem);

            // 时间轴轨道
            const timelineTrack = this.createTimelineTrack(track);
            this.timelineTracks.appendChild(timelineTrack);
        });
        
        // 重新创建对齐线（因为innerHTML清空了）
        const snapLine = document.createElement('div');
        snapLine.className = 'snap-line';
        snapLine.id = 'snapLine';
        this.timelineTracks.insertBefore(snapLine, this.timelineTracks.firstChild);
        this.snapLine = snapLine; // 更新引用
    }

    // 创建轨道项
    createTrackItem(track, index) {
        const div = document.createElement('div');
        div.className = 'track-item';
        div.style.borderLeftColor = track.color;
        div.dataset.trackId = track.id;

        div.innerHTML = `
            <div class="track-item-header">
                <input type="text" value="${track.name}" readonly>
                <button class="btn-close" onclick="app.deleteTrack('${track.id}')">🗑️</button>
            </div>
            <div class="track-item-info">
                ${track.events.length} 个事件
            </div>
        `;

        // 点击选中轨道
        div.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                this.selectTrack(track.id);
            }
        });

        // 双击编辑名称
        const input = div.querySelector('input');
        input.addEventListener('dblclick', () => {
            input.removeAttribute('readonly');
            input.focus();
            input.select();
        });

        input.addEventListener('blur', () => {
            track.name = input.value;
            input.setAttribute('readonly', true);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });

        return div;
    }

    // 创建时间轴轨道
    createTimelineTrack(track) {
        const div = document.createElement('div');
        div.className = 'timeline-track';
        div.dataset.trackId = track.id;

        // 右键添加敌人生成事件
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // 使用 timelinePanel 作为参考点计算位置
            const panelRect = this.timelinePanel.getBoundingClientRect();
            const x = e.clientX - panelRect.left + this.timelinePanel.scrollLeft;
            let time = x / this.pixelsPerSecond;
            
            // 应用对齐
            time = this.snapTime(time);
            
            if (time >= 0 && time <= this.timeline.duration) {
                // 默认添加敌人生成事件
                this.addEvent(track.id, time, 'spawn_enemy');
            }
        });

        // 鼠标移动显示对齐线
        div.addEventListener('mousemove', (e) => {
            if (this.snapToGrid && !this.isPanning) {
                // 使用 timelinePanel 作为参考点计算位置
                const panelRect = this.timelinePanel.getBoundingClientRect();
                const x = e.clientX - panelRect.left + this.timelinePanel.scrollLeft;
                let time = x / this.pixelsPerSecond;
                const snappedTime = this.snapTime(time);
                this.showSnapLine(snappedTime);
            }
        });

        div.addEventListener('mouseleave', () => {
            this.hideSnapLine();
        });

        // 渲染事件点
        track.events.forEach(event => {
            const eventElement = this.createEventElement(event, track);
            div.appendChild(eventElement);
        });

        return div;
    }

    // 创建事件元素
    createEventElement(event, track) {
        const typeConfig = event.getTypeConfig();
        const div = document.createElement('div');
        div.className = 'event-point';
        div.dataset.eventId = event.id;
        div.dataset.trackId = track.id;
        div.style.left = (event.time * this.pixelsPerSecond) + 'px';
        div.style.background = typeConfig.color;

        // 如果是敌人生成事件，显示敌人图标
        if (event.type === 'spawn_enemy') {
            const enemyType = enemyTypeRegistry.get(event.customData.enemyType);
            if (enemyType) {
                const icon = document.createElement('div');
                icon.className = 'event-icon';
                icon.innerHTML = this.renderEnemyIcon(enemyType.icon);
                div.appendChild(icon);
                
                // 显示生成数量
                if (event.customData.count > 1) {
                    const count = document.createElement('div');
                    count.className = 'event-count';
                    count.textContent = `×${event.customData.count}`;
                    div.appendChild(count);
                }
            }
        } else if (typeConfig.icon) {
            // 其他类型事件显示图标
            const icon = document.createElement('div');
            icon.className = 'event-icon';
            icon.textContent = typeConfig.icon;
            div.appendChild(icon);
        }

        // 事件标签
        const label = document.createElement('div');
        label.className = 'event-label';
        label.textContent = `${event.time.toFixed(2)}s`;
        div.appendChild(label);

        // 对齐指示点
        const snapIndicator = document.createElement('div');
        snapIndicator.className = 'snap-indicator';
        div.appendChild(snapIndicator);

        // 点击选中事件
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectEvent(track.id, event.id);
        });

        // 拖拽移动事件
        this.makeEventDraggable(div, event, snapIndicator);

        return div;
    }

    // 使事件可拖拽
    makeEventDraggable(element, event, snapIndicator) {
        let isDragging = false;
        let startX = 0;
        let startTime = 0;

        element.addEventListener('mousedown', (e) => {
            if (e.button === 0 && !this.isPanning) { // 左键且不在拖动视图
                isDragging = true;
                startX = e.clientX;
                startTime = event.time;
                element.style.cursor = 'grabbing';
                e.preventDefault();
                e.stopPropagation(); // 防止触发面板拖动
            }
        });

        const handleMouseMove = (e) => {
            if (isDragging) {
                const deltaX = e.clientX - startX;
                const deltaTime = deltaX / this.pixelsPerSecond;
                let newTime = startTime + deltaTime;

                // 限制在时间轴范围内
                newTime = Math.max(0, Math.min(this.timeline.duration, newTime));
                
                // 实时应用对齐（拖动时）
                const displayTime = this.snapToGrid ? this.snapTime(newTime) : newTime;
                
                // 显示对齐参考线和指示点
                if (this.snapToGrid && Math.abs(displayTime - newTime) < 0.1) {
                    this.showSnapLine(displayTime);
                    snapIndicator.classList.add('active');
                } else {
                    this.hideSnapLine();
                    snapIndicator.classList.remove('active');
                }
                
                event.time = newTime; // 保存原始时间用于继续拖动
                element.style.left = (displayTime * this.pixelsPerSecond) + 'px';
                element.querySelector('.event-label').textContent = `${displayTime.toFixed(2)}s`;

                // 更新侧边栏
                if (this.selectedEvent?.id === event.id) {
                    const timeInput = document.getElementById('eventTime');
                    if (timeInput) {
                        timeInput.value = displayTime.toFixed(2);
                    }
                }
            }
        };

        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'pointer';
                
                // 隐藏对齐指示
                this.hideSnapLine();
                snapIndicator.classList.remove('active');
                
                // 最终对齐
                if (this.snapToGrid) {
                    event.time = this.snapTime(event.time);
                    element.style.left = (event.time * this.pixelsPerSecond) + 'px';
                    element.querySelector('.event-label').textContent = `${event.time.toFixed(2)}s`;
                }
                
                // 重新排序事件
                const track = this.timeline.tracks.find(t => t.events.includes(event));
                if (track) {
                    track.sortEvents();
                }
                
                // 更新侧边栏
                if (this.selectedEvent?.id === event.id) {
                    this.showEventEditor(event);
                }
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // 选中轨道
    selectTrack(trackId) {
        this.selectedTrack = this.timeline.getTrack(trackId);
        
        // 更新UI
        document.querySelectorAll('.track-item').forEach(item => {
            if (item.dataset.trackId === trackId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // 选中事件
    selectEvent(trackId, eventId) {
        const track = this.timeline.getTrack(trackId);
        const event = track.getEvent(eventId);
        
        this.selectedTrack = track;
        this.selectedEvent = event;

        // 更新UI
        document.querySelectorAll('.event-point').forEach(el => {
            if (el.dataset.eventId === eventId) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });

        this.showEventEditor(event);
    }

    // 添加事件
    addEvent(trackId, time, type = 'default') {
        const track = this.timeline.getTrack(trackId);
        if (!track) return;

        const event = new TimelineEvent(time, type);
        track.addEvent(event);
        
        this.renderTracks();
        this.selectEvent(trackId, event.id);
    }

    // 删除选中的事件
    deleteSelectedEvent() {
        if (!this.selectedEvent || !this.selectedTrack) return;

        this.selectedTrack.removeEvent(this.selectedEvent.id);
        this.selectedEvent = null;
        this.closeSidebar();
        this.renderTracks();
    }

    // 显示事件编辑器
    showEventEditor(event) {
        const typeConfig = event.getTypeConfig();
        const allTypes = eventTypeRegistry.getAll();

        let fieldsHTML = '';
        
        // 如果是敌人生成事件，显示特殊UI
        if (event.type === 'spawn_enemy') {
            const allEnemies = enemyTypeRegistry.getAll();
            
            // 检查是否有敌人可用
            if (allEnemies.length === 0) {
                fieldsHTML = `
                    <div class="form-group">
                        <div class="validation-warning">
                            ⚠️ 还没有创建任何敌人类型！
                        </div>
                        <button class="btn btn-primary" onclick="app.openEnemyManager()">
                            ➕ 创建敌人类型
                        </button>
                    </div>
                `;
            } else {
                const selectedEnemy = enemyTypeRegistry.get(event.customData.enemyType);
                const validation = selectedEnemy ? enemyTypeRegistry.validate(selectedEnemy.id) : { valid: false };
                
                fieldsHTML = `
                    <div class="form-group">
                        <label>敌人类型:</label>
                        <select id="field_enemyType" class="enemy-select">
                            ${allEnemies.map(e => `
                                <option value="${e.id}" ${e.id === event.customData.enemyType ? 'selected' : ''}>
                                    ${this.renderEnemySelectText(e.icon, e.name)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    ${selectedEnemy ? `
                        <div class="enemy-preview">
                            <div class="enemy-icon">${this.renderEnemyIcon(selectedEnemy.icon)}</div>
                            <div class="enemy-info">
                                <strong>${selectedEnemy.name}</strong>
                                <small style="color: #888;">${selectedEnemy.id}</small>
                                ${!validation.valid ? `
                                    <div class="validation-warning">
                                        ⚠️ 烘焙时需要补充信息
                                    </div>
                                ` : '<div class="validation-success">✅ 配置完整</div>'}
                            </div>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label>生成数量:</label>
                        <input type="number" id="field_count" value="${event.customData.count || 1}" min="1" max="100">
                    </div>
                    <div class="form-group">
                        <label>生成位置:</label>
                        <select id="field_spawnPosition">
                            <option value="random" ${event.customData.spawnPosition === 'random' ? 'selected' : ''}>随机</option>
                            <option value="left" ${event.customData.spawnPosition === 'left' ? 'selected' : ''}>左侧</option>
                            <option value="right" ${event.customData.spawnPosition === 'right' ? 'selected' : ''}>右侧</option>
                            <option value="top" ${event.customData.spawnPosition === 'top' ? 'selected' : ''}>顶部</option>
                            <option value="bottom" ${event.customData.spawnPosition === 'bottom' ? 'selected' : ''}>底部</option>
                            <option value="center" ${event.customData.spawnPosition === 'center' ? 'selected' : ''}>中心</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>编队类型:</label>
                        <select id="field_formationType">
                            <option value="single" ${event.customData.formationType === 'single' ? 'selected' : ''}>单个</option>
                            <option value="line" ${event.customData.formationType === 'line' ? 'selected' : ''}>直线</option>
                            <option value="circle" ${event.customData.formationType === 'circle' ? 'selected' : ''}>圆形</option>
                            <option value="grid" ${event.customData.formationType === 'grid' ? 'selected' : ''}>网格</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-secondary" onclick="app.openEnemyManager()">
                            📋 管理敌人类型
                        </button>
                    </div>
                `;
            }
        } else {
            // 其他类型事件，显示常规字段
            for (const [key, value] of Object.entries(event.customData)) {
                const fieldType = typeof value === 'boolean' ? 'checkbox' : 
                                typeof value === 'number' ? 'number' : 'text';
                
                fieldsHTML += `
                    <div class="form-group">
                        <label>${key}:</label>
                        ${fieldType === 'checkbox' 
                            ? `<input type="checkbox" id="field_${key}" ${value ? 'checked' : ''}>`
                            : `<input type="${fieldType}" id="field_${key}" value="${value}">`
                        }
                    </div>
                `;
            }
        }

        this.sidebarContent.innerHTML = `
            <div class="form-group">
                <label>事件类型:</label>
                <select id="eventType">
                    ${allTypes.map(t => `
                        <option value="${t.id}" ${t.id === event.type ? 'selected' : ''}>
                            ${t.icon || '📌'} ${t.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>触发时间 (秒):</label>
                <input type="number" id="eventTime" value="${event.time.toFixed(2)}" 
                       min="0" max="${this.timeline.duration}" step="0.1">
            </div>
            ${fieldsHTML}
            <div class="form-group">
                <button class="btn btn-primary" onclick="app.updateEvent()">💾 保存</button>
                <button class="btn btn-danger" onclick="app.deleteSelectedEvent()">🗑️ 删除</button>
            </div>
        `;

        // 事件类型改变
        document.getElementById('eventType').addEventListener('change', (e) => {
            event.type = e.target.value;
            const newTypeConfig = event.getTypeConfig();
            event.customData = { ...newTypeConfig.fields };
            this.showEventEditor(event);
            this.renderTracks();
        });

        // 敌人类型改变时更新预览
        const enemyTypeSelect = document.getElementById('field_enemyType');
        if (enemyTypeSelect) {
            enemyTypeSelect.addEventListener('change', () => {
                this.showEventEditor(event);
            });
        }

        this.sidebar.classList.add('active');
    }

    // 更新事件
    updateEvent() {
        if (!this.selectedEvent) return;

        const time = parseFloat(document.getElementById('eventTime').value);
        this.selectedEvent.time = Math.max(0, Math.min(this.timeline.duration, time));

        // 更新自定义字段
        for (const key in this.selectedEvent.customData) {
            const field = document.getElementById(`field_${key}`);
            if (field) {
                if (field.type === 'checkbox') {
                    this.selectedEvent.customData[key] = field.checked;
                } else if (field.type === 'number') {
                    this.selectedEvent.customData[key] = parseFloat(field.value);
                } else {
                    this.selectedEvent.customData[key] = field.value;
                }
            }
        }

        this.selectedEvent.update({});
        this.selectedTrack.sortEvents();
        this.renderTracks();
        this.selectEvent(this.selectedTrack.id, this.selectedEvent.id);
    }

    // 关闭侧边栏
    closeSidebar() {
        this.sidebar.classList.remove('active');
        this.selectedEvent = null;
        
        document.querySelectorAll('.event-point').forEach(el => {
            el.classList.remove('selected');
        });
    }

    // 更新时间轴
    updateTimeline() {
        this.renderRuler();
        this.renderTracks();
    }

    // 渲染时间刻度尺
    renderRuler() {
        this.timelineRuler.innerHTML = '';
        const duration = this.timeline.duration;
        const interval = this.calculateInterval(duration);
        
        // 设置刻度尺宽度
        const totalWidth = duration * this.pixelsPerSecond;
        this.timelineRuler.style.width = totalWidth + 'px';

        for (let time = 0; time <= duration; time += interval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            
            // 每5个间隔显示为主刻度
            if (time % (interval * 5) === 0) {
                marker.classList.add('major');
            }

            marker.style.left = (time * this.pixelsPerSecond) + 'px';
            marker.innerHTML = `
                <div class="time-marker-line"></div>
                <div class="time-marker-label">${time}s</div>
            `;

            this.timelineRuler.appendChild(marker);
        }
    }

    // 计算合适的刻度间隔
    calculateInterval(duration) {
        if (duration <= 30) return 1;
        if (duration <= 60) return 2;
        if (duration <= 120) return 5;
        if (duration <= 300) return 10;
        return 30;
    }

    // 导出时间轴
    exportTimeline() {
        const json = this.timeline.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timeline_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 导出波次配置（游戏专用格式）
    exportWaveConfig() {
        // 验证敌人配置
        const validation = enemyTypeRegistry.validateAll();
        if (!validation.valid) {
            const warningMsg = '⚠️ 烘焙警告：以下敌人缺少Godot资源信息\n\n' + 
                              validation.warnings.join('\n') + 
                              '\n\n是否继续导出？（建议先在"管理敌人"中补充信息）';
            if (!confirm(warningMsg)) {
                return;
            }
        }

        const waveData = this.generateWaveData();

        const json = JSON.stringify(waveData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wave_config_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('✅ 波次配置已导出');
        console.log('📊 配置数据:', waveData);
    }

    // 生成波次数据
    generateWaveData() {
        const waveData = {
            waveName: this.timeline.name,
            duration: this.timeline.duration,
            enemies: enemyTypeRegistry.getAll(),
            spawnEvents: []
        };

        // 收集所有敌人生成事件
        this.timeline.tracks.forEach(track => {
            track.events.forEach(event => {
                if (event.type === 'spawn_enemy') {
                    const enemyConfig = enemyTypeRegistry.get(event.customData.enemyType);
                    waveData.spawnEvents.push({
                        time: event.time,
                        enemyId: event.customData.enemyType,
                        enemyName: enemyConfig.name,
                        count: event.customData.count,
                        spawnPosition: event.customData.spawnPosition,
                        formationType: event.customData.formationType,
                        // Godot资源信息（烘焙用）
                        scenePath: enemyConfig.scenePath,
                        uid: enemyConfig.uid,
                        trackName: track.name
                    });
                }
            });
        });

        // 按时间排序
        waveData.spawnEvents.sort((a, b) => a.time - b.time);

        return waveData;
    }

    // 显示波次统计信息
    showWaveStatistics() {
        const waveData = this.generateWaveData();
        
        // 统计敌人数量
        const enemyCount = {};
        let totalEnemies = 0;
        
        waveData.spawnEvents.forEach(event => {
            if (!enemyCount[event.enemyName]) {
                enemyCount[event.enemyName] = 0;
            }
            enemyCount[event.enemyName] += event.count;
            totalEnemies += event.count;
        });

        // 生成统计HTML
        let statsHTML = `
            <div class="wave-stats">
                <h3>📊 波次统计</h3>
                <div class="stat-item">
                    <strong>总时长:</strong> ${waveData.duration} 秒
                </div>
                <div class="stat-item">
                    <strong>生成事件数:</strong> ${waveData.spawnEvents.length}
                </div>
                <div class="stat-item">
                    <strong>敌人总数:</strong> ${totalEnemies}
                </div>
                <div class="enemy-breakdown">
                    <strong>敌人分布:</strong>
                    <ul>
        `;

        for (const [name, count] of Object.entries(enemyCount)) {
            const enemy = enemyTypeRegistry.getAll().find(e => e.name === name);
            statsHTML += `
                <li>${enemy ? enemy.icon : '👾'} ${name}: ${count} 个</li>
            `;
        }

        statsHTML += `
                    </ul>
                </div>
            </div>
        `;

        alert('波次统计（详细信息请查看控制台）\n\n' + 
              `总时长: ${waveData.duration}秒\n` +
              `生成事件: ${waveData.spawnEvents.length}个\n` +
              `敌人总数: ${totalEnemies}个`);
        
        console.log('📊 波次统计信息:', waveData);
    }

    // 导入时间轴
    importTimeline(jsonString) {
        const timeline = Timeline.import(jsonString);
        if (timeline) {
            this.timeline = timeline;
            this.durationInput.value = timeline.duration;
            this.updateTimeline();
            this.closeSidebar();
        }
    }

    // 打开敌人管理器
    openEnemyManager() {
        let modal = document.getElementById('enemyManagerModal');
        if (!modal) {
            this.createEnemyManagerModal();
            modal = document.getElementById('enemyManagerModal');
        }
        this.refreshEnemyList();
        modal.classList.add('active');
    }

    // 创建敌人管理器模态框
    createEnemyManagerModal() {
        const modal = document.createElement('div');
        modal.id = 'enemyManagerModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>🎮 敌人类型管理器</h2>
                    <div class="modal-header-actions">
                        <button class="btn btn-primary" onclick="app.showAddEnemyForm()">➕ 添加新敌人</button>
                        <button class="btn-close" onclick="app.closeEnemyManager()">✖</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div id="enemyList" class="enemy-grid"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 创建敌人表单模态框
    createEnemyFormModal() {
        const modal = document.createElement('div');
        modal.id = 'enemyFormModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="enemyFormTitle">➕ 添加新敌人</h2>
                    <button class="btn-close" onclick="app.closeEnemyForm()">✖</button>
                </div>
                <div class="modal-body">
                    <div class="enemy-form">
                        <div class="form-group">
                            <label>ID (唯一标识符) *:</label>
                            <input type="text" id="newEnemyId" placeholder="例如: chaser_enemy">
                            <small>使用小写字母和下划线</small>
                        </div>
                        <div class="form-group">
                            <label>名称 *:</label>
                            <input type="text" id="newEnemyName" placeholder="例如: 追击者">
                        </div>
                        <div class="form-group">
                            <label>图标:</label>
                            <div class="icon-upload-container">
                                <div class="icon-preview" id="iconPreview">
                                    <span class="icon-placeholder">📷</span>
                                </div>
                                <div class="icon-upload-options">
                                    <label class="btn btn-secondary" for="iconFileInput">📁 上传图片</label>
                                    <input type="file" id="iconFileInput" accept="image/*" style="display:none;">
                                    <button class="btn btn-secondary btn-sm" onclick="app.clearIcon()">清除</button>
                                </div>
                            </div>
                            <small>上传图片作为图标（推荐64x64px）</small>
                        </div>
                        <hr>
                        <div class="form-group">
                            <label>Godot 场景路径 (可选，烘焙时需要):</label>
                            <input type="text" id="newEnemyScenePath" placeholder="例如: res://scenes/enemies/ChaserEnemy.tscn">
                            <small>Godot场景文件路径</small>
                        </div>
                        <div class="form-group">
                            <label>Godot 资源UID (可选，烘焙时需要):</label>
                            <input type="text" id="newEnemyUid" placeholder="例如: uid://30ktq4nfbdpc">
                            <small>Godot资源唯一标识符</small>
                        </div>
                        <div class="form-actions">
                            <button class="btn btn-primary" onclick="app.saveEnemy()">💾 保存</button>
                            <button class="btn btn-secondary" onclick="app.closeEnemyForm()">取消</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定文件上传事件
        document.getElementById('iconFileInput').addEventListener('change', (e) => {
            this.handleIconUpload(e);
        });
    }

    // 刷新敌人列表
    refreshEnemyList() {
        const enemyList = document.getElementById('enemyList');
        if (!enemyList) return;

        const enemies = enemyTypeRegistry.getAll();
        
        if (enemies.length === 0) {
            enemyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👾</div>
                    <p>还没有添加任何敌人类型</p>
                    <button class="btn btn-primary" onclick="app.showAddEnemyForm()">➕ 添加第一个敌人</button>
                </div>
            `;
            return;
        }

        enemyList.innerHTML = enemies.map(enemy => {
            const validation = enemyTypeRegistry.validate(enemy.id);
            const statusIcon = validation.valid ? '✅' : '⚠️';
            const statusText = validation.valid ? '配置完整' : '需要补充';
            const iconDisplay = this.renderEnemyIcon(enemy.icon);
            
            return `
                <div class="enemy-card-compact" onclick="app.toggleEnemyDetails('${enemy.id}')">
                    <div class="enemy-card-main">
                        <div class="enemy-icon-small">${iconDisplay}</div>
                        <div class="enemy-card-info">
                            <strong>${enemy.name}</strong>
                            <small>${enemy.id}</small>
                        </div>
                        <span class="status-badge ${validation.valid ? 'status-valid' : 'status-warning'}">
                            ${statusIcon} ${statusText}
                        </span>
                        <div class="enemy-card-actions" onclick="event.stopPropagation()">
                            <button class="btn-icon" onclick="app.editEnemy('${enemy.id}')" title="编辑">✏️</button>
                            <button class="btn-icon btn-danger" onclick="app.deleteEnemy('${enemy.id}')" title="删除">🗑️</button>
                        </div>
                    </div>
                    <div class="enemy-card-details" id="details-${enemy.id}" style="display: none;">
                        <div class="detail-row">
                            <label>场景路径:</label>
                            <span class="detail-value">${enemy.scenePath || '<未设置>'}</span>
                        </div>
                        <div class="detail-row">
                            <label>资源UID:</label>
                            <span class="detail-value">${enemy.uid || '<未设置>'}</span>
                        </div>
                        ${!validation.valid ? `
                            <div class="detail-warnings">
                                <strong>⚠️ 烘焙警告:</strong>
                                <ul>
                                    ${validation.warnings.map(w => `<li>${w}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // 渲染敌人图标
    renderEnemyIcon(icon) {
        // 如果没有图标或是默认的👾，显示默认图标
        if (!icon || icon === '👾') {
            return '👾';
        }
        // 如果是base64图片
        if (icon.startsWith('data:image')) {
            return `<img src="${icon}" alt="icon" class="icon-image">`;
        }
        // 否则是emoji
        return icon;
    }

    // 为选择框渲染敌人显示文本（不显示完整base64）
    renderEnemySelectText(icon, name) {
        if (!icon || icon === '👾') {
            // 没有图标或默认图标，只显示名称
            return name;
        }
        if (icon.startsWith('data:image')) {
            // 是图片，显示：🖼️ 名称
            return `🖼️ ${name}`;
        }
        // 是emoji，显示emoji + 名称
        return `${icon} ${name}`;
    }

    // 切换敌人详情显示
    toggleEnemyDetails(enemyId) {
        const details = document.getElementById(`details-${enemyId}`);
        if (details) {
            const isVisible = details.style.display !== 'none';
            details.style.display = isVisible ? 'none' : 'block';
        }
    }

    // 添加新敌人
    addNewEnemy() {
        const id = document.getElementById('newEnemyId').value.trim();
        const name = document.getElementById('newEnemyName').value.trim();
        const scenePath = document.getElementById('newEnemyScenePath').value.trim();
        const uid = document.getElementById('newEnemyUid').value.trim();

        if (!id || !name) {
            alert('请填写ID和名称');
            return;
        }

        if (enemyTypeRegistry.enemies.has(id)) {
            alert('该ID已存在，请使用其他ID');
            return;
        }

        // 使用上传的图标，如果没有则使用默认图标
        const icon = this.currentIconData || '👾';

        enemyTypeRegistry.register(id, {
            name,
            icon,
            scenePath,
            uid,
        });

        this.closeEnemyForm();
        this.refreshEnemyList();
        
        const validation = enemyTypeRegistry.validate(id);
        if (!validation.valid) {
            alert('✅ 敌人类型添加成功！\n\n⚠️ 提示: Godot资源信息未填写，烘焙时需要补充');
        } else {
            alert('✅ 敌人类型添加成功！');
        }
    }

    // 编辑敌人
    editEnemy(enemyId) {
        const enemy = enemyTypeRegistry.get(enemyId);
        if (!enemy) return;

        if (!document.getElementById('enemyFormModal')) {
            this.createEnemyFormModal();
        }

        this.currentEditingEnemyId = enemyId;

        // 填充表单
        document.getElementById('newEnemyId').value = enemy.id;
        document.getElementById('newEnemyId').disabled = true; // ID不可修改
        document.getElementById('newEnemyName').value = enemy.name;
        document.getElementById('newEnemyScenePath').value = enemy.scenePath || '';
        document.getElementById('newEnemyUid').value = enemy.uid || '';

        // 处理图标
        this.currentIconData = enemy.icon;
        this.updateIconPreview(enemy.icon);

        document.getElementById('enemyFormTitle').textContent = '✏️ 编辑敌人';
        document.getElementById('enemyFormModal').classList.add('active');
    }

    // 保存敌人编辑
    saveEnemyEdit(enemyId) {
        const name = document.getElementById('newEnemyName').value.trim();
        const scenePath = document.getElementById('newEnemyScenePath').value.trim();
        const uid = document.getElementById('newEnemyUid').value.trim();

        if (!name) {
            alert('请填写名称');
            return;
        }

        // 使用上传的图标，如果没有则使用默认图标
        const icon = this.currentIconData || '👾';

        enemyTypeRegistry.register(enemyId, {
            name,
            icon,
            scenePath,
            uid,
        });

        this.closeEnemyForm();
        this.refreshEnemyList();
        
        // 如果当前编辑的事件使用了这个敌人，刷新编辑器和时间轴显示
        if (this.selectedEvent && this.selectedEvent.type === 'spawn_enemy' && 
            this.selectedEvent.customData.enemyType === enemyId) {
            this.showEventEditor(this.selectedEvent);
            this.renderTracks(); // 刷新时间轴上的图标显示
        }

        alert('✅ 敌人类型已更新！');
    }

    // 显示添加敌人表单
    showAddEnemyForm() {
        if (!document.getElementById('enemyFormModal')) {
            this.createEnemyFormModal();
        }
        this.currentEditingEnemyId = null;
        this.resetEnemyForm();
        document.getElementById('enemyFormTitle').textContent = '➕ 添加新敌人';
        document.getElementById('enemyFormModal').classList.add('active');
    }

    // 关闭敌人表单
    closeEnemyForm() {
        document.getElementById('enemyFormModal').classList.remove('active');
        this.currentEditingEnemyId = null;
        this.currentIconData = null;
    }

    // 处理图标上传
    handleIconUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 缩放到64x64
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                // 绘制并缩放图片
                ctx.drawImage(img, 0, 0, 64, 64);
                
                // 转换为base64
                const iconData = canvas.toDataURL('image/png');
                this.currentIconData = iconData;
                
                // 更新预览
                this.updateIconPreview(iconData);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 更新图标预览
    updateIconPreview(iconValue) {
        const preview = document.getElementById('iconPreview');
        if (!preview) return;

        if (!iconValue) {
            preview.innerHTML = '<span class="icon-placeholder">📷</span>';
            return;
        }

        if (iconValue.startsWith('data:image')) {
            // 图片
            preview.innerHTML = `<img src="${iconValue}" alt="icon" class="icon-image">`;
            this.currentIconData = iconValue;
        } else {
            // Emoji
            preview.innerHTML = `<span class="icon-emoji">${iconValue}</span>`;
            this.currentIconData = iconValue;
        }
    }

    // 清除图标
    clearIcon() {
        document.getElementById('iconFileInput').value = '';
        this.currentIconData = null;
        this.updateIconPreview('');
    }

    // 保存敌人（统一的保存方法）
    saveEnemy() {
        if (this.currentEditingEnemyId) {
            this.saveEnemyEdit(this.currentEditingEnemyId);
        } else {
            this.addNewEnemy();
        }
    }

    // 重置敌人表单
    resetEnemyForm() {
        document.getElementById('newEnemyId').value = '';
        document.getElementById('newEnemyId').disabled = false;
        document.getElementById('newEnemyName').value = '';
        document.getElementById('newEnemyScenePath').value = '';
        document.getElementById('newEnemyUid').value = '';
        document.getElementById('iconFileInput').value = '';
        this.currentIconData = null;
        this.updateIconPreview('');
    }

    // 删除敌人类型
    deleteEnemy(enemyId) {
        if (!confirm(`确定要删除敌人类型 "${enemyId}" 吗？`)) {
            return;
        }

        if (enemyTypeRegistry.remove(enemyId)) {
            this.refreshEnemyList();
            alert('敌人类型已删除');
        } else {
            alert('无法删除该敌人类型');
        }
    }

    // 关闭敌人管理器
    closeEnemyManager() {
        document.getElementById('enemyManagerModal').classList.remove('active');
        // 如果当前编辑的是敌人生成事件，刷新编辑器
        if (this.selectedEvent && this.selectedEvent.type === 'spawn_enemy') {
            this.showEventEditor(this.selectedEvent);
        }
    }
}

// 打开事件类型模态框
function openEventTypeModal() {
    document.getElementById('eventTypeModal').classList.add('active');
}

// 关闭事件类型模态框
function closeEventTypeModal() {
    document.getElementById('eventTypeModal').classList.remove('active');
}

// 保存事件类型
function saveEventType() {
    const name = document.getElementById('eventTypeName').value;
    const color = document.getElementById('eventTypeColor').value;
    const fieldsText = document.getElementById('eventTypeFields').value;

    if (!name) {
        alert('请输入事件类型名称');
        return;
    }

    try {
        const fields = fieldsText ? JSON.parse(fieldsText) : {};
        const id = name.toLowerCase().replace(/\s+/g, '_');

        eventTypeRegistry.register(id, {
            name,
            color,
            fields
        });

        alert('事件类型已保存！');
        closeEventTypeModal();

        // 清空表单
        document.getElementById('eventTypeName').value = '';
        document.getElementById('eventTypeColor').value = '#3498db';
        document.getElementById('eventTypeFields').value = '';
    } catch (error) {
        alert('自定义字段格式错误，请使用有效的JSON格式');
    }
}

// 初始化应用
let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new TimelineApp();

    // 添加导出/导入按钮
    const headerControls = document.querySelector('.header-controls');
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.textContent = '📥 导出';
    exportBtn.onclick = () => app.exportTimeline();
    headerControls.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.textContent = '📤 导入';
    importBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    app.importTimeline(event.target.result);
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };
    headerControls.appendChild(importBtn);
});
