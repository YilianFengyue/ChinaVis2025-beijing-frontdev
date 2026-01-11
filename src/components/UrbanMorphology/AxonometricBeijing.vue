<template>
  <div class="axonometric-container d-flex flex-column h-100 position-relative">
    
    <div class="controls-layer d-flex justify-space-between align-center px-2 pt-2 pb-2">
      
      <div class="text-h6 font-weight-bold text-brown-darken-3 d-flex align-center title-text">
        <v-icon icon="mdi-map-clock-outline" class="mr-2" color="brown-darken-3"></v-icon>
        北京城垣 · 轴向构造
      </div>
      
      <div class="d-flex align-center">
        <div class="control-pill d-flex align-center px-4 py-1 elevation-2">
          <span class="text-caption font-weight-bold text-brown mr-3">视图展开</span>
          <v-slider
            v-model="explodeFactor"
            :min="0"
            :max="100"
            :step="1"
            density="compact"
            hide-details
            thumb-size="14"
            track-color="brown-lighten-4"
            color="brown-darken-2"
            style="width: 100px"
          ></v-slider>
        </div>
      </div>
    </div>

    <div class="content-area d-flex flex-grow-1 overflow-hidden">
      
      <div 
        class="viewport flex-grow-1"
        @mousemove="handleMouseMove"
        @mouseleave="resetRotation"
      >
        <div class="scene" :style="sceneStyle">
          <svg width="0" height="0" style="position: absolute;">
            <defs>
              <filter id="paper-noise-3">
                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" in="noise" result="coloredNoise" />
                <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite" />
                <feBlend mode="multiply" in="composite" in2="SourceGraphic" />
              </filter>
            </defs>
          </svg>

          <div 
            v-for="(layer, index) in layers" 
            :key="layer.id"
            class="layer-slab"
            :class="{ 'is-hovered': hoveredLayerId === layer.id, 'is-dimmed': hoveredLayerId && hoveredLayerId !== layer.id }"
            :style="getLayerStyle(index)"
            @mouseenter="hoveredLayerId = layer.id"
            @mouseleave="hoveredLayerId = null"
          >
             <div class="slab-content" :class="layer.cssClass">
                <component :is="layer.render" />
             </div>
             <div class="slab-side front"></div>
             <div class="slab-side right"></div>
          </div>

        </div>
      </div>

      <div class="legend-panel px-4 py-6 d-flex flex-column justify-center">
        <div 
          v-for="layer in layers.slice().reverse()" 
          :key="layer.id"
          class="legend-item mb-4 pa-3 rounded-lg cursor-pointer"
          :class="{ 'active': hoveredLayerId === layer.id }"
          @mouseenter="hoveredLayerId = layer.id"
          @mouseleave="hoveredLayerId = null"
        >
          <div class="d-flex align-center mb-1">
            <div class="legend-dot mr-3" :style="{ background: layer.color }"></div>
            <div class="font-weight-bold text-body-2 text-brown-darken-2">{{ layer.name }}</div>
          </div>
          <div class="text-caption text-grey-darken-1 pl-6 lh-sm">
            {{ layer.desc }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';

// --- 图层数据定义 (全图片材质) ---
const layers = [
  {
    id: 'geo',
    name: '山川基底',
    desc: '北京湾三面环山，东南平原向海敞开的地理形势。',
    color: '#81C784',
    cssClass: 'geo-layer',
    render: () => h('img', { 
      src: '/images/surface.png', 
      alt: '地形地貌',
      style: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover',
        display: 'block',
        opacity: 0.9
      }
    })
  },
  {
    id: 'water',
    name: '水系脉络',
    desc: '永定河冲积扇与积水潭水系，城市水源的命脉。',
    color: '#29B6F6',
    cssClass: 'water-layer',
    render: () => h('img', { 
      src: '/images/revier.png', 
      alt: '水系分布',
      style: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover',
        display: 'block',
        filter: 'sepia(0.1)' 
      }
    })
  },
  {
    id: 'history',
    name: '明清城垣',
    desc: '经典的“凸”字形城廓与贯穿南北的中轴线。',
    color: '#8D6E63',
    cssClass: 'history-layer',
    render: () => h('img', { 
      src: '/images/city.png', 
      alt: '明清城垣',
      style: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover', 
        display: 'block',
        filter: 'sepia(0.2) contrast(1.1)' 
      }
    })
  },
  {
    id: 'modern',
    name: '现代格局',
    desc: '环路蔓延与多中心发展的现代城市肌理。',
    color: '#78909C',
    cssClass: 'road-layer',
    render: () => h('img', { 
      src: '/images/trans.png', 
      alt: '交通路网',
      style: { 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover',
        display: 'block',
        opacity: 0.95
      }
    })
  }
];

// --- 状态与交互逻辑 ---
const explodeFactor = ref(40);
const rotateX = ref(60);
const rotateZ = ref(40);
const hoveredLayerId = ref<string | null>(null);

const mouseX = ref(0);
const mouseY = ref(0);

const handleMouseMove = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  mouseX.value = x * 8; 
  mouseY.value = y * 8;
};

const resetRotation = () => {
  mouseX.value = 0;
  mouseY.value = 0;
};

const sceneStyle = computed(() => ({
  transform: `rotateX(${rotateX.value - mouseY.value}deg) rotateZ(${rotateZ.value + mouseX.value}deg)`
}));

// 图层动态样式计算 (紧凑间距版)
const getLayerStyle = (index: number) => {
  const baseSpacing = 30; // 基础间距
  const dynamicSpacing = (explodeFactor.value / 100) * 100; // 动态最大间距
  
  const currentId = layers[index].id;
  
  let zPos = index * (baseSpacing + dynamicSpacing);
  
  if (hoveredLayerId.value === currentId) {
    zPos += 20;
  }

  const shadowBlur = 20 + (index * 10) + (explodeFactor.value / 5);
  const shadowOpacity = 0.3 - (index * 0.04);
  
  return {
    transform: `translateZ(${zPos}px)`,
    zIndex: index,
    '--shadow-blur': `${shadowBlur}px`,
    '--shadow-opacity': Math.max(0.1, shadowOpacity)
  };
};
</script>

<style scoped lang="scss">
/* --- 基础变量 --- */
$panel-width: 260px;
$slab-size: 320px;
$slab-thick: 6px;

/* 容器：透明背景 */
.axonometric-container {
  background: transparent;
}

/* 顶部标题与控制区 */
.title-text {
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

.bg-white-transparent {
  background: rgba(255,255,255,0.4);
  backdrop-filter: blur(4px);
  &:hover {
    background: rgba(255,255,255,0.8);
  }
}

.control-pill {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(141, 110, 99, 0.2);
  border-radius: 999px;
  backdrop-filter: blur(8px);
}

/* --- 3D 视口 --- */
.viewport {
  position: relative;
  perspective: 1600px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 5%;
  padding-top: 5%;
}

.scene {
  width: $slab-size;
  height: $slab-size;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.2s cubic-bezier(0.1, 0.5, 0.5, 1);
}

/* --- 图层板 (Layer Slab) --- */
.layer-slab {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s;
  cursor: pointer;
  
  &.is-dimmed {
    filter: opacity(0.4) grayscale(0.2);
  }
}

.slab-content {
  position: absolute;
  width: 100%; height: 100%;
  background-color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.9);
  /* 动态阴影 */
  box-shadow: 0 20px var(--shadow-blur) rgba(93, 64, 55, var(--shadow-opacity));
  transition: all 0.3s ease;
  backface-visibility: hidden;
  
  /* 纸质纹理滤镜 - 叠加在图片之上 */
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.2;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 2; /* 确保纹理在图片之上 */
  }
}

/* 侧面厚度 */
.slab-side {
  position: absolute;
  background: rgba(200, 190, 180, 0.8);
  pointer-events: none;
  border: 1px solid rgba(255,255,255,0.2);
}
.slab-side.front {
  width: 100%; height: $slab-thick;
  bottom: 0; left: 0;
  transform-origin: bottom;
  transform: rotateX(-90deg);
  background: linear-gradient(to bottom, #d7ccc8, #a1887f);
}
.slab-side.right {
  width: $slab-thick; height: 100%;
  right: 0; top: 0;
  transform-origin: right;
  transform: rotateY(-90deg);
  background: linear-gradient(to right, #a1887f, #8d6e63);
}

/* 各层背景色 */
.geo-layer { background: linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%); }
.water-layer { background: rgba(225, 245, 254, 0.4); }
.history-layer { background: rgba(255, 248, 225, 0.5); border-color: rgba(141, 110, 99, 0.4); }
.road-layer { background: rgba(236, 239, 241, 0.3); }

/* --- 右侧图例面板 --- */
.legend-panel {
  width: $panel-width;
  background: rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);
  z-index: 10;
  border-radius: 16px 0 0 16px; 
}

.legend-item {
  transition: all 0.2s ease;
  border: 1px solid transparent;
  
  &:hover, &.active {
    background: rgba(255,255,255,0.85);
    border-color: rgba(141, 110, 99, 0.2);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    transform: translateX(-4px);
  }

  .legend-dot {
    width: 12px; height: 12px;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
}

.lh-sm { line-height: 1.3; }

/* 暗色模式适配 */
.v-theme--dark {
  .control-pill {
    background: rgba(30, 30, 30, 0.6);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .bg-white-transparent {
    background: rgba(50,50,50,0.4);
    &:hover { background: rgba(50,50,50,0.8); }
  }
  .slab-content {
    background-color: rgba(30, 40, 45, 0.6);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .legend-panel {
    background: rgba(0, 0, 0, 0.2);
  }
  .legend-item:hover, .legend-item.active {
    background: rgba(50, 50, 50, 0.8);
    border-color: rgba(255,255,255,0.2);
  }
  .text-brown-darken-3, .text-brown-darken-2 { color: #d7ccc8 !important; }
  .text-brown { color: #bcaaa4 !important; }
  .title-text { text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
}
</style>