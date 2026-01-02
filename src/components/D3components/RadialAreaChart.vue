<template>
  <v-card class="chart-card d-flex flex-column" elevation="0" color="transparent">
    <v-card-title class="chart-title">
      {{ chartTitle }}
    </v-card-title>
    
    <v-card-text class="chart-container">
      <div ref="svgContainer" class="d3-svg-container"></div>
      <div ref="tooltip" class="chart-tooltip"></div>
    </v-card-text>
    
    <v-card-actions class="px-4 pb-4">
      <div class="timeline-container w-100 d-flex">
        <div 
          v-for="dynasty in dynastyList" 
          :key="dynasty"
          class="dynasty-block d-flex align-center justify-center flex-grow-1"
          :class="{ 
            'active': selectedDynasty === dynasty,
            'inactive': selectedDynasty !== dynasty
          }"
          @click="selectedDynasty = dynasty"
          v-ripple
        >
          <span class="text-caption font-weight-bold text-truncate">{{ dynasty }}</span>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import * as d3 from 'd3';
import { useTheme } from 'vuetify';

// --- 1. 响应式状态定义 ---
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLElement | null>(null); 
const vuetifyTheme = useTheme();
const allDisasterData = ref<any[]>([]); 
const allCategories = ref<string[]>([]); 
const dynastyList = ref<string[]>([]); 
const processedData = ref<Map<string, { category: string, value: number }[]>>(new Map());
const selectedDynasty = ref('西汉'); 

// --- 2. 异步数据获取与处理 (保持原逻辑不变) ---
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
const chartTitle = computed(() => {
  return `${selectedDynasty.value || '加载中...'} · 灾害权重 (径向图)`;
});

const chartData = computed(() => {
  return processedData.value.get(selectedDynasty.value) || [];
});

// --- 4. 仿古风格配色 (保持不变) ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "transparent", // 确保背景透明
    text: "#5a4b40", 
    textLight: "#6d5f53", 
    stroke: "#dcd3c5", 
    areaLight: "rgba(161, 136, 127, 0.2)",
    areaDark: "rgba(161, 136, 127, 0.4)", 
    line: "#BF360C", 
    blockActive: "#8D6E63", // 选中状态背景
    blockInactive: "rgba(141, 110, 99, 0.1)" // 未选中状态
  };

  const antiqueDark = {
    bg: "transparent", 
    text: "#D7CCC8", 
    textLight: "#A1887F", 
    stroke: "#4E342E", 
    areaLight: "rgba(161, 136, 127, 0.2)",
    areaDark: "rgba(161, 136, 127, 0.4)", 
    line: "#FF8A65", 
    blockActive: "#A1887F",
    blockInactive: "rgba(161, 136, 127, 0.15)"
  };
  
  return isDark ? antiqueDark : antiqueLight;
});

// --- 5. D3 绘图逻辑 (重构以支持过渡动画) ---

const width = 928;
const height = width;
const margin = 40; 
const innerRadius = width / 5;
const outerRadius = width / 2 - margin; 

// 创建或获取 SVG 的辅助函数
const getOrAppendSvg = () => {
  if (!svgContainer.value) return null;
  let svg = d3.select(svgContainer.value).select("svg");
  if (svg.empty()) {
    svg = d3.select(svgContainer.value).append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "block");
      
    // 初始化分组
    const g = svg.append("g").attr("class", "chart-group");
    g.append("g").attr("class", "area-group");
    g.append("g").attr("class", "grid-circles-group");
    g.append("g").attr("class", "grid-text-group");
    g.append("g").attr("class", "axis-lines-group");
    g.append("g").attr("class", "axis-labels-group");
    g.append("path").attr("class", "outline-path"); // 最外圈的线
    g.append("text").attr("class", "center-text");
    g.append("g").attr("class", "tooltip-handles-group");
  }
  return svg;
};

const updateChart = () => {
  const svg = getOrAppendSvg();
  if (!svg) return;
  const g = svg.select(".chart-group");
  const data = chartData.value;
  const categories = allCategories.value;
  const colors = themeColors.value;

  if (data.length === 0 || categories.length === 0) return;

  // 1. 比例尺
  const numCategories = categories.length > 0 ? categories.length : 1; 
  const angleSegment = (2 * Math.PI) / numCategories;
  const rotationOffset = angleSegment / 2;
  
  const x = d3.scalePoint()
      .domain(categories)
      .range([rotationOffset, 2 * Math.PI - angleSegment + rotationOffset]);

  const yMax = (d3.max(data, d => d.value) || 10) * 1.05; 
  const y = d3.scaleRadial()
      .domain([0, yMax])
      .range([innerRadius, outerRadius]);

  // 2. 区域生成器
  const area = d3.areaRadial()
      .curve(d3.curveLinearClosed) 
      .angle(d => x((d as any).category)!) 
      .innerRadius(innerRadius) 
      .outerRadius(d => y((d as any).value)); 

  const t = svg.transition().duration(750); // 定义统一过渡

  // 3. 更新雷达图区域 (Area)
  g.select(".area-group")
    .selectAll("path")
    .data([data])
    .join("path")
    .attr("fill", colors.areaDark) 
    .attr("fill-opacity", 0.7)
    .transition(t as any)
    .attr("d", area(data as any));

  // 4. 更新轮廓线 (Outline)
  g.select(".outline-path")
    .attr("fill", "none")
    .attr("stroke", colors.line)
    .attr("stroke-width", 1.5)
    .transition(t as any)
    .attr("d", area.lineOuterRadius(d => y((d as any).value))(data as any));

  // 5. 更新 Y 轴网格圈 (Grid Circles)
  const yTicks = y.ticks(5).reverse();
  g.select(".grid-circles-group")
    .attr("text-anchor", "middle")
    .selectAll("circle")
    .data(yTicks)
    .join(
      enter => enter.append("circle")
        .attr("fill", "none")
        .attr("stroke", colors.text)
        .attr("stroke-opacity", 0.15)
        .attr("r", 0), // 初始半径0
      update => update,
      exit => exit.remove()
    )
    .transition(t as any)
    .attr("stroke", colors.text) // 颜色可能变化
    .attr("r", y); // 动态更新半径

  // 6. 更新 Y 轴刻度文字 (Grid Text)
  g.select(".grid-text-group")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(yTicks)
    .join(
      enter => enter.append("text").attr("dy", "-0.25em").style("opacity", 0),
      update => update,
      exit => exit.remove()
    )
    .transition(t as any)
    .attr("y", d => -y(d))
    .style("opacity", 1)
    .attr("stroke", colors.bg)
    .attr("stroke-width", 4)
    .attr("fill", colors.textLight)
    .attr("paint-order", "stroke")
    .attr("font-size", "10px")
    .text((val, i) => `${val.toFixed(0)}${i === 0 ? " 权重" : ""}`);

  // 7. 更新 X 轴 (灾害类型标签)
  const labelRadius = outerRadius + 15;
  
  // 轴线
  g.select(".axis-lines-group")
    .selectAll("path")
    .data(categories)
    .join("path")
    .attr("stroke", colors.text)
    .attr("stroke-opacity", 0.15)
    .attr("d", d => `M${d3.pointRadial(x(d)!, innerRadius)} L${d3.pointRadial(x(d)!, outerRadius)}`);

  // 标签文字
  g.select(".axis-labels-group")
    .selectAll("text")
    .data(categories)
    .join("text")
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
    .attr("font-weight", "500");

  // 8. 中心文字 (朝代名)
  g.select(".center-text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", "42px")
    .attr("font-weight", "600")
    .attr("opacity", 0.6)
    .transition(t as any)
    .attr("fill", colors.textLight)
    .text(selectedDynasty.value);

  // 9. 更新交互点 (Tooltip Handles) - 需要与变换后的形状匹配
  const tooltipEl = d3.select(tooltip.value);
  
  const circles = g.select(".tooltip-handles-group")
    .selectAll("circle")
    .data(data);

  circles.join(
    enter => enter.append("circle")
      .attr("class", "tooltip-handle")
      .attr("r", 0) // 初始大小
      .style("cursor", "pointer"),
    update => update,
    exit => exit.remove()
  )
  .transition(t as any)
  .attr("transform", d => {
    const [px, py] = d3.pointRadial(x((d as any).category)!, y((d as any).value));
    return `translate(${px},${py})`;
  })
  .attr("r", 5)
  .attr("fill", colors.line)
  .attr("stroke", colors.bg)
  .attr("stroke-width", 1.5)
  .attr("fill-opacity", 0.8);

  // 重新绑定事件 (因为数据更新了，如果不重新绑定闭包中的数据可能旧了，或者直接用 D3 data)
  g.select(".tooltip-handles-group").selectAll("circle")
    .on("mouseover", (event, d: any) => {
      tooltipEl.style("visibility", "visible")
        .html(`<strong>${d.category}</strong><br>权重: ${d.value.toFixed(2)}`);
    })
    .on("mousemove", (event) => {
      const [px, py] = d3.pointer(event, svgContainer.value);
      tooltipEl.style("top", `${py + 10}px`).style("left", `${px + 10}px`);
    })
    .on("mouseout", () => tooltipEl.style("visibility", "hidden"));

  // Zoom 逻辑
  const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()))
      .filter((event) => {
        if (event.type === 'wheel') return true;
        if (event.type === 'mousedown') return !event.target.closest('.tooltip-handle');
        return true;
      });
  svg.call(zoom);
};

// --- 6. Vue 生命周期与侦听器 ---
onMounted(async () => {
  await fetchDataAndProcess(); 
  updateChart(); // 初始化绘图
});

watch([themeColors, selectedDynasty], () => {
  updateChart(); // 数据或主题变化时执行过渡更新
});

</script>

<style scoped lang="scss">
$text-dark-brown: #5a4b40;
$border-color: #dcd3c5;

// 修改：确保透明背景
.chart-card {
  background-color: transparent !important;
  border: none !important;
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
    display: block; 
    
    text {
      user-select: none;
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
  
  background-color: v-bind('themeColors.bg'); // Fallback usually handled by JS styles if transparent
  // Explicit override for tooltip visibility on transparent background
  background-color: rgba(250, 246, 240, 0.95); 
  color: v-bind('themeColors.text');
  border: 1px solid v-bind('themeColors.stroke');

  :deep(strong) {
    color: v-bind('themeColors.line');
    font-weight: 600;
  }
}

.v-theme--dark .chart-tooltip {
  background-color: rgba(38, 50, 56, 0.95);
}

// 修改：块状时间轴样式
.timeline-container {
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid v-bind('themeColors.stroke'); // 整体外边框
}

.dynasty-block {
  cursor: pointer;
  transition: all 0.3s ease;
  height: 36px;
  border-right: 1px solid rgba(255, 255, 255, 0.2); // 分隔线
  position: relative;
  
  &:last-child {
    border-right: none;
  }

  // 选中状态
  &.active {
    background-color: v-bind('themeColors.blockActive');
    color: #fff; // 选中时文字变白
    font-weight: bold;
    box-shadow: inset 0 0 5px rgba(0,0,0,0.2);
  }

  // 未选中状态
  &.inactive {
    background-color: v-bind('themeColors.blockInactive');
    color: v-bind('themeColors.textLight');
    
    &:hover {
      background-color: v-bind('themeColors.areaDark'); // Hover 效果
      color: v-bind('themeColors.text');
    }
  }
}
</style>