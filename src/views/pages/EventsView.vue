<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue';
import * as d3 from 'd3';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册 ECharts 组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  CanvasRenderer
]);

// 1. 定义事件接口
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

// 2. 朝代配置 (10个阶段)
const dynastyConfig = [
  { label: '未知', start: 0, end: 0, isUnknown: true },
  { label: '先秦', start: -800, end: -221 },
  { label: '汉朝', start: -221, end: 220 },
  { label: '魏晋南北朝', start: 220, end: 581 },
  { label: '隋唐五代', start: 581, end: 960 },
  { label: '宋辽金', start: 960, end: 1271 },
  { label: '元朝', start: 1271, end: 1368 },
  { label: '明朝', start: 1368, end: 1644 },
  { label: '清朝', start: 1644, end: 1912 },
  { label: '民国时期', start: 1912, end: 1949 },
];

// 3. 状态定义
const allEvents = ref<EventItem[]>([]);
const searchQuery = ref('');
const selectedDynasty = ref<string | null>(null); // 最终确认查看的朝代
const pendingDynasty = ref<string | null>(null);  // 待确认的朝代
const showEventList = ref(false); 
const sortOrder = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const itemsPerPage = ref(9);

// 详情弹窗状态
const detailDialog = ref(false);
const currentEvent = ref<EventItem | null>(null);

// 计算属性处理 v-model 绑定
const isOverlayVisible = computed({
  get: () => !!pendingDynasty.value,
  set: (val) => {
    if (!val) pendingDynasty.value = null;
  }
});

// ECharts 实例
const chartRef = ref<HTMLElement | null>(null);
let myChart: echarts.ECharts | null = null;

// 【核心修复】增加 selected 为空的判断
const matchDynasty = (eventDynasty: string, selected: string | null) => {
  // 1. 如果 selected 为 null/undefined (比如弹窗关闭瞬间)，直接返回 false
  if (!selected || !eventDynasty) return false;
  
  // 2. 正常匹配逻辑
  if (eventDynasty === selected) return true;
  
  if (selected === '未知' && (eventDynasty === '未知' || eventDynasty === 'Unknown')) return true;
  if (selected === '汉朝' && (eventDynasty.includes('汉') || eventDynasty.includes('秦'))) return true;
  if (selected === '宋辽金' && (eventDynasty.includes('宋') || eventDynasty.includes('辽') || eventDynasty.includes('金'))) return true;
  if (selected === '元朝' && eventDynasty.includes('元')) return true;
  if (selected === '明朝' && eventDynasty.includes('明')) return true;
  if (selected === '清朝' && eventDynasty.includes('清')) return true;
  if (selected === '民国时期' && (eventDynasty.includes('民国') || eventDynasty.includes('中华民国'))) return true;
  
  // 3. 模糊匹配 (确保 selected 是字符串后再调用 includes)
  if (selected.includes(eventDynasty) || eventDynasty.includes(selected)) return true;
  
  return false;
};

// 4. 数据加载
async function loadEventData() {
  try {
    const data = await d3.csv('/data/events_step3_modern_locations.csv');
    
    const mergeFigures = (p1: string, p2: string): string => {
      const fig1 = p1 === '—' || !p1 ? [] : p1.split(/[,，]/).map(s => s.trim());
      const fig2 = p2 === '—' || !p2 ? [] : p2.split(/[,，]/).map(s => s.trim());
      const all = [...new Set([...fig1, ...fig2].filter(p => p))];
      return all.length ? all.join(', ') : '—';
    };

    const mergeDescriptions = (d1: string, d2: string): string => {
      return [...new Set([d1, d2].filter(d => d))].join('\n\n');
    };

    const groupedEvents = new Map<string, EventItem>();

    data.forEach((d: any) => {
      const yearString = d.year_abs || '';
      const yearRaw = parseInt(yearString || '0');
      
      let prefix = '公元';
      if (yearString === '') { prefix = d.dynasty_name || '未知'; }
      else if (d.year_ad_raw?.includes('约')) { prefix = '约'; }
      else if (yearRaw < 0) { prefix = '公元前'; }

      const rawText = d.raw_text || '';
      let title = d.event_summary || '';
      if (!title && rawText) { title = rawText.substring(0, 10) + (rawText.length > 10 ? '...' : ''); }
      else if (!title && !rawText) {
        if (yearString === '' && (prefix === '未知' || prefix === '')) return;
        title = '无标题';
      }
      
      const key = `${yearRaw}_${title}`;

      const currentItem: EventItem = {
        id: 0,
        year: Math.abs(yearRaw),
        yearPrefix: prefix,
        dynasty: d.dynasty_name || '未知',
        title,
        description: rawText,
        tags: d.tags ? d.tags.split(' ') : [], 
        people: d.figure || '—',
        province: d.location_modern || '北京'
      };

      if (groupedEvents.has(key)) {
        const existing = groupedEvents.get(key)!;
        existing.people = mergeFigures(existing.people, currentItem.people);
        existing.description = mergeDescriptions(existing.description, currentItem.description);
      } else {
        groupedEvents.set(key, currentItem);
      }
    });

    allEvents.value = Array.from(groupedEvents.values()).map((event, index) => ({
      ...event,
      id: index,
    }));

    // 数据加载完毕后初始化图表
    initChart();
  } catch (error) {
    console.error("Failed to load event data:", error);
  }
}

// 5. 图表逻辑
const initChart = () => {
  if (!chartRef.value) return;
  
  if (myChart) myChart.dispose();
  myChart = echarts.init(chartRef.value);

  // 统计每个标准朝代的事件数
  const counts = dynastyConfig.map(d => {
    // 这里的 matchDynasty 调用是安全的，因为 d.label 必定是字符串
    const count = allEvents.value.filter(e => matchDynasty(e.dynasty, d.label)).length;
    return { name: d.label, value: count };
  });

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true
    },
    xAxis: {
      type: 'category',
      data: counts.map(item => item.name),
      axisLabel: { interval: 0, rotate: 30, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: '事件数量'
    },
    series: [
      {
        name: '事件数',
        type: 'bar',
        data: counts.map(item => ({
          value: item.value,
          itemStyle: {
            color: (params: any) => {
              const target = pendingDynasty.value || selectedDynasty.value;
              return target === item.name ? '#1565C0' : '#90CAF9'; 
            }
          }
        })),
        barWidth: '60%',
        emphasis: {
          itemStyle: { color: '#1565C0' }
        }
      }
    ]
  };

  myChart.setOption(option);

  // 点击事件
  myChart.on('click', (params: any) => {
    const clickedDynasty = params.name;
    
    if (selectedDynasty.value === clickedDynasty && showEventList.value) {
      return; 
    }

    pendingDynasty.value = clickedDynasty;
    updateChartColor();
  });
};

const updateChartColor = () => {
  if (!myChart) return;
  const option = myChart.getOption() as any;
  option.series[0].data = option.series[0].data.map((item: any) => {
    const target = pendingDynasty.value || selectedDynasty.value;
    return {
      value: item.value,
      itemStyle: {
        color: target === item.name ? '#1565C0' : '#90CAF9'
      }
    };
  });
  myChart.setOption(option);
};

// 确认查看详情
const confirmViewDetails = () => {
  if (pendingDynasty.value) {
    selectedDynasty.value = pendingDynasty.value;
    // 关键点：这里设为 null 后，Vue 会触发 computed 重算
    // 此时模板中的 matchDynasty(..., pendingDynasty) 会传入 null
    // 因此 matchDynasty 必须能处理 null
    pendingDynasty.value = null; 
    showEventList.value = true;
    currentPage.value = 1;

    nextTick(() => {
      const element = document.getElementById('event-list-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
};

// 取消查看
const cancelView = () => {
  pendingDynasty.value = null; 
  updateChartColor(); 
};

// 6. 列表过滤逻辑
const filteredEvents = computed(() => {
  let events = allEvents.value ? [...allEvents.value] : []; 
  
  if (selectedDynasty.value) {
    events = events.filter(e => matchDynasty(e.dynasty, selectedDynasty.value));
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    events = events.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.people.toLowerCase().includes(query)
    );
  }

  events.sort((a, b) => {
    return sortOrder.value === 'asc' ? a.year - b.year : b.year - a.year;
  });
  return events;
});

const totalPages = computed(() => {
  return Math.ceil(filteredEvents.value.length / itemsPerPage.value);
});

const paginatedEvents = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return filteredEvents.value.slice(startIndex, endIndex);
});

// 7. 其他交互方法
const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  currentPage.value = 1;
};

const resetFilters = () => {
  searchQuery.value = '';
  selectedDynasty.value = null;
  pendingDynasty.value = null;
  showEventList.value = false;
  sortOrder.value = 'asc';
  currentPage.value = 1;
  updateChartColor();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const openDetails = (event: EventItem) => {
  currentEvent.value = event;
  detailDialog.value = true;
};

const getTagColor = (tag: string) => {
  const colors: Record<string, string> = {
    '文化': 'indigo', '科技': 'teal', '考古': 'brown',
    '社会': 'blue-grey', '政权': 'deep-orange', '军事': 'error'
  };
  return colors[tag] || 'primary';
};

// 生命周期
onMounted(() => {
  loadEventData();
  window.addEventListener('resize', () => myChart?.resize());
});

onUnmounted(() => {
  window.removeEventListener('resize', () => myChart?.resize());
  myChart?.dispose();
});
</script>

<template>
  <div class="pa-5">
    <h2 class="text-h4 mb-6 text-center font-weight-bold">都城纪事统计</h2>

    <v-card class="card-shadow mb-6 pa-4 position-relative" elevation="0">
      <v-card-title class="text-h6 font-weight-bold mb-2">
        <v-icon start color="primary">mdi-chart-bar</v-icon>
        各朝代大事件统计
      </v-card-title>
      <v-card-subtitle>
        点击下方柱状图选择朝代查看详情
      </v-card-subtitle>
      
      <div ref="chartRef" style="width: 100%; height: 350px;"></div>

      <v-overlay
        v-model="isOverlayVisible"
        contained
        class="align-center justify-center"
        scrim="rgba(255,255,255,0.8)"
        persistent
      >
        <v-card class="elevation-4 text-center pa-6" min-width="300">
          <v-icon size="large" color="primary" class="mb-3">mdi-eye-circle-outline</v-icon>
          <div class="text-h6 font-weight-bold mb-2">
            查看 {{ pendingDynasty }} 详情?
          </div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            该朝代共有 {{ allEvents.filter(e => matchDynasty(e.dynasty, pendingDynasty || '')).length }} 条记录
          </div>
          <div class="d-flex justify-center gap-4">
            <v-btn variant="outlined" color="grey" @click="cancelView">取消</v-btn>
            <v-btn color="primary" variant="flat" @click="confirmViewDetails">
              确认查看
              <v-icon end>mdi-arrow-down</v-icon>
            </v-btn>
          </div>
        </v-card>
      </v-overlay>
    </v-card>

    <v-expand-transition>
      <div v-if="showEventList" id="event-list-section">
        <v-divider class="mb-6">
          <v-chip color="primary" label variant="outlined">
            {{ selectedDynasty }} 事件列表
          </v-chip>
        </v-divider>

        <v-card class="card-shadow pa-4 mb-6">
          <v-row align="center" justify="space-between" dense>
            <v-col cols="12" md="5">
              <v-text-field
                v-model="searchQuery"
                label="在当前朝代中搜索..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                clearable
                color="primary"
                @update:model-value="currentPage = 1"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="7">
              <v-row align="center" justify="end" dense>
                <v-col cols="auto">
                  <v-btn 
                    @click="toggleSort" 
                    variant="text" 
                    color="primary"
                    :prepend-icon="sortOrder === 'asc' ? 'mdi-sort-calendar-ascending' : 'mdi-sort-calendar-descending'"
                  >
                    {{ sortOrder === 'asc' ? '时间升序' : '时间降序' }}
                  </v-btn>
                </v-col>
                <v-col cols="auto">
                  <v-btn 
                    @click="resetFilters" 
                    variant="tonal" 
                    color="error"
                    prepend-icon="mdi-arrow-up-bold"
                  >
                    重选朝代
                  </v-btn>
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-card>
        
        <v-row dense>
          <v-col v-for="event in paginatedEvents" :key="event.id" cols="12" sm="6" md="4">
            <v-card class="card-shadow d-flex flex-column" height="380">
              <v-card-text>
                <div class="d-flex justify-space-between mb-3 align-center">
                  <span class="text-h6 font-weight-bold text-primary">
                    {{ event.yearPrefix }}{{ event.year !== 0 ? event.year : '' }}
                  </span>
                  <v-chip color="primary" size="small" label variant="flat">{{ event.dynasty }}</v-chip>
                </div>
                <div class="text-h6 mb-2 text-truncate font-weight-medium">{{ event.title }}</div>
                <p class="text-body-2 text-medium-emphasis event-description">{{ event.description }}</p>
              </v-card-text>
              <v-spacer></v-spacer>
              <v-card-actions class="px-4 pb-4">
                <div class="d-flex align-center text-caption text-medium-emphasis text-truncate" style="max-width: 70%;">
                  <v-icon size="small" class="mr-1">mdi-account-group</v-icon>
                  {{ event.people }}
                </div>
                <v-spacer></v-spacer>
                <v-btn variant="text" size="small" color="primary" @click="openDetails(event)">详情</v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-row v-if="totalPages > 1" justify="center" class="mt-6 mb-8">
          <v-pagination 
            v-model="currentPage" 
            :length="totalPages" 
            total-visible="7" 
            active-color="primary"
            color="primary"
          ></v-pagination>
        </v-row>
      </div>
    </v-expand-transition>

    <v-dialog v-model="detailDialog" max-width="700px">
      <v-card v-if="currentEvent" class="pa-4">
        <v-card-title class="text-h5 font-weight-bold pb-1">{{ currentEvent.title }}</v-card-title>
        <v-card-subtitle class="text-subtitle-1 mb-3">
          <span class="text-primary font-weight-bold mr-2">
            {{ currentEvent.yearPrefix }}{{ currentEvent.year !== 0 ? currentEvent.year : '' }}
          </span>
          <v-chip size="small" color="primary" label class="mr-2">{{ currentEvent.dynasty }}</v-chip>
          <span><v-icon size="small">mdi-map-marker</v-icon> {{ currentEvent.province }}</span>
        </v-card-subtitle>
        <v-card-text class="text-body-1" style="line-height: 1.8;">
          {{ currentEvent.description }}
          <v-divider class="my-4"></v-divider>
          <div class="mb-2"><strong>相关人物:</strong> {{ currentEvent.people }}</div>
          <div v-if="currentEvent.tags.length" class="d-flex align-center mt-2">
            <strong class="mr-2">标签:</strong>
            <v-chip v-for="tag in currentEvent.tags" :key="tag" size="small" :color="getTagColor(tag)" variant="tonal" class="mr-1">
              {{ tag }}
            </v-chip>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="detailDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped lang="scss">
.event-description {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 8; 
  -webkit-box-orient: vertical;
  white-space: normal;
}

.gap-4 {
  gap: 16px;
}
</style>