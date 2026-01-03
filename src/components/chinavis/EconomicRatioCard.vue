<template>
  <div ref="chartRef" style="width: 100%; height: 400px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts';

const chartRef = ref<HTMLElement>();
let myChart: echarts.ECharts | null = null;

const initChart = () => {
  if (!chartRef.value) return;
  myChart = echarts.init(chartRef.value);

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['官营数量', '非官营数量', '官私比例'],
      bottom: 10
    },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['先秦至汉', '汉至唐', '辽', '金', '元', '明', '清', '近代'],
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: [
      { type: 'value', name: '数量', min: 0, max: 25 },
      { type: 'value', name: '比例', min: 0, max: 14 }
    ],
    series: [
      {
        name: '官营数量',
        type: 'bar',
        stack: 'total',
        color: '#A67C52', // 古典棕
        data: [7, 5, 1, 6, 11, 4, 5, 1]
      },
      {
        name: '非官营数量',
        type: 'bar',
        stack: 'total',
        color: '#8BAB8D', // 古典绿
        data: [6, 2, 0, 3, 1, 2, 3, 12]
      },
      {
        name: '官私比例',
        type: 'line',
        yAxisIndex: 1,
        color: '#CF794D', // 橙色线
        symbol: 'circle',
        symbolSize: 8,
        label: { show: true, position: 'top' },
        data: [1.1, 2.5, 1, 2, 11, 2, 1.6, 0.1]
      }
    ]
  };

  myChart.setOption(option);
};

onMounted(initChart);
window.addEventListener('resize', () => myChart?.resize());
</script>