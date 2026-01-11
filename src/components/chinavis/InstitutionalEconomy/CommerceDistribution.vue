<template>
  <v-card flat class="arch-panel">
    <!-- 头部区域 -->
    <div class="panel-header">
      <v-row align="center" dense no-gutters>
        <v-col cols="auto" class="d-flex align-center mr-6">
          <div class="header-block"></div>
          <div class="header-text-group">
            <h2 class="panel-title">商业手工业生产网络</h2>
            <span class="panel-subtitle">COMMERCE & CRAFT PRODUCTION</span>
          </div>
        </v-col>

        <v-spacer></v-spacer>

        <v-col cols="auto" v-if="selectedPeriod">
          <button class="arch-btn" @click="resetView">
            [ RESET VIEW ]
          </button>
        </v-col>
      </v-row>

      <!-- 图例/筛选栏 -->
      <div class="legend-bar">
        <div class="legend-group">
          <span class="legend-head">PERIOD</span>
          <div class="legend-items">
            <span 
              v-for="period in availablePeriods" 
              :key="period"
              class="l-item clickable"
              :class="{ active: selectedPeriod === period }"
              @click="togglePeriod(period)"
            >
              <span class="dot-square" :class="{ filled: selectedPeriod === period }"></span>
              {{ period }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 主体内容 -->
    <div class="content-body">
      <!-- 第一行 -->
      <v-row class="chart-row">
        <!-- 左侧：矩形树图 + 统计卡片 -->
        <v-col cols="8">
          <div class="chart-card" style="height: 420px;">
            <div class="chart-header">
              <span class="chart-title">产业类型图谱</span>
              <span class="chart-subtitle">INDUSTRY TREEMAP · {{ filteredTreemapData.totalCount }} 条记录</span>
            </div>
            <div class="treemap-with-stats">
              <!-- 矩形树图 -->
              <div ref="treemapContainer" class="treemap-section">
                <svg ref="treemapSvg"></svg>
              </div>
              <!-- 右侧统计卡片竖排 -->
              <div class="stats-column">
                <div class="stat-item-vertical" v-for="stat in summaryStats" :key="stat.title">
                  <div class="stat-value-v" :style="{ color: stat.color }">{{ stat.value }}</div>
                  <div class="stat-label-v">{{ stat.title }}</div>
                  <div class="stat-unit-v">{{ stat.subtitle }}</div>
                </div>
              </div>
            </div>
          </div>
        </v-col>

        <!-- 右侧：气候饼图（放大占满） -->
        <v-col cols="4">
          <div class="chart-card climate-card" style="height: 420px;">
            <div class="chart-header">
              <span class="chart-title">气候关联分布</span>
              <span class="chart-subtitle">CLIMATE CORRELATION</span>
            </div>
            <div ref="climateChartRef" class="climate-chart-full"></div>
            <div class="climate-legend-bottom">
              <span class="legend-dot-item" v-for="item in climateData" :key="item.name">
                <span class="dot" :style="{ background: item.color }"></span>
                {{ item.name }} {{ item.value }}
              </span>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- 第二行 -->
      <v-row class="chart-row mt-4">
        <!-- 左侧：产业变化趋势 -->
        <v-col cols="6">
          <div class="chart-card" style="height: 420px;">
            <div class="chart-header">
              <span class="chart-title">产业活动趋势</span>
              <span class="chart-subtitle">ACTIVITY TREND</span>
            </div>
            <div ref="industryTrendChartRef" class="echarts-container"></div>
          </div>
        </v-col>

        <!-- 右侧：官营私营比例 -->
        <v-col cols="6">
          <div class="chart-card" style="height: 420px;">
            <div class="chart-header">
              <span class="chart-title">官营与私营比例</span>
              <span class="chart-subtitle">OWNERSHIP RATIO · {{ ownershipData.totalLabeled }} 条已标注</span>
            </div>
            <div ref="ownershipChartRef" class="echarts-container"></div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="tooltip.show"
          class="arch-tooltip"
          :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        >
          <div class="tt-header">
            <span class="tt-name">{{ tooltip.data.name }}</span>
            <span class="tt-category">{{ tooltip.data.category }}</span>
          </div>
          <div class="tt-row">
            <span class="tt-label">出现次数</span>
            <span class="tt-value">{{ tooltip.data.count }}</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import * as d3 from 'd3';
import industryDataRaw from '@/data/14_industry_processed.json';

// 引用定义
const treemapContainer = ref<HTMLElement | null>(null);
const treemapSvg = ref<SVGSVGElement | null>(null);
const climateChartRef = ref<HTMLElement | null>(null);
const industryTrendChartRef = ref<HTMLElement | null>(null);
const ownershipChartRef = ref<HTMLElement | null>(null);
const selectedPeriod = ref<string | null>(null);

const tooltip = ref({
  show: false,
  x: 0,
  y: 0,
  data: {} as any,
});

// 朝代列表
const availablePeriods = [
  '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
  '辽金', '元', '明', '清', '民国'
];

// 🎨 低饱和高级灰色系（参考 MinguoMarketDonut）
const CLASS_COLORS: Record<string, string> = {
  '商业': '#B5A995',
  '金融业': '#9C8B7A',
  '冶铸业': '#7E8C91',
  '军工业': '#706B65',
  '食品加工业': '#8A9B8A',
  '粮食加工业': '#A09080',
  '酿酒业': '#8B7E6A',
  '纺织业': '#A0909A',
  '丝织业': '#9A8B80',
  '麻布业': '#7A8080',
  '皮革业': '#9B8570',
  '新式工业': '#6A7B8A',
  '家具业': '#7A6555',
  '工艺品': '#A09565',
  '采煤业': '#5A5F5F',
  '矿冶业': '#6A7060',
  '燃料': '#6A5050',
  '制盐业': '#6A8080',
  '制陶业': '#9A8585',
  '陶瓷业': '#6A7090',
  '营造业': '#7A8565',
  '石雕业': '#808080',
  '印刷业': '#8565A0',
  '杂项手工业': '#7A8090',
  '工具业': '#5A7A6A',
  '制药业': '#5A9090',
  '石器业': '#857A60',
  '骨器业': '#A0977A'
};

const CLASS_ORDER = Object.keys(CLASS_COLORS);

// 切换朝代筛选
const togglePeriod = (period: string) => {
  selectedPeriod.value = selectedPeriod.value === period ? null : period;
};

// 重置视图
const resetView = () => {
  selectedPeriod.value = null;
  tooltip.value.show = false;
};

// 1. 数据处理：产业类型统计（使用宏观分类）
const industryTypeData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodMap: Record<string, Record<string, number>> = {};
  const allTypes = new Set<string>();

  rawData.forEach(item => {
    const period = item.period;
    if (!period) return;
    if (selectedPeriod.value && period !== selectedPeriod.value) return;

    const types = item.main_period_categories || [];
    if (!periodMap[period]) {
      periodMap[period] = {};
    }

    types.forEach(type => {
      allTypes.add(type);
      periodMap[period][type] = (periodMap[period][type] || 0) + 1;
    });
  });

  return { periodMap, allTypes: Array.from(allTypes) };
});

// 矩形树图数据
const filteredTreemapData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const typeCount: Record<string, number> = {};
  let totalCount = 0;

  rawData.forEach(item => {
    if (selectedPeriod.value && item.period !== selectedPeriod.value) return;
    
    const types = item.main_period_categories || [];
    types.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
      totalCount++;
    });
  });

  const items = Object.entries(typeCount)
    .map(([name, count]) => ({ name, count, category: name }))
    .sort((a, b) => b.count - a.count);

  return { items, totalCount };
});

// 统计数据
const summaryStats = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const allTypes = new Set<string>();
  const allLocations = new Set<string>();
  let warmCount = 0;
  
  rawData.forEach(item => {
    if (selectedPeriod.value && item.period !== selectedPeriod.value) return;
    
    const types = item.main_period_categories || [];
    types.forEach(t => allTypes.add(t));
    
    (item.locations || []).forEach(loc => {
      if (loc.trim()) allLocations.add(loc.trim());
    });
    
    const temp = (item.temperature_desc || '').trim();
    if (temp.includes('暖')) warmCount++;
  });
  
  const filteredCount = selectedPeriod.value 
    ? rawData.filter(item => item.period === selectedPeriod.value).length
    : rawData.length;
  
  return [
    {
      title: '产业活动',
      value: filteredCount,
      subtitle: '次',
      color: '#7E8C91'
    },
    {
      title: '产业类型',
      value: allTypes.size,
      subtitle: '种',
      color: '#8A9B8A'
    },
    {
      title: '涉及地点',
      value: allLocations.size,
      subtitle: '处',
      color: '#9C8B7A'
    },
    {
      title: '暖期比例',
      value: filteredCount > 0 ? Math.round((warmCount / filteredCount) * 100) : 0,
      subtitle: '%',
      color: '#B5A995'
    }
  ];
});

// 气候关联数据
const climateData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const stats = { 暖期: 0, 冷期: 0, 平稳期: 0 };

  rawData.forEach(item => {
    if (selectedPeriod.value && item.period !== selectedPeriod.value) return;
    
    const temp = (item.temperature_desc || '').trim();
    if (temp.includes('暖')) {
      stats.暖期++;
    } else if (temp.includes('冷')) {
      stats.冷期++;
    } else {
      stats.平稳期++;
    }
  });

  return [
    { name: '暖期', value: stats.暖期, color: '#B5A995' },
    { name: '冷期', value: stats.冷期, color: '#7E8C91' },
    { name: '平稳期', value: stats.平稳期, color: '#8A9B8A' }
  ];
});

// 产业趋势数据
const industryTrendData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodCount: Record<string, number> = {};

  const historicalOrder = [
    '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
    '辽金', '元', '明', '清', '民国'
  ];

  historicalOrder.forEach(p => { periodCount[p] = 0; });

  rawData.forEach(item => {
    const period = item.period;
    if (period && historicalOrder.includes(period)) {
      periodCount[period]++;
    }
  });

  const periods = historicalOrder.filter(p => periodCount[p] > 0);
  const counts = periods.map(p => periodCount[p]);

  return { periods, counts };
});

// 官私比例数据
const ownershipData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodOwnership: Record<string, { 官营: number; 私营: number }> = {};

  const historicalOrder = [
    '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
    '辽金', '元', '明', '清', '民国'
  ];

  historicalOrder.forEach(p => {
    periodOwnership[p] = { 官营: 0, 私营: 0 };
  });

  let totalLabeled = 0;

  rawData.forEach(item => {
    const period = item.period;
    if (!period || !historicalOrder.includes(period)) return;

    const ownership = (item.ownership || '').trim();
    
    if (ownership === '官营') {
      periodOwnership[period].官营++;
      totalLabeled++;
    } else if (ownership === '私营') {
      periodOwnership[period].私营++;
      totalLabeled++;
    }
  });

  const periods = historicalOrder;
  const 官私比例 = periods.map(p => {
    const total = periodOwnership[p].官营 + periodOwnership[p].私营;
    if (total === 0) return null;
    return Math.round((periodOwnership[p].官营 / total) * 100);
  });

  return {
    periods,
    官营: periods.map(p => periodOwnership[p].官营),
    私营: periods.map(p => periodOwnership[p].私营),
    官私比例,
    totalLabeled
  };
});

// ==================== D3 矩形树图 ====================
const drawTreemap = () => {
  if (!treemapSvg.value || !treemapContainer.value) return;

  const container = treemapContainer.value;
  const { width, height } = container.getBoundingClientRect();
  
  if (width < 50) {
    setTimeout(drawTreemap, 100);
    return;
  }

  const svg = d3.select(treemapSvg.value)
    .attr('width', width)
    .attr('height', height || 320);

  svg.selectAll('*').remove();

  const { items } = filteredTreemapData.value;
  if (items.length === 0) return;

  // 构建层次数据
  const hierarchyData = {
    name: 'root',
    children: items.map(item => ({
      name: item.name,
      value: item.count,
      category: item.category,
    })),
  };

  const root = d3.hierarchy(hierarchyData)
    .sum((d: any) => d.value || 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  const treemap = d3.treemap<any>()
    .size([width, height || 320])
    .paddingInner(2)
    .paddingOuter(1)
    .round(true);

  treemap(root);

  // 绘制叶节点
  const leaves = svg.selectAll('.leaf')
    .data(root.leaves())
    .enter()
    .append('g')
    .attr('class', 'leaf')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  // 矩形
  leaves.append('rect')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => {
      const category = d.data.category;
      const baseColor = d3.color(CLASS_COLORS[category] || '#A09080')!;
      const hsl = d3.hsl(baseColor);
      const maxValue = d3.max(root.leaves(), leaf => leaf.value) || 1;
      const ratio = (d.value || 0) / maxValue;
      hsl.l = Math.max(0.45, Math.min(0.7, hsl.l + (1 - ratio) * 0.1));
      return hsl.toString();
    })
    .attr('opacity', 0)
    .attr('stroke', 'rgba(255,255,255,0.3)')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('mouseenter', function(event, d) {
      d3.select(this)
        .interrupt()
        .attr('opacity', 1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);

      tooltip.value = {
        show: true,
        x: event.clientX + 12,
        y: event.clientY - 35,
        data: {
          name: d.data.name,
          category: d.data.category,
          count: d.value,
        },
      };
    })
    .on('mousemove', (event) => {
      tooltip.value.x = event.clientX + 12;
      tooltip.value.y = event.clientY - 35;
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition().duration(200)
        .attr('opacity', 0.85)
        .attr('stroke', 'rgba(255,255,255,0.3)')
        .attr('stroke-width', 0.5);
      tooltip.value.show = false;
    })
    .transition()
    .duration(600)
    .delay((d, i) => i * 5)
    .attr('opacity', 0.85);

  // 文字标签
  leaves.each(function(d) {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    
    if (w > 30 && h > 18) {
      const g = d3.select(this);
      const fontSize = Math.min(12, Math.max(9, w / 5));
      
      g.append('text')
        .attr('x', 4)
        .attr('y', 14)
        .style('font-size', fontSize + 'px')
        .style('fill', '#fff')
        .style('font-family', '"Source Han Serif SC", serif')
        .style('font-weight', '500')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(d.data.name)
        .transition()
        .delay(400)
        .duration(300)
        .style('opacity', 0.95);

      if (w > 45 && h > 32) {
        g.append('text')
          .attr('x', 4)
          .attr('y', h - 6)
          .style('font-size', '9px')
          .style('fill', 'rgba(255,255,255,0.8)')
          .style('font-family', '"Product Sans", sans-serif')
          .style('pointer-events', 'none')
          .style('opacity', 0)
          .text(d.value)
          .transition()
          .delay(500)
          .duration(300)
          .style('opacity', 1);
      }
    }
  });
};

// ==================== ECharts 图表 ====================
let climateChart: echarts.ECharts | null = null;
let trendChart: echarts.ECharts | null = null;
let ownershipChart: echarts.ECharts | null = null;

const initClimateChart = () => {
  if (!climateChartRef.value) return;
  
  if (climateChart) {
    climateChart.dispose();
  }
  
  climateChart = echarts.init(climateChartRef.value);
  const data = climateData.value;

  climateChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}次 ({d}%)',
      backgroundColor: '#E8E6E2',
      borderColor: '#CCC',
      textStyle: { color: '#333' }
    },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      labelLine: { show: false },
      data: data.map(item => ({
        name: item.name,
        value: item.value,
        itemStyle: { color: item.color }
      }))
    }]
  });
};

const initTrendChart = () => {
  if (!industryTrendChartRef.value) return;
  
  if (trendChart) {
    trendChart.dispose();
  }
  
  trendChart = echarts.init(industryTrendChartRef.value);
  const { periods, counts } = industryTrendData.value;

  trendChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#E8E6E2',
      borderColor: '#CCC',
      textStyle: { color: '#333' },
      formatter: (params: any) => {
        const item = params[0];
        return `<div style="font-weight: bold;">${item.name}</div>
                <div>产业活动: ${item.value} 次</div>`;
      }
    },
    grid: {
      left: '10%',
      right: '8%',
      bottom: '15%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: periods,
      axisLabel: {
        color: '#666',
        fontSize: 10,
        rotate: 30,
        fontFamily: '"Source Han Serif SC", serif'
      },
      axisLine: { lineStyle: { color: '#CCC' } }
    },
    yAxis: {
      type: 'value',
      name: '活动次数',
      nameTextStyle: { color: '#666', fontSize: 10 },
      axisLabel: { color: '#666', fontSize: 10 },
      axisLine: { lineStyle: { color: '#CCC' } },
      splitLine: { lineStyle: { color: '#E5E5E5' } }
    },
    series: [{
      type: 'line',
      data: counts,
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#8A9B8A', width: 3 },
      itemStyle: {
        color: '#8A9B8A',
        borderColor: '#fff',
        borderWidth: 2
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(138, 155, 138, 0.4)' },
            { offset: 1, color: 'rgba(138, 155, 138, 0.05)' }
          ]
        }
      }
    }]
  });
};

const initOwnershipChart = () => {
  if (!ownershipChartRef.value) return;
  
  if (ownershipChart) {
    ownershipChart.dispose();
  }
  
  ownershipChart = echarts.init(ownershipChartRef.value);
  const { periods, 官营, 私营, 官私比例 } = ownershipData.value;

  ownershipChart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#E8E6E2',
      borderColor: '#CCC',
      textStyle: { color: '#333' },
      formatter: (params: any) => {
        const periodName = params[0].name;
        let html = `<div style="font-weight: bold; margin-bottom: 4px;">${periodName}</div>`;
        
        params.forEach((item: any) => {
          if (item.value !== null && item.value !== undefined) {
            const unit = item.seriesName === '官私比例' ? '%' : ' 条';
            html += `<div style="display: flex; align-items: center; margin: 2px 0;">
              <span style="display: inline-block; width: 10px; height: 10px; background: ${item.color}; margin-right: 6px;"></span>
              <span>${item.seriesName}: ${item.value}${unit}</span>
            </div>`;
          }
        });
        return html;
      }
    },
    legend: {
      top: 'top',
      left: 'center',
      textStyle: { color: '#666', fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10
    },
    grid: {
      left: '12%',
      right: '12%',
      bottom: '15%',
      top: '18%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: periods,
      axisLabel: {
        color: '#666',
        fontSize: 10,
        rotate: 30,
        fontFamily: '"Source Han Serif SC", serif'
      },
      axisLine: { lineStyle: { color: '#CCC' } }
    },
    yAxis: [
      {
        type: 'value',
        name: '官私比例',
        position: 'left',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#B5A995', fontSize: 10 },
        axisLabel: { color: '#B5A995', fontSize: 10, formatter: '{value}%' },
        axisLine: { show: true, lineStyle: { color: '#B5A995' } },
        splitLine: { lineStyle: { color: '#E5E5E5' } }
      },
      {
        type: 'value',
        name: '数量',
        position: 'right',
        nameTextStyle: { color: '#666', fontSize: 10 },
        axisLabel: { color: '#666', fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: '#666' } },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '官营',
        type: 'bar',
        yAxisIndex: 1,
        stack: 'ownership',
        data: 官营,
        itemStyle: { color: '#9C8B7A' }
      },
      {
        name: '私营',
        type: 'bar',
        yAxisIndex: 1,
        stack: 'ownership',
        data: 私营,
        itemStyle: { color: '#8A9B8A' }
      },
      {
        name: '官私比例',
        type: 'line',
        yAxisIndex: 0,
        data: 官私比例,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        connectNulls: false,
        lineStyle: { color: '#B5A995', width: 2 },
        itemStyle: { color: '#B5A995', borderColor: '#fff', borderWidth: 1 }
      }
    ]
  });
};

// ==================== 生命周期 ====================
const resizeObserver = ref<ResizeObserver | null>(null);

const initAllCharts = () => {
  drawTreemap();
  initClimateChart();
  initTrendChart();
  initOwnershipChart();
};

const resizeCharts = () => {
  drawTreemap();
  climateChart?.resize();
  trendChart?.resize();
  ownershipChart?.resize();
};

onMounted(() => {
  nextTick(() => {
    initAllCharts();
  });

  resizeObserver.value = new ResizeObserver(() => {
    requestAnimationFrame(resizeCharts);
  });

  if (treemapContainer.value) {
    resizeObserver.value.observe(treemapContainer.value);
  }

  window.addEventListener('resize', resizeCharts);
});

onUnmounted(() => {
  resizeObserver.value?.disconnect();
  window.removeEventListener('resize', resizeCharts);
  climateChart?.dispose();
  trendChart?.dispose();
  ownershipChart?.dispose();
});

// 监听筛选变化
watch(selectedPeriod, () => {
  nextTick(() => {
    initAllCharts();
  });
});
</script>

<style scoped>
/* ==================== 核心字体定义 ==================== */
.arch-panel {
  --font-en: "Product Sans", "Helvetica Neue", sans-serif;
  --font-cn: "Source Han Serif SC", "Noto Serif SC", serif;
  --bg-color: #E9E9E9;
  --card-bg: #FFFFFF;
  --border-color: #D1D1D1;
  --text-primary: #333;
  --text-muted: #666;
}

/* ==================== 面板容器 ==================== */
.arch-panel {
  background: var(--bg-color);
  font-family: var(--font-cn);
  border: none;
  border-radius: 0;
  color: var(--text-primary);
}

/* ==================== 头部设计 ==================== */
.panel-header {
  padding: 20px 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%);
  border-bottom: 1px solid #CCC;
}

.header-block {
  width: 5px;
  height: 28px;
  background: #7E8C91;
  margin-right: 12px;
}

.header-text-group {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-family: var(--font-cn);
  font-size: 20px;
  font-weight: 800;
  color: #333;
  letter-spacing: 2px;
  line-height: 1;
}

.panel-subtitle {
  font-family: var(--font-en);
  font-size: 9px;
  font-weight: 700;
  color: #888;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 4px;
}

/* ==================== 按钮 ==================== */
.arch-btn {
  font-family: var(--font-en);
  font-size: 10px;
  font-weight: 700;
  color: #555;
  background: transparent;
  border: 1px solid #BBB;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.arch-btn:hover {
  background: #333;
  color: #FFF;
  border-color: #333;
}

/* ==================== 图例栏 ==================== */
.legend-bar {
  display: flex;
  align-items: center;
  margin-top: 14px;
  gap: 16px;
}

.legend-group {
  display: flex;
  align-items: center;
}

.legend-head {
  font-family: var(--font-en);
  font-size: 9px;
  color: #888;
  font-weight: 700;
  margin-right: 10px;
  letter-spacing: 0.5px;
}

.legend-items {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.l-item {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #555;
  font-family: var(--font-cn);
  transition: all 0.2s;
}

.l-item.clickable {
  cursor: pointer;
}

.l-item.clickable:hover {
  color: #333;
}

.l-item.active {
  color: #333;
  font-weight: 600;
}

.dot-square {
  width: 8px;
  height: 8px;
  border: 1px solid #888;
  margin-right: 5px;
  transition: all 0.2s;
}

.dot-square.filled {
  background: #7E8C91;
  border-color: #7E8C91;
}

/* ==================== 主体内容 ==================== */
.content-body {
  padding: 16px 24px 24px;
}

.chart-row {
  margin: 0 -8px;
}

/* ==================== 图表卡片 ==================== */
.chart-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #EEE;
}

.chart-title {
  font-family: var(--font-cn);
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.chart-subtitle {
  font-family: var(--font-en);
  font-size: 9px;
  color: #999;
  letter-spacing: 0.5px;
}

/* ==================== 矩形树图 + 统计卡片横排 ==================== */
.treemap-with-stats {
  flex: 1;
  display: flex;
  gap: 16px;
}

.treemap-section {
  flex: 1;
  min-height: 300px;
}

/* ==================== 统计卡片竖排 ==================== */
.stats-column {
  width: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item-vertical {
  text-align: center;
  padding: 10px 6px;
  background: rgba(0,0,0,0.02);
  border: 1px solid #EEE;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-value-v {
  font-family: var(--font-en);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.stat-label-v {
  font-family: var(--font-cn);
  font-size: 10px;
  color: #666;
  margin-top: 4px;
}

.stat-unit-v {
  font-family: var(--font-en);
  font-size: 8px;
  color: #999;
  margin-top: 2px;
}

/* ==================== 气候饼图卡片（放大） ==================== */
.climate-card {
  display: flex;
  flex-direction: column;
}

.climate-chart-full {
  flex: 1;
  width: 100%;
  min-height: 280px;
}

.climate-legend-bottom {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid #EEE;
}

.legend-dot-item {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: #666;
}

.legend-dot-item .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}

/* ==================== ECharts 容器 ==================== */
.echarts-container {
  flex: 1;
  width: 100%;
  min-height: 320px;
}

/* ==================== Tooltip ==================== */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.12s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.arch-tooltip {
  position: fixed;
  z-index: 99999;
  background: #E8E6E2;
  color: #333;
  padding: 10px 14px;
  font-size: 11px;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  border-left: 3px solid #B5A995;
}

.tt-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid #CCC;
  padding-bottom: 6px;
}

.tt-name {
  font-family: var(--font-cn);
  font-size: 13px;
  font-weight: 600;
}

.tt-category {
  font-size: 9px;
  color: #888;
}

.tt-row {
  display: flex;
  justify-content: space-between;
}

.tt-label {
  color: #888;
  font-size: 10px;
}

.tt-value {
  font-weight: 600;
}
</style>