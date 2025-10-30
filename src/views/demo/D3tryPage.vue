<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import CircularDynastyChart from '@/components/D3components/CircularDynastyChart.vue';
import SequencesSunburst from '@/components/D3components/SequencesSunburst.vue';
import GreatEvent from '~/src/components/D3components/GreatEvent.vue';
import RadialAreaChart from '~/src/components/D3components/RadialAreaChart.vue';

// 注册 ECharts 组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  CanvasRenderer,
]);

const d3Container = ref<HTMLElement | null>(null);
const echartsContainer = ref<HTMLElement | null>(null);

// D3.js 示例
const initD3Chart = () => {
  if (d3Container.value) {
    const svg = d3.select(d3Container.value)
      .append('svg')
      .attr('width', 200)
      .attr('height', 100);

    svg.append('circle')
      .attr('cx', 50)
      .attr('cy', 50)
      .attr('r', 40)
      .style('fill', 'blue');
  }
};

// ECharts 示例
const initEChartsChart = () => {
  if (echartsContainer.value) {
    const chart = echarts.init(echartsContainer.value);
    const option = {
      title: {
        text: 'ECharts 示例'
      },
      tooltip: {},
      legend: {
        data:['销量']
      },
      xAxis: {
        data: ["衬衫","羊毛衫","雪纺衫","裤子","高跟鞋","袜子"]
      },
      yAxis: {},
      series: [{
        name: '销量',
        type: 'bar',
        data: [5, 20, 36, 10, 10, 20]
      }]
    };
    chart.setOption(option);
  }
};

onMounted(() => {
  initD3Chart();
  initEChartsChart();
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>D3.js 和 ECharts 练习页面</h1>
      </v-col>
    </v-row>
  </v-container>
  
    <v-container>
    <v-row>
      <v-col cols="6">
        <CircularDynastyChart />
      </v-col>
      <v-col cols="6">
        <SequencesSunburst />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <GreatEvent />
      </v-col>
      <v-col cols="12">
        <RadialAreaChart />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* 你可以在这里添加一些样式 */
</style>