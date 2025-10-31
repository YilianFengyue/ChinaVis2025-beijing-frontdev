<template>
  <v-card class="chart-card" elevation="0" variant="outlined">
    <v-card-title class="chart-title">
      {{ chartTitle }}
    </v-card-title>
    
    <v-card-text class="chart-container">
      <div ref="svgContainer" class="d3-svg-container"></div>
      <div ref="tooltip" class="chart-tooltip"></div>
    </v-card-text>
    
    <v-card-actions class="dynasty-selector">
      <v-chip-group
        v-model="selectedDynasty"
        column
        mandatory
      >
        <v-chip
          v-for="dynasty in dynastyList"
          :key="dynasty"
          :value="dynasty"
          variant="outlined"
          size="small"
        >
          {{ dynasty }}
        </v-chip>
      </v-chip-group>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';

// --- 1. 响应式状态定义 ---
// ... (无变动) ...
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null); 
const vuetifyTheme = useTheme();
const allDisasterData = ref<any[]>([]); 
const allCategories = ref<string[]>([]); 
const dynastyList = ref<string[]>([]); 
const processedData = ref<Map<string, { category: string, value: number }[]>>(new Map());
const selectedDynasty = ref('西汉'); 

// --- 2. 异步数据获取与处理 ---
// ... (无变动) ...
async function fetchDataAndProcess() {
  try {
    const response = await fetch('/data/disaster_events(3).json'); 
    if (!response.ok) throw new Error('网络响应失败');
    const rawData = await response.json();
    allDisasterData.value = rawData;

    const categoriesSet = new Set<string>();
    const dataMap = new Map<string, Map<string, number>>(); 
    const dynastyTotalWeight = new Map<string, number>();

    rawData.forEach((event: any) => {
      if (!event.dynasty_name || !event.disaster_type || event.weight == null) {
        return; 
      }
      
      const dynasty = event.dynasty_name;
      const category = event.disaster_type;
      const weight = +event.weight || 0;

      categoriesSet.add(category);

      if (!dataMap.has(dynasty)) {
        dataMap.set(dynasty, new Map<string, number>());
      }
      const categoryMap = dataMap.get(dynasty)!;
      const currentCatWeight = categoryMap.get(category) || 0;
      categoryMap.set(category, currentCatWeight + weight);

      const currentTotalWeight = dynastyTotalWeight.get(dynasty) || 0;
      dynastyTotalWeight.set(dynasty, currentTotalWeight + weight);
    });

    allCategories.value = Array.from(categoriesSet).sort();

    const sortedDynasties = Array.from(dynastyTotalWeight.entries())
                            .sort((a, b) => b[1] - a[1]);
    
    const top10 = sortedDynasties.slice(0, 10);
    const top10Names = new Set(top10.map(d => d[0]));

    const finalProcessedData = new Map<string, { category: string, value: number }[]>();
    const otherDynastyGroupedMap = new Map<string, number>();
    allCategories.value.forEach(cat => otherDynastyGroupedMap.set(cat, 0));

    dataMap.forEach((originalCategoryMap, dynasty) => {
      
      const groupedCategoryMap = new Map<string, number>();
      
      originalCategoryMap.forEach((weight, category) => {
        groupedCategoryMap.set(category, (groupedCategoryMap.get(category) || 0) + weight);
      });
      
      if (top10Names.has(dynasty)) {
        const chartArray = allCategories.value.map(category => ({
          category: category,
          value: groupedCategoryMap.get(category) || 0, 
        }));
        finalProcessedData.set(dynasty, chartArray);

      } else {
        groupedCategoryMap.forEach((weight, category) => {
          const currentOtherTotal = otherDynastyGroupedMap.get(category) || 0;
          otherDynastyGroupedMap.set(category, currentOtherTotal + weight);
        });
      }
    });

    const otherChartArray = allCategories.value.map(category => ({
      category: category,
      value: otherDynastyGroupedMap.get(category) || 0,
    }));
    finalProcessedData.set('其他', otherChartArray);
    
    dynastyList.value = [...top10.map(d => d[0]), '其他'];
    
    processedData.value = finalProcessedData;

    if (top10Names.has('西汉')) {
      selectedDynasty.value = '西汉';
    } else if (dynastyList.value.length > 0) {
      selectedDynasty.value = dynastyList.value[0]; 
    } else {
      selectedDynasty.value = '其他';
    }

  } catch (error) {
    console.error('加载或处理灾害数据时出错:', error);
  }
}

// --- 3. 计算属性 ---
// ... (无变动) ...
const chartTitle = computed(() => {
  return `${selectedDynasty.value || '加载中...'} · 灾害权重 (径向图)`;
});

const chartData = computed(() => {
  return processedData.value.get(selectedDynasty.value) || [];
});

// --- 4. 仿古风格配色 ---
// ... (无变动) ...
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "#fcfaf6", 
    text: "#5a4b40", 
    textLight: "#6d5f53", 
    stroke: "#dcd3c5", 
    areaLight: "rgba(161, 136, 127, 0.2)",
    areaDark: "rgba(161, 136, 127, 0.4)", 
    line: "#BF360C", 
  };

  const antiqueDark = {
    bg: "#263238", 
    text: "#D7CCC8", 
    textLight: "#A1887F", 
    stroke: "#4E342E", 
    areaLight: "rgba(161, 136, 127, 0.2)",
    areaDark: "rgba(161, 136, 127, 0.4)", 
    line: "#FF8A65", 
  };
  
  return isDark ? antiqueDark : antiqueLight;
});


// --- 5. D3 绘图函数 ( [!! 核心修改 !!] ) ---
const createChart = () => {
  if (!svgContainer.value || chartData.value.length === 0 || allCategories.value.length === 0) {
    d3.select(svgContainer.value).html('<p style="text-align: center; color: gray; padding-top: 50px;">数据加载中或当前朝代无数据。</p>');
    return;
  }
  
  const tooltipEl = d3.select(tooltip.value);
  if (!tooltipEl.node()) {
    console.warn("Tooltip DOM element (ref='tooltip') not found.");
  }

  const data = chartData.value;
  const categories = allCategories.value;
  const colors = themeColors.value;
  
  d3.select(svgContainer.value).html(''); 

  const width = 928;
  const height = width;
  const margin = 40; 
  const innerRadius = width / 5;
  const outerRadius = width / 2 - margin; 

  // --- [无变动] 比例尺定义 (修复首尾重叠的代码) ---
  const numCategories = categories.length > 0 ? categories.length : 1; 
  const angleSegment = (2 * Math.PI) / numCategories;
  const rotationOffset = angleSegment / 2;
  const x = d3.scalePoint()
      .domain(categories)
      .range([rotationOffset, 2 * Math.PI - angleSegment + rotationOffset]);
  // --- [修复代码结束] ---

  const yMax = (d3.max(data, d => d.value) || 10) * 1.05; 
  const y = d3.scaleRadial()
      .domain([0, yMax])
      .range([innerRadius, outerRadius]);

  const area = d3.areaRadial()
      .curve(d3.curveLinearClosed) 
      .angle(d => x((d as any).category)!) 
      .innerRadius(innerRadius) 
      .outerRadius(d => y((d as any).value)); 

  const svg = d3.select(svgContainer.value).append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

  // 主 <g> 元素 (无变动)
  const g = svg.append("g");

  // 绘制雷达图区域 (无变动)
  g.append("path")
      .attr("fill", colors.areaDark) 
      .attr("fill-opacity", 0.7)
      .attr("d", area(data as any));

  // 绘制最外圈的线 (无变动)
  g.append("path")
      .attr("fill", "none")
      .attr("stroke", colors.line)
      .attr("stroke-width", 1.5)
      .attr("d", area.lineOuterRadius(d => y((d as any).value))(data as any));

  // X 轴 (灾害类型) (无变动)
  const labelRadius = outerRadius + 15;
  g.append("g")
    .selectAll("g")
    .data(categories) 
    .join("g")
    .call(g => g.append("path")
        .attr("stroke", colors.text) 
        .attr("stroke-opacity", 0.15) 
        .attr("d", d => `M${d3.pointRadial(x(d)!, innerRadius)} L${d3.pointRadial(x(d)!, outerRadius)}`))
    .call(g => g.append("text")
        .attr("transform", d => {
            const [px, py] = d3.pointRadial(x(d)!, labelRadius);
            let angle = (x(d)! * 180 / Math.PI) - 90;
            if (angle > 90 || angle < -90) angle -= 180;
            return `translate(${px},${py}) rotate(${angle})`;
        })
        .attr("dy", "0.35em")
        .text(d => d)
        .attr("fill", colors.textLight)
        .attr("font-size", "11px")
        .attr("font-weight", "500")
    );

  // Y 轴 (权重指数) (无变动)
  g.append("g")
      .attr("text-anchor", "middle")
    .selectAll("g") 
    .data(y.ticks(5).reverse()) 
    .join("g")
      .call(g => g.append("circle")
          .attr("fill", "none")
          .attr("stroke", colors.text) 
          .attr("stroke-opacity", 0.15) 
          .attr("r", y))
      .call(g => g.append("text")
          .attr("y", d => -y(d)) 
          .attr("dy", "-0.25em")
          .attr("dx", 0)
          .attr("stroke", colors.bg) 
          .attr("stroke-width", 4) 
          .attr("fill", colors.textLight) 
          .attr("paint-order", "stroke")
          .attr("font-size", "10px")
          .text((val, i) => `${val.toFixed(0)}${i === 0 ? " 权重" : ""}`) 
      );

  // 中心朝代文本 (无变动)
  g.append("text")
      .attr("x", 0)
      .attr("y", 0) 
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", colors.textLight) 
      .attr("font-size", "42px") 
      .attr("font-weight", "600")
      .attr("opacity", 0.6) 
      .text(selectedDynasty.value); 
      
  // Tooltip 事件处理
  if (tooltipEl.node()) {
    
    const onMouseOver = (event: MouseEvent, d: { category: string, value: number }) => {
      tooltipEl
        .style("visibility", "visible")
        .html(`
          <strong>${d.category}</strong>
          <br>
          权重: ${d.value.toFixed(2)}
        `);
    };
    
    // [!! 
    // [!! 核心修改 1: 修复 Tooltip 坐标 !!]
    //
    const onMouseMove = (event: MouseEvent) => {
      // 使用 d3.pointer 获取相对于 svgContainer 的 [x, y] 坐标
      const [px, py] = d3.pointer(event, svgContainer.value);
      
      tooltipEl
        .style("top", `${py + 10}px`)
        .style("left", `${px + 10}px`);
    };

    const onMouseOut = () => {
      tooltipEl.style("visibility", "hidden");
    };
    
    g.append("g")
      .selectAll("circle")
      .data(data)
      .join("circle")
        .attr("class", "tooltip-handle") // 添加 class (用于 zoom 过滤)
        .attr("transform", d => {
          const [px, py] = d3.pointRadial(x((d as any).category)!, y((d as any).value));
          return `translate(${px},${py})`;
        })
        .attr("r", 5) 
        .attr("fill", colors.line) 
        .attr("stroke", colors.bg) 
        .attr("stroke-width", 1.5)
        .attr("fill-opacity", 0.8)
        .style("cursor", "pointer")
        .on("mouseover", onMouseOver)
        .on("mousemove", onMouseMove)
        .on("mouseout", onMouseOut);
  }

  // [!! 
  // [!! 核心修改 2: 修复 Zoom 冲突 !!]
  //
  const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8]) 
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
      })
      .filter((event) => {
        // 允许滚轮缩放
        if (event.type === 'wheel') {
          return true;
        }
        // 检查拖动事件
        if (event.type === 'mousedown') {
          // 如果拖动开始于 .tooltip-handle，则 *阻止* zoom
          return !event.target.closest('.tooltip-handle');
        }
        return true;
      });
  
  svg.call(zoom);
};

// --- 6. Vue 生命周期与侦听器 ---
// ... (无变动) ...
onMounted(async () => {
  await fetchDataAndProcess(); 
  createChart(); 
});

watch(themeColors, () => {
  createChart();
});

watch(selectedDynasty, () => {
  createChart();
});

</script>

<style scoped lang="scss">
// ... (样式代码没有改动，保持不变) ...
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

  > .d3-svg-container {
    height: 100%;
    width: 100%;
  }

  :deep(svg) {
    width: 100%;
    height: 100%;
    font: 10px sans-serif;
    overflow: visible;
    background-color: v-bind('themeColors.bg');
    display: block; 
    
    text {
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
    }
    
    .tooltip-handle {
      pointer-events: all !important;
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

.dynasty-selector {
  padding: 0 16px 12px 16px;
  overflow-x: auto; 
  white-space: nowrap; 

  :deep(.v-chip-group) {
    justify-content: center;
    flex-wrap: nowrap; 
  }

  .v-chip {
    border-color: $border-color;
    color: $text-mid-brown;
    margin-right: 8px; 

    &.v-chip--selected {
      background-color: rgba(161, 136, 127, 0.2);
      color: $text-dark-brown;
      font-weight: 600;
    }
  }

  .v-theme--dark & {
    .v-chip {
      border-color: #4E342E;
      color: #A1887F;

      &.v-chip--selected {
        background-color: rgba(161, 136, 127, 0.4);
        color: #D7CCC8;
      }
    }
  }
}
</style>