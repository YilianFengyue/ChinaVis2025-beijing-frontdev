<template>
  <v-card class="chart-card d-flex flex-column h-100" elevation="0" variant="outlined">
    <v-card-title class="chart-title">
      历代灾害与植被综合分析 (同心圆视图)
    </v-card-title>
    
    <v-card-text class="chart-container flex-grow-1">
      <!-- ECharts 容器 (最内圈植被演变) -->
      <div ref="echartsContainer" class="echarts-container"></div>
      <!-- D3 容器 (中圈和外圈) -->
      <div ref="svgContainer" class="d3-svg-container"></div>
      <div ref="tooltip" class="chart-tooltip"></div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick, shallowRef } from 'vue';
import * as d3 from 'd3'; 
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from 'vuetify';
import type { GraphicOption } from 'echarts/types/src/util/types';

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  PieChart,
  CanvasRenderer,
]);

// --- 数据定义 ---

// 1. 灾害类型数据 (外圈)
const disasterCategories = ['水灾', '旱灾', '蝗灾', '地震'];
const disasterData: Record<string, { [key: string]: number }> = {
  '先秦': { '水灾': 5, '旱灾': 3, '蝗灾': 0, '地震': 1 },
  '秦汉': { '水灾': 8, '旱灾': 5, '蝗灾': 2, '地震': 1 },
  '魏晋南北朝': { '水灾': 6, '旱灾': 9, '蝗灾': 4, '地震': 0 },
  '隋唐五代': { '水灾': 10, '旱灾': 4, '蝗灾': 3, '地震': 2 },
  '辽宋金': { '水灾': 7, '旱灾': 7, '蝗灾': 7, '地震': 2 },
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

// 2. 重要度数据 (中圈)
interface ImportanceData {
  dynasty: string;
  minVal: number;
  maxVal: number;
  mid: number;
}

const importanceData: ImportanceData[] = [
  { dynasty: '先秦', minVal: 2.0, maxVal: 3.5, mid: 2.75 },
  { dynasty: '秦汉', minVal: 3.0, maxVal: 5.0, mid: 4.0 },
  { dynasty: '魏晋南北朝', minVal: 1.5, maxVal: 2.8, mid: 2.15 },
  { dynasty: '隋唐五代', minVal: 3.5, maxVal: 5.5, mid: 4.5 },
  { dynasty: '辽宋金', minVal: 2.0, maxVal: 3.2, mid: 2.6 },
  { dynasty: '元', minVal: 4.0, maxVal: 6.0, mid: 5.0 },
  { dynasty: '明', minVal: 2.5, maxVal: 4.5, mid: 3.5 },
  { dynasty: '清', minVal: 1.5, maxVal: 3.0, mid: 2.25 },
  { dynasty: '民国', minVal: 1.0, maxVal: 2.0, mid: 1.5 },
];

// 中层带状图颜色配置（为每个朝代分配不同颜色）
const importanceColors = [
  '#8B4513', '#A0522D', '#CD853F', '#DEB887', 
  '#D2691E', '#BC8F8F', '#F4A460', '#DAA520', '#B8860B'
];

// 3. 植被数据 (内圈)
interface VegetationData {
  period: string;
  summary: string;
  condition: string;
  examples: string[];
}

const conditionImageMap: Record<string, string> = {
  '山川': '/images/山川.png',
  '河流': '/images/河流.png',
  '盆地': '/images/盆地.png',
};

// --- 响应式状态 ---
const svgContainer = ref<HTMLElement | null>(null);
const echartsContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLDivElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const vegetationData = ref<VegetationData[]>([]);
const vuetifyTheme = useTheme();
const resizeObserver = ref<ResizeObserver | null>(null);

// --- 主题配色 ---
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "#fcfaf6",       
    text: "#5a4b40",     
    textLight: "#6d5f53", 
    stroke: "#dcd3c5",
    bandFill: "#BF360C",
    bandLine: "#8D6E63",
  };

  const antiqueDark = {
    bg: "#263238", 
    text: "#D7CCC8", 
    textLight: "#A1887F", 
    stroke: "#4E342E",
    bandFill: "#FF8A65",
    bandLine: "#D7CCC8",
  };
  
  return isDark ? antiqueDark : antiqueLight;
});

// --- ECharts 内圈图片配置 ---
const innerRingImages = computed<GraphicOption[]>(() => {
  const chart = chartInstance.value;
  const container = echartsContainer.value;
  if (!chart || !container || vegetationData.value.length === 0) return [];

  const { offsetWidth: containerWidth, offsetHeight: containerHeight } = container;
  if (containerWidth === 0 || containerHeight === 0) return [];

  const centerX = containerWidth / 1.975;
  const centerY = containerHeight / 1.93;
  const radius = Math.min(containerWidth, containerHeight) * 0.12;
  const imageSize = 20;
  const itemCount = vegetationData.value.length;

  return vegetationData.value.map((item, index) => {
    const imagePath = conditionImageMap[item.condition];
    if (!imagePath) return null;

    const angle = (index / itemCount) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle) - imageSize / 2;
    const y = centerY + radius * Math.sin(angle) - imageSize / 2;
    const rotation = -(angle + Math.PI / 2);

    return {
      type: 'image',
      x,
      y,
      rotation,
      style: {
        image: imagePath,
        width: imageSize,
        height: imageSize,
        objectFit: 'contain',
      },
      z: 4,
    } as GraphicOption;
  }).filter(Boolean) as GraphicOption[];
});

// --- ECharts 配置 (最内圈植被) ---
const getChartOption = (isDark: boolean, data: VegetationData[]): echarts.EChartsOption => {
  const colors = ['#D27D46', '#D4AF37', '#8FBC8F', '#D2B48C', '#C0A080'];
  
  const chartData = data.map((item, index) => ({
    value: 1,
    name: item.period,
    summary: item.summary,
    condition: item.condition,
    itemStyle: {
      color: colors[index % colors.length]
    }
  }));

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data as { name: string; summary: string; condition: string };
        if (!data.name) return '';
        return `
          <div style="max-width: 300px; white-space: normal; line-height: 1.6;">
            <strong style="font-size: 1.1em; color: ${params.color};">${data.name}</strong><br/>
            <strong>状况:</strong> ${data.condition}<br/>
            <strong>概述:</strong> ${data.summary}
          </div>
        `;
      },
      backgroundColor: isDark ? '#263238' : '#faf6f0',
      borderColor: isDark ? '#4E342E' : '#dcd3c5',
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#D7CCC8' : '#5a4b40',
      },
      padding: 10,
    },
    series: [
      {
        name: '朝代',
        type: 'pie',
        radius: ['30%', '50%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: isDark ? '#111b27' : '#f2f5f8',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}',
          color: '#ffffff',
          fontSize: 9,
        },
        labelLine: {
          show: false
        },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
          scaleSize: 5
        },
        data: chartData
      }
    ],
    graphic: [...innerRingImages.value],
  };
};

// --- D3 绘图函数 (中圈重要度 + 外圈灾害类型) ---
const drawChart = () => {
  if (!svgContainer.value || !echartsContainer.value) return;

  d3.select(svgContainer.value).select('svg').remove();

  const containerWidth = svgContainer.value.clientWidth;
  const containerHeight = svgContainer.value.clientHeight;
  
  if (containerWidth === 0 || containerHeight === 0) return;

  const width = containerWidth;
  const height = containerHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 半径定义
  const innerRadiusVegetation = Math.min(width, height) * 0.25; // 植被外圈
  const innerRadiusImportance = innerRadiusVegetation + 10; // 重要度内圈（增加间隔）
  const outerRadiusImportance = Math.min(width, height) * 0.32; // 重要度外圈（缩小宽度）
  const innerRadiusDisaster = outerRadiusImportance + 10; // 灾害内圈（增加间隔）
  const outerRadiusDisaster = Math.min(width, height) * 0.46; // 灾害外圈
  const labelRadius = innerRadiusDisaster - 15; // 标签半径

  const colors = themeColors.value;
  
  // 扁平化灾害数据
  const disasterArray: FlatData[] = Object.entries(disasterData).flatMap(([dynasty, counts]) => 
    disasterCategories.map(category => ({
      dynasty,
      category,
      count: counts[category] || 0
    }))
  );
  
  const dynastyList = Object.keys(disasterData);

  // SVG 创建
  const svg = d3.select(svgContainer.value)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("background-color", "transparent")
    .style("position", "absolute")
    .style("top", "0")
    .style("left", "0")
    .style("pointer-events", "none");

  const g = svg.append("g")
    .attr("transform", `translate(${centerX}, ${centerY})`);

  // ========== 中圈：重要度带状图 (径向 - 使用面积表示) ==========
  
  const angleScale = d3.scaleBand<string>()
    .domain(importanceData.map(d => d.dynasty))
    .range([0, 2 * Math.PI])
    .paddingInner(0); // 移除间距，让环完全连续

  // 计算最大数据值用于归一化（这里用 maxVal - minVal 的差值来表示重要度）
  const maxDataRange = d3.max(importanceData, d => d.maxVal - d.minVal) || 1;
  
  // 存储中心线的半径数据，用于后续绘制连续曲线
  const midRadiusData: { angle: number; radius: number; dynasty: string }[] = [];
  
  // 绘制重要度带状区域（使用面积映射）
  importanceData.forEach((d, index) => {
    const startAngle = angleScale(d.dynasty)!;
    const endAngle = startAngle + angleScale.bandwidth();
    
    // 计算该朝代的数据范围（代表重要度的"量"）
    const dataRange = d.maxVal - d.minVal;
    
    // 归一化
    const normalizedValue = dataRange / maxDataRange;
    
    // 使用面积公式：环形面积 A = θ/2π × π(r_outer² - r_inner²) = θ/2 × (r_outer² - r_inner²)
    // 其中 θ 是角度范围
    const theta = angleScale.bandwidth();
    const innerR = innerRadiusImportance;
    
    // 计算最大可用面积（角度范围内的环形面积）
    const maxSectorArea = (theta / 2) * (outerRadiusImportance * outerRadiusImportance - innerRadiusImportance * innerRadiusImportance);
    
    // 目标面积
    const targetArea = normalizedValue * maxSectorArea;
    
    // 反推外半径：r_outer = sqrt(r_inner² + 2×A/θ)
    const outerR = Math.sqrt(innerR * innerR + (2 * targetArea) / theta);

    const arcGenerator = d3.arc()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(0); // 确保没有圆角

    // 使用不同颜色
    const fillColor = importanceColors[index % importanceColors.length];

    g.append("path")
      .attr("d", arcGenerator as any)
      .attr("fill", fillColor)
      .attr("fill-opacity", 0.6)
      .attr("stroke", "none") // 移除描边，让环连续
      .style("pointer-events", "all")
      .on("mouseover", function(event) {
        d3.select(this).attr("fill-opacity", 0.9);
        tooltip.value!.style.display = 'block';
        tooltip.value!.innerHTML = `
          <strong>${d.dynasty}</strong><br>
          重要度范围: ${d.minVal.toFixed(1)} - ${d.maxVal.toFixed(1)}<br>
          重要度跨度: ${dataRange.toFixed(1)}
        `;
      })
      .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svgContainer.value);
        tooltip.value!.style.transform = `translate(${x + 15}px, ${y - 10}px)`;
      })
      .on("mouseout", function() {
        d3.select(this).attr("fill-opacity", 0.6);
        tooltip.value!.style.display = 'none';
      });

    // 计算中心线半径（用于后续绘制连续曲线）
    const midRelativePos = (d.mid - d.minVal) / dataRange;
    const midArea = midRelativePos * targetArea;
    const midR = Math.sqrt(innerR * innerR + (2 * midArea) / theta);
    
    // 存储中心角度和半径
    const centerAngle = (startAngle + endAngle) / 2;
    midRadiusData.push({ angle: centerAngle, radius: midR, dynasty: d.dynasty });
  });

  // 绘制连续的中心线（使用径向线生成器）
  const radialLineGenerator = d3.lineRadial<{ angle: number; radius: number }>()
    .angle(d => d.angle)
    .radius(d => d.radius)
    .curve(d3.curveCardinalClosed.tension(0.5)); // 使用闭合的曲线

  g.append("path")
    .datum(midRadiusData)
    .attr("d", radialLineGenerator)
    .attr("fill", "none")
    .attr("stroke", colors.text)
    .attr("stroke-width", 2)
    .attr("stroke-opacity", 0.8)
    .style("pointer-events", "none"); // 不阻挡下层交互

  // ========== 外圈：灾害类型统计 (径向分组条形图) ==========
  
  const x = d3.scaleBand<string>()
    .domain(dynastyList)
    .range([0, 2 * Math.PI])
    .align(0)
    .paddingInner(0.1)
    .paddingOuter(0.05);

  const xInner = d3.scaleBand<string>()
    .domain(disasterCategories)
    .range([0, x.bandwidth()])
    .padding(0.1);

  const yMaxDisaster = d3.max(disasterArray, d => d.count) || 1;
  const y = d3.scaleSqrt()
    .domain([0, yMaxDisaster * 1.1])
    .range([innerRadiusDisaster, outerRadiusDisaster]);

  const arc = d3.arc<FlatData>()
    .innerRadius(innerRadiusDisaster)
    .outerRadius(d => y(d.count))
    .startAngle(d => x(d.dynasty)! + xInner(d.category)!)
    .endAngle(d => x(d.dynasty)! + xInner(d.category)! + xInner.bandwidth())
    .padAngle(0.01);

  // 绘制基准圆
  g.append("circle")
    .attr("r", innerRadiusDisaster)
    .attr("fill", "none")
    .attr("stroke", colors.stroke)
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6);

  // 绘制条形
  g.selectAll("path.bar")
    .data(disasterArray.filter(d => d.count > 0))
    .join("path")
    .attr("class", "bar")
    .attr("fill", d => colorMap[d.category] || colors.text)
    .attr("d", arc)
    .attr("stroke", colors.bg)
    .attr("stroke-width", 0.5)
    .attr("fill-opacity", 0.9)
    .style("pointer-events", "all")
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

  // 绘制朝代标签
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
      const dynastyCenterAngle = x(d)! + x.bandwidth() / 2;
      let baseRotation = dynastyCenterAngle * 180 / Math.PI;
      const charAngularSpace = (fontPx * characterSpacing) / labelRadius;
      const totalAngularSpace = numChars * charAngularSpace;
      const startAngle = x(d)! + (x.bandwidth() / 2) - (totalAngularSpace / 2);

      d3.select(this)
        .selectAll("text")
        .data(chars)
        .join("text")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", colors.text)
        .attr("font-size", `${fontPx}px`)
        .attr("font-weight", "600")
        .text(c => c)
        .attr("transform", (c, i) => {
          const charCenterAngle = startAngle + (i * charAngularSpace) + (charAngularSpace / 2);
          const [px, py] = d3.pointRadial(charCenterAngle, labelRadius);
          return `translate(${px},${py}) rotate(${baseRotation})`;
        });
    });
};

// --- 生命周期 ---
onMounted(async () => {
  try {
    const response = await fetch('/data/process_data_fromLin/vegetation_summary_final.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: VegetationData[] = await response.json();
    vegetationData.value = data.filter(item => item.condition !== '无');

    await nextTick();
    setTimeout(() => {
      // 初始化 ECharts (内圈)
      if (echartsContainer.value) {
        chartInstance.value = echarts.init(echartsContainer.value);
        chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark, vegetationData.value));
      }
      // 绘制 D3 图表 (中圈和外圈)
      drawChart();
    }, 300);

    if (svgContainer.value) {
      resizeObserver.value = new ResizeObserver(() => {
        chartInstance.value?.resize();
        drawChart();
      });
      resizeObserver.value.observe(svgContainer.value);
    }
  } catch (error) {
    console.error('Failed to fetch vegetation data:', error);
  }
});

onUnmounted(() => {
  if (resizeObserver.value && svgContainer.value) {
    resizeObserver.value.unobserve(svgContainer.value);
  }
  chartInstance.value?.dispose();
  d3.select('.chart-tooltip').remove();
});

watch(themeColors, () => {
  nextTick(() => {
    if (chartInstance.value && vegetationData.value.length > 0) {
      chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark, vegetationData.value), { replaceMerge: ['graphic'] });
    }
    drawChart();
  });
}, { deep: true });
</script>

<style scoped lang="scss">
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
  width: 100%;
  position: relative;
  min-height: 600px;
}

.echarts-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: auto !important;
  
  canvas {
    pointer-events: auto !important;
  }
}

.d3-svg-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none !important;
  
  svg {
    pointer-events: none !important;
    
    // 只在中圈和外圈的元素上启用交互
    g path, g text {
      pointer-events: auto;
    }
  }
}

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
  z-index: 100;
  
  .v-theme--dark & {
    background-color: rgba(38, 50, 56, 0.95);
    border-color: #4E342E;
    color: #D7CCC8;
  }
}
</style>