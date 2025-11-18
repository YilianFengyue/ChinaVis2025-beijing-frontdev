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

// --- 1. 数据和接口定义 (保持不变) ---

const disasterCategories = ['水灾', '旱灾', '蝗灾', '地震'];
const staticData: Record<string, { [key: string]: number }> = {
  '先秦': { '水灾': 5, '旱灾': 3, '蝗灾': 0, '地震': 1 },
  '秦汉': { '水灾': 8, '旱灾': 5, '蝗灾': 2, '地震': 1 },
  '魏晋南北朝': { '水灾': 6, '旱灾': 9, '蝗灾': 4, '地震': 0 },
  '隋唐五代': { '水灾': 10, '旱灾': 4, '蝗灾': 3, '地震': 2 },
  '辽': { '水灾': 4, '旱灾': 7, '蝗灾': 10, '地震': 1 },
  '金': { '水灾': 9, '旱灾': 6, '蝗灾': 4, '地震': 3 },
  '元': { '水灾': 15, '旱灾': 10, '蝗灾': 5, '地震': 2 },
  '明': { '水灾': 12, '旱灾': 18, '蝗灾': 15, '地震': 5 },
  '清': { '水灾': 8, '旱灾': 15, '蝗灾': 10, '地震': 4 },
  '民国': { '水灾': 2, '旱灾': 3, '蝗灾': 1, '地震': 0 },
};
const colorMap: Record<string, string> = {
  '水灾': '#7EB6CE',  
  '旱灾': '#BF360C',  
  '蝗灾': '#8BAB8D',  
  '地震': '#D99964',  
};
interface FlatData {
    dynasty: string;
    category: string;
    count: number;
}
interface D3StackData extends d3.SeriesPoint<DisasterCount> {
  key: string; 
}


// --- 2. 响应式状态定义 ---
const svgContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLDivElement | null>(null); 
const vuetifyTheme = useTheme();
const resizeObserver = ref<ResizeObserver | null>(null);
const chartTitle = "各朝代灾害类型统计 (径向分组条形图)"; 

// --- 3. 仿古风格配色 ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "#fcfaf6",       
    text: "#5a4b40",     
    textLight: "#6d5f53", 
    stroke: "#dcd3c5",   
  };

  const antiqueDark = {
    bg: "#263238", 
    text: "#D7CCC8", 
    textLight: "#A1887F", 
    stroke: "#4E342E", 
  };
  
  return isDark ? antiqueDark : antiqueLight;
});

// --- 4. D3 绘图函数 (分组径向条形图) ---
const drawChart = () => {
  if (!svgContainer.value) return;

  d3.select(svgContainer.value).select('svg').remove();

  const containerWidth = svgContainer.value.clientWidth;
  const containerHeight = svgContainer.value.clientHeight;
  
  if (containerWidth === 0 || containerHeight === 0) return;

  const width = containerWidth;
  const height = containerHeight;
  const margin = 40; 
  
  const outerRadius = Math.min(width, height) / 2 - margin;
  const innerRadius = 110; 
  const labelRadius = innerRadius - 20; 

  const colors = themeColors.value;
  
  // 扁平化数据
  const dataArray: FlatData[] = Object.entries(staticData).flatMap(([dynasty, counts]) => 
    disasterCategories.map(category => ({
      dynasty,
      category,
      count: counts[category] || 0
    }))
  );
  
  // 获取所有朝代的列表
  const dynastyList = Object.keys(staticData);

  // --- 比例尺定义 ---
  
  // 1. Outer Scale (X轴 - 朝代扇区)
  const x = d3.scaleBand<string>()
      .domain(dynastyList)
      .range([0, 2 * Math.PI])
      .align(0)
      .paddingInner(0.1) 
      .paddingOuter(0.05); 

  // 2. Inner Scale (XInner - 灾害类型分组)
  const xInner = d3.scaleBand<string>()
      .domain(disasterCategories)
      .range([0, x.bandwidth()]) 
      .padding(0.1); 

  // 3. Radial Scale (Y轴 - 计数/高度)
  const yMax = d3.max(dataArray, d => d.count) || 1;
  const y = d3.scaleSqrt()
      .domain([0, yMax * 1.1])
      .range([innerRadius, outerRadius]);

  // Bar Generator (生成分组条形图的路径)
  const arc = d3.arc<FlatData>()
      .innerRadius(innerRadius)
      .outerRadius(d => y(d.count))
      .startAngle(d => x(d.dynasty)! + xInner(d.category)!)
      .endAngle(d => x(d.dynasty)! + xInner(d.category)! + xInner.bandwidth())
      .padAngle(0.01)
      .cornerRadius(0); 
      
  // --- 绘制元素 ---

  const svg = d3.select(svgContainer.value)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background-color", colors.bg);

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // 1. 径向网格线 (Y轴刻度线移除)
  g.append("g")
      .attr("text-anchor", "middle")
    .selectAll("g")
    .data(y.ticks(5).slice(1)) 
    .join("g")
      .call(g => g.append("circle")
          .attr("fill", "none")
          .attr("stroke", "none")
          .attr("r", d => y(d))
      );
      
  // 2. 绘制 X 轴基准圆
  g.append("circle")
    .attr("r", innerRadius) 
    .attr("fill", "none")
    .attr("stroke", colors.stroke) 
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6); 
  
  // 3. 绘制条形（Arc）
  g.selectAll("path.bar")
    .data(dataArray.filter(d => d.count > 0)) 
    .join("path")
      .attr("class", "bar")
      .attr("fill", d => colorMap[d.category] || colors.text)
      .attr("d", arc)
      .attr("stroke", colors.bg) 
      .attr("stroke-width", 0.5)
      .attr("fill-opacity", 0.9)
      .on("mouseover", function(event, d) {
        d3.select(this).attr("fill-opacity", 1.0).attr("stroke-width", 1);
        
        tooltip.value!.style.display = 'block';
        tooltip.value!.innerHTML = `
          <strong>朝代: ${d.dynasty}</strong><br>
          灾害类型: ${d.category}<br>
          事件次数: ${d.count}
        `;
      })
      .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svgContainer.value);
        tooltip.value!.style.transform = `translate(${x + 15}px, ${y - 10}px)`;
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill-opacity", 0.9).attr("stroke-width", 0.5);
        tooltip.value!.style.display = 'none';
      });


  // 4. 绘制朝代标签（X轴标签，实现字符分散排列）
  const fontPx = 10; 
  const characterSpacing = 1.1; 
  
  const centerTextGroup = g.append("g").attr("class", "dynasty-labels");

  centerTextGroup.selectAll("g.dynasty-label-group")
    .data(dynastyList)
    .join("g")
      .attr("class", "dynasty-label-group")
      .each(function(d) {
        const chars = d.split('');
        const numChars = chars.length;
        
        // --- 1. 块级中心角度判断 (保证整词方向一致) ---
        const dynastyCenterAngle = x(d)! + x.bandwidth() / 2;
        
        // 计算文本块的基准旋转角度 (径向角度)
        // *** 关键修改：取消下半部分 (> 90度 且 < 270度) 的 180 度翻转 ***
        let baseRotation = dynastyCenterAngle * 180 / Math.PI;
        // ----------------------------------------------------

        // 2. 估算单个字符在 labelRadius 上的角度空间 (弧度)
        const charAngularSpace = (fontPx * characterSpacing) / labelRadius; 
        const totalAngularSpace = numChars * charAngularSpace;
        
        // 3. 计算文本块的起始角度，以使文本块在朝代的 angular band 中居中
        const startAngle = x(d)! + (x.bandwidth() / 2) - (totalAngularSpace / 2);

        d3.select(this)
          .selectAll("text")
          .data(chars)
          .join("text")
          .attr("text-anchor", "middle")
          // 垂直居中对齐
          .attr("dominant-baseline", "middle")
          .attr("fill", colors.text)
          .attr("font-size", `${fontPx}px`)
          .attr("font-weight", "600")
          .text(c => c)
          .attr("transform", (c, i) => {
            // 4. 计算当前字符的中心角度 (在文本块中定位)
            const charCenterAngle = startAngle + (i * charAngularSpace) + (charAngularSpace / 2);
            
            // 5. 计算径向位置
            const [px, py] = d3.pointRadial(charCenterAngle, labelRadius);
            
            // 6. 使用块级径向旋转角度
            return `translate(${px},${py}) rotate(${baseRotation})`;
          });
      });


  // 5. 绘制径向分隔线 (移除)
  // 此处已移除径向分隔线。

  // 6. 中心标签 (移除)
  // 此处已移除中心标签。
};

// --- 5. Vue 生命周期与侦听器 (保持不变) ---
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
  d3.select('.chart-tooltip').remove();
});

watch(themeColors, () => {
  nextTick(drawChart);
}, { deep: true });
</script>

<style scoped lang="scss">
// --- 样式 (保持不变) ---
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
  flex-shrink: 0;
  
  .v-theme--dark & {
    color: #D7CCC8;
  }
}

.chart-container {
  padding: 0;
  margin: 0;
  flex-grow: 1; 
  width: 100%; 
  position: relative; 

  > .d3-svg-container {
    height: 100%;
    width: 100%;
  }
}

// Tooltip 样式 (保持不变)
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