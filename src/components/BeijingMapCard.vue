<template>
  <v-card class="chart-card" elevation="0" variant="outlined">
    <v-card-title class="chart-title pb-0">
      北京行政区划地图
    </v-card-title>

    <v-card-text class="chart-container">
      <div ref="mapContainer" class="map-container" @contextmenu.prevent="onContextMenu"></div>
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

// 标注接口
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
    center: [116.397, 39.9075], // 北京市中心（天安门广场）
    zoom: 9.5,
    minZoom: 7,
    maxZoom: 14,
  });

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
  // 点击其他地方关闭右键菜单
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
  if (map) {
    map.remove();
    map = null;
  }
});
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
</style>
