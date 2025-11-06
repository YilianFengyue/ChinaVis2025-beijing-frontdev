<template>
  <v-card flat class="pa-6" style="background-color: #F8F6F0;">
    <div ref="chartRef" style="width: 100%; height: 960px;"></div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

// 颜色（不改）
const colors = {
  朝代: '#CF794D',
  制度: '#D99964',
  行政区划: '#CDA756',
  机构: '#C2B190',
  城市职能: '#8BAB8D',
  未选中线: '#E1E0DD',
  字体: '#7C6B59'
}

// ====== 五个字段（按你最新手敲版本）======
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
}

// ——固定分层（不改 UI，只给每个节点一个 depth）——
const nodeDepths: Record<string, number> = (() => {
  const d: Record<string, number> = {}
  categories.朝代.forEach(n => d[n] = 0)
  categories.制度.forEach(n => d[n] = 1)
  categories.行政区划.forEach(n => d[n] = 2)
  categories.机构.forEach(n => d[n] = 3)
  categories.城市职能.forEach(n => d[n] = 4)
  return d
})()

const getNodeCategory = (name: string): keyof typeof colors => {
  for (const [k, arr] of Object.entries(categories)) {
    if ((arr as string[]).includes(name)) return k as keyof typeof colors
  }
  return '朝代' as keyof typeof colors
}

const buildChartData = () => {
  const nodes: any[] = []
  const links: any[] = []
  const nodeMap = new Map<string, number>()

  const addNode = (name: string) => {
    if (nodeMap.has(name)) return
    nodes.push({
      name,
      depth: nodeDepths[name] ?? 2,
      itemStyle: { color: colors[getNodeCategory(name)] },
      label: { color: colors.字体, formatter: name }
    })
    nodeMap.set(name, nodes.length - 1)
  }

  const addLink = (s: string, t: string, v = 1) => {
    addNode(s); addNode(t)
    links.push({
      source: s, target: t, value: v,
      lineStyle: { color: colors.未选中线, opacity: 0.2 }
    })
  }

  // ================== 连线（按史实校对 + 你的字段表） ==================

  // 先秦（周/战国，北京为燕地）
  addLink('先秦','分封制')
  addLink('分封制','诸侯国'); addLink('诸侯国','燕侯府'); addLink('燕侯府','政治行政')
  addLink('分封制','都城'); addLink('都城','相国府'); addLink('相国府','政治行政')
  addLink('先秦','郡县制萌芽'); addLink('郡县制萌芽','郡'); addLink('郡县制萌芽','县')
  addLink('都城','将军府'); addLink('将军府','军事防卫')

  // 秦汉：郡县制、郡国并行制与刺史监察制（十三刺史部）
  addLink('秦汉','郡县制'); addLink('郡县制','郡'); addLink('郡县制','县')
  addLink('秦汉','郡国并行制'); addLink('郡国并行制','国')
  addLink('秦汉','刺史监察制'); addLink('刺史监察制','刺史部')
  addLink('郡','郡太守府'); addLink('郡太守府','政治行政')
  addLink('县','护乌桓校尉'); addLink('护乌桓校尉','军事防卫')

  // 魏晋南北朝：州郡县三级、都督体制（幽州都督）
  addLink('魏晋南北朝','州郡县三级制'); addLink('州郡县三级制','州'); addLink('州','都督府'); addLink('都督府','政治行政')
  addLink('魏晋南北朝','郡县二级制') // 地方一度两级化的过渡
  addLink('行台尚书省','政治行政') // 行台为非常设中央派出机关
  addLink('州','幽州都督府'); addLink('幽州都督府','政治行政')

  // 隋唐五代：道—州—县、节度使体制（安史后）
  addLink('隋唐五代','道州县三级制'); addLink('道州县三级制','道'); addLink('道','州'); addLink('州','县')
  addLink('隋唐五代','节度使体制'); addLink('节度使体制','节度使府'); addLink('节度使府','军事防卫'); addLink('节度使府','政治行政')
  addLink('隋唐五代','都督府'); // 早唐沿用都督府
  addLink('隋唐五代','尚书省'); addLink('尚书省','政治行政')
  addLink('隋唐五代','御史台'); addLink('御史台','政治行政')
  addLink('隋唐五代','国子监'); addLink('国子监','文化教育')
  addLink('隋唐五代','弘文院'); addLink('弘文院','文化教育')
  addLink('隋唐五代','殿前都点检司'); addLink('殿前都点检司','军事防卫') // 五代/宋前身

  // 辽：五京制 + 南北面官双轨制 + 道府州县
  addLink('辽','五京制'); addLink('五京制','京'); addLink('京','南京留守司'); addLink('南京留守司','政治行政')
  addLink('辽','道府州县四级制'); addLink('道府州县四级制','道'); addLink('道府州县四级制','府'); addLink('道府州县四级制','州'); addLink('道府州县四级制','县')
  addLink('辽','南北面官双轨制')
  addLink('南北面官双轨制','南枢密院南京分院'); addLink('南枢密院南京分院','政治行政'); addLink('南枢密院南京分院','军事防卫')
  addLink('南北面官双轨制','南京三司使司'); addLink('南京三司使司','经济贸易')
  addLink('南北面官双轨制','西南面招讨司'); addLink('西南面招讨司','军事防卫')
  addLink('辽','南京邮驿司'); addLink('南京邮驿司','交通枢纽')

  // 金：路—府—州—县、猛安谋克、都城警巡制
  addLink('金','路府州县四级制'); addLink('路府州县四级制','路'); addLink('路府州县四级制','府'); addLink('路府州县四级制','州'); addLink('路府州县四级制','县')
  addLink('金','猛安谋克制'); addLink('猛安谋克制','猛安谋克司'); addLink('猛安谋克司','军事防卫'); addLink('猛安谋克司','政治行政')
  addLink('金','都城警巡制'); addLink('都城警巡制','警巡院'); addLink('警巡院','市政管理'); addLink('警巡院','治安管理')
  addLink('路','中都路转运司'); addLink('中都路转运司','经济贸易')
  addLink('府','大兴府衙'); addLink('大兴府衙','政治行政')
  addLink('金','中书省'); addLink('中书省','政治行政'); addLink('金','枢密院'); addLink('枢密院','军事防卫')
  addLink('金','国子监'); addLink('国子监','文化教育'); addLink('金','弘文院'); addLink('弘文院','文化教育')

  // 元：行省制 + 省—路—府（州）—县；京师大都
  addLink('元','省路府州县五级制'); addLink('省路府州县五级制','省'); addLink('省路府州县五级制','路'); addLink('省路府州县五级制','府'); addLink('省路府州县五级制','州'); addLink('省路府州县五级制','县')
  addLink('元','行中书省制度'); addLink('行中书省制度','中书省'); addLink('中书省','政治行政'); addLink('行中书省制度','大都留守司'); addLink('大都留守司','政治行政')
  addLink('路','大都路总管府'); addLink('大都路总管府','政治行政')
  addLink('元','都元帅府'); addLink('都元帅府','军事防卫')

  // 明：北直隶、五城管理、（州府县体系）与京师机构
  addLink('明','北直隶制'); addLink('北直隶制','省')
  addLink('明','五城管理制'); addLink('五城管理制','京'); addLink('京','五城兵马指挥司'); addLink('五城兵马指挥司','市政管理'); addLink('五城兵马指挥司','治安管理')
  addLink('明','直隶省与府州县制'); addLink('直隶省与府州县制','省')
  addLink('明','卫所'); addLink('卫所','都指挥使司'); addLink('都指挥使司','军事防卫')
  ;['内阁','六部','都察院','通政使司','五军都督府','锦衣卫','顺天府','翰林院'].forEach(i=>{
    addLink('明', i);
    if (['翰林院'].includes(i)) addLink(i,'文化教育');
    else if (['五军都督府','锦衣卫'].includes(i)) { addLink(i,'军事防卫'); addLink(i,'政治行政') }
    else addLink(i,'政治行政')
  })

  // 清：八旗制度 + 直隶省制；京师治安（步军统领）与军机处等
  addLink('清','八旗制度'); addLink('八旗制度','旗营'); addLink('旗营','军事防卫')
  addLink('清','直隶省与府州县制'); addLink('直隶省与府州县制','省')
  ;['军机处','八旗都统衙门','步军统领衙门','都察院','顺天府','翰林院','京兆尹公署'].forEach(i=>{
    addLink('清', i)
    if (i==='步军统领衙门') { addLink(i,'军事防卫'); addLink(i,'市政管理') }
    else if (i==='翰林院') addLink(i,'文化教育')
    else addLink(i,'政治行政')
  })

  // 民国：市区制；京师警察厅/市政府/铁路局/大学/税局
  addLink('民国','市区制'); addLink('市区制','市'); addLink('市区制','区'); addLink('市区制','特别区')
  addLink('民国','京师警察厅'); addLink('京师警察厅','市政管理'); addLink('京师警察厅','治安管理')
  addLink('民国','平绥铁路局/平汉铁路局等/市政府'); addLink('平绥铁路局/平汉铁路局等/市政府','交通枢纽'); addLink('平绥铁路局/平汉铁路局等/市政府','政治行政')
  addLink('民国','国立与私立大学'); addLink('国立与私立大学','文化教育')
  addLink('民国','税局等'); addLink('税局等','经济贸易')

  return { nodes, links }
}

// 初始化（不改）
const initChart = () => {
  if (!chartRef.value) return
  chartInstance = echarts.init(chartRef.value)
  const { nodes, links } = buildChartData()
  const option: echarts.EChartsOption = {
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
          return `<div style="padding:8px 12px;"><div style="font-weight:bold;margin-bottom:4px;font-size:14px;">${p.name}</div><div style="font-size:12px;color:#999;">类别：${cat}</div></div>`
        }
      }
    },
    graphic: {
    elements: [
      {
        type: 'group',
        left: 40,  // 图例左边距
        top: 10,   // 图例顶边距
        children: [
          // 标题（可按需改成你图片里的样式）
          { type: 'text', left: 0, top: 0, style: { text: '建制沿革', fontSize: 16, fontWeight: 'bold', fill: colors.字体 } },

          // 彩条 + 文字（朝代）
          { type: 'rect', left: 0, top: 26, shape: { width: 20, height: 8 }, style: { fill: colors.朝代 } },
          { type: 'text', left: 26, top: 22, style: { text: '朝代', fontSize: 12, fill: colors.字体 } },

          // 制度
          { type: 'rect', left: 76, top: 26, shape: { width: 20, height: 8 }, style: { fill: colors.制度 } },
          { type: 'text', left: 102, top: 22, style: { text: '制度', fontSize: 12, fill: colors.字体 } },

          // 行政区划
          { type: 'rect', left: 152, top: 26, shape: { width: 20, height: 8 }, style: { fill: colors.行政区划 } },
          { type: 'text', left: 178, top: 22, style: { text: '行政区划', fontSize: 12, fill: colors.字体 } },

          // 机构
          { type: 'rect', left: 260, top: 26, shape: { width: 20, height: 8 }, style: { fill: colors.机构 } },
          { type: 'text', left: 286, top: 22, style: { text: '机构', fontSize: 12, fill: colors.字体 } },

          // 城市职能
          { type: 'rect', left: 340, top: 26, shape: { width: 20, height: 8 }, style: { fill: colors.城市职能 } },
          { type: 'text', left: 366, top: 22, style: { text: '城市职能', fontSize: 12, fill: colors.字体 } }
        ]
      }
    ]
  },
  series: [{
      type: 'sankey',
      top: 80, // 图例与图之间间距
      left: 24,   // ← 新增：左边距（px 或百分比均可）
      right: 24,  // ← 新增：右边距（把默认 20% 巨大空白去掉）
      layoutIterations: 0,
      emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.6, color: colors.字体 } },
      nodeAlign: 'justify', nodeGap: 12, nodeWidth: 20,
      data: nodes, links,
      lineStyle: { curveness: 0.5, opacity: 0.3 },
      label: { fontFamily: 'Source Han Serif SC, serif', fontSize: 11, color: colors.字体, position: 'right' }
    }]
  }
  chartInstance.setOption(option)
}

const handleResize = () => chartInstance?.resize()
onMounted(()=>{ initChart(); window.addEventListener('resize', handleResize) })
onUnmounted(()=>{ window.removeEventListener('resize', handleResize); chartInstance?.dispose() })
</script>

<style scoped>
:deep(*) { font-family: 'Source Han Serif SC', serif; }
</style>
