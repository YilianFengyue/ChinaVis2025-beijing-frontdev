<template>
  <v-card flat class="pa-6" style="background-color: #F8F6F0;">
    <!-- 🎯 标题与说明 -->
    <div class="mb-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <h2 class="text-h5 font-weight-bold" style="color: #7C6B59;">
          建制沿革演变 · 制度桑基图
        </h2>
        <div class="d-flex gap-2">
          <v-btn size="small" variant="text" icon="mdi-information-outline" 
                 @click="showHelp = !showHelp"></v-btn>
        </div>
      </div>
      <p class="text-body-2 text-grey-darken-1">
        从朝代到城市职能的五层演变：朝代 → 制度 → 行政区划 → 机构 → 城市职能
      </p>
    </div>

    <div class="mt-4 pa-4 rounded legend-panel">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div class="text-caption font-weight-bold" style="color: #7C6B59;">图例 / LEGEND</div>
        <div class="d-flex flex-wrap gap-3">
          <div 
            v-for="legend in legends" 
            :key="legend.key"
            class="legend-item d-flex align-center gap-2"
            :class="{ 'legend-disabled': !visibleLayers[legend.key] }"
            @click="toggleLayer(legend.key)"
          >
            <div class="legend-color" :style="{ backgroundColor: legend.color }"></div>
            <span class="text-caption">{{ legend.label }}</span>
            <v-icon size="x-small" :color="visibleLayers[legend.key] ? 'success' : 'grey'">
              {{ visibleLayers[legend.key] ? 'mdi-eye' : 'mdi-eye-off' }}
            </v-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- ❓ 帮助说明 (可折叠) -->
    <v-expand-transition>
      <v-alert v-if="showHelp" type="info" variant="tonal" closable @click:close="showHelp = false" class="mb-4">
        <div class="text-body-2">
          <strong>交互提示：</strong><br>
          • 点击<strong>图例色块</strong>可隐藏/显示对应层级<br>
          • 悬浮<strong>节点</strong>查看详细信息<br>
          • 悬浮<strong>连线</strong>高亮演变路径
        </div>
      </v-alert>
    </v-expand-transition>

    <!-- 📊 主图表区域 (添加横向滚动以增加列间距) -->
    <div style="width: 100%; overflow-x: auto;">
      <div ref="chartRef" style="min-width: 900px; height: 960px;"></div>
    </div>

    
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import * as echarts from 'echarts/core';
import { SankeyChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  SankeyChart,
  CanvasRenderer
]);

// 🎨 颜色配置
const colors = {
  朝代: '#CF794D',
  制度: '#D99964',
  行政区划: '#CDA756',
  机构: '#C2B190',
  城市职能: '#8BAB8D',
  未选中线: '#E1E0DD',
  字体: '#7C6B59'
};

// 📊 分类定义 (基于你原有的数据结构)
const categories = {
  朝代: ['先秦','秦汉','魏晋南北朝','隋唐五代','辽','金','元','明','清','民国'],
  制度: [
    '分封制','郡县制萌芽','郡县制','郡国并行制','刺史监察制',
    '州郡县三级制','郡县二级制','道州县三级制','节度使体制',
    '五京制','道府州县四级制','南北面官双轨制','路府州县四级制',
    '猛安谋克制','都城警巡制','省路府州县五级制','行中书省制度',
    '北直隶制','五城管理制','直隶省与府州县制','八旗制度','市区制'
  ],
  行政区划: [
    '诸侯国','都城','郡','县','国','刺史部','州','道','都督府','京',
    '府','路','警巡院','省','卫所','旗营','特别区','市','区'
  ],
  机构: [
    '燕侯府','相国府','将军府','都署','都卫府','护乌桓校尉','刺史部',
    '行台尚书省','都督府','郡太守府','幽州都督府','节度使府',
    '南京留守司','南枢密院南京分院','南京三司使司','西南面招讨司',
    '尚书省','御史台','殿前都点检司','武卫军都指挥司','都元帅府',
    '南京邮驿司','国子监','弘文院','中都路转运司','大兴府衙','猛安谋克司',
    '中书省','大都留守司','枢密院','都指挥使司','大都路总管府',
    '内阁','六部','都察院','通政使司','五军都督府','锦衣卫','顺天府',
    '五城兵马指挥司','军机处','翰林院','八旗都统衙门','步军统领衙门',
    '京师警察厅','京兆尹公署','税局等','国立与私立大学',
    '平绥铁路局/平汉铁路局等/市政府'
  ],
  城市职能: ['政治行政','军事防卫','经济贸易','文化教育','市政管理','交通枢纽']
};

// 🎯 机构节点详细信息映射
const institutionDetails: Record<string, { setup: string; leader: string; functions: string }> = {
  '燕侯府': { setup: '周初分封', leader: '燕侯', functions: '封地治理、诸侯朝贡' },
  '相国府': { setup: '战国设立', leader: '相国', functions: '辅佐君主、总理政务' },
  '将军府': { setup: '战国设立', leader: '将军', functions: '统率军队、边境防御' },
  '都署': { setup: '秦代设立', leader: '都尉', functions: '郡级军事长官' },
  '都卫府': { setup: '西汉设立', leader: '都尉', functions: '首都治安、宫廷守卫' },
  '护乌桓校尉': { setup: '东汉设立', leader: '校尉', functions: '管理乌桓事务、边境安抚' },
  '刺史部': { setup: '汉武帝设立', leader: '刺史', functions: '监察州郡、考核官员' },
  '行台尚书省': { setup: '北魏设立', leader: '尚书令', functions: '地方行政、战时决策' },
  '都督府': { setup: '魏晋设立', leader: '都督', functions: '统辖军政、镇守要地' },
  '郡太守府': { setup: '秦汉设立', leader: '太守', functions: '郡级行政长官、民政军事' },
  '幽州都督府': { setup: '北朝设立', leader: '都督', functions: '幽州军政、边防统筹' },
  '节度使府': { setup: '唐代设立', leader: '节度使', functions: '地方军政、财赋管理' },
  '南京留守司': { setup: '辽代设立', leader: '留守', functions: '南京治理、陪都管理' },
  '南枢密院南京分院': { setup: '辽代设立', leader: '知院事', functions: '军机处理、南面军务' },
  '南京三司使司': { setup: '辽代设立', leader: '三司使', functions: '财政税收、盐铁管理' },
  '西南面招讨司': { setup: '辽代设立', leader: '招讨使', functions: '西南军务、民族事务' },
  '尚书省': { setup: '隋唐设立', leader: '尚书令', functions: '中央行政、政令执行' },
  '御史台': { setup: '隋唐设立', leader: '御史大夫', functions: '监察百官、纠察违法' },
  '殿前都点检司': { setup: '后周设立', leader: '都点检', functions: '禁军统帅、京师卫戍' },
  '武卫军都指挥司': { setup: '五代设立', leader: '都指挥使', functions: '禁军指挥、宫廷守卫' },
  '都元帅府': { setup: '金元设立', leader: '都元帅', functions: '全国军务、战时指挥' },
  '南京邮驿司': { setup: '辽代设立', leader: '使', functions: '驿站管理、文书传递' },
  '国子监': { setup: '隋唐设立', leader: '祭酒', functions: '最高学府、教育管理' },
  '弘文院': { setup: '唐代设立', leader: '学士', functions: '宫廷藏书、文学侍从' },
  '中都路转运司': { setup: '金代设立', leader: '转运使', functions: '漕运财赋、物资调配' },
  '大兴府衙': { setup: '金代设立', leader: '府尹', functions: '首府行政、京畿治理' },
  '猛安谋克司': { setup: '金代设立', leader: '猛安/谋克', functions: '女真军政、部族管理' },
  '中书省': { setup: '元代设立', leader: '中书令', functions: '中央政务、政令制定' },
  '大都留守司': { setup: '元代设立', leader: '留守', functions: '大都治理、京师守卫' },
  '枢密院': { setup: '宋元设立', leader: '枢密使', functions: '全国军务、边防调度' },
  '都指挥使司': { setup: '明代设立', leader: '都指挥使', functions: '卫所军务、边防管理' },
  '大都路总管府': { setup: '元代设立', leader: '总管', functions: '路级行政、地方治理' },
  '内阁': { setup: '明代设立', leader: '大学士', functions: '辅政决策、票拟奏章' },
  '六部': { setup: '隋唐定制', leader: '尚书', functions: '分掌政务、执行政令' },
  '都察院': { setup: '明代设立', leader: '都御史', functions: '监察百官、巡按天下' },
  '通政使司': { setup: '明代设立', leader: '通政使', functions: '章奏传达、文书管理' },
  '五军都督府': { setup: '明代设立', leader: '都督', functions: '统辖卫所、军队管理' },
  '锦衣卫': { setup: '明代设立', leader: '指挥使', functions: '皇帝侍卫、特务缉捕' },
  '顺天府': { setup: '明清设立', leader: '府尹', functions: '首都行政、京畿治理' },
  '五城兵马指挥司': { setup: '明代设立', leader: '指挥', functions: '京师治安、巡防缉捕' },
  '军机处': { setup: '清代设立', leader: '军机大臣', functions: '军国机要、辅助决策' },
  '翰林院': { setup: '唐代设立', leader: '掌院学士', functions: '文学侍从、编修典籍' },
  '八旗都统衙门': { setup: '清代设立', leader: '都统', functions: '八旗管理、旗务统筹' },
  '步军统领衙门': { setup: '清代设立', leader: '步军统领', functions: '京师治安、九门守卫' },
  '京师警察厅': { setup: '清末设立', leader: '总监督', functions: '首都治安、警察管理' },
  '京兆尹公署': { setup: '民国设立', leader: '京兆尹', functions: '京兆地区行政' },
  '税局等': { setup: '民国设立', leader: '局长', functions: '税收征管、财政收入' },
  '国立与私立大学': { setup: '民国设立', leader: '校长', functions: '高等教育、人才培养' },
  '平绥铁路局/平汉铁路局等/市政府': { setup: '民国设立', leader: '局长/市长', functions: '交通运输、市政管理' }
};

// 🎯 图例配置
const legends = [
  { key: '朝代', label: '朝代', color: colors.朝代 },
  { key: '制度', label: '制度', color: colors.制度 },
  { key: '行政区划', label: '行政区划', color: colors.行政区划 },
  { key: '机构', label: '机构', color: colors.机构 },
  { key: '城市职能', label: '城市职能', color: colors.城市职能 }
];

// 状态管理
const chartRef = ref<HTMLElement>();
let chartInstance: echarts.ECharts | null = null;
const showHelp = ref(false);

// 📌 点击固定节点的状态
const pinnedNodes = ref<string[]>([]);

// 📌 图层可见性控制 (参考一等奖的交互)
const visibleLayers = reactive({
  朝代: true,
  制度: true,
  行政区划: true,
  机构: true,
  城市职能: true
});

// 🔧 工具函数
const getNodeCategory = (name: string): string => {
  for (const [k, arr] of Object.entries(categories)) {
    if ((arr as string[]).includes(name)) return k;
  }
  return '朝代';
};

// 🎛️ 切换图层显示
const toggleLayer = (key: string) => {
  visibleLayers[key] = !visibleLayers[key];
  updateChart();
};

// 📊 构建图表数据 (保留你原有的连线逻辑)
const buildChartData = () => {
  const nodes: any[] = [];
  const links: any[] = [];
  const nodeMap = new Map<string, number>();

  const depthMap: Record<string, number> = {
    '朝代': 0,
    '制度': 1,
    '行政区划': 2,
    '机构': 3,
    '城市职能': 4
  };

  const addNode = (name: string) => {
    if (nodeMap.has(name)) return;
    const category = getNodeCategory(name);
    
    // 根据图层可见性决定是否显示
    const isVisible = visibleLayers[category];
    
    nodes.push({
      name,
      depth: depthMap[category], // 🎯 强制指定层级/列
      itemStyle: { 
        color: isVisible ? colors[category] : colors.未选中线,
        opacity: isVisible ? 1 : 0.2
      },
      label: { 
        color: colors.字体, 
        formatter: isVisible ? '{b}' : '',
        fontSize: 10
      }
    });
    nodeMap.set(name, nodes.length - 1);
  };

  const addLink = (s: string, t: string, v = 1) => {
    addNode(s);
    addNode(t);
    
    const sourceCategory = getNodeCategory(s);
    const targetCategory = getNodeCategory(t);
    const isVisible = visibleLayers[sourceCategory] && visibleLayers[targetCategory];
    
    links.push({
      source: s,
      target: t,
      value: v,
      lineStyle: { 
        color: colors.未选中线,
        opacity: isVisible ? 0.2 : 0.05
      }
    });
  };

  // ================== 你原有的连线逻辑 (完整保留) ==================
  // 先秦
  addLink('先秦','分封制');
  addLink('分封制','诸侯国'); addLink('诸侯国','燕侯府'); addLink('燕侯府','政治行政');
  addLink('分封制','都城'); addLink('都城','相国府'); addLink('相国府','政治行政');
  addLink('先秦','郡县制萌芽'); addLink('郡县制萌芽','郡'); addLink('郡县制萌芽','县');
  addLink('都城','将军府'); addLink('将军府','军事防卫');

  // 秦汉
  addLink('秦汉','郡县制'); addLink('郡县制','郡'); addLink('郡县制','县');
  addLink('秦汉','郡国并行制'); addLink('郡国并行制','国');
  addLink('秦汉','刺史监察制'); addLink('刺史监察制','刺史部');
  addLink('郡','郡太守府'); addLink('郡太守府','政治行政');
  addLink('县','护乌桓校尉'); addLink('护乌桓校尉','军事防卫');

  // 魏晋南北朝
  addLink('魏晋南北朝','州郡县三级制'); addLink('州郡县三级制','州'); 
  addLink('州','都督府'); addLink('都督府','政治行政');
  addLink('魏晋南北朝','郡县二级制');
  addLink('行台尚书省','政治行政');
  addLink('州','幽州都督府'); addLink('幽州都督府','政治行政');

  // 隋唐五代
  addLink('隋唐五代','道州县三级制'); addLink('道州县三级制','道'); 
  addLink('道','州'); addLink('州','县');
  addLink('隋唐五代','节度使体制'); addLink('节度使体制','节度使府'); 
  addLink('节度使府','军事防卫'); addLink('节度使府','政治行政');
  addLink('隋唐五代','都督府');
  addLink('隋唐五代','尚书省'); addLink('尚书省','政治行政');
  addLink('隋唐五代','御史台'); addLink('御史台','政治行政');
  addLink('隋唐五代','国子监'); addLink('国子监','文化教育');
  addLink('隋唐五代','弘文院'); addLink('弘文院','文化教育');
  addLink('隋唐五代','殿前都点检司'); addLink('殿前都点检司','军事防卫');

  // 辽
  addLink('辽','五京制'); addLink('五京制','京'); addLink('京','南京留守司'); 
  addLink('南京留守司','政治行政');
  addLink('辽','道府州县四级制'); addLink('道府州县四级制','道'); 
  addLink('道府州县四级制','府'); addLink('道府州县四级制','州'); 
  addLink('道府州县四级制','县');
  addLink('辽','南北面官双轨制');
  addLink('南北面官双轨制','南枢密院南京分院'); 
  addLink('南枢密院南京分院','政治行政'); 
  addLink('南枢密院南京分院','军事防卫');
  addLink('南北面官双轨制','南京三司使司'); 
  addLink('南京三司使司','经济贸易');
  addLink('南北面官双轨制','西南面招讨司'); 
  addLink('西南面招讨司','军事防卫');
  addLink('辽','南京邮驿司'); addLink('南京邮驿司','交通枢纽');

  // 金
  addLink('金','路府州县四级制'); addLink('路府州县四级制','路'); 
  addLink('路府州县四级制','府'); addLink('路府州县四级制','州'); 
  addLink('路府州县四级制','县');
  addLink('金','猛安谋克制'); addLink('猛安谋克制','猛安谋克司'); 
  addLink('猛安谋克司','军事防卫'); addLink('猛安谋克司','政治行政');
  addLink('金','都城警巡制'); addLink('都城警巡制','警巡院'); 
  addLink('警巡院','市政管理');
  addLink('路','中都路转运司'); addLink('中都路转运司','经济贸易');
  addLink('府','大兴府衙'); addLink('大兴府衙','政治行政');
  addLink('金','中书省'); addLink('中书省','政治行政'); 
  addLink('金','枢密院'); addLink('枢密院','军事防卫');
  addLink('金','国子监'); addLink('金','弘文院');

  // 元
  addLink('元','省路府州县五级制'); addLink('省路府州县五级制','省'); 
  addLink('省路府州县五级制','路'); addLink('省路府州县五级制','府'); 
  addLink('省路府州县五级制','州'); addLink('省路府州县五级制','县');
  addLink('元','行中书省制度'); addLink('行中书省制度','中书省'); 
  addLink('行中书省制度','大都留守司'); addLink('大都留守司','政治行政');
  addLink('路','大都路总管府'); addLink('大都路总管府','政治行政');
  addLink('元','都元帅府'); addLink('都元帅府','军事防卫');

  // 明
  addLink('明','北直隶制'); addLink('北直隶制','省');
  addLink('明','五城管理制'); addLink('五城管理制','京'); 
  addLink('京','五城兵马指挥司'); addLink('五城兵马指挥司','市政管理');
  addLink('明','直隶省与府州县制'); addLink('直隶省与府州县制','省');
  addLink('明','卫所'); addLink('卫所','都指挥使司'); 
  addLink('都指挥使司','军事防卫');
  ['内阁','六部','都察院','通政使司','五军都督府','锦衣卫','顺天府','翰林院'].forEach(i=>{
    addLink('明', i);
    if (['翰林院'].includes(i)) addLink(i,'文化教育');
    else if (['五军都督府','锦衣卫'].includes(i)) { 
      addLink(i,'军事防卫'); addLink(i,'政治行政');
    }
    else addLink(i,'政治行政');
  });

  // 清
  addLink('清','八旗制度'); addLink('八旗制度','旗营'); 
  addLink('旗营','军事防卫');
  addLink('清','直隶省与府州县制'); addLink('直隶省与府州县制','省');
  ['军机处','八旗都统衙门','步军统领衙门','都察院','顺天府','翰林院','京兆尹公署'].forEach(i=>{
    addLink('清', i);
    if (i==='步军统领衙门') { 
      addLink(i,'军事防卫'); addLink(i,'市政管理');
    }
    else if (i==='翰林院') addLink(i,'文化教育');
    else addLink(i,'政治行政');
  });

  // 民国
  addLink('民国','市区制'); addLink('市区制','市'); 
  addLink('市区制','区'); addLink('市区制','特别区');
  addLink('民国','京师警察厅'); addLink('京师警察厅','市政管理');
  addLink('民国','平绥铁路局/平汉铁路局等/市政府'); 
  addLink('平绥铁路局/平汉铁路局等/市政府','交通枢纽'); 
  addLink('平绥铁路局/平汉铁路局等/市政府','政治行政');
  addLink('民国','国立与私立大学'); addLink('国立与私立大学','文化教育');
  addLink('民国','税局等'); addLink('税局等','经济贸易');

  return { nodes, links };
};

// 🎨 初始化/更新图表
const updateChart = () => {
  if (!chartRef.value) return;
  
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const { nodes, links } = buildChartData();

  const option: any = {
    backgroundColor: '#F8F6F0',
    tooltip: {
      trigger: 'item', triggerOn: 'mousemove',
      backgroundColor: 'rgba(255,255,255,0.95)', borderColor: colors.字体, borderWidth: 1,
      textStyle: { color: colors.字体, fontFamily: 'Source Han Serif SC, serif' },
      formatter: (p: any) => {
        if (p.dataType === 'edge') {
          return `<div style="padding:8px 12px;"><div style="font-weight:bold;margin-bottom:4px;">${p.data.source} → ${p.data.target}</div><div style="font-size:12px;color:#999;">演变路径</div></div>`
        } else {
          const cat = getNodeCategory(p.name)
          // 如果是机构节点且有详细信息，显示详细信息
          if (cat === '机构' && institutionDetails[p.name]) {
            const detail = institutionDetails[p.name]
            return `<div style="padding:10px 14px; max-width: 280px;">
              <div style="font-weight:bold;margin-bottom:8px;font-size:15px;border-bottom:1px solid #E5E5E5;padding-bottom:6px;">${p.name}</div>
              <div style="margin-bottom:6px;"><span style="color:#999;font-size:12px;">机构设置：</span><span style="font-size:13px;">${detail.setup}</span></div>
              <div style="margin-bottom:6px;"><span style="color:#999;font-size:12px;">长　　官：</span><span style="font-size:13px;">${detail.leader}</span></div>
              <div><span style="color:#999;font-size:12px;">核心职能：</span><span style="font-size:13px;">${detail.functions}</span></div>
            </div>`
          }
          return `<div style="padding:8px 12px;"><div style="font-weight:bold;margin-bottom:4px;font-size:14px;">${p.name}</div><div style="font-size:12px;color:#999;">类别：${cat}</div></div>`
        }
      }
    },

    series: [{
      type: 'sankey',
      top: 80,
      left: 24,
      right: 24,
      layoutIterations: 0,
      emphasis: { 
        focus: 'adjacency',
        lineStyle: { opacity: 0.6, color: colors.字体 }
      },
      nodeAlign: 'justify',
      nodeGap: 14,
      nodeWidth: 20,
      data: nodes,
      links,
      lineStyle: { curveness: 0.3, opacity: 0.3 },
      label: { 
        fontFamily: 'Source Han Serif SC, serif',
        fontSize: 11,
        color: colors.字体,
        position: 'right'
      }
    }]
  };

  chartInstance.setOption(option);
  
  // 🎯 添加点击事件：固定节点并显示连线
  chartInstance.off('click'); // 先移除旧的监听器
  chartInstance.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const nodeName = params.name;
      const index = pinnedNodes.value.indexOf(nodeName);
      
      if (index > -1) {
        // 如果已固定，则取消固定
        pinnedNodes.value.splice(index, 1);
      } else {
        // 固定节点
        pinnedNodes.value.push(nodeName);
      }
      
      // 重新渲染图表以显示高亮
      highlightPinnedNodes();
    }
  });
};

// 🎯 高亮固定的节点及其连线
const highlightPinnedNodes = () => {
  if (!chartInstance || pinnedNodes.value.length === 0) {
    // 如果没有固定的节点，恢复默认状态
    if (chartInstance) {
      chartInstance.dispatchAction({
        type: 'downplay',
        seriesIndex: 0
      });
    }
    return;
  }
  
  // 先取消所有高亮
  chartInstance.dispatchAction({
    type: 'downplay',
    seriesIndex: 0
  });
  
  // 高亮所有固定的节点
  pinnedNodes.value.forEach(nodeName => {
    chartInstance!.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      name: nodeName
    });
  });
};

// 🔧 响应式调整
const handleResize = () => chartInstance?.resize();

onMounted(() => {
  updateChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped>
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

.legend-panel {
  background: rgba(255, 250, 240, 0.6);
  border: 1px solid rgba(220, 211, 197, 0.5);
  backdrop-filter: blur(4px);
}

.legend-item {
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.legend-item:hover {
  background-color: rgba(0,0,0,0.05);
  border-color: #DCD3C5;
}

.legend-disabled {
  opacity: 0.4;
}

.legend-color {
  width: 20px;
  height: 8px;
  border-radius: 2px;
}

:deep(*) { 
  font-family: 'Source Han Serif SC', serif; 
}
</style>
