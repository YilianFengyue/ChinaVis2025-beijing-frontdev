<template>
  <!-- <v-container class="great-events-page pa-md-8 pa-4"> -->
    <h2 class="page-title text-center text-h4 text-md-h3 mb-6">都城纪事</h2>

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
            @update:model-value="currentPage = 1" ></v-text-field>
        </v-col>

        <v-col cols="12" md="8">
          <v-row align="center" justify="end" dense>
            <v-col cols="12" sm="4" md="auto">
              <v-select
                v-model="selectedDynasty"
                :items="dynasties"
                label="全部朝代"
                variant="solo-filled"
                density="compact"
                hide-details
                @update:model-value="currentPage = 1" ></v-select>
            </v-col>
            <v-col cols="12" sm="4" md="auto">
              <v-select
                v-model="selectedTag"
                :items="tags"
                label="全部标签"
                variant="solo-filled"
                density="compact"
                hide-details
                @update:model-value="currentPage = 1" ></v-select>
            </v-col>
            <v-col cols="6" sm="2" md="auto">
              <v-btn
                @click="toggleSort"
                variant="text"
                class="control-button"
                :prepend-icon="sortOrder === 'asc' ? 'mdi-sort-calendar-ascending' : 'mdi-sort-calendar-descending'"
              >
                {{ sortOrder === 'asc' ? '时间升序' : '时间降序' }}
              </v-btn>
            </v-col>
            <v-col cols="6" sm="2" md="auto">
              <v-btn @click="resetFilters" variant="text" class="control-button" prepend-icon="mdi-refresh">
                重置
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </v-sheet>
    
    <v-row>
      <v-col
        v-for="event in paginatedEvents" :key="event.id"
        cols="12"
        sm="6"
        md="4"
        lg="4" >
        <v-card class="event-card d-flex flex-column" height="380px" elevation="0" variant="outlined">
           <v-card-text class="pb-2">
            <div class="d-flex justify-space-between align-start mb-3">
              <div class="d-flex align-center flex-wrap">
                <span class="event-year mr-2">{{ event.yearPrefix }}{{ event.year === 0 ? '' : Math.abs(event.year) }}</span>
                <v-chip
                  color="#8D6E63"
                  variant="flat"
                  size="small"
                  class="dynasty-chip"
                  label
                >
                  {{ event.dynasty }}
                </v-chip>
              </div>
              <div class="text-right">
                <v-chip
                  v-for="tag in event.tags"
                  :key="tag"
                  :color="getTagColor(tag)"
                  variant="flat"
                  size="x-small"
                  class="ma-1 tag-chip"
                  label
                >
                  {{ tag }}
                </v-chip>
              </div>
            </div>
            
            <div class="event-title text-h6 mb-2 text-truncate">
              {{ event.title }}
            </div>

            <p class="event-description">
              {{ event.description }}
            </p>
           </v-card-text>

          <v-spacer></v-spacer>

          <v-card-actions class="px-4 pt-0">
            <span class="event-people text-truncate">人物：{{ event.people }}</span>
            <v-spacer></v-spacer>
            
            <span class="event-location">
              <v-icon size="x-small" start>mdi-map-marker-outline</v-icon>
              {{ event.province || '未知' }}
            </span>
            
            <v-menu location="center" open-on-click>
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" variant="text" size="small" color="#6D4C41">
                  详情
                </v-btn>
              </template>
              <v-card max-width="450px" elevation="10">
                <v-card-title class="text-wrap" style="background-color: #faf6f0; color: #5a4b40;">
                  {{ event.title }}
                </v-card-title>
                <v-card-subtitle class="pb-2" style="background-color: #faf6f0; color: #6d5f53;">
                  {{ event.yearPrefix }}{{ event.year === 0 ? '' : Math.abs(event.year) }} - {{ event.dynasty }}
                </v-card-subtitle>
                <v-divider></v-divider>
                <v-card-text style="white-space: pre-wrap; max-height: 400px; overflow-y: auto; background-color: #fcfaf6; color: #5a4b40;">
                  <strong v-if="event.people !== '—'">人物：{{ event.people }}</strong>
                  <v-divider class="my-2" v-if="event.people !== '—'"></v-divider>
                  {{ event.description }}
                </v-card-text>
                
                </v-card>
            </v-menu>
            </v-card-actions>
          </v-card>
      </v-col>

      <v-col v-if="filteredEvents.length === 0" cols="12"> <v-card class="event-card text-center pa-10" variant="outlined">
          <v-icon size="50" color="#a1887f">mdi-archive-search-outline</v-icon>
          <div class="event-title mt-4">未找到相关纪事</div>
          <p class="event-description">请尝试调整搜索或筛选条件。</p>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="totalPages > 1" justify="center" class="mt-6">
      <v-col cols="auto">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          active-color="#8D6E63"
          variant="elevated"
          density="comfortable"
        ></v-pagination>
      </v-col>
    </v-row>

  <!-- </v-container> -->
</template>

<script setup lang="ts">
// [!! 核心修改 !!] 移除了 MapLocation 的 import
import { ref, computed, onMounted, type PropType } from 'vue'; 
import * as d3 from 'd3'; 
// import MapLocation from './MapLocation.vue'; // [!! 已移除 !!]

// ... (接口和 Props 定义不变) ...
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
const props = defineProps({
  allEvents: {
    type: Array as PropType<EventItem[]>,
    required: true
  }
});

// ... (状态定义不变) ...
const searchQuery = ref('');
const selectedDynasty = ref('全部朝代');
const selectedTag = ref('全部标签');
const sortOrder = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const itemsPerPage = ref(9); 

// ... (计算属性不变) ...
const dynasties = computed(() => {
  return ['全部朝代', ...Array.from(new Set(props.allEvents.map(e => e.dynasty)))];
});
const tags = computed(() => {
  return ['全部标签', ...Array.from(new Set(props.allEvents.flatMap(e => e.tags)))];
});
const filteredEvents = computed(() => {
  let events = props.allEvents; 
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

// [!! 核心修改 !!] 移除了省份名称规范化函数
// const normalizeProvinceForMap = ... // [!! 已移除 !!]


// --- 方法 (无修改) ---
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
  switch (tag) {
    case '文化': return '#a1887f';
    case '科技': return '#00695C';
    case '考古': return '#6D4C41';
    case '社会': return '#8D6E63';
    case '政权': return '#BF360C';
    case '军事': return '#E65100';
    default: return '#5D4037';
  }
};
</script>

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