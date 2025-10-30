<template>
  <v-container class="great-events-page pa-md-8 pa-4">
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
        <v-card class="event-card fill-height d-flex flex-column" elevation="0" variant="outlined">
           <v-card-text class="pb-2">
            <div class="d-flex justify-space-between align-start mb-3">
              <div class="d-flex align-center flex-wrap">
                <span class="event-year mr-2">{{ event.yearPrefix }}{{ Math.abs(event.year) }}</span>
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
            <div class="event-title text-h6 mb-2">
              {{ event.title }}
            </div>
            <p class="event-description">
              {{ event.description }}
            </p>
          </v-card-text>
          <v-spacer></v-spacer>
          <v-card-actions class="px-4 pt-0">
            <span class="event-people">人物：{{ event.people }}</span>
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

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 事件条目类型 (保持不变)
interface EventItem {
  id: number;
  year: number;
  yearPrefix: string;
  dynasty: string;
  title: string;
  description: string;
  tags: string[];
  people: string;
}

// 筛选和排序状态 (保持不变)
const searchQuery = ref('');
const selectedDynasty = ref('全部朝代');
const selectedTag = ref('全部标签');
const sortOrder = ref<'asc' | 'desc'>('asc');

// --- NEW: 分页状态 ---
const currentPage = ref(1);
const itemsPerPage = ref(9); // 每页显示9条 (3行 x 3列)

// 静态数据 (保持不变)
const allEvents = ref<EventItem[]>([
  { id: 1, year: -6000, yearPrefix: '约', dynasty: '先秦', title: '雪山遗址发现', description: '一九六一年在北京市昌平县雪山村发现一处新石器时代遗址...', tags: ['文化', '考古'], people: '—' },
  { id: 2, year: -2000, yearPrefix: '约', dynasty: '先秦', title: '雪山二期文化', description: '在北京地区发现的反映这时人类生产、生活的遗址...', tags: ['社会'], people: '—' },
  { id: 3, year: -2000, yearPrefix: '约', dynasty: '先秦', title: '燕丹遗址发现', description: '类似雪山二期文化的遗址，还有昌平县的燕丹遗址...', tags: ['文化', '考古'], people: '—' },
  { id: 4, year: -2000, yearPrefix: '约', dynasty: '先秦', title: '翼碾遗址发现', description: '类似雪山二期文化的遗址，还有昌平县的翼碾遗址...', tags: ['文化', '考古'], people: '—' },
  { id: 5, year: -1800, yearPrefix: '约', dynasty: '先秦', title: '进入奴隶社会', description: '夏商时期是中国奴隶社会的开端。从现有考古材料看...', tags: ['政权', '社会'], people: '—' },
  { id: 6, year: -1500, yearPrefix: '约', dynasty: '先秦', title: '发现青铜器物', description: '北京地区属于夏家店下层文化的同类遗址，发现了青铜器...', tags: ['文化', '科技'], people: '—' },
  { id: 7, year: -1045, yearPrefix: '约', dynasty: '先秦', title: '发现铁刃铜钺', description: '在刘家河墓葬中还有一件铁刃铜钺，这是人工冶铁的证明...', tags: ['科技', '军事'], people: '—' },
  { id: 8, year: -1044, yearPrefix: '约', dynasty: '先秦', title: '发现商代古城址', description: '在北京发现的商代文化遗迹和遗物，较重要的有房山...', tags: ['文化', '考古'], people: '—' },
  { id: 9, year: -1043, yearPrefix: '约', dynasty: '先秦', title: '周初封燕', description: '周武王灭商后，封召公奭于燕，建立燕国，都城在蓟...', tags: ['政权'], people: '召公奭' },
  { id: 10, year: -770, yearPrefix: '公元前', dynasty: '先秦', title: '春秋战国', description: '燕国成为春秋战国时期的重要诸侯国之一，蓟城更为繁荣...', tags: ['政权', '社会'], people: '—' },
  { id: 11, year: -221, yearPrefix: '公元前', dynasty: '秦', title: '秦朝统一', description: '秦始皇统一六国，建立秦朝，北京地区属广阳郡，蓟城为其郡治...', tags: ['政权', '军事'], people: '秦始皇' },
  { id: 12, year: -202, yearPrefix: '公元前', dynasty: '汉', title: '汉朝建立', description: '汉高祖刘邦建立汉朝，北京为广阳郡，后改为广阳国...', tags: ['政权'], people: '刘邦' },
  { id: 13, year: 100, yearPrefix: '公元', dynasty: '汉', title: '《说文解字》成书', description: '许慎完成了中国首部字典，标志着汉字研究的系统化...', tags: ['文化', '科技'], people: '许慎' },
  { id: 14, year: 184, yearPrefix: '公元', dynasty: '汉', title: '黄巾起义', description: '大规模的农民起义，动摇了东汉的统治，幽州是重要战区...', tags: ['军事', '社会'], people: '张角' },
  { id: 15, year: 220, yearPrefix: '公元', dynasty: '三国', title: '三国鼎立', description: '魏、蜀、吴三国鼎立的局面形成，北京地区属魏国幽州...', tags: ['政权', '军事'], people: '曹操, 刘备, 孙权' },
  { id: 16, year: 420, yearPrefix: '公元', dynasty: '南北朝', title: '南北朝开始', description: '刘裕建立宋，中国进入南北朝对峙时期，北京地区先后属北魏...', tags: ['政权'], people: '刘裕' },
  { id: 17, year: 581, yearPrefix: '公元', dynasty: '隋', title: '隋朝建立', description: '杨坚建立隋朝，重新统一中国，设涿郡，即今北京...', tags: ['政权'], people: '杨坚' },
  { id: 18, year: 618, yearPrefix: '公元', dynasty: '唐', title: '唐朝建立', description: '李渊建立唐朝，北京为幽州，是北方重镇和军事中心...', tags: ['政权'], people: '李渊' },
  { id: 19, year: 755, yearPrefix: '公元', dynasty: '唐', title: '安史之乱', description: '安禄山在范阳（今北京）起兵，是唐朝由盛转衰的转折点...', tags: ['军事', '社会'], people: '安禄山, 史思明' },
  { id: 20, year: 907, yearPrefix: '公元', dynasty: '五代十国', title: '五代十国开始', description: '唐朝灭亡，中国进入分裂时期，北京地区成为战场...', tags: ['政权'], people: '—' },
]);

// 动态计算筛选器选项 (保持不变)
const dynasties = computed(() => {
  return ['全部朝代', ...Array.from(new Set(allEvents.value.map(e => e.dynasty)))];
});
const tags = computed(() => {
  return ['全部标签', ...Array.from(new Set(allEvents.value.flatMap(e => e.tags)))];
});

// --- MODIFIED: 先计算过滤和排序后的完整列表 ---
const filteredEvents = computed(() => {
  let events = allEvents.value;
  // 筛选逻辑 (保持不变)
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
  // 排序逻辑 (保持不变)
  events.sort((a, b) => {
    return sortOrder.value === 'asc' ? a.year - b.year : b.year - a.year;
  });
  return events;
});

// --- NEW: 计算总页数 ---
const totalPages = computed(() => {
  return Math.ceil(filteredEvents.value.length / itemsPerPage.value);
});

// --- NEW: 计算当前页要显示的数据 ---
const paginatedEvents = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  // 使用 .slice() 从过滤排序后的列表中提取当前页的数据
  return filteredEvents.value.slice(startIndex, endIndex);
});

// --- 方法 (保持不变) ---
const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  currentPage.value = 1; // 排序后回到第一页
};
const resetFilters = () => {
  searchQuery.value = '';
  selectedDynasty.value = '全部朝代';
  selectedTag.value = '全部标签';
  sortOrder.value = 'asc';
  currentPage.value = 1; // 重置后回到第一页
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
/* 样式保持不变 */
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
}
.event-people {
  color: $text-light-brown;
  font-size: 0.85rem;
  font-style: italic;
}

/* NEW: 为分页按钮添加一些间距和仿古颜色 */
.v-pagination {
  :deep(.v-pagination__item--is-active) {
     background-color: #8D6E63 !important; // 浅棕色作为激活色
     border-color: #8D6E63 !important;
     color: #fff !important;
  }
   :deep(.v-pagination__item) {
     color: $text-mid-brown;
   }
}
</style>