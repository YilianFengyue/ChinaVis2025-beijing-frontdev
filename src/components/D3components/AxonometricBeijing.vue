<template>
  <v-card flat class="axonometric-card">
    <div class="panel-header">
      <div class="header-left-group">
        <div class="header-block"></div>
        <div class="header-text-line">
          <h2 class="panel-title">北京城垣演变</h2>
          
        </div>
      </div>

      <div class="explode-control">
        <span class="control-label">EXPLODE</span>
        <div class="slider-wrapper">
          <v-slider
            v-model="explodeFactor"
            :min="0"
            :max="100"
            :step="1"
            density="compact"
            thumb-size="12"
            track-size="2"
            track-color="grey-lighten-3"
            color="#5d4037"
            hide-details
            elevation="0"
          ></v-slider>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <div class="viewport">
        <div class="scene" :style="sceneContainerStyle">
          
          <div 
            v-for="(layer, index) in layersWithEvents" 
            :key="layer.id"
            class="layer-group"
            :style="getLayerTransform(index)"
          >
            
            <template v-if="index > 0">
              <div class="drop-line corner-tl" :style="{ height: currentSpacing + 'px' }"></div>
              <div class="drop-line corner-tr" :style="{ height: currentSpacing + 'px' }"></div>
              <div class="drop-line corner-bl" :style="{ height: currentSpacing + 'px' }"></div>
              <div class="drop-line corner-br" :style="{ height: currentSpacing + 'px' }"></div>
            </template>

            <div class="layer-slab" :class="{ 'is-hovered': hoveredLayerId === layer.id }">
              <div class="slab-face" :style="{ borderColor: layer.color }">
                <img :src="layer.image" :alt="layer.name" class="layer-image" />
                
                <div class="slab-overlay" :class="{ 'active': hoveredLayerId && hoveredLayerId !== layer.id }"></div>
                
                <!-- Event Dots Layer - 放在最后确保在最上层 -->
                <div class="events-layer">
                  <div 
                    v-for="event in layer.events"
                    :key="event.event_id"
                    class="event-dot"
                    :class="{ 'is-hovered': hoveredEventId === event.event_id }"
                    :style="getEventDotStyle(event)"
                    @mouseenter.stop="onEventEnter($event, event, layer)"
                    @mouseleave.stop="onEventLeave"
                    @dblclick.stop="onEventDblClick(event, layer)"
                    @click.stop
                  >
                    <span class="ripple"></span>
                  </div>
                </div>
              </div>
              <div class="slab-side front" :style="{ background: layer.color }"></div>
              <div class="slab-side right" :style="{ background: layer.color }"></div>
            </div>

            <div class="annotation-wrapper">
              <div class="annotation-line"></div>
              <div class="annotation-content">
                <div class="annotation-name">{{ layer.name }}</div>
                <div class="annotation-period">{{ layer.period }}</div>
              </div>
            </div>

          </div>

          <div class="ground-shadow"></div>
        </div>
      </div>
    </div>

      <!-- Tooltip (Teleported to body to escape 3D transforms) -->
    <Teleport to="body">
      <Transition name="fade-up">
        <div 
          v-if="tooltip.show" 
          class="arch-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tt-header">
            <div class="tt-title-row">
              <span class="tt-name">{{ tooltip.title }}</span>
              <span class="tt-id">{{ tooltip.year }}</span>
            </div>
          </div>

          <div class="tt-content">
            <div class="event-meta">
              <span class="event-tag">{{ tooltip.type }}</span>
              <span class="event-location" v-if="tooltip.location">📍 {{ tooltip.location }}</span>
            </div>
            <div class="tt-divider"></div>
            <p class="tt-description">
              <span class="desc-label">事件影响：</span>
              {{ tooltip.impact }}
            </p>
            <p class="tt-note" v-if="tooltip.note">{{ tooltip.note }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import eventsData from '../../data/beijing_layers_events_top30_v1_1.json';
// 导入线索收集器
import { useClueCollector } from '@/composables/useClueCollector';

const { collectClue } = useClueCollector();

// ---------------- 数据配置 ----------------
const rawLayers = [
  { id: 'tang', name: '唐幽州城', period: '618-907 CE', image: '/images/axonometricImages/tang.png', color: '#8D6E63' },
  { id: 'liao', name: '辽南京城', period: '938-1125 CE', image: '/images/axonometricImages/liao.png', color: '#78909C' },
  { id: 'jin', name: '金中都城', period: '1153-1215 CE', image: '/images/axonometricImages/jin.png', color: '#A1887F' },
  { id: 'yuan', name: '元大都城', period: '1267-1368 CE', image: '/images/axonometricImages/yuan.png', color: '#D4E157' },
  { id: 'mingqing', name: '明清北京城', period: '1421-1912 CE', image: '/images/axonometricImages/mingqing.png', color: '#9CCC65' }
];

// Combine layers with event data
const layersWithEvents = computed(() => {
  return rawLayers.map(layer => {
    const layerData = eventsData.layers.find(l => l.id === layer.id);
    return {
      ...layer,
      events: layerData ? layerData.events_top30 : []
    };
  });
});

const explodeFactor = ref(80);
const hoveredLayerId = ref<string | null>(null);
const hoveredEventId = ref<number | null>(null);

// Tooltip State
const tooltip = ref({
  show: false,
  x: 0, 
  y: 0,
  title: '',
  year: '',
  type: '',
  location: '',
  impact: '',
  note: ''
});

// 事件点交互
const onEventEnter = (e: MouseEvent, eventData: any, layer: any) => {
  hoveredEventId.value = eventData.event_id;
  
  let targetX = e.clientX + 15;
  let targetY = e.clientY - 100;

  // 边界检查
  if (targetX + 300 > window.innerWidth) targetX -= 320;
  if (targetY < 0) targetY = 10;

  tooltip.value = {
    show: true,
    x: targetX,
    y: targetY,
    title: eventData.title,
    year: eventData.year_display,
    type: eventData.type_main,
    location: eventData.location_raw,
    impact: eventData.impact_tags,
    note: eventData.hover
  };
};

const onEventLeave = () => {
  hoveredEventId.value = null;
  tooltip.value.show = false;
};

// 双击收集线索
const onEventDblClick = (eventData: any, layer: any) => {
  collectClue({
    title: eventData.title,
    year: eventData.year_display,
    dynasty: layer.name,
    content: eventData.hover || eventData.impact_tags,
    subLabel: `${layer.name} · ${eventData.year_display}`
  }, 'clue_city', '城垣演变');
};

// ---------------- 布局计算 ----------------
const BASE_SPACING = 30;
const MAX_EXTRA_SPACING = 160;
// JSON data is based on 300x300 canvas
const DATA_CANVAS_SIZE = 300; 
// Current slab size (defined in CSS as $slab-size) is 320px
const SLAB_SIZE = 320; 

const currentSpacing = computed(() => {
  return BASE_SPACING + (explodeFactor.value / 100) * MAX_EXTRA_SPACING;
});

const getLayerTransform = (index: number) => {
  const zPos = index * currentSpacing.value;
  return {
    transform: `translateZ(${zPos}px)`,
    zIndex: layersWithEvents.value.length - index
  };
};

const getEventDotStyle = (event: any) => {
  // Scale coordinates from 300px datums to 320px actual size
  const scale = SLAB_SIZE / DATA_CANVAS_SIZE;
  const x = event.px[0] * scale;
  const y = event.px[1] * scale;
  
  return {
    left: `${x}px`,
    top: `${y}px`
  };
};

// 核心修改：缩放和平移逻辑
const sceneContainerStyle = computed(() => {
  const totalHeight = (layersWithEvents.value.length - 1) * currentSpacing.value;
  // 垂直偏移：尽量让整体居中 - 这里需要微调
  const verticalOffset = totalHeight * 0.4; 

  // !!! 在这里调整整体上下位置 (像素) !!!
  // 正数向下移，负数向上移
  const topOffset = 70; 

  return {
    transform: `
      translateY(${topOffset}px)
      scale(0.85) 
      rotateX(60deg) 
      rotateZ(45deg) 
      translateY(${verticalOffset}px) 
      translateX(${verticalOffset}px)
    `
  };
});
</script>

<style scoped lang="scss">
/* ---------------- 基础设置 ---------------- */
$card-bg: #f9f9f9; 
$slab-size: 320px; 
$slab-thick: 5px;

@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Noto+Serif+SC:wght@400;700&display=swap');

.axonometric-card {
  --font-en: "Cinzel", serif;
  --font-cn: "Noto Serif SC", serif;

  height: 100%; /* 填满父容器，或者保持固定高度 */
  min-height: 800px;
  background-color: $card-bg;
  background-image: 
    linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ---------------- 头部样式 ---------------- */
.panel-header {
  height: auto;
  min-height: 70px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start; /* 左对齐 */
  flex-wrap: nowrap; /* 不换行 */
  gap: 24px; /* Title 和 Control 之间的间距 */
  z-index: 10;
}

.header-left-group {
  display: flex;
  align-items: center;
}

.header-block {
  width: 4px;
  height: 24px;
  background: #5d4037; 
  margin-right: 12px;
  flex-shrink: 0;
}

.header-text-line {
  display: flex;
  align-items: baseline;
  gap: 12px; /* 标题和副标题的间距 */
  white-space: nowrap;
}

.panel-title {
  font-family: var(--font-cn);
  font-size: 20px;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1;
  margin: 0;
}

.panel-subtitle {
  font-family: var(--font-en);
  font-size: 10px;
  letter-spacing: 1px;
  color: #888;
  line-height: 1;
}

/* Slider 控制区 */
.explode-control {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #eee;
  padding: 4px 16px;
  border-radius: 50px; 
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
  margin-left: 0; /* 紧挨着 */
}

.control-label {
  font-family: var(--font-en);
  font-size: 10px;
  font-weight: 700;
  color: #555;
  letter-spacing: 1px;
}

.slider-wrapper {
  width: 100px;
  display: flex;
  align-items: center;
}

/* ---------------- 3D 舞台 ---------------- */
.content-wrapper {
  flex: 1;
  position: relative;
  /* 允许滚动 */
  overflow: auto; 
  display: flex;
  align-items: center; /* 如果内容比容器小，垂直居中 */
  justify-content: center; /* 水平居中 */
  padding: 40px; 
}

.viewport {
  /* 只有当内容溢出时才需要尺寸 */
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene {
  width: $slab-size;
  height: $slab-size;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.1s linear; 
  /* 确保 Scene 有足够的 margin 以便 content-wrapper 可以滚动 */
  margin: auto;
}

/* ---------------- 图层组 ---------------- */
.layer-group {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  pointer-events: none; /* 让事件穿透 */
}

/* 辅助虚线 */
.drop-line {
  position: absolute;
  width: 1px;
  background-image: linear-gradient(to bottom, #555 40%, rgba(255,255,255,0) 0%);
  background-size: 1px 6px;
  background-repeat: repeat-y;
  transform-origin: top center;
  transform: rotateX(-90deg);
  opacity: 0.4;
  pointer-events: none;
}
.corner-tl { top: 0; left: 0; }
.corner-tr { top: 0; right: 0; }
.corner-bl { bottom: 0; left: 0; }
.corner-br { bottom: 0; right: 0; }

/* 实体板 */
.layer-slab {
  position: absolute;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  cursor: default;
  transition: all 0.3s ease;
  overflow: visible;
  pointer-events: none; /* 不拦截事件 */
}
.layer-slab.is-hovered { transform: translateZ(10px); }

.slab-face {
  position: absolute;
  width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0,0,0,0.6); /* 细黑线 */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible; /* 允许事件点显示 */
  pointer-events: none; /* 让事件穿透到layer-group */
}

.layer-image {
  width: 94%; height: 94%;
  object-fit: contain;
  filter: sepia(0.1) contrast(1.1);
  pointer-events: none; /* 图片不拦截事件 */
}

.slab-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.7);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none; /* 不阻挡事件点交互 */
}
.slab-overlay.active { opacity: 1; }

/* 侧面 */
.slab-side {
  position: absolute;
  opacity: 0.8;
  border: 1px solid rgba(0,0,0,0.1);
}
/* 视觉上的左侧面 (对应 CSS 的 Bottom 边) */
.slab-side.front {
  width: 100%; 
  height: 5px; /* 保持你的厚度变量 $slab-thick */
  
  /* !!! 核心修改 !!! */
  bottom: -1px;  /* 原来是 0，改成 -1px，抵消边框宽度，不然会显得高 */
  
  left: 0;
  transform-origin: bottom; /* 确保是从底部边缘往下折 */
  transform: rotateX(-90deg);
  background: inherit; /* 确保颜色一致 */
}

/* 视觉上的右侧面 (对应 CSS 的 Right 边) */
.slab-side.right {
  width: 5px; /* 保持你的厚度变量 $slab-thick */
  height: 100%;
  
  top: 0;
  
  /* !!! 核心修改 !!! */
  right: -1px; /* 原来是 0，改成 -1px */
  
  transform-origin: right;
  transform: rotateY(90deg);
  background: inherit;
}

/* 确保主面使用 border-box，防止边框把盒子撑大导致错位 */
.slab-face {
  box-sizing: border-box; 
  /* ...其他属性保持不变 */
}

/* ---------------- 标注 (优化防遮挡) ---------------- */
.annotation-wrapper {
  position: absolute;
  /* 向右延伸的距离 */
  right: -20px; 
  top: 50%;
  /* 反向旋转使文字正对屏幕 */
  transform: translate(100%, -50%) rotateZ(-45deg) rotateX(-60deg);
  transform-origin: left center;
  display: flex;
  align-items: center;
  pointer-events: none;
  /* 确保文字在最上层 */
  z-index: 100; 
}

.annotation-line {
  width: 40px; 
  height: 1px;
  background: #333;
  margin-right: 8px;
  position: relative;
}
.annotation-line::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 3px;
  background: #333;
  border-radius: 50%;
}

.annotation-content {
  text-align: left;
  text-shadow: 0 0 5px rgba(255,255,255,0.8);
}

.annotation-name {
  font-family: var(--font-cn);
  font-size: 15px;
  font-weight: 700;
  color: #111;
  white-space: nowrap;
}

.annotation-period {
  font-family: var(--font-en);
  font-size: 11px;
  color: #666;
  margin-top: -2px;
}

/* 底部阴影 */
.ground-shadow {
  position: absolute;
  width: 140%; height: 140%;
  left: -20%; top: -20%;
  background: radial-gradient(circle, rgba(0,0,0,0.08) 0%, transparent 70%);
  transform: translateZ(-50px);
  pointer-events: none;
}

/* ---------------- 事件点图层 ---------------- */
.events-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 200;
  transform-style: preserve-3d;
  transform: translateZ(1px); /* 微微抬高确保在最上层 */
}

.event-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #AE8A53; /* 金棕色 - 与EcoIndexCard一致 */
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.25);
  transform: translate(-50%, -50%) translateZ(2px); /* 3D抬高 */
  cursor: pointer;
  pointer-events: auto !important;
  transition: all 0.18s ease;
  z-index: 9999;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));

  /* 涟漪子元素 */
  .ripple {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid #AE8A53;
    opacity: 0;
    animation: none;
  }

  &:hover,
  &.is-hovered {
    transform: translate(-50%, -50%) translateZ(2px) scale(1.4);
    background: #B79157;
    box-shadow: 0 4px 12px rgba(183, 145, 87, 0.6);

    .ripple {
      animation: ripple-expand 0.5s ease-out;
    }
  }
}

@keyframes ripple-expand {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* ---------------- Tooltip 样式 (与 EcoIndexCard 一致) ---------------- */
.fade-up-enter-active, .fade-up-leave-active {
  transition: all 0.2s ease-out;
}
.fade-up-enter-from, .fade-up-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>

<style>
/* Tooltip 需要全局样式（因为Teleport到body） */
.arch-tooltip {
  position: fixed;
  z-index: 99999;
  width: 300px;
  max-width: 320px;
  background: #E8E6E2; /* 浅灰米色，不透明 */
  color: #333;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  border-left: 3px solid #EFD160; /* 金色左边框 */
  pointer-events: none;
  font-family: "Noto Serif SC", serif;
}

.arch-tooltip .tt-header {
  border-bottom: 1px solid #CCC;
  padding-bottom: 8px;
  margin-bottom: 12px;
  background: #F0EFEB;
  padding: 12px 16px;
  margin: -16px -16px 12px -16px;
}

.arch-tooltip .tt-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.arch-tooltip .tt-name {
  font-family: "Noto Serif SC", serif;
  font-size: 16px;
  font-weight: 700;
  color: #333;
}

.arch-tooltip .tt-id {
  font-size: 11px;
  color: #666;
  font-family: "Cinzel", serif;
}

.arch-tooltip .tt-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.arch-tooltip .event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.arch-tooltip .event-tag {
  display: inline-block;
  background: #C9A962;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 1px;
}

.arch-tooltip .event-location {
  font-size: 11px;
  color: #666;
}

.arch-tooltip .tt-divider {
  height: 1px;
  background: #D1CEC7;
  margin: 4px 0;
}

.arch-tooltip .tt-description {
  font-size: 12px;
  line-height: 1.6;
  color: #444;
  margin: 0;
}

.arch-tooltip .desc-label {
  font-weight: 700;
  color: #555;
}

.arch-tooltip .tt-note {
  font-size: 11px;
  color: #777;
  margin: 0;
  padding: 8px;
  background: #F0EFEB;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.06);
}
</style>