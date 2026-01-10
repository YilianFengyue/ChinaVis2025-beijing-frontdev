<template>
  <v-card flat class="pa-6" style="background-color: #F8F6F0;">
    <!-- 🎯 标题区域 -->
    <div class="mb-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <h2 class="text-h5 font-weight-bold" style="color: #7C6B59;">
          历代商业手工业 · 生产网络
        </h2>
        <v-btn size="small" variant="text" icon="mdi-information-outline" 
               @click="showHelp = !showHelp"></v-btn>
      </div>
      <p class="text-body-2 text-grey-darken-1">
        分析制度逻辑如何驱动经济重心迁移
      </p>
    </div>

    <!-- ❓ 帮助说明 -->
    <v-expand-transition>
      <v-alert v-if="showHelp" type="info" variant="tonal" closable @click:close="showHelp = false" class="mb-4">
        <div class="text-body-2">
          <strong>数据说明：</strong><br>
          • 展示夏商周至民国各朝代的产业类型分布（宏观分类）<br>
          • 气候关联分析产业活动与温度变化的相关性<br>
          • 产业变化趋势体现北京历代商业手工业发展脉络<br>
          • 官营与私营比例反映各朝代手工业经营模式<br>
          • 点击朝代筛选器可过滤特定时期数据
        </div>
      </v-alert>
    </v-expand-transition>

    <!-- 📊 朝代筛选器 -->
    <div class="mb-4 pa-4 bg-white rounded-lg filter-bar" style="border: 1px solid #DCD3C5;">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div class="d-flex align-center gap-2">
          <v-icon size="18" color="#7C6B59">mdi-filter-variant</v-icon>
          <span class="text-caption font-weight-bold" style="color: #7C6B59;">时期筛选</span>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="period in availablePeriods"
            :key="period"
            size="small"
            :variant="selectedPeriod === period ? 'flat' : 'outlined'"
            :color="selectedPeriod === period ? '#CF794D' : '#7C6B59'"
            @click="togglePeriod(period)"
            class="period-chip"
          >
            {{ period }}
          </v-chip>
          <v-chip
            size="small"
            variant="text"
            color="#C2B190"
            @click="selectedPeriod = null"
            v-if="selectedPeriod"
            class="clear-chip"
          >
            重置
          </v-chip>
        </div>
      </div>
    </div>

    <!-- 📈 统计卡片 -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3" v-for="stat in summaryStats" :key="stat.title">
        <div class="stat-card pa-4 bg-white rounded-lg" style="border: 1px solid #DCD3C5;">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-caption text-grey-darken-1 mb-1">{{ stat.title }}</div>
              <div class="text-h5 font-weight-bold" :style="{ color: stat.color }">
                {{ stat.value }}
              </div>
              <div class="text-caption text-grey" v-if="stat.subtitle">{{ stat.subtitle }}</div>
            </div>
            <v-icon :color="stat.color" size="40" class="stat-icon">{{ stat.icon }}</v-icon>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- 左侧：产业类型演变堆叠图（宏观分类） -->
      <v-col cols="12" md="8">
        <div class="pa-4 bg-white rounded-lg chart-card" style="border: 1px solid #DCD3C5; height: 100%;">
          <h3 class="text-subtitle-2 mb-4 font-weight-bold" style="color: #7C6B59;">
            <v-icon size="small" color="#CF794D" class="mr-1">mdi-chart-bar</v-icon>
            各时期产业类型分布
            <span class="text-caption font-weight-regular ml-2" style="color: #C2B190;">
              {{ filteredIndustryData.periods.length }} 个时期 · 宏观分类
            </span>
          </h3>
          <div ref="industryChartRef" style="width: 100%; height: 480px;"></div>
        </div>
      </v-col>
      
      <!-- 右侧：气候关联饼图 -->
      <v-col cols="12" md="4">
        <div class="pa-4 bg-white rounded-lg" style="border: 1px solid #DCD3C5; height: 100%;">
          <h3 class="text-subtitle-2 mb-3 font-weight-bold" style="color: #7C6B59;">
            产业活动与气候关联
          </h3>
          <div ref="climateChartRef" style="width: 100%; height: 280px;"></div>
          <div class="d-flex justify-center gap-4 mt-2">
            <div class="d-flex align-center">
              <div class="legend-dot mr-2" style="background-color: #CF794D;"></div>
              <span class="text-caption">暖期</span>
            </div>
            <div class="d-flex align-center">
              <div class="legend-dot mr-2" style="background-color: #C2B190;"></div>
              <span class="text-caption">冷期</span>
            </div>
            <div class="d-flex align-center">
              <div class="legend-dot mr-2" style="background-color: #8BAB8D;"></div>
              <span class="text-caption">平稳期</span>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- 📍 北京历代商业手工业变化 -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <div class="pa-4 bg-white rounded-lg chart-card" style="border: 1px solid #DCD3C5;">
          <h3 class="text-subtitle-2 mb-4 font-weight-bold" style="color: #7C6B59;">
            <v-icon size="small" color="#8BAB8D" class="mr-1">mdi-chart-line</v-icon>
            北京历代商业手工业变化
            <span class="text-caption font-weight-regular ml-2" style="color: #C2B190;" v-if="selectedPeriod">
              筛选: {{ selectedPeriod }}
            </span>
          </h3>
          <div ref="industryTrendChartRef" style="width: 100%; height: 320px;"></div>
        </div>
      </v-col>

      <!-- � 各朝代官营与私营手工业比例 -->
      <v-col cols="12" md="6">
        <div class="pa-4 bg-white rounded-lg chart-card" style="border: 1px solid #DCD3C5;">
          <h3 class="text-subtitle-2 mb-4 font-weight-bold" style="color: #7C6B59;">
            <v-icon size="small" color="#D99964" class="mr-1">mdi-chart-donut</v-icon>
            各朝代官营与私营手工业比例
            <span class="text-caption font-weight-regular ml-2" style="color: #C2B190;">
              已标注 {{ ownershipData.totalLabeled }} 条
            </span>
          </h3>
          <div ref="ownershipChartRef" style="width: 100%; height: 320px;"></div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import * as echarts from 'echarts';
import industryDataRaw from '@/data/14_industry_processed.json';
import { useClimateLinkageStore } from '@/stores/climateLinkageStore';

// 气候联动 Store
const climateLinkageStore = useClimateLinkageStore();

// 引用定义
const industryChartRef = ref<HTMLElement | null>(null);
const climateChartRef = ref<HTMLElement | null>(null);
const industryTrendChartRef = ref<HTMLElement | null>(null);
const ownershipChartRef = ref<HTMLElement | null>(null);
const showHelp = ref(false);
const selectedPeriod = ref<string | null>(null);

// 朝代列表
const availablePeriods = [
  '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
  '辽金', '元', '明', '清', '民国'
];

// 切换朝代筛选 + 联动触发
const togglePeriod = (period: string) => {
  const newPeriod = selectedPeriod.value === period ? null : period;
  selectedPeriod.value = newPeriod;
  // 触发联动：更新 store
  climateLinkageStore.setPeriodHighlight(newPeriod);
};

// 颜色配置（宏观产业类型）
const colorPalette: Record<string, string> = {
  商业: '#CF794D',
  金融业: '#D99964',
  冶铸业: '#CDA756',
  军工业: '#C2B190',
  食品加工业: '#8BAB8D',
  粮食加工业: '#7C6B59',
  酿酒业: '#A67C52',
  纺织业: '#92816D',
  丝织业: '#B8860B',
  麻布业: '#708090',
  皮革业: '#CD853F',
  新式工业: '#4682B4',
  家具业: '#8B4513',
  工艺品: '#DAA520',
  采煤业: '#2F4F4F',
  矿冶业: '#556B2F',
  燃料: '#8B0000',
  制盐业: '#5F9EA0',
  制陶业: '#BC8F8F',
  陶瓷业: '#4169E1',
  营造业: '#6B8E23',
  石雕业: '#808080',
  印刷业: '#9932CC',
  杂项手工业: '#778899',
  工具业: '#2E8B57',
  制药业: '#20B2AA',
  石器业: '#A0522D',
  骨器业: '#DEB887'
};

// 1. 数据处理：产业类型统计（使用宏观分类 main_period_categories）
const industryTypeData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodMap: Record<string, Record<string, number>> = {};
  const allTypes = new Set<string>();

  rawData.forEach(item => {
    const period = item.period;
    if (!period) return;

    // 使用宏观分类
    const types = item.main_period_categories || [];

    if (!periodMap[period]) {
      periodMap[period] = {};
    }

    types.forEach(type => {
      allTypes.add(type);
      periodMap[period][type] = (periodMap[period][type] || 0) + 1;
    });
  });

  const historicalOrder = [
    '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
    '辽金', '元', '明', '清', '民国'
  ];

  const periods = historicalOrder.filter(p => p in periodMap);

  const series = Array.from(allTypes)
    .map(type => ({
      name: type,
      type: 'bar',
      stack: 'total',
      itemStyle: {
        color: colorPalette[type] || '#E1E0DD'
      },
      data: periods.map(period => periodMap[period]?.[type] || 0)
    }))
    .filter(s => s.data.some(v => v > 0));

  return { periods, series };
});

// 过滤后的产业数据
const filteredIndustryData = computed(() => {
  const { periods, series } = industryTypeData.value;
  
  if (!selectedPeriod.value) {
    return { periods, series };
  }
  
  const periodIndex = periods.indexOf(selectedPeriod.value);
  if (periodIndex === -1) {
    return { periods, series };
  }
  
  const filteredPeriods = [selectedPeriod.value];
  const filteredSeries = series.map(s => ({
    ...s,
    data: [s.data[periodIndex]]
  })).filter(s => s.data[0] > 0);
  
  return { periods: filteredPeriods, series: filteredSeries };
});

// 统计数据
const summaryStats = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const allTypes = new Set<string>();
  const allLocations = new Set<string>();
  let warmCount = 0;
  
  rawData.forEach(item => {
    if (selectedPeriod.value && item.period !== selectedPeriod.value) return;
    
    // 使用宏观分类统计
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
      icon: 'mdi-factory',
      color: '#CF794D'
    },
    {
      title: '产业类型',
      value: allTypes.size,
      subtitle: '种（宏观）',
      icon: 'mdi-chart-pie',
      color: '#D99964'
    },
    {
      title: '涉及地点',
      value: allLocations.size,
      subtitle: '处',
      icon: 'mdi-map-marker',
      color: '#8BAB8D'
    },
    {
      title: '暖期比例',
      value: filteredCount > 0 ? Math.round((warmCount / filteredCount) * 100) : 0,
      subtitle: '%',
      icon: 'mdi-white-balance-sunny',
      color: '#CDA756'
    }
  ];
});

// 2. 数据处理：气候关联统计
const climateData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const stats = { 暖期: 0, 冷期: 0, 平稳期: 0 };

  rawData.forEach(item => {
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
    { name: '暖期', value: stats.暖期, color: '#CF794D' },
    { name: '冷期', value: stats.冷期, color: '#C2B190' },
    { name: '平稳期', value: stats.平稳期, color: '#8BAB8D' }
  ];
});

// 3. 数据处理：北京历代商业手工业变化趋势
const industryTrendData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodCount: Record<string, number> = {};

  const historicalOrder = [
    '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
    '辽金', '元', '明', '清', '民国'
  ];

  // 初始化
  historicalOrder.forEach(p => { periodCount[p] = 0; });

  // 统计每个朝代的产业活动次数
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

// 4. 数据处理：各朝代官营与私营手工业比例（显示所有朝代+双Y轴）
const ownershipData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodOwnership: Record<string, { 官营: number; 私营: number }> = {};

  const historicalOrder = [
    '先秦', '秦汉', '魏晋南北朝', '隋唐五代',
    '辽金', '元', '明', '清', '民国'
  ];

  // 初始化所有朝代
  historicalOrder.forEach(p => {
    periodOwnership[p] = { 官营: 0, 私营: 0 };
  });

  let totalLabeled = 0;

  // 直接使用 ownership 字段识别官营/私营
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

  // 显示所有朝代（不过滤）
  const periods = historicalOrder;

  // 计算官私比例（官营/(官营+私营)*100，无数据时为null）
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


// 初始化图表
const initCharts = () => {
  const { periods, series } = filteredIndustryData.value;

  // 1. 产业类型堆叠柱状图（宏观分类）
  if (industryChartRef.value) {
    const chart = echarts.init(industryChartRef.value);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { color: '#7C6B59' },
        formatter: (params: any) => {
          const periodName = params[0].name;
          let tooltipHtml = `<div style="font-weight: bold; margin-bottom: 4px;">${periodName}</div>`;
          
          params.forEach((item: any) => {
            if (item.value > 0) {
              tooltipHtml += `<div style="display: flex; align-items: center; margin: 2px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${item.color}; margin-right: 6px; border-radius: 2px;"></span>
                <span>${item.seriesName}: ${item.value} 次</span>
              </div>`;
            }
          });
          return tooltipHtml;
        }
      },
      legend: {
        type: 'scroll',
        top: 'top',
        left: 'center',
        textStyle: { color: '#7C6B59', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        pageIconSize: 10
      },
      grid: {
        left: '10%',
        right: '5%',
        bottom: '15%',
        top: '18%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: periods,
        axisLabel: {
          color: '#7C6B59',
          fontSize: 10,
          rotate: 45,
          interval: 0
        },
        axisLine: {
          lineStyle: { color: '#DCD3C5' }
        }
      },
      yAxis: {
        type: 'value',
        name: '产业活动次数',
        nameTextStyle: { color: '#7C6B59', fontSize: 10 },
        axisLabel: {
          color: '#7C6B59',
          fontSize: 10
        },
        axisLine: {
          lineStyle: { color: '#DCD3C5' }
        },
        splitLine: {
          lineStyle: { color: '#F1EEE8' }
        }
      },
      series: series
    });

    window.addEventListener('resize', () => chart.resize());
  }

  // 2. 气候关联饼图（带联动点击）
  if (climateChartRef.value) {
    const chart = echarts.init(climateChartRef.value);
    const data = climateData.value;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}次 ({d}%)',
        textStyle: { color: '#7C6B59' }
      },
      series: [{
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#7C6B59'
          }
        },
        labelLine: {
          show: false
        },
        data: data.map(item => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: item.color }
        })),
        selectedMode: 'single', // 允许单选
        select: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }]
    });

    // 点击饼图扇区触发联动
    chart.on('click', (params: any) => {
      const name = params.name;
      let climate: 'warm' | 'cold' | 'stable' | null = null;
      if (name === '暖期') climate = 'warm';
      else if (name === '冷期') climate = 'cold';
      else if (name === '平稳期') climate = 'stable';
      
      // 切换选中状态
      if (climateLinkageStore.highlightClimate === climate) {
        climateLinkageStore.setClimateHighlight(null);
      } else {
        climateLinkageStore.setClimateHighlight(climate);
      }
    });

    window.addEventListener('resize', () => chart.resize());
  }

  // 3. 北京历代商业手工业变化趋势
  if (industryTrendChartRef.value) {
    const chart = echarts.init(industryTrendChartRef.value);
    const { periods: trendPeriods, counts } = industryTrendData.value;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        textStyle: { color: '#7C6B59' },
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
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: trendPeriods,
        axisLabel: {
          color: '#7C6B59',
          fontSize: 10,
          rotate: 30
        },
        axisLine: {
          lineStyle: { color: '#DCD3C5' }
        }
      },
      yAxis: {
        type: 'value',
        name: '活动次数',
        nameTextStyle: { color: '#7C6B59', fontSize: 10 },
        axisLabel: {
          color: '#7C6B59',
          fontSize: 10
        },
        axisLine: {
          lineStyle: { color: '#DCD3C5' }
        },
        splitLine: {
          lineStyle: { color: '#F1EEE8' }
        }
      },
      series: [{
        type: 'line',
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#8BAB8D',
          width: 3
        },
        itemStyle: {
          color: '#8BAB8D',
          borderColor: '#fff',
          borderWidth: 2
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(139, 171, 141, 0.4)' },
              { offset: 1, color: 'rgba(139, 171, 141, 0.05)' }
            ]
          }
        }
      }]
    });

    window.addEventListener('resize', () => chart.resize());
  }

  // 4. 各朝代官营与私营手工业比例（双Y轴：左侧比例、右侧数量）
  if (ownershipChartRef.value) {
    const chart = echarts.init(ownershipChartRef.value);
    const { periods: ownerPeriods, 官营, 私营, 官私比例 } = ownershipData.value;

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { color: '#7C6B59' },
        formatter: (params: any) => {
          const periodName = params[0].name;
          let tooltipHtml = `<div style="font-weight: bold; margin-bottom: 4px;">${periodName}</div>`;
          
          params.forEach((item: any) => {
            if (item.value !== null && item.value !== undefined) {
              const unit = item.seriesName === '官私比例' ? '%' : ' 条';
              tooltipHtml += `<div style="display: flex; align-items: center; margin: 2px 0;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${item.color}; margin-right: 6px; border-radius: 2px;"></span>
                <span>${item.seriesName}: ${item.value}${unit}</span>
              </div>`;
            }
          });
          return tooltipHtml;
        }
      },
      legend: {
        top: 'top',
        left: 'center',
        textStyle: { color: '#7C6B59', fontSize: 11 },
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
        data: ownerPeriods,
        axisLabel: {
          color: '#7C6B59',
          fontSize: 10,
          rotate: 30
        },
        axisLine: {
          lineStyle: { color: '#DCD3C5' }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '官私比例',
          position: 'left',
          min: 0,
          max: 100,
          nameTextStyle: { color: '#CDA756', fontSize: 10 },
          axisLabel: {
            color: '#CDA756',
            fontSize: 10,
            formatter: '{value}%'
          },
          axisLine: {
            show: true,
            lineStyle: { color: '#CDA756' }
          },
          splitLine: {
            lineStyle: { color: '#F1EEE8' }
          }
        },
        {
          type: 'value',
          name: '数量',
          position: 'right',
          nameTextStyle: { color: '#7C6B59', fontSize: 10 },
          axisLabel: {
            color: '#7C6B59',
            fontSize: 10
          },
          axisLine: {
            show: true,
            lineStyle: { color: '#7C6B59' }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '官营',
          type: 'bar',
          yAxisIndex: 1,
          stack: 'ownership',
          data: 官营,
          itemStyle: { color: '#CF794D' }
        },
        {
          name: '私营',
          type: 'bar',
          yAxisIndex: 1,
          stack: 'ownership',
          data: 私营,
          itemStyle: { color: '#8BAB8D' }
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
          lineStyle: {
            color: '#CDA756',
            width: 2
          },
          itemStyle: {
            color: '#CDA756',
            borderColor: '#fff',
            borderWidth: 1
          }
        }
      ]
    });

    window.addEventListener('resize', () => chart.resize());
  }
};

// 组件挂载时初始化图表
onMounted(initCharts);

// 监听筛选变化，重新渲染图表
watch(selectedPeriod, () => {
  initCharts();
});
</script>
<style scoped>
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }

/* 📊 统计卡片 */
.stat-card {
  transition: all 0.3s ease;
  border: 1px solid #DCD3C5;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(124, 107, 89, 0.15);
  transform: translateY(-2px);
  border-color: #C2B190;
}

.stat-icon {
  opacity: 0.2;
  transition: opacity 0.3s ease;
}

.stat-card:hover .stat-icon {
  opacity: 0.3;
}

/* 🎨 筛选栏 */
.filter-bar {
  transition: all 0.3s ease;
}

.filter-bar:hover {
  box-shadow: 0 2px 8px rgba(124, 107, 89, 0.08);
}

/* 🎨 朝代筛选芯片 - 简洁样式 */
.period-chip {
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.period-chip:hover {
  opacity: 0.85;
}

/* 清除按钮 - 简洁文本样式 */
.clear-chip {
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.clear-chip:hover {
  opacity: 0.7;
}

/* 📈 图表卡片 */
.chart-card {
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 16px rgba(124, 107, 89, 0.12);
}
</style>