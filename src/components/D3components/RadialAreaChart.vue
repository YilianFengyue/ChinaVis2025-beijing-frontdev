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
    const response = await fetch('/data/disaster_events.json'); 
    if (!response.ok) throw new Error('网络响应失败');
    const rawData = await response.json();
    allDisasterData.value = rawData;

    const categoriesSet = new Set<string>();
    const dataMap = new Map<string, Map<string, number>>(); 
    const dynastyTotalWeight = new Map<string, number>();
    // [移除] 不再需要 categoryTotalWeight
    // const categoryTotalWeight = new Map<string, number>(); 

    rawData.forEach((event: any) => {
      if (!event.dynasty_name || !event.disaster_type || event.weight == null) {
        return; 
      }
      
      const dynasty = event.dynasty_name;
      const category = event.disaster_type;
      const weight = +event.weight || 0;

      categoriesSet.add(category);

      // --- 聚合朝代数据 (不变) ---
      if (!dataMap.has(dynasty)) {
        dataMap.set(dynasty, new Map<string, number>());
      }
      const categoryMap = dataMap.get(dynasty)!;
      const currentCatWeight = categoryMap.get(category) || 0;
      categoryMap.set(category, currentCatWeight + weight);

      // --- 聚合朝代总权重 (不变) ---
      const currentTotalWeight = dynastyTotalWeight.get(dynasty) || 0;
      dynastyTotalWeight.set(dynasty, currentTotalWeight + weight);
      
      // [移除] 不再需要聚合灾害类型总权重
      // const currentCategoryTotal = ...
    });

    // --- [修改] 移除 Top 7 筛选逻辑 ---
    // const sortedCategories = ... (已移除)
    // const top7Categories = ... (已移除)
    // const top7CategoriesSet = ... (已移除)
    // const top7NamesSorted = ... (已移除) 

    // [修改] allCategories 现在包含数据源中的所有类型
    allCategories.value = Array.from(categoriesSet).sort();

    // --- 确定 Top 10 朝代 (不变) ---
    const sortedDynasties = Array.from(dynastyTotalWeight.entries())
                                .sort((a, b) => b[1] - a[1]);
    
    const top10 = sortedDynasties.slice(0, 10);
    const top10Names = new Set(top10.map(d => d[0]));

    // --- [修改] 重组数据以匹配 (所有) 类别 ---
    
    const finalProcessedData = new Map<string, { category: string, value: number }[]>();
    
    // [修改] 此 Map 用于 "其他" 朝代，且其键也必须是 (所有) 类别
    const otherDynastyGroupedMap = new Map<string, number>();
    // 初始化 "其他" 朝代的 map (现在包含所有类型)
    allCategories.value.forEach(cat => otherDynastyGroupedMap.set(cat, 0));

    // 遍历所有朝代的数据
    dataMap.forEach((originalCategoryMap, dynasty) => {
      
      // [修改] 临时 Map，用于存放当前朝代的 (所有) 数据
      const groupedCategoryMap = new Map<string, number>();
      
      // [修改] 遍历该朝代的所有 *原始* 灾害类型，不再筛选
      originalCategoryMap.forEach((weight, category) => {
        // [修改] 移除了 if (top7CategoriesSet.has(category))
        groupedCategoryMap.set(category, (groupedCategoryMap.get(category) || 0) + weight);
      });
      
      // --- (不变) 根据朝代是 Top 10 还是 "其他" 来处理 ---
      
      if (top10Names.has(dynasty)) {
        // 1. 如果是 Top 10 朝代，直接生成图表数组
        const chartArray = allCategories.value.map(category => ({
          category: category,
          value: groupedCategoryMap.get(category) || 0, // 从重组后的 map 中取值
        }));
        finalProcessedData.set(dynasty, chartArray);

      } else {
        // 2. 如果是 "其他" 朝代，将其重组后的数据累加到 'otherDynastyGroupedMap'
        groupedCategoryMap.forEach((weight, category) => {
          const currentOtherTotal = otherDynastyGroupedMap.get(category) || 0;
          otherDynastyGroupedMap.set(category, currentOtherTotal + weight);
        });
      }
    });

    // [修改] 为 "其他" 朝代创建最终的图表数组 (现在包含所有类型)
    const otherChartArray = allCategories.value.map(category => ({
      category: category,
      value: otherDynastyGroupedMap.get(category) || 0,
    }));
    finalProcessedData.set('其他', otherChartArray);
    
    // --- (不变) 设置朝代列表和默认值 ---
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


// --- 5. D3 绘图函数 (已修复和优化) ---
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

  // --- [!!! 关键修复：解决首尾重叠问题 !!!] ---

  // 1. 获取类别数量
  const numCategories = categories.length > 0 ? categories.length : 1; 
  
  // 2. 计算每个类别的角度 "扇区" 大小
  const angleSegment = (2 * Math.PI) / numCategories;

  // 3. 计算旋转偏移量 (使其错开 12 点钟方向)
  //    (这等同于您原来的 Math.PI / categories.length)
  const rotationOffset = angleSegment / 2;

  // 4. 定义 X 轴 (角度) 比例尺
  const x = d3.scalePoint()
      .domain(categories)
      // 5. [!! 核心修复 !!]
      // 原始 range: [rotationOffset, 2 * Math.PI + rotationOffset]
      // 这会导致 domain 的第一个值和最后一个值被映射到同一个角度，从而重叠。
      //
      // 修正 range: [rotationOffset, 2 * Math.PI - angleSegment + rotationOffset]
      // 这样最后一个点的位置就在第一个点 *之前* 的一个 "扇区"，
      // d3.curveLinearClosed 会自动将它们连接起来。
      .range([rotationOffset, 2 * Math.PI - angleSegment + rotationOffset]);

  // [!! 旧代码已被替换 !!]
  // const rotationOffset = Math.PI / (categories.length > 0 ? categories.length : 8);
  // const x = d3.scalePoint()
  //     .domain(categories)
  //     .range([rotationOffset, 2 * Math.PI + rotationOffset]);
  // --- [!!! 修复结束 !!!] ---

  const yMax = (d3.max(data, d => d.value) || 10) * 1.05; 
  const y = d3.scaleRadial()
      .domain([0, yMax])
      .range([innerRadius, outerRadius]);

  const area = d3.areaRadial()
      .curve(d3.curveLinearClosed) // <- 这个闭合曲线现在可以正常工作了
      .angle(d => x((d as any).category)!) 
      .innerRadius(innerRadius) 
      .outerRadius(d => y((d as any).value)); 

  const svg = d3.select(svgContainer.value).append("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

  // ... (后续所有绘图代码, 包括 svg.append("path"), X 轴, Y 轴, Tooltip 等... ) ...
  // ... (均无需任何改动) ...
  // ...
  
  // 绘制雷达图区域
  svg.append("path")
      .attr("fill", colors.areaDark) 
      .attr("fill-opacity", 0.7)
      .attr("d", area(data as any));

  // 绘制最外圈的线
  svg.append("path")
      .attr("fill", "none")
      .attr("stroke", colors.line)
      .attr("stroke-width", 1.5)
      .attr("d", area.lineOuterRadius(d => y((d as any).value))(data as any));

  // X 轴 (灾害类型)
  const labelRadius = outerRadius + 15;
  svg.append("g")
    .selectAll("g")
    .data(categories) // 现在最后一个 category 不会与第一个重叠
    .join("g")
    .call(g => g.append("path")
        .attr("stroke", colors.text) 
        .attr("stroke-opacity", 0.15) 
        .attr("d", d => `
            M${d3.pointRadial(x(d)!, innerRadius)}
            L${d3.pointRadial(x(d)!, outerRadius)}
        `))
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

  // Y 轴 (权重指数)
  svg.append("g")
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

  // 中心朝代文本
  svg.append("text")
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
    
    const onMouseMove = (event: MouseEvent) => {
      tooltipEl
        .style("top", `${event.pageY + 10}px`)
        .style("left", `${event.pageX + 10}px`);
    };

    const onMouseOut = () => {
      tooltipEl.style("visibility", "hidden");
    };
    
    svg.append("g")
      .selectAll("circle")
      .data(data)
      .join("circle")
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