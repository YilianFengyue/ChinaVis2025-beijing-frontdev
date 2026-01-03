<template>
  <v-card flat class="pa-6" style="background-color: #F8F6F0;">
    <!-- 🎯 标题区域 -->
    <div class="mb-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <h2 class="text-h5 font-weight-bold" style="color: #7C6B59;">
          历代商业手工业 · 生产网络
        </h2>
        <div class="d-flex align-center gap-2">
          <v-btn size="small" variant="text" icon="mdi-information-outline" 
                 @click="showHelp = !showHelp"></v-btn>
        </div>
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
          • 展示夏商周至民国各朝代的产业类型分布<br>
          • 气候关联分析产业活动与温度变化的相关性<br>
          • 经济中心分布体现各朝代经济活动的地理重心<br>
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
            <v-icon v-if="selectedPeriod === period" size="14" start>mdi-check</v-icon>
            {{ period }}
          </v-chip>
          <v-chip
            size="small"
            variant="outlined"
            color="#C2B190"
            @click="selectedPeriod = null"
            v-if="selectedPeriod"
            class="clear-chip"
          >
            <v-icon size="14" start>mdi-close-circle</v-icon>
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
      <!-- 左侧：产业类型演变堆叠图 -->
      <v-col cols="12" md="8">
        <div class="pa-4 bg-white rounded-lg chart-card" style="border: 1px solid #DCD3C5; height: 100%;">
          <h3 class="text-subtitle-2 mb-4 font-weight-bold" style="color: #7C6B59;">
            <v-icon size="small" color="#CF794D" class="mr-1">mdi-chart-bar</v-icon>
            各时期产业类型分布
            <v-chip size="x-small" variant="flat" color="#F1EEE8" class="ml-2">
              {{ filteredIndustryData.periods.length }} 个时期
            </v-chip>
          </h3>
          <div ref="industryChartRef" style="width: 100%; height: 480px;"></div>
        </div>
      </v-col>
      
      <!-- 右侧：气候关联 + 高频区域 -->
      <v-col cols="12" md="4">
        <!-- 气候关联饼图 -->
        <div class="pa-4 bg-white rounded-lg mb-4" style="border: 1px solid #DCD3C5;">
          <h3 class="text-subtitle-2 mb-3 font-weight-bold" style="color: #7C6B59;">
            产业活动与气候关联
          </h3>
          <div ref="climateChartRef" style="width: 100%; height: 200px;"></div>
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
        
        <!-- 高频生产区域 -->
        <div class="pa-4 bg-white rounded-lg" style="border: 1px solid #DCD3C5;">
          <h3 class="text-subtitle-2 mb-3 font-weight-bold" style="color: #7C6B59;">
            高频生产区域 Top 5
          </h3>
          <v-list density="compact" class="bg-transparent">
            <v-list-item 
              v-for="(item, index) in topLocations" 
              :key="index"
              class="px-0 location-item"
            >
              <template v-slot:prepend>
                <v-avatar size="28" :color="getRankColor(index)" class="text-white text-xs font-weight-bold">
                  {{ index + 1 }}
                </v-avatar>
              </template>
              <v-list-item-content>
                <v-list-item-title class="text-sm font-weight-medium">
                  {{ item.name }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-xs">
                  {{ item.count }} 次产业活动
                </v-list-item-subtitle>
              </v-list-item-content>
              <template v-slot:append>
                <div style="width: 80px;">
                  <v-progress-linear 
                    :model-value="(item.count / topLocations[0].count) * 100" 
                    height="4" 
                    rounded 
                    :color="getRankColor(index)"
                  ></v-progress-linear>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-col>
    </v-row>

    <!-- 📍 新增：历代经济活动中心分布 -->
    <v-row class="mt-4">
      <v-col cols="12">
        <div class="pa-4 bg-white rounded-lg chart-card" style="border: 1px solid #DCD3C5;">
          <h3 class="text-subtitle-2 mb-4 font-weight-bold" style="color: #7C6B59;">
            <v-icon size="small" color="#8BAB8D" class="mr-1">mdi-map-marker-multiple</v-icon>
            历代经济活动中心分布
            <v-chip size="x-small" variant="flat" color="#F1EEE8" class="ml-2" v-if="selectedPeriod">
              筛选: {{ selectedPeriod }}
            </v-chip>
          </h3>
          <div ref="economicCentersChartRef" style="width: 100%; height: 400px;"></div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import * as echarts from 'echarts';
import industryDataRaw from '@/data/14_industry_processed.json';

// 引用定义
const industryChartRef = ref<HTMLElement | null>(null);
const climateChartRef = ref<HTMLElement | null>(null);
const economicCentersChartRef = ref<HTMLElement | null>(null);
const showHelp = ref(false);
const selectedPeriod = ref<string | null>(null);

//  朝代列表
const availablePeriods = [
  '先秦', '秦汉', '魏晋南北朝', '隗唐五代',
  '辽金', '元', '明', '清', '民国'
];

// 切换朝代筛选
const togglePeriod = (period: string) => {
  selectedPeriod.value = selectedPeriod.value === period ? null : period;
};

// 总活动次数
const totalActivities = computed(() => {
  return industryDataRaw.industry_data?.length || 0;
});

// 颜色配置（与AdminEvoSankey保持一致+适配更多产业类型）
const colorPalette = {
  // 基础产业类型
  青铜冶炼: '#CF794D',
  铸造技术: '#D99964',
  石器: '#CDA756',
  骨器: '#C2B190',
  陶器: '#8BAB8D',
  蚌器: '#7C6B59',
  装饰品: '#A67C52',
  装饰艺术品: '#92816D',
  // 宏观产业类型
  商业: '#CF794D',
  金融业: '#D99964',
  冶铸业: '#CDA756',
  军工业: '#C2B190',
  食品加工业: '#8BAB8D',
  粮食加工业: '#7C6B59',
  酿酒业: '#A67C52',
  纺织业: '#92816D',
  丝织业: '#E1E0DD',
  麻布业: '#F1EEE8',
  皮革业: '#CF794D',
  新式工业: '#D99964',
  家具业: '#CDA756',
  工艺品: '#C2B190',
  采煤业: '#8BAB8D',
  矿冶业: '#7C6B59',
  燃料: '#A67C52',
  制盐业: '#92816D',
  制陶业: '#E1E0DD',
  陶瓷业: '#F1EEE8',
  营造业: '#CF794D',
  石雕业: '#D99964',
  印刷业: '#CDA756',
  杂项手工业: '#C2B190',
  工具业: '#8BAB8D',
  制药业: '#7C6B59'
};

// 1. 数据处理：产业类型统计（拆分；分隔的类型+适配无史前数据）
const industryTypeData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodMap: Record<string, Record<string, number>> = {};
  const allTypes = new Set<string>();

  rawData.forEach(item => {
    const period = item.period;
    if (!period) return;

    const types = (item.industry_types || '')
      .split('；')
      .map(t => t.trim())
      .filter(Boolean);

    if (!periodMap[period]) {
      periodMap[period] = {};
    }

    types.forEach(type => {
      allTypes.add(type);
      periodMap[period][type] = (periodMap[period][type] || 0) + 1;
    });
  });

  const historicalOrder = [
    '先秦',
    '秦汉',
    '魏晋南北朝',
    '隗唐五代',
    '辽金',
    '元',
    '明',
    '清',
    '民国'
  ];

  const periods = historicalOrder.filter(p => p in periodMap);

  const series = Array.from(allTypes)
    .map(type => ({
      name: type,
      type: 'bar',
      stack: 'total',
      itemStyle: {
        color: colorPalette[type as keyof typeof colorPalette] || '#E1E0DD'
      },
      data: periods.map(period => periodMap[period]?.[type] || 0)
    }))
    .filter(s => s.data.some(v => v > 0)); // 过滤掉所有值为0的系列

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
  
  // 只显示选中的朝代
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
    
    const types = (item.industry_types || '').split('；').filter(Boolean);
    types.forEach(t => allTypes.add(t.trim()));
    
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
      subtitle: '种',
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

// 3. 数据处理：高频区域统计
const topLocations = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const locationMap: Record<string, number> = {};

  // 统计所有归一化后的地点出现次数
  rawData.forEach(item => {
    (item.locations || []).forEach(loc => {
      const location = loc.trim();
      if (location) {
        locationMap[location] = (locationMap[location] || 0) + 1;
      }
    });
  });

  // 排序并取前5
  return Object.entries(locationMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

// 工具函数：获取排名颜色
const getRankColor = (index: number) => {
  const colors = ['#CF794D', '#D99964', '#CDA756', '#C2B190', '#8BAB8D'];
  return colors[index] || '#E1E0DD';
};

// 4. 数据处理：历代经济活动中心分布
const economicCentersData = computed(() => {
  const rawData = industryDataRaw.industry_data || [];
  const periodLocationMap: Record<string, Record<string, number>> = {};

  const historicalOrder = [
    '先秦', '秦汉', '魏晋南北朝', '隗唐五代',
    '辽金', '元', '明', '清', '民国'
  ];

  // 统计每个朝代的地点产业活动次数
  rawData.forEach(item => {
    const period = item.period;
    if (!period || !historicalOrder.includes(period)) return;

    if (!periodLocationMap[period]) {
      periodLocationMap[period] = {};
    }

    (item.locations || []).forEach(loc => {
      const location = loc.trim();
      if (location) {
        periodLocationMap[period][location] = (periodLocationMap[period][location] || 0) + 1;
      }
    });
  });

  // 获取所有独特地点
  const allLocations = new Set<string>();
  Object.values(periodLocationMap).forEach(locMap => {
    Object.keys(locMap).forEach(loc => allLocations.add(loc));
  });

  // 构建系列数据（每个朝代取Top 3地点）
  const seriesData = historicalOrder.map(period => {
    if (!periodLocationMap[period]) return { period, data: [] };
    
    const topLocations = Object.entries(periodLocationMap[period])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    return { period, data: topLocations };
  });

  return seriesData;
});

// 初始化图表
const initCharts = () => {
  const { periods, series } = filteredIndustryData.value;

  // 1. 产业类型堆叠柱状图（修正朝代顺序+Tooltip过滤无效数据）
  if (industryChartRef.value) {
    const chart = echarts.init(industryChartRef.value);

    chart.setOption({
      backgroundColor: 'transparent',
      // 核心修改2：Tooltip格式化，仅显示当前朝代存在的产业（数值>0）
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        textStyle: { color: '#7C6B59' },
        formatter: (params: any) => {
          // 获取当前朝代名称
          const periodName = params[0].name;
          let tooltipHtml = `<div style="font-weight: bold; margin-bottom: 4px;">${periodName}</div>`;
          
          // 过滤数值为0的产业，仅保留存在的（value>0）
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
      // 滚动图例：解决图例过多重叠问题
      legend: {
        type: 'scroll',
        top: 'top',
        left: 'center',
        textStyle: { color: '#7C6B59', fontSize: 11 },
        formatter: (name) => `  ${name}  `,
        itemWidth: 10,
        itemHeight: 10,
        pageButtonItemGap: 5,
        pageButtonsPosition: 'end',
        pageIconSize: 10
      },
      grid: {
        left: '10%',
        right: '5%',
        bottom: '15%',
        top: '20%', // 增加顶部间距，避免图例遮挡
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

    // 响应式调整
    window.addEventListener('resize', () => chart.resize());
  }

  // 2. 气候关联饼图
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
        radius: ['60%', '80%'],
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
        }))
      }]
    });

    // 响应式调整
    window.addEventListener('resize', () => chart.resize());
  }

  // 3. 历代经济活动中心分布图
  if (economicCentersChartRef.value) {
    const chart = echarts.init(economicCentersChartRef.value);
    const data = economicCentersData.value;

    // 准备数据
    const periods = data.map(d => d.period);
    const allLocations = new Set<string>();
    data.forEach(d => d.data.forEach(loc => allLocations.add(loc.name)));

    // 为每个地点创建一个系列
    const locationColors: Record<string, string> = {
      '北京': '#CF794D',
      '洛阳': '#D99964',
      '长安': '#CDA756',
      '开封': '#C2B190',
      '南京': '#8BAB8D',
      '杭州': '#7C6B59'
    };

    const series = Array.from(allLocations).map(location => {
      const locationData = periods.map(period => {
        const periodData = data.find(d => d.period === period);
        const locData = periodData?.data.find(l => l.name === location);
        return locData?.count || 0;
      });

      return {
        name: location,
        type: 'bar',
        data: locationData,
        itemStyle: {
          color: locationColors[location] || '#E1E0DD'
        }
      };
    });

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
        top: 'top',
        left: 'center',
        textStyle: { color: '#7C6B59', fontSize: 11 }
      },
      grid: {
        left: '8%',
        right: '5%',
        bottom: '12%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: periods,
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

    // 响应式调整
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

.location-item {
  transition: background-color 0.2s ease;
}

.location-item:hover {
  background-color: #F8F6F0;
}

.v-progress-linear {
  --v-progress-linear-height: 4px !important;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }

/* 📊 统计卡片 */
.stat-card {
  transition: all 0.3s ease;
  cursor: pointer;
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

/* 🎨 朝代筛选芯片 */
.period-chip {
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 500;
}

.period-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(124, 107, 89, 0.2);
}

.period-chip:active {
  transform: translateY(0);
}

/* 清除按钮 */
.clear-chip {
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 500;
}

.clear-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(194, 177, 144, 0.3);
  background-color: rgba(194, 177, 144, 0.1);
}

/* 📈 图表卡片 */
.chart-card {
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: 0 4px 16px rgba(124, 107, 89, 0.12);
}
</style>