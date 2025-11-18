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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import * as d3 from 'd3'; 
import { useTheme } from 'vuetify';

// --- 1. 数据定义：模拟波状带数据 ---
interface ImportanceData {
  dynasty: string;
  minVal: number; // 带状区域的下限 (重要度)
  maxVal: number; // 带状区域的上限 (重要度)
  mid: number;    // 带状区域的中心线 (用于描边)
}

const rawData: ImportanceData[] = [
    // 为了模拟波浪效果，minVal 和 maxVal 之间有一个基本跨度，并在此基础上波动
    { dynasty: '先秦', minVal: 1.5, maxVal: 2.5, mid: 2 },
    { dynasty: '秦汉', minVal: 2.0, maxVal: 3.5, mid: 2.75 },
    { dynasty: '魏晋南北朝', minVal: 1.0, maxVal: 3.0, mid: 2.0 },
    { dynasty: '隋唐五代', minVal: 2.5, maxVal: 4.5, mid: 3.5 },
    { dynasty: '辽宋金', minVal: 1.5, maxVal: 2.8, mid: 2.15 },
    { dynasty: '元', minVal: 3.0, maxVal: 5.0, mid: 4.0 },
    { dynasty: '明', minVal: 2.5, maxVal: 4.0, mid: 3.25 },
    { dynasty: '清', minVal: 1.0, maxVal: 2.0, mid: 1.5 },
    { dynasty: '民国', minVal: 0.5, maxVal: 1.5, mid: 1.0 },
];

// --- 2. 响应式状态定义 ---
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLDivElement | null>(null); 
const vuetifyTheme = useTheme();
const resizeObserver = ref<ResizeObserver | null>(null);
const chartTitle = "灾害重要度带状图 (X-Y 坐标)"; 

// --- 3. 仿古风格配色 ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "#fcfaf6",       
    text: "#5a4b40",     
    stroke: "#dcd3c5",   
    bandFill: "#BF360C", // 红色系用于面积填充
    bandLine: "#8D6E63", // 深棕色用于中心线
    axisColor: "#5a4b40", 
  };

  const antiqueDark = {
    bg: "#263238", 
    text: "#D7CCC8", 
    stroke: "#4E342E", 
    bandFill: "#FF8A65", 
    bandLine: "#D7CCC8",
    axisColor: "#D7CCC8", 
  };
  
  return isDark ? antiqueDark : antiqueLight;
});

// --- 4. D3 绘图函数 ---
const drawChart = () => {
  if (!svgContainer.value) return;

  d3.select(svgContainer.value).select('svg').remove();

  const containerWidth = svgContainer.value.clientWidth;
  const containerHeight = svgContainer.value.clientHeight;
  
  if (containerWidth === 0 || containerHeight === 0) return;

  const margin = { top: 30, right: 30, bottom: 40, left: 50 }; 
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  const colors = themeColors.value;
  
  // --- 比例尺定义 ---
  
  // 1. X 轴 (Band Scale): 映射朝代到宽度
  const dynastyList = rawData.map(d => d.dynasty);
  const x = d3.scaleBand<string>()
      .domain(dynastyList)
      .range([0, width])
      .padding(0.1); 

  // 2. Y 轴 (Linear Scale): 映射重要度分数到高度
  const yMax = d3.max(rawData, d => d.maxVal) || 1;
  const yMin = d3.min(rawData, d => d.minVal) || 0;
  const y = d3.scaleLinear()
      // 增加一点缓冲
      .domain([yMin * 0.9, yMax * 1.1]) 
      .range([height, 0]);

  // --- 绘制 SVG 和 Group ---

  const svg = d3.select(svgContainer.value)
    .append("svg")
    .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
    .attr("style", "width: 100%; height: 100%;")
    .style("background-color", colors.bg);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // --- 生成器 ---
  
  // 面积生成器：定义带状区域
  const areaGenerator = d3.area<ImportanceData>()
      .x(d => x(d.dynasty)! + x.bandwidth() / 2) // X 轴位置：朝代中心
      .y0(d => y(d.minVal)) // 区域下边界
      .y1(d => y(d.maxVal)) // 区域上边界
      // 使用 d3.curveCardinal 曲线模拟波浪感
      .curve(d3.curveCardinal.tension(0.8));

  // 线条生成器：用于绘制带状区域的中心线
  const lineGenerator = d3.line<ImportanceData>()
      .x(d => x(d.dynasty)! + x.bandwidth() / 2)
      .y(d => y(d.mid))
      .curve(d3.curveCardinal.tension(0.8));

  // --- 绘制图表内容 ---

  // 1. 绘制带状区域 (阴影部分)
  g.append("path")
    .datum(rawData)
    .attr("fill", colors.bandFill)
    .attr("fill-opacity", 0.3)
    .attr("d", areaGenerator);

  // 2. 绘制带状区域的中心线（模拟核心趋势）
  g.append("path")
    .datum(rawData)
    .attr("fill", "none")
    .attr("stroke", colors.bandLine)
    .attr("stroke-width", 1.5)
    .attr("d", lineGenerator);

  // 3. 绘制 X 轴和标签
  const xAxis = d3.axisBottom(x)
      .tickSize(0)
      .tickPadding(10); 

  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${height})`)
    .call(xAxis)
    .call(g => g.select(".domain").remove()) // 移除底部基线
    .selectAll("text")
    .attr("fill", colors.axisColor)
    .style("font-size", "12px");

  // 4. 绘制 Y 轴和标签
  const yAxis = d3.axisLeft(y)
      .ticks(5) // 仅保留 5 个刻度
      .tickSizeInner(-width) // 绘制网格线
      .tickSizeOuter(0)
      .tickFormat(d => d.toFixed(1));

  g.append("g")
    .attr("class", "y-axis")
    .call(yAxis)
    .call(g => g.select(".domain").remove()) // 移除 Y 轴主线
    .call(g => g.selectAll(".tick line") // 样式化网格线
        .attr("stroke", colors.stroke)
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "2,2"))
    .selectAll("text")
    .attr("fill", colors.axisColor)
    .style("font-size", "12px");

  // 5. Y 轴标题 (重要度)
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 15)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", colors.axisColor)
    .style("font-size", "14px")
    .text("重要度 (Y 轴)");
    
  // 6. 交互点 (可选，用于展示数据点)
  g.selectAll(".data-point")
    .data(rawData)
    .join("circle")
    .attr("class", "data-point")
    .attr("cx", d => x(d.dynasty)! + x.bandwidth() / 2)
    .attr("cy", d => y(d.mid))
    .attr("r", 5)
    .attr("fill", colors.bandLine)
    .attr("stroke", colors.bg)
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 7);
        tooltip.value!.style.display = 'block';
        tooltip.value!.innerHTML = `
          <strong>${d.dynasty}</strong><br>
          重要度范围: ${d.minVal.toFixed(1)} - ${d.maxVal.toFixed(1)}
        `;
    })
    .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svgContainer.value);
        tooltip.value!.style.transform = `translate(${x + 15}px, ${y - 10}px)`;
    })
    .on("mouseout", function() {
        d3.select(this).attr("r", 5);
        tooltip.value!.style.display = 'none';
    });


};

// --- 5. Vue 生命周期与侦听器 ---
onMounted(() => {
  nextTick(() => {
    setTimeout(drawChart, 300);
    if (svgContainer.value) {
      resizeObserver.value = new ResizeObserver(() => {
        drawChart();
      });
      resizeObserver.value.observe(svgContainer.value);
    }
  });
});

onUnmounted(() => {
  if (resizeObserver.value && svgContainer.value) {
    resizeObserver.value.unobserve(svgContainer.value);
  }
  // 确保移除全局创建的 tooltip
  d3.select('.chart-tooltip').remove(); 
});

watch(themeColors, () => {
  nextTick(drawChart);
}, { deep: true });
</script>

<style scoped lang="scss">
// --- 样式 (使用您的仿古风格) ---
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;

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
  flex-shrink: 0;
  
  .v-theme--dark & {
    color: #D7CCC8;
  }
}

.chart-container {
  padding: 0;
  margin: 0;
  flex-grow: 1; 
  min-height: 350px; /* 确保有足够的高度来显示图表 */
  width: 100%; 
  position: relative; 

  > .d3-svg-container {
    height: 100%;
    width: 100%;
  }
}

.legend-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    padding: 8px 16px;
    background-color: transparent;
}

// D3 Tooltip 样式
.chart-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  background-color: rgba(250, 246, 240, 0.95);
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
</style>