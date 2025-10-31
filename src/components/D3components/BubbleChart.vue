<template>
  <v-card class="chart-card d-flex flex-column h-100" elevation="0" variant="outlined">
    <v-card-title class="chart-title">
      {{ chartTitle }}
    </v-card-title>
    
    <v-card-text class="chart-container flex-grow-1">
      <div ref="svgContainer" class="d3-svg-container"></div>
      <div ref="tooltip" class="chart-tooltip"></div>
    </v-card-text>
    
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as d3 from 'd3'; 
// [!! 修改 !!] 移除了 useTheme
// import { useTheme } from 'vuetify'; 

// --- 1. 接口定义 ---
interface DisasterData {
  year: number;
  dynasty: string;
  category: string; 
}

interface AggregatedData {
  dynasty: string;
  category: string;
  count: number;
}

// --- 2. 响应式状态定义 ---
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null); 
// [!! 修改 !!] 移除了 vuetifyTheme
// const vuetifyTheme = useTheme(); 
const allDisasters = ref<DisasterData[]>([]); 
const resizeObserver = ref<ResizeObserver | null>(null);
const chartTitle = "北京古代灾害时空分布 (气泡图)"; 

// --- 3. 异步数据获取与处理 ---
async function loadData() {
  try {
    const rawData = await d3.json('/data/disaster_events(3).json') as any[];
    
    const data: DisasterData[] = rawData.map(d => ({
      year: +d.year_abs, 
      dynasty: d.dynasty_name, // 确保使用 "dynasty_name"
      category: d.disaster_type
    }));
    
    data.sort((a, b) => a.year - b.year);
    allDisasters.value = data;
    
  } catch (error) {
    console.error('Error loading or processing data:', error);
    allDisasters.value = []; 
  }
}

// --- [!! 核心修改 !!] ---
// --- 4. 主题色计算属性 (硬编码为 "都城纪事" 风格) ---
const themeColors = computed(() => {
  // 硬编码 "都城纪事" 的棕色/米色主题
  return {
    bg: '#fcfaf6',       // 页面背景
    cardBg: '#faf6f0',   // 卡片背景
    text: '#5a4b40',     // 深棕色文字
    textLight: '#6d5f53', // 中棕色文字 (用于轴标签)
    stroke: '#dcd3c5',   // 边框
    grid: '#dcd3c5',     // 网格线
  };
});
// --- [ 修复结束 ] ---

// --- 5. 绘制图表的核心函数 ---
function drawChart() {
  // 0. 清理旧图表并获取容器尺寸
  if (!svgContainer.value || !tooltip.value) return;
  d3.select(svgContainer.value).select('svg').remove();

  const { width, height } = svgContainer.value.getBoundingClientRect();
  const margin = { top: 20, right: 40, bottom: 50, left: 100 }; 
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const data = allDisasters.value;
  if (data.length === 0) return;

  // 1. 数据聚合
  const aggregatedMap = d3.rollup(
    data, 
    v => v.length, 
    d => d.dynasty, 
    d => d.category 
  );

  const flatData: AggregatedData[] = [];
  aggregatedMap.forEach((categoryMap, dynasty) => {
    categoryMap.forEach((count, category) => {
      flatData.push({ dynasty, category, count });
    });
  });

  // 1. 创建 SVG 和 G 元素
  const svg = d3.select(svgContainer.value)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // 2. 定义比例尺 - X轴 (朝代)
  
  // [!! 修正 !!] 移除硬编码的 xDomain，动态生成
  // const xDomain = [
  //   "汉朝", "魏晋南北朝", "隋唐五代", "宋辽金", "元朝", "明朝", "清朝", "民国时期", "近当代"
  // ];

  // [!! 修正 !!] 
  // data 已经在 loadData() 中按年份排序
  // 按此顺序提取唯一的朝代名
  const uniqueDynasties = [];
  const seenDynasties = new Set();
  for (const d of data) {
    if (d.dynasty && !seenDynasties.has(d.dynasty)) { // 确保 dynasty 存在
      uniqueDynasties.push(d.dynasty);
      seenDynasties.add(d.dynasty);
    }
  }
  const xDomain = uniqueDynasties;

  const xScale = d3.scaleBand()
    .domain(xDomain) 
    .range([0, innerWidth])
    .padding(0.1);

  // 3. 定义比例尺 - Y轴 (灾害类别)
  const yDomain = Array.from(new Set(data.map(d => d.category)));
  const yScale = d3.scaleBand()
    .domain(yDomain)
    .range([0, innerHeight])
    .padding(0.1);

  // 4. 定义比例尺 - 颜色 (灾害类别)
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(yDomain);

  // 5. 定义比例尺 - 气泡半径 (R)
  const maxCount = d3.max(flatData, d => d.count)!;
  const maxRadius = Math.min(xScale.bandwidth(), yScale.bandwidth()) / 2 * 0.9;
  
  const rScale = d3.scaleSqrt() 
    .domain([0, maxCount])
    .range([1, maxRadius]); 

  // 6. 绘制坐标轴 (将使用 v-bind 绑定的 themeColors)
  // X轴
  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    // [!! 修正 !!] 移除了 .tickFormat()，因为它依赖于已删除的硬编码 xDomain
    .call(d3.axisBottom(xScale)) 
    .call(g => g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", margin.bottom - 10)
      .attr("fill", themeColors.value.text) // 使用新主题色
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("朝代"));

  // Y轴
  g.append('g')
    .call(d3.axisLeft(yScale))
    .call(g => g.selectAll(".tick line").remove())
    .call(g => g.append("text") 
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 30) 
      .attr("x", -innerHeight / 2)
      .attr("fill", themeColors.value.text) // 使用新主题色
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .text("灾难类别"));

  // Y轴网格线
  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat(() => "")
    )
    .call(g => g.selectAll(".domain").remove());

  // 7. 绘制气泡 (使用 flatData)
  g.selectAll('.disaster-bubble') 
    .data(flatData, (d: AggregatedData) => `${d.dynasty}-${d.category}`) 
    .join(
      enter => enter.append('circle')
        .attr('class', 'disaster-bubble')
        .attr('cx', d => xScale(d.dynasty)! + xScale.bandwidth() / 2) 
        .attr('cy', d => yScale(d.category)! + yScale.bandwidth() / 2)
        .attr('fill', d => colorScale(d.category)!)
        .attr('opacity', 0) 
        .attr('r', 0) 
        .call(enter => enter.transition().duration(500) 
          .attr('opacity', 0.7)
          .attr('r', d => rScale(d.count)!)
        ),
      
      update => update
        .call(update => update.transition().duration(300) 
          .attr('cx', d => xScale(d.dynasty)! + xScale.bandwidth() / 2)
          .attr('cy', d => yScale(d.category)! + yScale.bandwidth() / 2)
          .attr('fill', d => colorScale(d.category)!)
          .attr('r', d => rScale(d.count)!) 
          .attr('opacity', 0.7)
        ),
      
      exit => exit
        .call(exit => exit.transition().duration(300) 
          .attr('r', 0) 
          .attr('opacity', 0)
          .remove()
        )
    );

  // 8. 绑定工具提示事件
  g.selectAll('.disaster-bubble')
    .on('mouseover', (event, d: any) => { 
      const currentRadius = rScale(d.count)!;
      d3.select(event.currentTarget)
        .transition().duration(100)
        .attr('r', currentRadius * 1.15) 
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('opacity', 0.9);
      
      tooltip.value!.style.display = 'block';
      tooltip.value!.innerHTML = `
        <strong>${d.dynasty}</strong><br>
        灾害类别: ${d.category}<br>
        <strong>发生次数: ${d.count}</strong>
      `;
    })
    .on('mouseout', (event, d: any) => {
      const currentRadius = rScale(d.count)!;
      d3.select(event.currentTarget)
        .transition().duration(100)
        .attr('r', currentRadius) 
        .attr('stroke', 'none')
        .attr('stroke-width', 0)
        .attr('opacity', 0.7); 
      tooltip.value!.style.display = 'none';
    })
    .on('mousemove', (event) => {
      const [x, y] = d3.pointer(event, svgContainer.value);
      tooltip.value!.style.transform = `translate(${x + 15}px, ${y - 10}px)`;
    });
}

// --- 6. Vue 生命周期钩子 ---
onMounted(async () => {
  await loadData();
  
  if (svgContainer.value) {
    drawChart(); 
    resizeObserver.value = new ResizeObserver(() => {
      drawChart();
    });
    resizeObserver.value.observe(svgContainer.value);
  }
});

onUnmounted(() => {
  if (resizeObserver.value && svgContainer.value) {
    resizeObserver.value.unobserve(svgContainer.value);
  }
});

// --- 7. 监听数据和主题变化 ---
watch(allDisasters, () => {
  drawChart();
});

// [!! 修改 !!] 移除了 watch(themeColors, ...)
// watch(themeColors, () => {
//   drawChart();
// });

</script>

<style scoped lang="scss">
/* --- [!! 核心修改 !!] --- */
/* "都城纪事" 风格 SCSS 变量 */
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;
$text-mid-brown: #6d5f53;
$text-light-brown: #8c7b6f;
/* --- [ 修复结束 ] --- */

.chart-card {
  border-color: $border-color; /* [!! 修改 !!] */
  background-color: $card-bg-color; /* [!! 新增 !!] */
  /* [!! 修正 !!] 移除了 height: 100% (已由 h-100 class 替代) */
  display: flex;
  flex-direction: column;
}

.chart-title {
  font-weight: 600;
  color: $text-dark-brown; /* [!! 修改 !!] (变量值已更新) */
  padding: 16px; 
  text-align: center; 
  flex-shrink: 0;
  
  /* [!! 移除 !!] 移除了 .v-theme--dark & ... */
}

.chart-container {
  padding: 0;
  margin: 0;
  flex-grow: 1; 
  /* [!! 修正 !!] 移除了 min-height: 500px; */
  width: 100%; 
  position: relative; 
  overflow: hidden; 

  > .d3-svg-container {
    height: 100%;
    width: 100%;
  }
  
  /* --- [!! 核心修改 !!] --- */
  /* 悬浮提示框 (使用 "都城纪事" 风格) */
  :deep(.chart-tooltip) {
    position: absolute;
    top: 0;
    left: 0;
    display: none;
    background-color: rgba(250, 246, 240, 0.95); /* $card-bg-color + alpha */
    border: 1px solid $border-color;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    color: $text-dark-brown;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    pointer-events: none; 
    white-space: nowrap;
    z-index: 10;
  }
  
  /* [!! 移除 !!] 移除了 .v-theme--dark & :deep(.chart-tooltip) ... */
  /* --- [ 修复结束 ] --- */

  /* D3 内部元素样式 */
  /* (这部分通过 v-bind 自动更新，无需修改) */
  :deep(svg) {
    width: 100%;
    height: 100%;
    background-color: v-bind('themeColors.bg');
    display: block; 
    
    .domain {
      stroke: v-bind('themeColors.stroke');
    }
    .tick line {
      stroke: v-bind('themeColors.stroke');
      opacity: 0.3;
    }
    .tick text {
      fill: v-bind('themeColors.textLight');
      font-size: 11px;
    }
    
    /* Y轴网格线样式 */
    .grid .tick line {
      stroke: v-bind('themeColors.grid');
      opacity: 0.2;
      stroke-dasharray: 2,2; /* 虚线 */
    }
    
    .disaster-bubble {
      cursor: pointer;
      stroke: none;
    }
  }
}
</style>