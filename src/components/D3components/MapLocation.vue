<template>
  <v-card class="chart-card" elevation="0" variant="outlined">
    <v-card-title class="chart-title">
      {{ chartTitle }}
      
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        @click="emit('close')"
        style="position: absolute; top: 10px; right: 10px; z-index: 10;"
      ></v-btn>

    </v-card-title>
    
    <v-card-text class="chart-container">
      <div ref="svgContainer" class="d3-svg-container"></div>
      <div ref="tooltip" class="chart-tooltip"></div>
    </v-card-text>
    
    </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';
import type { FeatureCollection } from 'geojson'; 

// [!! MODIFIED: 添加 props 和 emits !!]
const props = defineProps({
  highlightProvince: {
    type: String,
    default: ''
  }
});
const emit = defineEmits(['close']);


// --- 1. 响应式状态定义 (无变动) ---
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null); 
const vuetifyTheme = useTheme();
const chinaGeoJson = ref<FeatureCollection | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);

// --- 2. 仿古风格配色 (无变动) ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  const antiqueLight = {
    bg: "#fcfaf6", text: "#5a4b40", textLight: "#6d5f53", 
    stroke: "#a1887f", areaLight: "transparent",
    areaDark: "rgba(161, 136, 127, 0.2)", line: "#BF360C", // 高亮色
  };
  const antiqueDark = {
    bg: "#263238", text: "#D7CCC8", textLight: "#A1887F", 
    stroke: "#A1887F", areaLight: "transparent",
    areaDark: "rgba(161, 136, 127, 0.2)", line: "#FF8A65", // 高亮色
  };
  return isDark ? antiqueDark : antiqueLight;
});

// --- 3. 计算属性 (无变动) ---
const chartTitle = computed(() => {
  // 标题可以根据高亮的省份变化
  if (props.highlightProvince && props.highlightProvince !== '未知') {
    return `中国地图 · ${props.highlightProvince}`;
  }
  return '中国地图 · 概览';
});

// --- 4. 异步数据获取 (无变动) ---
async function loadMapData() {
  try {
    const chinaRes = await fetch('/data/maps/china_full.json'); 
    if (!chinaRes.ok) throw new Error('网络响应失败');
    chinaGeoJson.value = await chinaRes.json();
  } catch (error) {
    console.error('加载地图数据时出错:', error);
    if (svgContainer.value) {
      d3.select(svgContainer.value).html(
        `<p style="text-align: center; color: gray; padding-top: 50px;">
          地图数据加载失败。
         </p>`
      );
    }
  }
}

// --- 5. D3 绘图函数 ( [!! 核心修改 !!] ) ---
const createChart = () => {
  const geoData = chinaGeoJson.value; 
  if (!svgContainer.value) return;

  const width = svgContainer.value.clientWidth;
  const height = svgContainer.value.clientHeight;
  
  if (width === 0 || height === 0 || !geoData) {
    d3.select(svgContainer.value).html(
      `<p style="text-align: center; color: gray; padding-top: 50px;">
        ${!geoData ? '正在加载地图数据...' : '容器尺寸无效'}
       </p>`
    );
    return;
  }
  
  const tooltipEl = d3.select(tooltip.value);
  const colors = themeColors.value;
  
  d3.select(svgContainer.value).html(''); 

  const svg = d3.select(svgContainer.value).append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("background-color", colors.bg);

  const projection = d3.geoMercator();
  const path = d3.geoPath().projection(projection);

  // [!! 保留您之前的自定义修改 (陕西居中) !!]
  projection.center([108.9, 34.3]);
  projection.translate([(width / 10)+170, height / 2]);
  const [[x0, y0], [x1, y1]] = path.bounds(geoData);
  const sX = width / (x1 - x0);
  const sY = height / (y1 - y0);
  const scale = Math.min(sX, sY) * projection.scale();
  projection.scale(scale*6);
  // [!! 自定义修改结束 !!]


  const g = svg.append("g");

  // [!! MODIFIED: Tooltip 事件, 增加高亮判断 !!]
  const highlightColor = colors.line;
  const defaultColor = colors.areaLight;
  const hoverColor = colors.areaDark;

  const onMouseOver = (event: MouseEvent, d: any) => {
    const name = d.properties.name || '未知区域';
    tooltipEl.style("visibility", "visible").html(`<strong>${name}</strong>`);
    // 仅当不是被选中的高亮省份时，才应用悬浮色
    if (d.properties.name !== props.highlightProvince) {
      d3.select(event.currentTarget as any).style('fill', hoverColor);
    }
  };
  const onMouseMove = (event: MouseEvent) => {
    tooltipEl.style("top", `${event.pageY + 10}px`).style("left", `${event.pageX + 10}px`);
  };
  const onMouseOut = (event: MouseEvent, d: any) => {
    tooltipEl.style("visibility", "hidden");
    // 检查是否是被选中的高亮省份
    const isHighlighted = d.properties.name === props.highlightProvince;
    // 如果是高亮省份，恢复高亮色；否则恢复默认色
    d3.select(event.currentTarget as any).style('fill', isHighlighted ? highlightColor : defaultColor);
  };

  // [!! MODIFIED: 绘制路径, 增加高亮判断 !!]
  g.selectAll('path')
    .data(geoData.features)
    .join('path')
    .attr('d', path as any)
    .attr('class', 'province')
    // 根据 prop 设置初始填充色
    .style('fill', (d: any) => {
      return d.properties.name === props.highlightProvince ? highlightColor : defaultColor;
    })
    .style('stroke', colors.stroke)
    // 高亮省份的描边更粗
    .style('stroke-width', (d: any) => {
      return d.properties.name === props.highlightProvince ? 1.5 : 0.5;
    })
    .style('cursor', 'pointer')
    .on("mouseover", onMouseOver)
    .on("mousemove", onMouseMove)
    .on("mouseout", onMouseOut);

  // 缩放 (无变动)
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform.toString());
    });
  svg.call(zoom);
};

// --- 6. Vue 生命周期与侦听器 (无变动) ---
onMounted(async () => {
  await loadMapData();
  
  if (svgContainer.value) {
    resizeObserver.value = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        createChart();
      }
    });
    resizeObserver.value.observe(svgContainer.value);
  }
});

onUnmounted(() => {
  if (resizeObserver.value && svgContainer.value) {
    resizeObserver.value.unobserve(svgContainer.value);
    resizeObserver.value.disconnect();
  }
});

// [!! MODIFIED: 添加对 prop 的侦听 !!]
watch(() => props.highlightProvince, () => {
  // 当高亮的省份变化时，重绘图表
  createChart();
});

watch(themeColors, () => {
  createChart();
});

</script>

<style scoped lang="scss">
/* --- 样式 (无变动) --- */
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;
$text-mid-brown: #6d5f53;

.chart-card {
  background-color: $card-bg-color;
  border: 1px solid $border-color;
  
  &.v-theme--dark {
    background-color: #263238;
    border-color: #4E342E;
  }
}

.chart-title {
  font-weight: 600;
  color: $text-dark-brown;
  padding: 16px; 
  text-align: center; 
  position: relative; /* 为关闭按钮定位 */
  
  .v-theme--dark & {
    color: #D7CCC8;
  }
}

.chart-container {
  padding: 0;
  margin: 0;
  height: 500px; 
  width: 100%; 
  position: relative; 
  overflow: hidden; 

  > .d3-svg-container {
    height: 100%;
    width: 100%;
  }

  :deep(svg) {
    width: 100%;
    height: 100%;
    display: block; 
    
    .province {
      transition: fill 0.2s ease-in-out, stroke-width 0.2s ease-in-out;
    }
  }
}

.chart-tooltip {
  position: absolute; 
  visibility: hidden;
  padding: 8px 12px;
  border-radius: 4px;
  z-index: 10;
  font-size: 13px;
  line-height: 1.4;
  pointer-events: none; 
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  
  background-color: v-bind('themeColors.bg');
  color: v-bind('themeColors.text');
  border: 1px solid v-bind('themeColors.stroke');

  :deep(strong) {
    color: v-bind('themeColors.line');
    font-weight: 600;
  }
}
</style>