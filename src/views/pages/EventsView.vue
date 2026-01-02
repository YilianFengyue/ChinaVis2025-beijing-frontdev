<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as d3 from 'd3';

// 引入组件

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

// 2. 状态定义 (将原有的 props 更改为本地 ref)
const allEvents = ref<EventItem[]>([]);
const searchQuery = ref('');
const selectedDynasty = ref('全部朝代');
const selectedTag = ref('全部标签');
const sortOrder = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const itemsPerPage = ref(9);

/**
 * 3. 数据加载逻辑 (从 CSV 加载并处理数据)
 */
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
      const year = parseInt(yearString || '0');
      let prefix = '公元';
      if (yearString === '') { prefix = d.dynasty_name || '未知'; }
      else if (d.year_ad_raw?.includes('约')) { prefix = '约'; }
      else if (year < 0) { prefix = '公元前'; }

      const rawText = d.raw_text || '';
      let title = d.event_summary || '';
      if (!title && rawText) { title = rawText.substring(0, 10) + (rawText.length > 10 ? '...' : ''); }
      else if (!title && !rawText) {
        if (yearString === '' && (prefix === '未知' || prefix === '')) return;
        title = '无标题';
      }
      
      const key = `${year}_${title}`;

      const currentEvent: EventItem = {
        id: 0,
        year: Math.abs(year),
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
        existing.people = mergeFigures(existing.people, currentEvent.people);
        existing.description = mergeDescriptions(existing.description, currentEvent.description);
      } else {
        groupedEvents.set(key, currentEvent);
      }
    });

    allEvents.value = Array.from(groupedEvents.values()).map((event, index) => ({
      ...event,
      id: index,
    }));
  } catch (error) {
    console.error("Failed to load event data:", error);
  }
}

// 4. 计算属性 (基于 allEvents.value 进行过滤和排序)
const dynasties = computed(() => {
  return ['全部朝代', ...Array.from(new Set(allEvents.value.map(e => e.dynasty)))];
});

const tags = computed(() => {
  return ['全部标签', ...Array.from(new Set(allEvents.value.flatMap(e => e.tags)))];
});

const filteredEvents = computed(() => {
  // 安全检查：如果数据还没加载完，返回空数组防止 sort 报错
  let events = allEvents.value ? [...allEvents.value] : []; 
  
  if (selectedDynasty.value !== '全部朝代') {
    events = events.filter(e => e.dynasty === selectedDynasty.value);
  }
  if (selectedTag.value !== '全部标签') {
    events = events.filter(e => e.tags.includes(selectedTag.value));
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    events = events.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.description.toLowerCase().includes(query) ||
      e.people.toLowerCase().includes(query)
    );
  }

  // 排序
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

// 5. 方法
const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  currentPage.value = 1;
};

const resetFilters = () => {
  searchQuery.value = '';
  selectedDynasty.value = '全部朝代';
  selectedTag.value = '全部标签';
  sortOrder.value = 'asc';
  currentPage.value = 1; 
};

const getTagColor = (tag: string) => {
  const colors: Record<string, string> = {
    '文化': '#a1887f', '科技': '#00695C', '考古': '#6D4C41',
    '社会': '#8D6E63', '政权': '#BF360C', '军事': '#E65100'
  };
  return colors[tag] || '#5D4037';
};

onMounted(() => {
  loadEventData();
});
</script>

<template>
  <div class="pa-5 events-view-page">
    <h2 class="page-title text-center text-h4 mb-6">都城纪事</h2>

    <v-sheet class="controls-bar pa-4 mb-6" rounded="lg">
      <v-row align="center" justify="space-between" dense>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            label="搜索纪事、描述或人物..."
            prepend-inner-icon="mdi-magnify"
            variant="solo-filled"
            density="compact"
            hide-details
            clearable
            @update:model-value="currentPage = 1"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="8">
          <v-row align="center" justify="end" dense>
            <v-col cols="auto"><v-select v-model="selectedDynasty" :items="dynasties" label="全部朝代" variant="solo-filled" density="compact" hide-details></v-select></v-col>
            <v-col cols="auto"><v-select v-model="selectedTag" :items="tags" label="全部标签" variant="solo-filled" density="compact" hide-details></v-select></v-col>
            <v-col cols="auto"><v-btn @click="toggleSort" variant="text" :prepend-icon="sortOrder === 'asc' ? 'mdi-sort-calendar-ascending' : 'mdi-sort-calendar-descending'">{{ sortOrder === 'asc' ? '时间升序' : '时间降序' }}</v-btn></v-col>
            <v-col cols="auto"><v-btn @click="resetFilters" variant="text" prepend-icon="mdi-refresh">重置</v-btn></v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
    
    <v-row>
      <v-col v-for="event in paginatedEvents" :key="event.id" cols="12" sm="6" md="4">
        <v-card class="event-card d-flex flex-column" height="380" variant="outlined">
          <v-card-text>
            <div class="d-flex justify-space-between mb-3">
              <span class="event-year">{{ event.yearPrefix }}{{ event.year }}</span>
              <v-chip color="#8D6E63" size="small" label>{{ event.dynasty }}</v-chip>
            </div>
            <div class="event-title text-h6 mb-2 text-truncate">{{ event.title }}</div>
            <p class="event-description">{{ event.description }}</p>
          </v-card-text>
          <v-spacer></v-spacer>
          <v-card-actions class="px-4 pb-4">
            <span class="event-people text-truncate">人物：{{ event.people }}</span>
            <v-spacer></v-spacer>
            <v-btn variant="text" size="small" color="#6D4C41">详情</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="totalPages > 1" justify="center" class="mt-6">
      <v-pagination v-model="currentPage" :length="totalPages" total-visible="7" active-color="#8D6E63"></v-pagination>
    </v-row>
  </div>
</template>

<style scoped lang="scss">
/* ... 样式 (无修改) ... */
$bg-color: #fcfaf6;
$card-bg-color: #faf6f0;
$border-color: #dcd3c5;
$text-dark-brown: #5a4b40;
$text-mid-brown: #6d5f53;
$text-light-brown: #8c7b6f;

.great-events-page {
  background-color: $bg-color;
  min-height: 100vh;
}
.page-title {
  font-weight: 700;
  color: $text-dark-brown;
}
.controls-bar {
  background-color: $card-bg-color;
  border: 1px solid $border-color;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  .v-text-field, .v-select {
    background-color: $bg-color;
  }
  .control-button {
    color: $text-mid-brown;
    font-weight: 600;
  }
}
.event-card {
  background-color: $card-bg-color;
  border: 1px solid $border-color;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  &:hover {
    box-shadow: 0 5px 12px rgba(90, 75, 64, 0.12);
    transform: translateY(-4px);
    border-color: darken($border-color, 10%);
  }
}
.event-year {
  color: $text-light-brown;
  font-weight: 700;
  font-size: 1.1rem;
  white-space: nowrap;
}
.dynasty-chip {
  font-weight: 600;
  color: #fff !important;
}
.tag-chip {
  color: #fff !important;
  font-weight: 500;
}
.event-title {
  font-weight: 600;
  color: $text-dark-brown;
  line-height: 1.3;
}
.event-description {
  color: $text-mid-brown;
  font-size: 0.9rem;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 8; 
  -webkit-box-orient: vertical;
  white-space: normal;
}
.event-people {
  color: $text-light-brown;
  font-size: 0.85rem;
  font-style: italic;
  max-width: 100px;
}
.event-location {
  color: $text-light-brown;
  font-size: 0.85rem;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.v-pagination {
  :deep(.v-pagination__item--is-active) {
     background-color: #8D6E63 !important; 
     border-color: #8D6E63 !important;
     color: #fff !important;
  }
   :deep(.v-pagination__item) {
     color: $text-mid-brown;
   }
}
</style>