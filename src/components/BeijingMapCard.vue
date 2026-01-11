<template>
  <v-card class="chart-card" elevation="0" variant="outlined">
    <v-card-title class="chart-title pb-0">
      北京行政区划地图
    </v-card-title>

    <v-card-text class="chart-container" style="position: relative; overflow: hidden;">
      <!-- 工具栏 -->
      <div style="position: absolute; top: 16px; left: 16px; z-index: 10; display: flex; gap: 8px;">
        <v-sheet class="pa-2 rounded-lg d-flex align-center gap-2" :color="isDark ? 'rgba(30,30,30,0.9)' : 'rgba(255,255,255,0.9)'" elevation="2" border>
          <v-btn icon size="small" variant="text" :color="mode === 'view' ? 'primary' : 'grey'" @click="mode = 'view'">
            <v-icon>mdi-cursor-move</v-icon>
            <v-tooltip activator="parent">浏览模式</v-tooltip>
          </v-btn>
          <v-divider vertical class="mx-2"></v-divider>
          
          <span class="text-caption text-grey mr-2" v-if="!xs">添加:</span>
          
          <v-btn size="small" color="amber-darken-2" variant="text" prepend-icon="mdi-note-text" @click="spawnSticker('text')">
            便签
          </v-btn>
          <v-btn size="small" color="purple-darken-2" variant="text" prepend-icon="mdi-draw" @click="spawnSticker('handwriting')">
            手写
          </v-btn>
          <v-btn size="small" color="blue-darken-2" variant="text" prepend-icon="mdi-import" @click="importFromInspiration">
            导入线索
          </v-btn>

          <v-divider vertical class="mx-2"></v-divider>

          <v-switch
            v-model="scaleWithMap"
            color="primary"
            hide-details
            density="compact"
            inset
            class="ml-2"
          >
            <template v-slot:label>
               <v-icon size="small" :color="scaleWithMap ? 'primary' : 'grey'">mdi-resize</v-icon>
            </template>
            <v-tooltip activator="parent">贴纸跟随地图缩放</v-tooltip>
          </v-switch>
        </v-sheet>
      </div>

      <div ref="mapContainer" class="map-container" @contextmenu.prevent="onContextMenu"></div>

      <!-- 贴纸层 -->
      <div id="sticker-layer" :style="{ pointerEvents: mode === 'view' ? 'none' : 'auto' }">
        <div 
          v-for="sticker in stickers" 
          :key="sticker.id"
          class="sticker-wrapper"
          :class="{ active: activeStickerId === sticker.id }"
          :style="{ 
            transform: `translate(${sticker.x}px, ${sticker.y}px) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
            zIndex: activeStickerId === sticker.id ? 100 : 10
          }"
          @click.stop="activeStickerId = sticker.id"
        >
          <!-- 胶带装饰 -->
          <div class="tape" v-if="sticker.style === 'tape'"></div>

          <v-card class="sticker-card" :theme="isDark ? 'dark' : 'light'">
            <!-- 拖拽把手 - 只有这里可以拖拽 -->
            <div class="drag-handle" @mousedown.stop.prevent="startDragSticker($event, sticker)">
              <div class="drag-handle-icon"></div>
            </div>

            <!-- 便签内容 -->
            <v-card-text v-if="sticker.type === 'text'" class="pa-3">
              <input 
                v-model="sticker.title" 
                class="sticker-title-input mb-2"
                placeholder="标题..."
              />
              <textarea 
                v-model="sticker.content" 
                class="sticker-content-input"
                rows="3"
                placeholder="写点什么..."
              ></textarea>
            </v-card-text>

            <!-- 手写内容 -->
            <v-card-text v-if="sticker.type === 'handwriting'" class="pa-3">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption text-grey">手写笔记</span>
                <v-btn size="x-small" icon="mdi-delete-sweep" variant="text" @click="clearCanvas(sticker.id)"></v-btn>
              </div>
              <canvas 
                :id="'canvas-' + sticker.id"
                class="handwriting-canvas"
                width="270" 
                height="180"
                @mousedown.stop="startDrawing($event, sticker)"
                @mousemove.stop="draw($event, sticker)"
                @mouseup.stop="stopDrawing"
                @mouseleave.stop="stopDrawing"
              ></canvas>
              <!-- 颜色选择 -->
              <div class="d-flex justify-center mt-1 gap-1">
                 <div v-for="c in ['#000000', '#D32F2F', '#1976D2', '#388E3C']" :key="c" 
                      class="color-dot" :style="{background: c, border: sticker.penColor === c ? '2px solid #999' : '1px solid #ddd'}"
                      @click.stop="sticker.penColor = c"></div>
              </div>
            </v-card-text>

            <!-- 数据卡片内容 (导入的线索) -->
            <v-card-text v-if="sticker.type === 'data'" class="pa-3">
              <div class="d-flex align-center mb-2">
                <v-icon :color="getTypeColor(sticker.sourceType)" size="small" class="mr-2">{{ getTypeIcon(sticker.sourceType) }}</v-icon>
                <span class="font-weight-bold text-subtitle-2 text-truncate">{{ sticker.title }}</span>
              </div>
              <div class="text-body-2 mb-2 sticker-text-content">{{ sticker.content }}</div>
              <div class="text-caption text-grey">来源: {{ sticker.sourceType || '线索板' }}</div>
            </v-card-text>

            <!-- 底部操作栏 -->
            <v-divider class="border-opacity-10"></v-divider>
            <v-card-actions class="py-1 px-2" style="min-height: 32px;">
              <span class="text-caption text-disabled" style="font-size: 10px;">{{ sticker.date }}</span>
              <v-spacer></v-spacer>
              <v-btn icon="mdi-delete" size="x-small" color="red-lighten-2" variant="text" @click="deleteSticker(sticker.id)"></v-btn>
            </v-card-actions>
          </v-card>
          
          <!-- 连接点 -->
          <div class="connector-dot mt-2"></div>
        </div>
      </div>
    </v-card-text>

    <!-- 右键菜单 -->
    <div 
      v-if="contextMenu.show" 
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div v-if="!contextMenu.markerId" class="menu-item" @click="showAddDialog">
        <v-icon size="small" class="mr-2">mdi-plus-circle</v-icon>
        添加标注
      </div>
      <div v-else class="menu-item delete" @click="deleteMarker(contextMenu.markerId)">
        <v-icon size="small" class="mr-2">mdi-delete</v-icon>
        删除标注
      </div>
    </div>

    <!-- 添加标注对话框 -->
    <v-dialog v-model="addDialog.show" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6">添加标注</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="addDialog.title"
            label="标注内容"
            placeholder="请输入标注文字"
            variant="outlined"
            density="comfortable"
            autofocus
            @keyup.enter="addMarker"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelAddDialog">取消</v-btn>
          <v-btn color="primary" variant="flat" @click="addMarker">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, reactive } from 'vue';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from 'vuetify';

// Mapbox Access Token from environment
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// 引入 Inspiration Store
import { useInspirationStore } from '@/stores/inspirationStore'
import { useDisplay } from 'vuetify'
import { storeToRefs } from 'pinia' // 确保响应式

const inspirationStore = useInspirationStore()
const { inspirationItems } = storeToRefs(inspirationStore)
const { xs } = useDisplay()

// 贴纸接口
interface Sticker {
  id: number
  type: 'text' | 'handwriting' | 'data'
  lng: number
  lat: number
  x: number
  y: number
  scale: number
  rotation: number
  style: 'tape' | 'plain'
  title: string
  content: string
  penColor?: string // for handwriting
  sourceType?: string // for data
  date: string
}
interface MapMarker {
  id: string;
  title: string;
  lngLat: mapboxgl.LngLat;
  marker: mapboxgl.Marker;
}

// Refs
const mapContainer = ref<HTMLElement | null>(null);
let map: mapboxgl.Map | null = null;

// 存储所有标注
const markers = ref<MapMarker[]>([]);
let markerIdCounter = 0;

// Sticker 状态
const mode = ref<'view' | 'sticker-drag'>('sticker-drag') // 默认编辑模式，允许拖拽
const scaleWithMap = ref(false)
const stickers = ref<Sticker[]>([])
const activeStickerId = ref<number | null>(null)
let isDraggingSticker = false
let draggedStickerId: number | null = null
let dragOffset = { x: 0, y: 0 }

// 绘画状态
let isDrawing = false
let lastX = 0
let lastY = 0

// Mapbox 相关变量用于 scale 计算
const BASE_ZOOM = 9.5

// 右键菜单状态
const contextMenu = reactive({
  show: false,
  x: 0,
  y: 0,
  lngLat: null as mapboxgl.LngLat | null,
  markerId: null as string | null,
});

// 添加对话框状态
const addDialog = reactive({
  show: false,
  title: '',
});

// 右键菜单处理
const onContextMenu = (e: MouseEvent) => {
  if (!map) return;
  
  // 获取地图坐标
  const rect = mapContainer.value?.getBoundingClientRect();
  if (!rect) return;
  
  const mapX = e.clientX - rect.left;
  const mapY = e.clientY - rect.top;
  const lngLat = map.unproject([mapX, mapY]);
  
  // 检查是否点击了已有标注
  let clickedMarkerId: string | null = null;
  for (const marker of markers.value) {
    const markerEl = marker.marker.getElement();
    const markerRect = markerEl.getBoundingClientRect();
    if (
      e.clientX >= markerRect.left &&
      e.clientX <= markerRect.right &&
      e.clientY >= markerRect.top &&
      e.clientY <= markerRect.bottom
    ) {
      clickedMarkerId = marker.id;
      break;
    }
  }
  
  contextMenu.show = true;
  contextMenu.x = e.offsetX;
  contextMenu.y = e.offsetY;
  contextMenu.lngLat = lngLat;
  contextMenu.markerId = clickedMarkerId;
};

// 显示添加对话框
const showAddDialog = () => {
  contextMenu.show = false;
  addDialog.title = '';
  addDialog.show = true;
};

// 取消添加
const cancelAddDialog = () => {
  addDialog.show = false;
  addDialog.title = '';
  contextMenu.lngLat = null;
};

// 添加标注
const addMarker = () => {
  if (!map || !contextMenu.lngLat || !addDialog.title.trim()) {
    addDialog.show = false;
    return;
  }
  
  const id = `marker-${++markerIdCounter}`;
  
  // 创建自定义标注元素
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.innerHTML = `
    <div class="marker-pin"></div>
    <div class="marker-label">${addDialog.title}</div>
  `;
  
  // 创建 Mapbox Marker
  const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat(contextMenu.lngLat)
    .addTo(map);
  
  // 保存到列表
  markers.value.push({
    id,
    title: addDialog.title,
    lngLat: contextMenu.lngLat,
    marker,
  });
  
  addDialog.show = false;
  addDialog.title = '';
  contextMenu.lngLat = null;
};

// 删除标注
const deleteMarker = (id: string) => {
  const index = markers.value.findIndex(m => m.id === id);
  if (index !== -1) {
    markers.value[index].marker.remove();
    markers.value.splice(index, 1);
  }
  contextMenu.show = false;
  contextMenu.markerId = null;
};

// 点击其他地方关闭菜单
const closeContextMenu = () => {
  contextMenu.show = false;
};

// Theme
const vuetifyTheme = useTheme();
const isDark = computed(() => vuetifyTheme.global.current.value.dark);

// 复古风格配色
const themeColors = computed(() => {
  return isDark.value
    ? {
        fill: 'rgba(161, 136, 127, 0.3)',
        fillHover: 'rgba(161, 136, 127, 0.5)',
        stroke: '#A1887F',
        text: '#D7CCC8',
        bg: '#263238',
      }
    : {
        fill: 'rgba(161, 136, 127, 0.2)',
        fillHover: 'rgba(161, 136, 127, 0.4)',
        stroke: '#8D6E63',
        text: '#5a4b40',
        bg: '#fcfaf6',
      };
});

// 初始化地图
const initMap = async () => {
  if (!mapContainer.value || !mapboxgl.accessToken) {
    console.error('Map container not found or Mapbox token missing');
    return;
  }

  // 创建地图实例
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: isDark.value 
      ? 'mapbox://styles/mapbox/dark-v11' 
      : 'mapbox://styles/mapbox/light-v11',
    center: [116.397, 39.9075], // 北京市中心
    zoom: BASE_ZOOM,
    minZoom: 7,
    maxZoom: 14,
    preserveDrawingBuffer: true // 允许截图等操作
  });

  // 监听地图事件以更新贴纸
  map.on('move', updateStickerPositions);
  map.on('zoom', updateStickerPositions);
  map.on('resize', updateStickerPositions);

  // 添加导航控件
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // 地图加载完成后添加北京区划图层
  map.on('load', async () => {
    try {
      const response = await fetch('/data/maps/beijing_full.json');
      const beijingGeoJson = await response.json();

      // 添加数据源
      map!.addSource('beijing-districts', {
        type: 'geojson',
        data: beijingGeoJson,
      });

      // 添加填充图层
      map!.addLayer({
        id: 'beijing-fill',
        type: 'fill',
        source: 'beijing-districts',
        paint: {
          'fill-color': themeColors.value.fill,
          'fill-opacity': 0.8,
        },
      });

      // 添加边界线图层
      map!.addLayer({
        id: 'beijing-outline',
        type: 'line',
        source: 'beijing-districts',
        paint: {
          'line-color': themeColors.value.stroke,
          'line-width': 1.5,
        },
      });

      // Hover 高亮效果
      let hoveredId: number | null = null;

      map!.on('mousemove', 'beijing-fill', (e) => {
        if (e.features && e.features.length > 0) {
          if (hoveredId !== null) {
            map!.setFeatureState(
              { source: 'beijing-districts', id: hoveredId },
              { hover: false }
            );
          }
          hoveredId = e.features[0].id as number;
          map!.setFeatureState(
            { source: 'beijing-districts', id: hoveredId },
            { hover: true }
          );
          map!.getCanvas().style.cursor = 'pointer';
        }
      });

      map!.on('mouseleave', 'beijing-fill', () => {
        if (hoveredId !== null) {
          map!.setFeatureState(
            { source: 'beijing-districts', id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = null;
        map!.getCanvas().style.cursor = '';
      });

      // 点击显示区名
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'beijing-popup',
      });

      map!.on('click', 'beijing-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const name = props?.name || '未知区域';
          const center = props?.center ? JSON.parse(props.center) : e.lngLat;

          popup
            .setLngLat(center)
            .setHTML(`<strong>${name}</strong>`)
            .addTo(map!);
        }
      });

      // 为 GeoJSON 添加唯一 ID（用于 hover 状态）
      beijingGeoJson.features.forEach((feature: any, index: number) => {
        feature.id = index;
      });
      (map!.getSource('beijing-districts') as mapboxgl.GeoJSONSource).setData(beijingGeoJson);

    } catch (error) {
      console.error('Failed to load Beijing GeoJSON:', error);
    }
  });
};

// 更新地图样式
const updateMapStyle = () => {
  if (!map) return;
  
  map.setStyle(isDark.value 
    ? 'mapbox://styles/mapbox/dark-v11' 
    : 'mapbox://styles/mapbox/light-v11'
  );
  
  // 样式变化后需要重新添加图层
  map.once('style.load', async () => {
    try {
      const response = await fetch('/data/maps/beijing_full.json');
      const beijingGeoJson = await response.json();
      
      beijingGeoJson.features.forEach((feature: any, index: number) => {
        feature.id = index;
      });

      if (!map!.getSource('beijing-districts')) {
        map!.addSource('beijing-districts', {
          type: 'geojson',
          data: beijingGeoJson,
        });
      }

      if (!map!.getLayer('beijing-fill')) {
        map!.addLayer({
          id: 'beijing-fill',
          type: 'fill',
          source: 'beijing-districts',
          paint: {
            'fill-color': themeColors.value.fill,
            'fill-opacity': 0.8,
          },
        });
      }

      if (!map!.getLayer('beijing-outline')) {
        map!.addLayer({
          id: 'beijing-outline',
          type: 'line',
          source: 'beijing-districts',
          paint: {
            'line-color': themeColors.value.stroke,
            'line-width': 1.5,
          },
        });
      }
    } catch (error) {
      console.error('Failed to reload layers:', error);
    }
  });
};

// 监听主题变化
watch(isDark, () => {
  updateMapStyle();
});

onMounted(() => {
  initMap();
  
  // 尝试加载存储的数据
  if (inspirationStore.loadFromLocalStorage) {
    inspirationStore.loadFromLocalStorage()
  }

  // 全局事件监听
  document.addEventListener('click', closeContextMenu);
  window.addEventListener('mousemove', onGlobalMouseMove);
  window.addEventListener('mouseup', onGlobalMouseUp);
  
  // 注入字体
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&family=Noto+Sans+SC:wght@300;400;500&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
  window.removeEventListener('mousemove', onGlobalMouseMove);
  window.removeEventListener('mouseup', onGlobalMouseUp);
  if (map) {
    map.remove();
    map = null;
  }
});

// --- Sticker 核心逻辑 ---

// 更新贴纸位置和缩放
const updateStickerPositions = () => {
  if (!map) return;
  const currentZoom = map.getZoom();
  const k = Math.pow(2, currentZoom - BASE_ZOOM);
  
  stickers.value.forEach(s => {
    // 经纬度 -> 屏幕坐标
    const point = map!.project([s.lng, s.lat]);
    s.x = point.x;
    s.y = point.y;
    
    // 缩放逻辑
    s.scale = scaleWithMap.value ? k : 1;
  });
};

// 生成贴纸
const spawnSticker = (type: 'text' | 'handwriting' | 'data', lng?: number, lat?: number, data?: any) => {
  if (!map) return;
  
  let targetLng = lng;
  let targetLat = lat;
  
  // 如果未指定位置，默认屏幕中心
  if (targetLng === undefined || targetLat === undefined) {
    const center = map.getCenter();
    targetLng = center.lng;
    targetLat = center.lat;
  }

  const newSticker: Sticker = {
    id: Date.now() + Math.random(),
    type,
    lng: targetLng!,
    lat: targetLat!,
    x: 0, 
    y: 0,
    scale: 1,
    rotation: (Math.random() - 0.5) * 6,
    style: Math.random() > 0.5 ? 'tape' : 'plain',
    title: data?.title || (type === 'data' ? '数据卡片' : ''),
    content: data?.content || '',
    penColor: '#000000',
    sourceType: data?.sourceType,
    date: new Date().toLocaleDateString()
  };
  
  stickers.value.push(newSticker);
  activeStickerId.value = newSticker.id;
  updateStickerPositions();
};

const importFromInspiration = async () => {
  // 确保数据已加载
  inspirationStore.loadFromLocalStorage()
  
  // 注意：store中是 items 不是 inspirationItems
  const items = inspirationStore.items;
  console.log('Trying to import, count:', items?.length);
  
  if (!items || items.length === 0) {
    alert('线索板为空，请先去收集一些线索');
    return;
  }
  
  // 随机散落在当前视图内
  if (!map) return;
  const bounds = map.getBounds();
  
  // 限制一次导入的数量，防止卡顿
  const itemsToImport = items.slice(0, 10); 
  
  itemsToImport.forEach((item: any, index: number) => {
    // 简单的随机位置分布算法
    const lng = bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest()) * 0.8 + (bounds.getEast() - bounds.getWest()) * 0.1;
    const lat = bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth()) * 0.8 + (bounds.getNorth() - bounds.getSouth()) * 0.1;
    
    setTimeout(() => {
        spawnSticker('data', lng, lat, {
            title: item.title,
            content: item.content, // 只取前100字防止太长? 不，让它自适应
            sourceType: item.sourceType
        });
    }, index * 150);
  });
  
  scaleWithMap.value = true; // 导入时自动开启跟随模式
};

// 拖拽逻辑 - 现在只在drag-handle上触发
const startDragSticker = (e: MouseEvent, sticker: Sticker) => {
  // 不再检查mode，因为只有把手会触发此事件
  isDraggingSticker = true;
  draggedStickerId = sticker.id;
  activeStickerId.value = sticker.id;
  
  dragOffset.x = e.clientX;
  dragOffset.y = e.clientY;
};

const onGlobalMouseMove = (e: MouseEvent) => {
  if (!isDraggingSticker || !draggedStickerId || !map) return;
  
  const sticker = stickers.value.find(s => s.id === draggedStickerId);
  if (sticker) {
    const dx = e.clientX - dragOffset.x;
    const dy = e.clientY - dragOffset.y;
    
    // 更新屏幕坐标 (临时)
    sticker.x += dx;
    sticker.y += dy;
    
    dragOffset.x = e.clientX;
    dragOffset.y = e.clientY;
    
    // 反算经纬度 (这样松手或缩放时位置正确)
    const lngLat = map.unproject([sticker.x, sticker.y]);
    sticker.lng = lngLat.lng;
    sticker.lat = lngLat.lat;
  }
};

const onGlobalMouseUp = () => {
  isDraggingSticker = false;
  draggedStickerId = null;
};

// 删除贴纸
const deleteSticker = (id: number) => {
  stickers.value = stickers.value.filter(s => s.id !== id);
};

// 辅助函数
const getTypeIcon = (type: string) => {
  const map: Record<string, string> = {
    'clue_river': 'mdi-water',
    'clue_climate': 'mdi-weather-partly-cloudy',
    'clue_event': 'mdi-calendar-alert',
    'clue_city': 'mdi-city-variant',
    'clue_eco': 'mdi-tree',
    'clue_transport': 'mdi-road-variant',
    'clue_commerce': 'mdi-finance',
    'clue_ai_analysis': 'mdi-robot',
    'default': 'mdi-file-document-outline'
  }
  return map[type] || map['default']
}

const getTypeColor = (type: string) => {
  const map: Record<string, string> = {
    'clue_river': 'blue',
    'clue_climate': 'orange',
    'clue_event': 'red',
    'clue_city': 'purple',
    'clue_eco': 'green',
    'clue_transport': 'brown',
    'clue_commerce': 'indigo',
    'clue_ai_analysis': 'deep-purple',
    'default': 'grey'
  }
  return map[type] || map['default']
}

// Canvas 手写逻辑
const startDrawing = (e: MouseEvent, sticker: Sticker) => {
  isDrawing = true;
  const canvas = document.getElementById('canvas-' + sticker.id) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  lastX = (e.clientX - rect.left) * scaleX;
  lastY = (e.clientY - rect.top) * scaleY;
  
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.strokeStyle = sticker.penColor || '#000000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
};

const draw = (e: MouseEvent, sticker: Sticker) => {
  if (!isDrawing) return;
  const canvas = document.getElementById('canvas-' + sticker.id) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  ctx.lineTo(x, y);
  ctx.stroke();
  
  lastX = x;
  lastY = y;
};

const stopDrawing = () => {
  isDrawing = false;
};

const clearCanvas = (id: number) => {
  const canvas = document.getElementById('canvas-' + id) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
};
</script>

<style scoped lang="scss">
$bg-color: #f5f5f5;
$card-bg-color: #fafafa;
$border-color: #e0e0e0;
$text-color: #424242;

.chart-card {
  background-color: $card-bg-color;
  border: 1px solid $border-color;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &.v-theme--dark {
    background-color: #2d2d2d;
    border-color: #424242;
  }
}

.chart-title {
  font-weight: 600;
  color: $text-color;
  padding: 16px 16px 0 16px;
  text-align: center;
  flex-shrink: 0;

  .v-theme--dark & {
    color: #e0e0e0;
  }
}

.chart-container {
  padding: 8px;
  flex: 1;
  min-height: 0;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 350px;
  border-radius: 8px;
  overflow: hidden;
}

// Popup 样式
:global(.beijing-popup .mapboxgl-popup-content) {
  background: rgba(250, 246, 240, 0.95);
  padding: 8px 12px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  color: #5a4b40;
}

:global(.v-theme--dark .beijing-popup .mapboxgl-popup-content) {
  background: rgba(38, 50, 56, 0.95);
  color: #D7CCC8;
}

// 右键菜单样式
.context-menu {
  position: absolute;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 140px;
  overflow: hidden;

  .v-theme--dark & {
    background: #2d2d2d;
  }
}

.menu-item {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #424242;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }

  &.delete {
    color: #d32f2f;
  }

  .v-theme--dark & {
    color: #e0e0e0;

    &:hover {
      background-color: #3d3d3d;
    }

    &.delete {
      color: #ef5350;
    }
  }
}

// 自定义标注样式
:global(.custom-marker) {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

:global(.marker-pin) {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #ef5350 0%, #d32f2f 100%);
  border: 2px solid white;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

:global(.marker-label) {
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.95);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #424242;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.v-theme--dark .marker-label) {
  background: rgba(45, 45, 45, 0.95);
  color: #e0e0e0;
}

// Sticker Styles
.sticker-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  will-change: transform;
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 优化性能，减少重绘 */
  backface-visibility: hidden;
}

.sticker-card {
  width: 280px;
  /* 类似毛玻璃/纸质材质 */
  background: rgba(255, 255, 255, 0.9) !important;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 12px !important;
  transition: box-shadow 0.2s, border-color 0.2s;
  overflow: visible !important;
  
  &.v-theme--dark {
    background: rgba(45, 45, 45, 0.85) !important;
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
}

.sticker-wrapper.active .sticker-card {
  border-color: rgba(168, 150, 126, 0.8); /* #A8967E */
  box-shadow: 0 12px 32px rgba(168, 150, 126, 0.25);
  
  &.v-theme--dark {
    border-color: rgba(168, 150, 126, 0.6);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
  }
}

/* 拖拽把手 */
.drag-handle {
  cursor: grab;
  height: 20px;
  width: 100%;
  background: rgba(0, 0, 0, 0.03);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  
  &:active {
    cursor: grabbing;
    background: rgba(0, 0, 0, 0.08);
  }
  
  .v-theme--dark & {
    background: rgba(255, 255, 255, 0.05);
    
    &:active {
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.drag-handle-icon {
  width: 32px;
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
  
  .v-theme--dark & {
    background: rgba(255, 255, 255, 0.2);
  }
}

/* 手写画布 */
canvas.handwriting-canvas {
  border: 1px dashed rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  cursor: crosshair;
  touch-action: none;
  
  .v-theme--dark & {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.2);
  }
}

/* 颜色选择点 */
.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
  
  &:hover {
    transform: scale(1.2);
  }
}

/* 胶带效果 */
.tape {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%) rotate(-1.5deg);
  width: 80px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.3);
  opacity: 0.9;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  z-index: 2;
  pointer-events: none;
  backdrop-filter: blur(2px);
  border-left: 1px dashed rgba(0,0,0,0.05);
  border-right: 1px dashed rgba(0,0,0,0.05);
}

/* 输入框样式重置 */
.sticker-title-input {
  width: 100%;
  font-size: 1.1rem;
  font-weight: 700;
  border: none;
  background: transparent;
  outline: none;
  color: inherit;
  font-family: 'Noto Sans SC', sans-serif;
  
  &::placeholder {
    color: rgba(0,0,0,0.3);
  }
  
  .v-theme--dark &::placeholder {
    color: rgba(255,255,255,0.3);
  }
}

.sticker-content-input {
  width: 100%;
  min-height: 80px;
  font-family: 'Kalam', cursive; /* 手写字体 */
  font-size: 1.05rem;
  line-height: 1.5;
  border: none;
  background: transparent;
  outline: none;
  resize: none;
  color: inherit;
  
  &::placeholder {
    color: rgba(0,0,0,0.3);
    font-style: italic;
  }
  
  .v-theme--dark &::placeholder {
    color: rgba(255,255,255,0.3);
  }
}

/* 连接点 */
.connector-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #E91E63;
  box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.3);
  pointer-events: none;
}

.sticker-text-content {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(0,0,0,0.7);
  
  /* 多行截断 */
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  .v-theme--dark & {
    color: rgba(255,255,255,0.7);
  }
}

#sticker-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  overflow: hidden; /* 防止贴纸超出容器 */
}
</style>
