<template>
  <v-card flat class="minguo-panel transparent">
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">历代战争与植被</h2>
            <span class="panel-subtitle">WAR & VEGETATION · 综合分析</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <v-col cols="auto">
          
        </v-col>
      </v-row>

      <div class="desc-line">
        <span class="legend-dot vegetation mr-1"></span>植被状况
        <span class="mx-2 separator">/</span>
        <span class="legend-dot importance mr-1"></span>综合国力
        <span class="mx-2 separator">/</span>
        <span class="legend-dot war mr-1"></span>战争频次
      </div>
    </div>

    <div class="chart-wrapper">
      <div ref="echartsContainer" class="echarts-layer"></div>
      <div ref="svgContainer" class="d3-layer"></div>
      <div ref="tooltip" class="arch-tooltip"></div>
    </div>
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
  '决定性战役': '#8D4E3C', // 铁锈红 (Rust) - 沉稳的警示
  '重要战役': '#B08B57',   // 古铜金 (Antique Bronze)
  '一般冲突': '#CDB398',   // 砂岩色 (Sandstone)
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
// 这里的 dynasty 列表也作为主键列表
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
  '#7E8C91', // 铁灰 (先秦)
  '#8D6E63', // 褐土 (秦汉)
  '#A1887F', // 浅陶 (魏晋)
  '#8B7355', // 古铜 (隋唐) - 盛世用金铜色
  '#9C8B7A', // 驼灰 (辽宋金)
  '#6D4C41', // 深咖 (元)
  '#BCAAA4', // 暖灰 (明)
  '#795548', // 赭石 (清)
  '#A0909A'  // 藕灰 (民国)
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

// 朝代映射表 (将 JSON 中的朝代映射到 importanceData 的标准朝代)
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

// 主题配色 (仿古风格)
const themeColors = computed(() => {
  const isDark = vuetifyTheme.global.current.value.dark;
  
  // ☀️【光模式：民国老报纸/建筑图纸风】
  const antiqueLight = {
    bg: "transparent",       
    text: "#4A4035",         
    textLight: "#9A8B7A",    
    stroke: "#BCAAA4",       
    bandFill: "#A1887F",     
    bandLine: "#5D4037",     
    
    // 👇 核心修改：改为白底、深灰框、深色字 (RiverCard 风格)
    tooltipBg: "rgba(255, 255, 255, 0.96)", 
    tooltipBorder: "rgba(0, 0, 0, 0.08)",
    tooltipText: "#333333" // 改为深色字
  };

  // 🌙【暗模式：夜间博物馆/拓片风】
  const antiqueDark = {
     
    
    // 字体：米白/骨色，不刺眼
    text: "#E6DACE",         
    // 次要字体：灰褐，融入背景
    textLight: "#8D7B6F",    
    
    // 线条：深褐木色，低调的结构感
    stroke: "#5D4037",       
    
    // 国力带状图基调：稍亮的红陶色，在深色背景中透出来
    bandFill: "#8D4E3C",     
    
    // 中心虚线：浅骨色
    bandLine: "#D7CCC8",     
    
    // Tooltip：更深的黑褐背景
    tooltipBg: "rgba(30, 26, 23, 0.95)", 
    tooltipBorder: "rgba(141, 110, 99, 0.3)",
    tooltipText: "#D7CCC8"
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
  const colors = [
    '#8A9B8A', // 苔灰 (Moss Grey)
    '#9C8B7A', // 驼灰 (Camel Grey)
    '#7E8C91', // 铁灰 (Iron Grey)
    '#B5A995', // 米灰 (Rice Grey)
    '#A0909A'  // 藕灰 (Lotus Grey)
  ];
  
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
      extraCssText: 'backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.15);'
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
        .attr("fill", "#4A4035") // 强制使用深褐色
        .attr("font-family", '"Source Han Serif SC", serif') // 使用衬线体
        .attr("font-weight", "700")
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

<style scoped>
/* ================= 基础容器风格 ================= */
.minguo-panel {
  --font-en: "Product Sans", "Helvetica Neue", sans-serif;
  --font-cn: "Source Han Serif SC", "Noto Serif SC", serif;
  /* 民国风背景色，带一点点暖调的透明白 */
  background: rgba(250, 248, 245, 0.4) !important; 
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 115, 85, 0.15); /* 极淡的古铜色边框 */
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ================= 头部设计 ================= */
.panel-header {
  padding: 16px 20px 10px;
  border-bottom: 1px solid rgba(139, 115, 85, 0.1);
  background: linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
}

.header-block {
  width: 5px;
  height: 28px;
  background: #8B7355; /* 民国古铜色 */
  margin-right: 12px;
  border-radius: 1px;
}

.header-text-group {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-family: var(--font-cn);
  font-size: 18px;
  font-weight: 700;
  color: #4A4035; /* 深褐灰色 */
  letter-spacing: 2px;
  line-height: 1.2;
}

.panel-subtitle {
  font-family: var(--font-en);
  font-size: 9px;
  color: #9A8B7A; /* 浅驼灰 */
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 2px;
}

.source-tag {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  background: rgba(139, 115, 85, 0.05);
  border: 1px solid rgba(139, 115, 85, 0.1);
  border-radius: 2px;
}

.source-text {
  font-family: var(--font-cn);
  font-size: 10px;
  color: #8B7355;
}

.desc-line {
  font-family: var(--font-cn);
  font-size: 11px;
  color: #7E7065;
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.separator {
  color: #ccc;
  font-weight: 300;
}

/* ================= 图例颜色点 ================= */
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%; /* 如果想要更建筑感，可以改成 border-radius: 1px (方形) */
}
/* 这里对应 Script 中的新色系 */
.legend-dot.vegetation { background-color: #8A9B8A; } /* 苔灰 */
.legend-dot.importance { background-color: #BDA29A; } /* 褐灰 */
.legend-dot.war { background-color: #8D4E3C; }        /* 铁锈红 */

/* ================= 图表布局 (核心) ================= */
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 700px; /* 强制高度 */
  overflow: hidden;
  flex-grow: 1;
}

.echarts-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: auto !important;
}

.d3-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none !important;
}

/* 必须保留 pointer-events 穿透设置 */
.d3-layer :deep(svg) {
  pointer-events: none !important;
}
.d3-layer :deep(g path), 
.d3-layer :deep(g text) {
  pointer-events: auto;
}

/* ==================== Tooltip (建筑文档风格·高可视度版) ==================== */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.arch-tooltip {
  position: fixed;
  z-index: 99999;
  width: 260px;
  
  /* 核心修改：改为高亮磨砂白背景 */
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  
  /* 边框：极细的灰线 */
  border: 1px solid rgba(0, 0, 0, 0.08);
  /* 左侧强调线：保留，但颜色加深一点以便识别 */
  border-left: 3px solid #D4AF37; 
  
  /* 投影：加深投影，让它“浮”在图表之上 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0,0,0,0.06);
  
  padding: 16px;
  pointer-events: none;
  font-family: var(--font-en);
  border-radius: 2px;
}

.tt-header {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  padding-bottom: 8px;
  margin-bottom: 10px;
}

.tt-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.tt-name {
  font-family: var(--font-cn);
  font-size: 16px; /* 稍微调小一点，更精致 */
  font-weight: 800;
  color: #1a1a1a; /* 纯黑偏灰，极高对比度 */
  letter-spacing: 1px;
}

.tt-id {
  font-size: 11px;
  color: #999;
  font-weight: 600;
}

.tt-sub-row {
  margin-top: 2px;
}

.tt-alias {
  font-size: 11px;
  color: #666;
  font-family: var(--font-cn);
  background: #F0F0F0;
  padding: 1px 4px;
  border-radius: 2px;
}

.tt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px; /* 增加列间距 */
  margin-bottom: 12px;
}

.tt-item {
  display: flex;
  flex-direction: column;
}

.tt-item.full {
  grid-column: span 2;
}

.tt-label {
  font-size: 9px;
  color: #888; /* 标签用浅灰 */
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
  font-weight: 700;
}

.tt-value {
  font-size: 12px;
  color: #333; /* 数值用深灰 */
  font-family: var(--font-cn);
  font-weight: 500;
  line-height: 1.4;
}

/* 核心修改：金色的文字在白底上看不清，改为“古铜色” */
.tt-value.highlight-gold {
  color: #9C7C13; /* 深古铜金，在白底上清晰可见 */
  font-weight: 700;
  background: rgba(239, 209, 96, 0.15); /* 淡金背景衬托 */
  padding: 0 4px;
  border-radius: 2px;
  display: inline-block;
}

.tt-note {
  /* 核心修改：Note区域改为浅灰底，与白底区分 */
  background: #F7F7F7;
  border: 1px solid #EDEDED;
  padding: 8px 10px;
  border-radius: 2px;
  margin-top: 8px;
}

.tt-note-label {
  font-size: 8px;
  color: #999;
  margin-bottom: 4px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.tt-note-text {
  font-size: 11px;
  line-height: 1.6;
  color: #555; /* 正文深灰 */
  font-family: var(--font-cn);
  text-align: justify;
  margin: 0;
}
</style>