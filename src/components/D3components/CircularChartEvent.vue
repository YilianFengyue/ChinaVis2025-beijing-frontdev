<template>
  <v-card class="d-flex flex-column h-100">
    <v-card-title>各朝代大事件频数统计</v-card-title>
    <v-card-text class="flex-grow-1">
      <div style="position: relative; width: 100%; height: 100%;">
        <div ref="echartsContainer" style="width: 100%; height: 100%;"></div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, shallowRef, watch, nextTick, onUnmounted, computed } from 'vue'; // [!! 新增: 导入 computed !!]
import * as echarts from 'echarts/core';
import { PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent // [!! 新增: 导入 GraphicComponent !!]
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from 'vuetify';
import * as d3 from 'd3'; 

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent, // [!! 新增: 启用 GraphicComponent !!]
  PieChart,
  CanvasRenderer,
]);

// [!! 新增: 导入 GraphicOption 类型 !!]
import type { GraphicOption } from 'echarts/types/src/util/types';

// --- Refs ---
const echartsContainer = ref<HTMLElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const vuetifyTheme = useTheme();

// --- 数据 ---
const dynastyData = ref<{ value: number, name: string }[]>([]);

// --- 数据加载 (无变动) ---
async function loadData() {
  try {
    const rawData = await d3.csv('/data/events_step3_modern_locations.csv');
    const aggregatedMap = d3.rollup(
      rawData,
      v => v.length,     
      d => d.dynasty_name!
    );
    const formattedData = Array.from(aggregatedMap, ([name, value]) => ({
      name,
      value
    }));
    formattedData.sort((a, b) => b.value - a.value);
    dynastyData.value = formattedData;
    
  } catch (error) {
    console.error("Error loading or processing data:", error);
    dynastyData.value = []; 
  }
}

// [!! 新增: 中心图片的 graphic 配置 (仿照示例) !!]
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
  
  // [!! 调整 !!]
  // 您的内环半径是 32%，中心圆半径是 28%
  // 我们使用 28% * 2 = 56% 作为直径比例
  const diameter = Math.min(containerWidth, containerHeight) * 0.16 * 2; 

  return [
    {
      type: 'image',
      x: centerX - diameter / 2,
      y: centerY - diameter / 2,
      // 添加圆形裁剪
      clip: {
        type: 'circle',
        shape: {
          cx: diameter / 2,
          cy: diameter / 2,
          r: diameter / 2,
        },
      },
      style: {
        // [!! 调整 !!] 使用您想要的图片路径
        image: '/images/centerC.jpg', 
        width: diameter,
        height: diameter,
        objectFit: 'cover',
        backgroundColor: 'transparent',
      },
      z: 3, // 确保在饼图上层
    },
  ];
});


// --- ECharts 选项 (保持上次的修改) ---
const getChartOption = (isDark: boolean): echarts.EChartsOption => {
  // 保持您的主题色
  const colors = ['#d8b98b', '#c7a37a', '#b08c6b', '#957159', '#7a5a48', '#624538', '#4d332a','#a1a36e', ];
  
  // 定义图表边框的颜色 (用于扇区间的空隙)
  const chartBorderColor = isDark ? '#111b27' : '#f2f5f8';


  return {
    tooltip: { 
      trigger: 'item', 
      formatter: '{b}: {c}次 ({d}%)' 
    },
    // 图例 (保持上次的修改)
    legend: {
      orient: 'horizontal', 
      top: 'top',
      left: 'center', 
      textStyle: {
        color: isDark ? '#ccc' : '#555'
      }
    },
    series: [
      
      // [!! 移除 !!]
      // 不再需要 '中心图片' 这个 pie 系列
      // {
      //   name: '中心图片',
      //   type: 'pie',
      //   ...
      //   data: [ { ... symbol: '...' } ]
      // },

      // [!! 原有的 '朝代' 环形图 !!]
      // (保持不变)
      { 
        name: '朝代', 
        type: 'pie', 
        radius: ['32%', '56%'], 
        center: ['50%', '50%'], 
        avoidLabelOverlap: true, 
        itemStyle: { 
          borderRadius: 5, 
          borderColor: chartBorderColor, 
          borderWidth: 2 
        },
        label: { 
          show: true, 
          position: 'outside', 
          formatter: '{b} ({d}%)',
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
          scaleSize: 10 
        },
        data: dynastyData.value.map((item, index) => ({ 
          ...item, 
          itemStyle: { color: colors[index % colors.length] } 
        }))
      },
    ],
    
    // [!! 新增: 挂载 graphic !!]
    // 合并中心图片的配置
    graphic: centerImageGraphic.value,
  };
};

// --- (生命周期钩子，无变动) ---
onMounted(async () => {
  await loadData();
  if (echartsContainer.value) {
    nextTick(() => {
      setTimeout(() => { 
        if (echartsContainer.value) {
          chartInstance.value = echarts.init(echartsContainer.value);
          chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark));
        }
      }, 300); 
    });
    window.addEventListener('resize', resizeChart);
  }
});

// [!! 调整: 监听主题变化 !!]
watch(() => vuetifyTheme.global.current.value.dark, (isDark) => {
  if (chartInstance.value) {
    nextTick(() => {
      // [!! 调整 !!] 仿照示例，使用 replaceMerge 确保 graphic 更新
      chartInstance.value?.setOption(getChartOption(isDark), { replaceMerge: ['graphic'] });
    });
  }
});

// [!! 调整: 监听窗口大小变化 !!]
const resizeChart = () => {
  if (chartInstance.value) {
    chartInstance.value.resize();
    // [!! 调整 !!] 仿照示例，必须重新 setOption 来更新 graphic 的像素位置
    chartInstance.value.setOption(getChartOption(vuetifyTheme.global.current.value.dark));
  }
};

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
  width: 100%;
  position: relative; 

    > div { 
      background-color: $card-bg-color;
       .v-theme--dark & {
         background-color: #263238;
       }
    }
}
</style>