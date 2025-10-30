<script setup lang="ts">
import { ref, onMounted, shallowRef, watch, nextTick, computed } from 'vue';
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


echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  PieChart,
  CanvasRenderer,
]);


import type { GraphicOption } from 'echarts/types/src/util/types';

// 计算外层图片的弧形分布（含旋转）
const outerRingImages = computed<GraphicOption[]>(() => {
  const chart = chartInstance.value;
  const container = echartsContainer.value;
  if (!chart || !container) return [];

  const { offsetWidth: containerWidth, offsetHeight: containerHeight } = container;
  if (containerWidth === 0 || containerHeight === 0) return [];

  // 容器中心坐标
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  // 外层圆环半径（稍大于外层饼图半径）
  const radius = Math.min(containerWidth, containerHeight) * 0.55;
  // 图片尺寸
  const imageSize = 30;
  // 数据项数量（与外层饼图保持一致）
  const itemCount = dynastyData.length;
  
  return dynastyData.map((_, index) => {
    // 计算每个图片的角度（弧度），从顶部开始分布，顺时针排列
    const angle = (index / itemCount) * Math.PI * 2 - Math.PI / 2;
    
    // 计算图片位置（基于圆心和角度）
    const x = centerX + radius * Math.cos(angle) - imageSize / 2;
    const y = centerY + radius * Math.sin(angle) - imageSize / 2;

    // 计算旋转角度（弧度转角度，使图片沿圆环弧度对齐）
    const rotation = -(angle + Math.PI / 2);

    return {
      type: 'image',
      x,
      y,
      rotation, // 设置图片旋转角度
      style: {
        image: '/images/build.jpg', // 图片路径
        width: imageSize,
        height: imageSize,
        objectFit: 'contain',
      },
      z: 4, // 确保显示在饼图上方
    };
  });
});

// 中心图片的 graphic 配置
const centerImageGraphic = computed<GraphicOption[]>(() => {
  const chart = chartInstance.value;
  const container = echartsContainer.value;
  if (!chart || !container) return [];

  // 获取容器尺寸
  const { offsetWidth: containerWidth, offsetHeight: containerHeight } = container;
  if (containerWidth === 0 || containerHeight === 0) return [];

  // 计算中心坐标和图片直径
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const diameter = Math.min(containerWidth, containerHeight) * 0.16 * 2;

  return [
    {
      type: 'image',
      x: centerX - diameter / 2,
      y: centerY - diameter / 2,
      clip: {
        type: 'circle',
        shape: {
          cx: diameter / 2,
          cy: diameter / 2,
          r: diameter / 2,
        },
      },
      style: {
        image: '/images/centerC.jpg',
        width: diameter,
        height: diameter,
        objectFit: 'cover',
        backgroundColor: 'transparent',
      },
      z: 3,
    },
  ];
});


// --- Refs ---
const echartsContainer = ref<HTMLElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const vuetifyTheme = useTheme();

// --- 示例数据 ---
const dynastyData = [
  { value: 1, name: '清' }, { value: 1, name: '秦汉' }, { value: 1, name: '魏晋南北朝' },
  { value: 1, name: '隋唐五代' }, { value: 1, name: '北宋' }, { value: 1, name: '南宋' },
  { value: 1, name: '元' }, { value: 1, name: '明' },
];
const categoryData = [
  { value: 1, name: '自然资源类' }, { value: 1, name: '农作物类' }, { value: 1, name: '水文类' },
  { value: 1, name: '畜牧类' }, { value: 1, name: '工艺与纺织品类' }, { value: 1, name: '食品加工类' },
];

// --- ECharts 选项 ---
const getChartOption = (isDark: boolean): echarts.EChartsOption => {
  const colors = ['#d8b98b', '#c7a37a', '#b08c6b', '#957159', '#7a5a48', '#624538', '#4d332a','#a1a36e', ];
  const categoryColors = ['#87a79a', '#a5c0b0', '#c2d8c7', '#e0f0de', '#6b8a7f', '#4e6d62'];

  return {
    tooltip: { trigger: 'item', formatter: '{b}' },
    series: [
      // 外层朝代环
      { 
        name: '朝代', 
        type: 'pie', 
        radius: ['70%', '90%'], 
        avoidLabelOverlap: false,
        itemStyle: { 
          borderRadius: 5, 
          borderColor: isDark ? '#111b27' : '#f2f5f8', 
          borderWidth: 2 
        },
        label: { 
          show: true, 
          position: 'outside', 
          formatter: '{b}', 
          color: isDark ? '#ccc' : '#555', 
          distanceToLabelLine: 5 
        },
        labelLine: { 
          show: true, 
          length: 15, 
          length2: 10, 
          smooth: true 
        },
        emphasis: { 
          label: { show: true, fontSize: 14, fontWeight: 'bold' }, 
          scaleSize: 5 
        },
        data: dynastyData.map((item, index) => ({ 
          ...item, 
          itemStyle: { color: colors[index % colors.length] } 
        }))
      },
      // 中层类别环
      { 
        name: '类别', 
        type: 'pie', 
        radius: ['45%', '60%'], 
        avoidLabelOverlap: true,
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
          fontSize: 10 
        },
        emphasis: { scale: false, label: { show: false } },
        data: categoryData.map((item, index) => ({ 
          ...item, 
          itemStyle: { color: categoryColors[index % categoryColors.length] } 
        }))
      },
      // 中心环
      { 
        name: '中心图片', 
        type: 'pie', 
        radius: ['0%', '16%'],
        silent: true,
        label: { show: false },
        itemStyle: { color: 'transparent' },
        symbol: 'image:///images/centerC.jpg',
        symbolSize: ['100%', '100%'],
        symbolKeepAspect: true,
        data: [{ value: 1 }]
        }
    ],
    // 合并中心图片和外层图片的配置
    graphic: [...centerImageGraphic.value, ...outerRingImages.value],
  };
};

// --- 生命周期与监听器 ---
onMounted(() => {
  if (echartsContainer.value) {
    nextTick(() => {
      setTimeout(() => {
        chartInstance.value = echarts.init(echartsContainer.value);
        chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark));
      }, 300);
    });
    window.addEventListener('resize', resizeChart);
  }
});

// 监听主题变化
watch(() => vuetifyTheme.global.current.value.dark, (isDark) => {
  if (chartInstance.value) {
    nextTick(() => {
      chartInstance.value?.setOption(getChartOption(isDark), { replaceMerge: ['series', 'graphic'] });
    });
  }
});

// 监听窗口大小变化，重新计算图片位置
const resizeChart = () => {
  if (chartInstance.value) {
    chartInstance.value.resize();
    // 重新设置选项以更新图片位置和旋转
    chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark));
  }
};

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance.value?.dispose();
});
</script>

<template>
  <v-card>
    <v-card-title>环形图复刻</v-card-title>
    <v-card-text>
      <div style="position: relative; width: 100%; height: 500px;">
        <div ref="echartsContainer" style="width: 100%; height: 100%;"></div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.v-card-text {
  padding: 0 !important;
}
</style>