<template>
  <v-card class="chart-card d-flex flex-column h-100" elevation="0" color="transparent">
    <v-card-title class="chart-title text-center py-4">
      <div class="text-h6 font-weight-bold d-flex align-center justify-center gap-2" style="letter-spacing: 1.5px; font-family: 'Noto Serif SC', serif;">
        <v-icon color="brown-darken-3" size="small" class="mr-2">mdi-sword-cross</v-icon>
        历代战争与植被综合分析
      </div>
      <div class="text-caption text-medium-emphasis mt-1 d-flex align-center justify-center" style="opacity: 0.8;">
        <span class="legend-dot vegetation mr-1"></span>植被
        <span class="mx-2">|</span>
        <span class="legend-dot importance mr-1"></span>综合国力
        <span class="mx-2">|</span>
        <span class="legend-dot war mr-1"></span>战争频次
      </div>
    </v-card-title>
    
    <v-card-text class="chart-container flex-grow-1 position-relative">
      <div ref="echartsContainer" class="echarts-container"></div>
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

// --- 1. 数据定义与状态 ---

// 战争分类 (外圈)
const warCategories = ['决定性战役', '重要战役', '一般冲突'];

// 战争数据配色 (战火色调)
const colorMap: Record<string, string> = {
  '决定性战役': '#B71C1C', // 猩红 (Importance 9-10)
  '重要战役': '#E65100',   // 深橙 (Importance 7-8)
  '一般冲突': '#F9A825',   // 暗黄 (Importance < 7)
};

// 响应式数据
const warData = ref<Record<string, { [key: string]: number }>>({});
const isDataLoaded = ref(false);

interface FlatData {
  dynasty: string;
  category: string;
  count: number;
}

// 重要度数据 (中圈 - 保持不变，作为综合国力/重要性指标)
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

const importanceColors = [
  '#8B4513', '#A0522D', '#CD853F', '#DEB887', 
  '#D2691E', '#BC8F8F', '#F4A460', '#DAA520', '#B8860B'
];

// 植被数据 (内圈)
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

// 响应式状态
const svgContainer = ref<HTMLElement | null>(null);
const echartsContainer = ref<HTMLElement | null>(null);
const tooltip = ref<HTMLDivElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const vegetationData = ref<VegetationData[]>([]);
const vuetifyTheme = useTheme();
const resizeObserver = ref<ResizeObserver | null>(null);

// --- 2. 辅助逻辑 ---

const dynastyMap: Record<string, string> = {
  '先秦': '先秦',
  '秦汉': '秦汉',
  '魏晋南北朝': '魏晋南北朝',
  '隋唐五代': '隋唐五代', '唐': '隋唐五代', '五代': '隋唐五代',
  '辽': '辽宋金', '宋': '辽宋金', '金': '辽宋金',
  '元': '元',
  '明': '明',
  '清': '清',
  '民国': '民国'
};

// 数据处理函数
const processWarData = (rawData: any[]) => {
  const processed: Record<string, { [key: string]: number }> = {};
  
  // 初始化结构
  importanceData.forEach(d => {
    processed[d.dynasty] = {
      '决定性战役': 0,
      '重要战役': 0,
      '一般冲突': 0
    };
  });

  rawData.forEach(item => {
    const rawDynasty = item.dynasty;
    const targetDynasty = dynastyMap[rawDynasty];
    
    if (targetDynasty && processed[targetDynasty]) {
      const importance = parseInt(item.importance) || 0;
      let category = '一般冲突';
      if (importance >= 9) category = '决定性战役';
      else if (importance >= 7) category = '重要战役';
      
      processed[targetDynasty][category]++;
    }
  });

  return processed;
};

// 【关键修改1】主题配色 (仿古风格) - 将 tooltipBg 改为纯色 Hex 代码
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  const antiqueLight = {
    bg: "transparent",       
    text: "#5a4b40",     
    textLight: "#6d5f53", 
    stroke: "#dcd3c5",
    bandFill: "#BF360C",
    bandLine: "#8D6E63",
    tooltipBg: "#FCFAF6", // 改为 Hex 纯色，对应原来的 rgba(252, 250, 246)
    tooltipBorder: "#dcd3c5"
  };

  const antiqueDark = {
    bg: "transparent", 
    text: "#D7CCC8", 
    textLight: "#A1887F", 
    stroke: "#4E342E",
    bandFill: "#FF8A65",
    bandLine: "#D7CCC8",
    tooltipBg: "#263238", // 改为 Hex 纯色，对应原来的 rgba(38, 50, 56)
    tooltipBorder: "#4E342E"
  };
  
  return isDark ? antiqueDark : antiqueLight;
});

// --- 3. ECharts 配置 (内圈) ---

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
        opacity: 0.85
      },
      z: 4,
    } as GraphicOption;
  }).filter(Boolean) as GraphicOption[];
});

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
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
    // 【关键修改2】ECharts Tooltip 强制添加不透明度样式
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data as { name: string; summary: string; condition: string };
        if (!data.name) return '';
        return `
          <div style="max-width: 240px; white-space: normal; line-height: 1.5; font-family: serif;">
            <div style="font-size: 1.1em; color: ${params.color}; font-weight: bold; margin-bottom: 4px;">${data.name}</div>
            <div style="font-size: 0.9em; color: ${isDark ? '#ccc' : '#666'};"><strong>状况:</strong> ${data.condition}</div>
            <div style="font-size: 0.85em; margin-top: 4px;">${data.summary}</div>
          </div>
        `;
      },
      backgroundColor: themeColors.value.tooltipBg,
      borderColor: themeColors.value.tooltipBorder,
      borderWidth: 1,
      textStyle: {
        color: themeColors.value.text,
      },
      padding: 12,
      // 强制 opacity 1 和移除滤镜
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity: 1; backdrop-filter: none;'
    },
    series: [
      {
        name: '朝代',
        type: 'pie',
        radius: ['30%', '50%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: isDark ? '#111b27' : 'transparent',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}',
          color: '#ffffff',
          fontSize: 10,
          fontWeight: 'bold',
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowBlur: 2
        },
        labelLine: {
          show: false
        },
        emphasis: {
          label: { show: true, fontSize: 12 },
          scale: true,
          scaleSize: 5,
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: chartData
      }
    ],
    graphic: [...innerRingImages.value],
  };
};

// --- 4. D3 绘图 (中圈重要度 + 外圈战争统计) ---

const drawChart = () => {
  if (!svgContainer.value || !echartsContainer.value || !isDataLoaded.value) return;

  d3.select(svgContainer.value).select('svg').remove();

  const containerWidth = svgContainer.value.clientWidth;
  const containerHeight = svgContainer.value.clientHeight;
  
  if (containerWidth === 0 || containerHeight === 0) return;

  const width = containerWidth;
  const height = containerHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 半径定义
  const innerRadiusVegetation = Math.min(width, height) * 0.25; 
  const innerRadiusImportance = innerRadiusVegetation + 10; 
  const outerRadiusImportance = Math.min(width, height) * 0.32; 
  const innerRadiusWar = outerRadiusImportance + 15; 
  const outerRadiusWar = Math.min(width, height) * 0.46; 
  const labelRadius = innerRadiusWar - 15; 

  const colors = themeColors.value;
  
  // 准备外圈数据
  const flatWarData: FlatData[] = Object.entries(warData.value).flatMap(([dynasty, counts]) => 
    warCategories.map(category => ({
      dynasty,
      category,
      count: counts[category] || 0
    }))
  );
  
  // 朝代列表 (基于 importanceData 保持顺序)
  const dynastyList = importanceData.map(d => d.dynasty);

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

  // ========== 中圈：重要度/国力带状图 ==========
  
  const angleScale = d3.scaleBand<string>()
    .domain(dynastyList)
    .range([0, 2 * Math.PI])
    .paddingInner(0); 

  const maxDataRange = d3.max(importanceData, d => d.maxVal - d.minVal) || 1;
  const midRadiusData: { angle: number; radius: number; dynasty: string }[] = [];
  
  importanceData.forEach((d, index) => {
    const startAngle = angleScale(d.dynasty)!;
    const endAngle = startAngle + angleScale.bandwidth();
    const dataRange = d.maxVal - d.minVal;
    const normalizedValue = dataRange / maxDataRange;
    const theta = angleScale.bandwidth();
    const innerR = innerRadiusImportance;
    const maxSectorArea = (theta / 2) * (outerRadiusImportance * outerRadiusImportance - innerRadiusImportance * innerRadiusImportance);
    const targetArea = normalizedValue * maxSectorArea;
    const outerR = Math.sqrt(innerR * innerR + (2 * targetArea) / theta);

    // 生长动画插值
    const arcTween = (finalOuterR: number) => {
      return function(t: number) {
        const currentOuterR = d3.interpolate(innerR, finalOuterR)(t);
        return d3.arc()
          .innerRadius(innerR)
          .outerRadius(currentOuterR)
          .startAngle(startAngle)
          .endAngle(endAngle)
          .cornerRadius(2)();
      };
    };

    const fillColor = importanceColors[index % importanceColors.length];

    const path = g.append("path")
      .attr("fill", fillColor)
      .attr("fill-opacity", 0.7)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .style("pointer-events", "all")
      .style("cursor", "crosshair");

    // 动画
    path.transition()
      .duration(800)
      .ease(d3.easeCubicOut)
      .delay(index * 50)
      .attrTween("d", () => arcTween(outerR) as any);

    // 交互
    path.on("mouseover", function(event) {
        d3.select(this)
          .transition().duration(200)
          .attr("fill-opacity", 0.95)
          .attr("stroke-width", 1.5);
          
        tooltip.value!.style.display = 'block';
        tooltip.value!.innerHTML = `
          <div style="font-family: serif; min-width: 120px;">
            <div style="border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 4px; font-weight: bold;">
              ${d.dynasty} · 综合国力
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>指数:</span> <span>${d.minVal.toFixed(1)} - ${d.maxVal.toFixed(1)}</span>
            </div>
          </div>
        `;
      })
      .on("mousemove", function(event) {
        const [x, y] = d3.pointer(event, svgContainer.value);
        tooltip.value!.style.transform = `translate(${x + 20}px, ${y}px)`;
      })
      .on("mouseout", function() {
        d3.select(this)
          .transition().duration(200)
          .attr("fill-opacity", 0.7)
          .attr("stroke-width", 0.5);
        tooltip.value!.style.display = 'none';
      });

    const midRelativePos = (d.mid - d.minVal) / dataRange;
    const midArea = midRelativePos * targetArea;
    const midR = Math.sqrt(innerR * innerR + (2 * midArea) / theta);
    const centerAngle = (startAngle + endAngle) / 2;
    midRadiusData.push({ angle: centerAngle, radius: midR, dynasty: d.dynasty });
  });

  // 绘制中心线
  const radialLineGenerator = d3.lineRadial<{ angle: number; radius: number }>()
    .angle(d => d.angle)
    .radius(d => d.radius)
    .curve(d3.curveCardinalClosed.tension(0.5)); 

  const linePath = g.append("path")
    .datum(midRadiusData)
    .attr("d", radialLineGenerator)
    .attr("fill", "none")
    .attr("stroke", colors.text)
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.6)
    .attr("stroke-dasharray", "4,4")
    .style("pointer-events", "none");
    
  const totalLength = linePath.node()?.getTotalLength() || 0;
  linePath
    .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(1500)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0)
    .on("end", () => {
      linePath.attr("stroke-dasharray", "3,3");
    });

  // ========== 外圈：战争统计 (径向分组条形图) ==========
  
  const x = d3.scaleBand<string>()
    .domain(dynastyList)
    .range([0, 2 * Math.PI])
    .align(0)
    .paddingInner(0.1)
    .paddingOuter(0.05);

  const xInner = d3.scaleBand<string>()
    .domain(warCategories)
    .range([0, x.bandwidth()])
    .padding(0.1);

  const yMaxWar = d3.max(flatWarData, d => d.count) || 1;
  const y = d3.scaleSqrt()
    .domain([0, yMaxWar * 1.1])
    .range([innerRadiusWar, outerRadiusWar]);

  const arc = d3.arc<FlatData>()
    .innerRadius(innerRadiusWar)
    .outerRadius(d => y(d.count))
    .startAngle(d => x(d.dynasty)! + xInner(d.category)!)
    .endAngle(d => x(d.dynasty)! + xInner(d.category)! + xInner.bandwidth())
    .padAngle(0.01)
    .cornerRadius(2);

  // 基准圆
  g.append("circle")
    .attr("r", innerRadiusWar)
    .attr("fill", "none")
    .attr("stroke", colors.stroke)
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.5)
    .style("opacity", 0)
    .transition().duration(500).style("opacity", 1);

  // 绘制战争条形
  g.selectAll("path.bar")
    .data(flatWarData.filter(d => d.count > 0))
    .join("path")
    .attr("class", "bar")
    .attr("fill", d => colorMap[d.category] || colors.text)
    .attr("stroke", "none")
    .attr("fill-opacity", 0.85)
    .style("pointer-events", "all")
    .transition()
    .duration(800)
    .delay((d, i) => i * 10)
    .ease(d3.easeBackOut.overshoot(1.5))
    .attrTween("d", function(d) {
      const i = d3.interpolate(innerRadiusWar, y(d.count));
      return (t: number) => {
        (d as any).outerRadius = i(t);
        return d3.arc<FlatData>()
          .innerRadius(innerRadiusWar)
          .outerRadius(i(t))
          .startAngle(x(d.dynasty)! + xInner(d.category)!)
          .endAngle(x(d.dynasty)! + xInner(d.category)! + xInner.bandwidth())
          .padAngle(0.01)
          .cornerRadius(2)();
      };
    });

  // 绑定交互
  g.selectAll("path.bar")
    .on("mouseover", function(event, d: any) {
      d3.select(this)
        .transition().duration(200)
        .attr("fill-opacity", 1.0)
        .attr("transform", "scale(1.02)");
      
      tooltip.value!.style.display = 'block';
      tooltip.value!.innerHTML = `
        <div style="font-family: serif;">
          <div style="font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 2px; margin-bottom: 4px;">
            ${d.dynasty} · ${d.category}
          </div>
          <div style="display: flex; align-items: center;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${colorMap[d.category]}; margin-right:6px;"></span>
            <span>事件次数: <strong>${d.count}</strong></span>
          </div>
        </div>
      `;
    })
    .on("mousemove", function(event) {
      const [x, y] = d3.pointer(event, svgContainer.value);
      tooltip.value!.style.transform = `translate(${x + 20}px, ${y}px)`;
    })
    .on("mouseout", function() {
      d3.select(this)
        .transition().duration(200)
        .attr("fill-opacity", 0.85)
        .attr("transform", "scale(1)");
      tooltip.value!.style.display = 'none';
    });

  // 绘制标签
  const fontPx = 11;
  const characterSpacing = 1.2;
  
  const centerTextGroup = g.append("g").attr("class", "dynasty-labels");

  centerTextGroup.selectAll("g.dynasty-label-group")
    .data(dynastyList)
    .join("g")
    .attr("class", "dynasty-label-group")
    .style("opacity", 0)
    .transition().duration(1000).delay(500).style("opacity", 1)
    .selection()
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

// --- 5. 生命周期 ---

onMounted(async () => {
  try {
    // 1. 获取植被数据
    const vegResponse = await fetch('/data/process_data_fromLin/vegetation_summary_final.json');
    if (vegResponse.ok) {
      const data: VegetationData[] = await vegResponse.json();
      vegetationData.value = data.filter(item => item.condition !== '无');
    }

    // 2. 获取战争数据 (新)
    const warResponse = await fetch('/data/war_summary_final.json');
    if (warResponse.ok) {
      const rawWarData = await warResponse.json();
      warData.value = processWarData(rawWarData);
      isDataLoaded.value = true;
    } else {
      console.error('Failed to load war summary data');
    }

    await nextTick();
    setTimeout(() => {
      // ECharts
      if (echartsContainer.value) {
        chartInstance.value = echarts.init(echartsContainer.value);
        chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark, vegetationData.value));
      }
      // D3
      if (isDataLoaded.value) {
        drawChart();
      }
    }, 300);

    if (svgContainer.value) {
      resizeObserver.value = new ResizeObserver(() => {
        chartInstance.value?.resize();
        requestAnimationFrame(() => drawChart());
      });
      resizeObserver.value.observe(svgContainer.value);
    }
  } catch (error) {
    console.error('Chart init error:', error);
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
    if (isDataLoaded.value) drawChart();
  });
}, { deep: true });
</script>

<style scoped lang="scss">
$text-dark-brown: #5a4b40;
$border-color: #dcd3c5;

.chart-card {
  background-color: transparent !important;
  border: none !important;
}

.chart-title {
  color: $text-dark-brown;
  
  .v-theme--dark & {
    color: #D7CCC8;
  }
}

// 图例圆点
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  &.vegetation { background-color: #8FBC8F; }
  &.importance { background-color: #D2691E; }
  &.war { background-color: #B71C1C; }
}

.gap-2 {
  gap: 8px;
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
    
    g path, g text {
      pointer-events: auto;
    }
  }
}

// 【关键修改3】强制 D3 Tooltip 不透明
.chart-tooltip {
  position: absolute;
  top: 0;
  left: 0;
  display: none;
  
  // 改为 Hex 纯色
  background-color: #FCFAF6; 
  // 强制不透明且移除滤镜
  opacity: 1 !important;
  backdrop-filter: none !important;

  border: 1px solid $border-color;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: $text-dark-brown;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  white-space: nowrap;
  z-index: 100;
  transition: opacity 0.2s, transform 0.1s;
  
  .v-theme--dark & {
    // 改为 Hex 纯色 (深色模式)
    background-color: #263238; 
    border-color: #4E342E;
    color: #D7CCC8;
  }
}
</style>