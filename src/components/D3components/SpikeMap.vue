<template>
  <v-card class="chart-card" elevation="0" variant="outlined">
    <v-card-title class="chart-title pb-0">
      时空频次图
    </v-card-title>

    <v-card-text class="pb-0">
      <v-select
        v-model="selectedDynasty"
        :items="dynasties"
        label="选择朝代"
        variant="solo-filled"
        density="compact"
        hide-details
      ></v-select>
    </v-card-text>
    
    <v-card-text class="chart-container">
      <div ref="svgContainer" class="d3-svg-container"></div>
      <div ref="tooltip" class="chart-tooltip"></div>
    </v-card-text>
    
    </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, type PropType } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';
import type { FeatureCollection } from 'geojson'; 

// --- 接口与 Props (无变动) ---
interface EventItem {
  id: number;
  year: number;
  yearPrefix: string;
  dynasty: string;
  title: string;
  description: string;
  tags: string[];
  people: string;
  province: string;
}
const props = defineProps({
  allEvents: {
    type: Array as PropType<EventItem[]>,
    required: true
  }
});

// --- 状态定义 (无变动) ---
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null); 
const vuetifyTheme = useTheme();
const chinaGeoJson = ref<FeatureCollection | null>(null);
const resizeObserver = ref<ResizeObserver | null>(null);
const selectedDynasty = ref('全部朝代');

// --- 配色 (无变动) ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  const antiqueLight = {
    bg: "#fcfaf6", text: "#5a4b40", textLight: "#6d5f53", 
    stroke: "#a1887f", areaLight: "transparent",
    areaDark: "rgba(161, 136, 127, 0.2)", line: "#BF360C", 
  };
  const antiqueDark = {
    bg: "#263238", text: "#D7CCC8", textLight: "#A1887F", 
    stroke: "#A1887F", areaLight: "transparent",
    areaDark: "rgba(161, 136, 127, 0.2)", line: "#FF8A65", 
  };
  return isDark ? antiqueDark : antiqueLight;
});

// --- [!! 核心修改 1: 添加地名归一化函数 !!] ---
/**
 * 将 CSV 中的地名 (如 "北京", "陕西") 转换为 GeoJSON 中的标准名称 (如 "北京市", "陕西省")
 * @param name 
 */
function normalizeProvinceName(name: string): string {
  if (!name || name === '未知') return '未知';

  // 检查是否已经是标准名称
  const suffixes = ['省', '市', '自治区', '特别行政区'];
  if (suffixes.some(s => name.endsWith(s))) {
    return name;
  }

  // 添加特定后缀
  const specialMunicipalities = ['北京', '上海', '天津', '重庆'];
  if (specialMunicipalities.includes(name)) {
    return `${name}市`;
  }

  const autonomousRegions: Record<string, string> = {
    '内蒙古': '内蒙古自治区',
    '西藏': '西藏自治区',
    '广西': '广西壮族自治区',
    '宁夏': '宁夏回族自治区',
    '新疆': '新疆维吾尔自治区',
    '香港': '香港特别行政区',
    '澳门': '澳门特别行政区'
  };
  if (autonomousRegions[name]) {
    return autonomousRegions[name];
  }

  // 默认添加 "省"
  return `${name}省`;
}

// --- 3. 计算属性 ---
const dynasties = computed(() => {
  return ['全部朝代', ...Array.from(new Set(props.allEvents.map(e => e.dynasty)))];
});

// --- [!! 核心修改 2: 频次统计时使用归一化函数 !!] ---
const provinceFrequencies = computed(() => {
  const counts = new Map<string, number>();
  
  const filteredEvents = props.allEvents.filter(e => 
    selectedDynasty.value === '全部朝代' || e.dynasty === selectedDynasty.value
  );

  for (const event of filteredEvents) {
    // [!! MODIFIED !!]
    // 使用归一化函数处理地名
    const province = normalizeProvinceName(event.province); 
    
    if (province && province !== '未知') {
      counts.set(province, (counts.get(province) || 0) + 1);
    }
  }
  return counts;
});


// --- 4. 异步数据获取 (无变动) ---
async function loadMapData() {
  try {
    const chinaRes = await fetch('/data/maps/china.json'); 
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

// --- [!! 核心修改 3: 仿照示例修改 D3 绘图函数 !!] ---
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
  const frequencies = provinceFrequencies.value; 
  
  d3.select(svgContainer.value).html(''); 

  const svg = d3.select(svgContainer.value).append("svg")
      .attr("viewBox", [0, 0, width, height])
      .style("background-color", colors.bg);

  const projection = d3.geoMercator();
  const path = d3.geoPath().projection(projection);

  // 使用 fitSize 自动 "Contain" (无变动)
  projection.fitSize([width, height], geoData);

  const g = svg.append("g");

  // Tooltip 事件 (无变动)
  const onMouseOver = (event: MouseEvent, d: any) => {
    const name = d.properties.name || '未知区域';
    const count = frequencies.get(name) || 0;
    tooltipEl.style("visibility", "visible").html(`<strong>${name}</strong><br>事件数: ${count}`);
    d3.select(event.currentTarget as any).style('fill', colors.areaDark);
  };
  const onMouseMove = (event: MouseEvent) => {
    tooltipEl.style("top", `${event.pageY + 10}px`).style("left", `${event.pageX + 10}px`);
  };
  const onMouseOut = (event: MouseEvent) => {
    tooltipEl.style("visibility", "hidden");
    d3.select(event.currentTarget as any).style('fill', colors.areaLight);
  };

  // 1. 绘制底图 (无变动)
  g.selectAll('path.province')
    .data(geoData.features)
    .join('path')
    .attr('class', 'province')
    .attr('d', path as any)
    .style('fill', colors.areaLight)
    .style('stroke', colors.stroke)
    .style('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on("mouseover", onMouseOver)
    .on("mousemove", onMouseMove)
    .on("mouseout", onMouseOut);

  // [!! MODIFIED: 2. 绘制尖刺 (改为 <path> 元素) !!]
  
  // a. 定义尖刺 <path> 形状的辅助函数 (仿照示例)
  const spikeWidth = 4; // 尖刺底座宽度 (像素)
  function spike(length: number): string {
    if (length === 0) return "";
    // M = MoveTo (起点在质心), L = LineTo (画到左上), L = LineTo (画到右上), Z = ClosePath (闭合回起点)
    return `M 0,0 L ${-spikeWidth / 2},${-length} L ${spikeWidth / 2},${-length} Z`;
  }

  // b. 创建尖刺的高度比例尺 (无变动)
  const maxFreq = d3.max(Array.from(frequencies.values())) || 1;
  const spikeScale = d3.scaleLinear()
    .domain([0, maxFreq])
    .range([0, height / 5]); // 最大尖刺高度为容器的1/5

  // c. 绘制尖刺 <path> (仿照示例)
  g.append("g") // 创建一个组来存放所有尖刺
      .attr("fill", colors.line)
      .attr("fill-opacity", 0.7)
      .attr("stroke", colors.line)
      .attr("stroke-width", 0.5)
    .selectAll('path.spike')
    .data(geoData.features) // 依然绑定地理特征
    .join('path')
    .attr('class', 'spike')
    .style('pointer-events', 'none')
    .attr('transform', (d: any) => {
      // 1. 获取省份中心点 [x, y]
      const centroid = path.centroid(d);
      // 2. 使用 translate 将 <path> 的起点 (0,0) 移动到该中心点
      return `translate(${centroid[0]},${centroid[1]})`;
    })
    .attr('d', (d: any) => {
      // 1. 获取省份名并查询频次
      const provinceName = d.properties.name;
      const freq = frequencies.get(provinceName) || 0;
      // 2. 计算尖刺的实际高度
      const spikeHeight = spikeScale(freq);
      // 3. 调用辅助函数，生成 "d" 属性 (path 路径字符串)
      return spike(spikeHeight);
    });

  // 缩放 (无变 động)
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

watch(provinceFrequencies, () => {
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
  padding: 16px 16px 0 16px; 
  text-align: center; 
  position: relative;
  
  .v-theme--dark & {
    color: #D7CCC8;
  }
}

.v-card-text {
  :deep(.v-select) {
    background-color: $bg-color;
    .v-theme--dark & {
      background-color: #37474F;
    }
  }
}

.chart-container {
  padding: 0;
  margin: 0;
  height: 450px; 
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
      transition: fill 0.2s ease-in-out;
    }
    .spike {
      transition: all 0.3s ease-in-out;
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