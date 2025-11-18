<template>
  <v-card>
    <v-card-title>历代植被演变</v-card-title>
    <v-card-text>
      <div style="position: relative; width: 100%; height: 500px;">
        <div ref="echartsContainer" style="width: 100%; height: 100%;"></div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick, computed } from 'vue';
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent // 导入图形组件
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from 'vuetify';
import type { GraphicOption } from 'echarts/types/src/util/types'; // 导入图形配置类型

// 注册 ECharts 必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent, // 注册图形组件
  PieChart,
  CanvasRenderer,
]);

// --- 类型定义 ---
interface VegetationData {
  period: string;
  summary: string;
  condition: string;
  examples: string[];
}

// --- Refs ---
const echartsContainer = ref<HTMLElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const vuetifyTheme = useTheme();
const vegetationData = ref<VegetationData[]>([]);

// --- Condition 到图片路径的映射 ---
const conditionImageMap: Record<string, string> = {
  '山川': '/images/山川.png',
  '河流': '/images/河流.png',
  '盆地': '/images/盆地.png',
};

// --- 计算内部图片 graphic 配置 ---
const innerRingImages = computed<GraphicOption[]>(() => {
  const chart = chartInstance.value;
  const container = echartsContainer.value;
  // 依赖 vegetationData.value (此时应已被过滤)
  if (!chart || !container || vegetationData.value.length === 0) return [];

  const { offsetWidth: containerWidth, offsetHeight: containerHeight } = container;
  if (containerWidth === 0 || containerHeight === 0) return [];

  const centerX = containerWidth / 1.96;
  const centerY = containerHeight / 1.92;
  const radius = Math.min(containerWidth, containerHeight) * 0.18;
  const imageSize = 25; 
  // itemCount 将是过滤后的数量
  const itemCount = vegetationData.value.length; 

  // .map 将遍历过滤后的数据
  return vegetationData.value.map((item, index) => {
    const imagePath = conditionImageMap[item.condition];
    // 此处 '无' 已被过滤掉，但保留检查以防万一
    if (!imagePath) return null; 

    // 1. 计算角度
    const angle = (index / itemCount) * Math.PI * 2 - Math.PI / 2;

    // 2. 计算坐标
    const x = centerX + radius * Math.cos(angle) - imageSize / 2;
    const y = centerY + radius * Math.sin(angle) - imageSize / 2;

    // 3. 保留原始的旋转逻辑
    const rotation = -(angle + Math.PI / 2);

    return {
      type: 'image',
      x,
      y,
      rotation, // 设置图片旋转
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


// --- ECharts 选项 ---
const getChartOption = (isDark: boolean, data: VegetationData[]): echarts.EChartsOption => {
  // 使用您指定的循环配色
  const colors = [
    '#D27D46', '#D4AF37', '#8FBC8F', '#D2B48C', '#C0A080'
  ];
  
  // 传入的 data 此时应已被过滤
  const chartData = data.map((item, index) => ({
    value: 1, 
    name: item.period,
    summary: item.summary,
    condition: item.condition,
    itemStyle: {
      // 循环使用颜色
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
        radius: ['45%', '75%'], 
        // 核心修复：强制圆环图的中心与容器中心 (50%, 50%) 对齐。
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
          fontSize: 10, 
        },
        labelLine: {
          show: false 
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          scaleSize: 5
        },
        data: chartData
      }
    ],
    // 应用计算好的 graphic 图片元素
    graphic: [...innerRingImages.value],
  };
};

// --- 生命周期与监听器 ---
onMounted(async () => {
  if (!echartsContainer.value) return;

  try {
    // 1. 异步获取数据
    const response = await fetch('/data/process_data_fromLin/vegetation_summary_final.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: VegetationData[] = await response.json();
    
    // **新增逻辑**：过滤掉 condition 为 "无" 的数据
    vegetationData.value = data.filter(item => item.condition !== '无');

    // 2. 数据获取后 (使用过滤后的数据)，初始化图表
    await nextTick(); 
    setTimeout(() => {
      if (echartsContainer.value) {
        chartInstance.value = echarts.init(echartsContainer.value);
        chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark, vegetationData.value));
      }
    }, 300);

  } catch (error) {
    console.error('Failed to fetch or parse vegetation data:', error);
  }

  // 3. 监听窗口大小变化
  window.addEventListener('resize', resizeChart);
});

// 监听 Vuetify 主题变化
watch(() => vuetifyTheme.global.current.value.dark, (isDark) => {
  // 确保 vegetationData.value (过滤后的) 有数据
  if (chartInstance.value && vegetationData.value.length > 0) {
    nextTick(() => {
      chartInstance.value?.setOption(getChartOption(isDark, vegetationData.value), { replaceMerge: ['graphic'] });
    });
  }
});

// 重新计算图表大小
const resizeChart = () => {
  if (chartInstance.value && vegetationData.value.length > 0) {
    chartInstance.value.resize();
    // 重新设置 option 会自动重新计算 computed 属性 (innerRingImages)
    chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark, vegetationData.value));
  }
};

// 组件卸载时销毁实例
onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance.value?.dispose();
});
</script>

<style scoped lang="scss">
// --- 仿古风格 (仅卡片和标题) ---
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;

.v-card {
  background-color: $card-bg-color !important;
  // **已修复**：移除损坏的样式代码
  border: 1px solid $border-color !important;
  overflow: hidden;

  &.v-theme--dark {
    background-color: #263238 !important;
    border-color: #4E342E !important;
  }
}

.v-card-title {
  color: $text-dark-brown !important;
  font-weight: 600;

  .v-theme--dark & {
    color: #D7CCC8 !important;
  }
}

.v-card-text {
  padding: 0 !important;
  height: 500px;
  width: 100%;
  position: relative;

   > div { // 指向 ref="echartsContainer" 的 div
      background-color: $card-bg-color;
       .v-theme--dark & {
         background-color: #263238;
      }
   }
}
</style>