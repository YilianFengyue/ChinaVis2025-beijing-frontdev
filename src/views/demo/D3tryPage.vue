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
//import CircularDynastyChart from '@/components/D3components/CircularDynastyChart.vue';
import SequencesSunburst from '@/components/D3components/SequencesSunburst.vue';
import GreatEvent from '~/src/components/D3components/GreatEvent.vue';
import RadialAreaChart from '~/src/components/D3components/RadialAreaChart.vue';
// [!! MODIFIED: 移除 MapLocation, 引入 SpikeMap !!]
// import MapLocation from '~/src/components/D3components/MapLocation.vue';
import SpikeMap from '~/src/components/D3components/SpikeMap.vue';
import BubbleChart from '~/src/components/D3components/BubbleChart.vue';
import CircularChartEvent from '~/src/components/D3components/CircularChartEvent.vue';
import RiversCard from '~/src/components/chinavis/rivers/RiversCard.vue';

// 注册 ECharts 组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  CanvasRenderer,
]);

// ... ECharts 示例 (无变动) ...
const echartsContainer = ref<HTMLElement | null>(null);
const initEChartsChart = () => { /* ... */ };

// [!! NEW: 定义事件接口 !!]
interface EventItem {
  id: number;
  year: number;
  yearPrefix: string;
  dynasty: string;
  title: string;
  description: string;
  tags: string[];
  people: string;
  province: string;
}

// [!! NEW: 状态提升 !!]
// allEvents ref 用于存储从 CSV 加载的数据
const allEvents = ref<EventItem[]>([]);

/**
 * [!! NEW: 数据加载逻辑从 GreatEvent 提升至此 !!]
 * 加载并处理事件数据
 */
async function loadEventData() {
  const data = await d3.csv('/data/events_step3_modern_locations.csv');
  
  // 辅助函数 (与 GreatEvent 中一致)
  const mergeFigures = (p1: string, p2: string): string => {
    const fig1 = p1 === '—' ? [] : p1.split(',').map(s => s.trim());
    const fig2 = p2 === '—' ? [] : p2.split(',').map(s => s.trim());
    const all = [...new Set([...fig1, ...fig2].filter(p => p))];
    return all.length ? all.join(', ') : '—';
  };
  const mergeDescriptions = (d1: string, d2: string): string => {
    return [...new Set([d1, d2].filter(d => d))].join('\n\n');
  };

  const groupedEvents = new Map<string, EventItem>();

  data.forEach((d) => {
    // 1. 解析年份
    const yearString = d.year_abs || '';
    const year = parseInt(yearString || '0');
    let prefix = '公元';
    if (yearString === '') { prefix = d.dynasty_name || '未知'; }
    else if (d.year_ad_raw?.includes('约')) { prefix = '约'; }
    else if (year < 0) { prefix = '公元前'; }

    // 2. 解析标题
    const rawText = d.raw_text || '';
    let title = d.event_summary || '';
    if (!title && rawText) { title = rawText.substring(0, 5) + (rawText.length > 5 ? '...' : ''); }
    else if (!title && !rawText) {
      if (yearString === '' && (prefix === '未知' || prefix === '')) { return; }
      title = '无标题';
    }
    
    // 3. 唯一键
    const key = `${year}_${title}`;

    // 4. 获取朝代和地点
    const dynasty = d.dynasty_name || '未知';
    const province = d.location_modern || '未知'; // 使用 'location' 列
    
    const currentEvent = {
      id: 0, year, yearPrefix: prefix, dynasty, title, 
      description: rawText, tags: [], people: d.figure || '—', province
    };

    // 5. 合并
    if (groupedEvents.has(key)) {
      const existing = groupedEvents.get(key)!;
      existing.people = mergeFigures(existing.people, currentEvent.people);
      existing.description = mergeDescriptions(existing.description, currentEvent.description);
    } else {
      groupedEvents.set(key, currentEvent);
    }
  });
  
  // 6. 赋值给 ref
  allEvents.value = Array.from(groupedEvents.values()).map((event, index) => ({
    ...event,
    id: index,
  }));
}

onMounted(() => {
  // initEChartsChart();
  loadEventData(); // [!! NEW !!] 页面挂载时加载事件数据
});

// [!! REMOVED: 移除了 D3 示例和地图浮窗逻辑 !!]
// const d3Container = ref<HTMLElement | null>(null);
// const initD3Chart = () => {};
// const showMapDialog = ref(false);
// const selectedProvince = ref('');
// const handleShowMap = (province: string) => {};
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <!-- <h1>D3.js 和 ECharts 练习页面</h1> -->
      </v-col>
    </v-row>
  </v-container>
  
    <!-- <v-container> -->
    <v-row style="height: 550px;">
      <v-col cols="7">
        <!-- <CircularDynastyChart /> -->
         <BubbleChart />
      </v-col>
      <v-col cols="5">
        <!-- <SequencesSunburst /> -->
         <CircularChartEvent />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="12">
        <GreatEvent :all-events="allEvents" />
      </v-col>
      
      <v-col cols="12" md="12">
        <SpikeMap :all-events="allEvents" />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <RadialAreaChart />
      </v-col>

      <v-col cols="12" xl="6">
        <v-card class="card-shadow"
          ><rivers-card></rivers-card>
        </v-card>
      </v-col>
    </v-row>


  <!-- </v-container> -->

  </template>

<style scoped>
/* 你可以在这里添加一些样式 */
</style>