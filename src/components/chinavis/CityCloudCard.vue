<template>
    <v-card class="pa-4 glass-card" flat color="transparent">
    <!-- 标题 + 说明 tooltip -->
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="d-flex align-center">
        <v-icon size="28">mdi-book-open-variant</v-icon>
        <span class="text-h6 ml-2">史海要词</span>

        <!-- Vuetify3 Tooltip 官方用法 -->
        <v-tooltip text="三个词云：人物(北)、地点(北京地图)、年份(京)。点击人物可查看详情">
          <template #activator="{ props }">
            <v-icon class="ml-2" v-bind="props">mdi-information-outline</v-icon>
          </template>
        </v-tooltip>
      </div>

      <div class="d-flex align-center">
        <v-chip size="small" class="mr-2" style="background:#B9C4B4">人物</v-chip>
        <v-chip size="small" class="mr-2" style="background:#D59E80">地点</v-chip>
        <v-chip size="small" style="background:#D7C393">年份</v-chip>
      </div>
    </div>

    <v-row dense>
      <v-col cols="12" md="4">
        <div class="cloud-wrapper">
          <!-- 背景轮廓：#B9C4B4 绿色 -->
          <div class="cloud-bg" data-color="#B9C4B4" data-mask="/masks/Bei.png"></div>
          <!-- 词云层 -->
          <div ref="peopleEl" class="cloud"></div>
        </div>
      </v-col>
      <v-col cols="12" md="4">
        <div class="cloud-wrapper">
          <!-- 背景轮廓：#D59E80 橙色 -->
          <div class="cloud-bg" data-color="#D59E80" data-mask="/masks/BeijingMap.png"></div>
          <!-- 词云层 -->
          <div ref="placeEl" class="cloud"></div>
        </div>
      </v-col>
      <v-col cols="12" md="4">
        <div class="cloud-wrapper">
          <!-- 背景轮廓：#D7C393 金色 -->
          <div class="cloud-bg" data-color="#D7C393" data-mask="/masks/Jing.png"></div>
          <!-- 词云层 -->
          <div ref="yearEl" class="cloud"></div>
        </div>
      </v-col>
    </v-row>

    <!-- 人物详情弹窗 -->
    <v-dialog v-model="showPerson" width="640">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ activePerson?.name }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showPerson = false" />
        </v-card-title>
        <v-divider />
        <v-card-text v-if="activePerson" class="pt-4">
          <v-chip v-if="activePerson?.detail?.period" class="mb-3" color="primary" size="small">
            {{ activePerson.detail.period }}
          </v-chip>

          <template v-if="activePerson?.detail?.identity">
            <div class="text-subtitle-2 font-weight-bold mb-1">身份</div>
            <div class="mb-3">{{ activePerson.detail.identity }}</div>
          </template>

          <template v-if="activePerson?.detail?.introduction">
            <div class="text-subtitle-2 font-weight-bold mb-1">人物介绍</div>
            <div class="mb-3" style="white-space: pre-line">
              {{ activePerson.detail.introduction }}
            </div>
          </template>

          <template v-if="activePerson?.detail?.activity">
            <div class="text-subtitle-2 font-weight-bold mb-1">活动</div>
            <div style="white-space: pre-line">
              {{ activePerson.detail.activity }}
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="amber-darken-3"
            variant="tonal"
            prepend-icon="mdi-pin-outline"
            @click="collectActivePerson"
          >
            收集人物
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="text" @click="showPerson = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import wordcloud from '@/data/wordcloud_data.json'
// 导入线索收集器
import { useClueCollector } from '@/composables/useClueCollector'

const { collectClue } = useClueCollector()

type WordItem = { name: string; value: number; detail?: any }

const peopleEl = ref<HTMLDivElement | null>(null)
const placeEl = ref<HTMLDivElement | null>(null)
const yearEl = ref<HTMLDivElement | null>(null)

let peopleChart: echarts.ECharts | null = null
let placeChart: echarts.ECharts | null = null
let yearChart: echarts.ECharts | null = null

const showPerson = ref(false)
const activePerson = ref<WordItem | null>(null)

// 收集当前人物到线索板
const collectActivePerson = () => {
  if (!activePerson.value) return
  const p = activePerson.value
  collectClue({
    title: p.name,
    content: p.detail?.introduction || p.detail?.activity || '无详细介绍',
    subLabel: p.detail?.period || '历史人物'
  }, 'clue_event', '史海人物')
  showPerson.value = false
}

/** 加载并反色处理mask图片（黑色主体->白色主体，用于maskImage） */
function loadAndInvertMask(
  url: string,
  opts: { forCss?: boolean; scale?: number } = {}
): Promise<HTMLImageElement> {
  const { forCss = false, scale = 1 } = opts

  function cropTransparent(srcCanvas: HTMLCanvasElement) {
    const { width, height } = srcCanvas
    const ctx = srcCanvas.getContext('2d')!
    const imgData = ctx.getImageData(0, 0, width, height).data

    let top = height, left = width, right = 0, bottom = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const a = imgData[idx + 3]
        if (a > 0) {
          if (x < left) left = x
          if (x > right) right = x
          if (y < top) top = y
          if (y > bottom) bottom = y
        }
      }
    }
    if (right < left || bottom < top) return srcCanvas // 空图兜底

    const bw = right - left + 1
    const bh = bottom - top + 1

    const out = document.createElement('canvas')
    const octx = out.getContext('2d')!
    out.width = Math.ceil(bw * scale)
    out.height = Math.ceil(bh * scale)
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(
      srcCanvas,
      left, top, bw, bh,
      0, 0, out.width, out.height
    )
    return out
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // 1) 画原图
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('无法获取canvas context'))
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // 2) 先裁边（去掉透明留白，并可 scale 放大）
      const cropped = cropTransparent(canvas)

      // 3) forCss: 不反色；wordcloud: 反色（白=可排布）
      const w = document.createElement('canvas')
      const wctx = w.getContext('2d')!
      w.width = cropped.width
      w.height = cropped.height
      wctx.drawImage(cropped, 0, 0)

      if (!forCss) {
        const d = wctx.getImageData(0, 0, w.width, w.height)
        const data = d.data
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i]
          data[i + 1] = 255 - data[i + 1]
          data[i + 2] = 255 - data[i + 2]
          // alpha 保持
        }
        wctx.putImageData(d, 0, 0)
      }

      const outImg = new Image()
      outImg.onload = () => resolve(outImg)
      outImg.onerror = reject
      outImg.src = w.toDataURL('image/png')
    }
    img.onerror = reject
    img.src = url
  })
}

/** 构建词云option */
function buildOption(data: any[], color: string, maskImage: HTMLImageElement) {
  return {
    backgroundColor: 'transparent',  // 背景透明，让下层的彩色轮廓显示出来
    tooltip: {
      show: true,
      trigger: 'item',
      backgroundColor: '#fff',        // 白色背景
      borderColor: color,
      borderWidth: 2,
      padding: [8, 12],
      textStyle: {
        color: '#333',               // 深色文字
        fontSize: 13
      },
      formatter: (params: any) => {
        const hasDetail = params.data?.detail
        return `<strong style="font-size:14px;color:#000">${params.name}</strong><br/>出现次数: <span style="color:${color};font-weight:bold">${params.value}</span>${
          hasDetail ? '<br/><em style="color:#999;font-size:11px">点击查看详情</em>' : ''
        }`
      }
    },
    series: [{
      type: 'wordCloud',
      // maskImage决定词的分布区域（反色后的白色区域）
      maskImage: maskImage,
      keepAspect: true,
      
      // 位置和大小 - 留出边距避免超出
      left: 'center',
      top: 'center', 
      width: '100%',
    height: '100%',

      
      // 词云参数 - 调整以适应轮廓
      gridSize: 6,              // 网格密度，越小越紧密
      sizeRange: [12, 42],      // 字号范围缩小，避免大词超出
      rotationRange: [-45, 45], // 允许旋转 -45° 到 45°
      rotationStep: 15,         // 旋转步长15度
      drawOutOfBound: false,    // 不允许超出画布
      shrinkToFit: true,        // 如果太大就缩小
      
      // 样式 - 黑色文字
      textStyle: {
        fontFamily: 'Noto Serif SC, PingFang SC, Microsoft YaHei, sans-serif',
        fontWeight: 'bold',
        color: '#000',           // 黑色文字！
      },
      emphasis: {
        focus: 'self',
        textStyle: {
          fontSize: 16,
          color: '#000',         // 悬停也是黑色
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.3)',
          textBorderColor: color,
          textBorderWidth: 2
        }
      },
      
      data: data
    }]
  }
}

/** 初始化词云 */
async function render() {
  try {
        // 词云用：裁边 + 反色
    const [maskBei, maskMap, maskJing] = await Promise.all([
    loadAndInvertMask('/masks/Bei.png', { scale: 1.08 }),
    loadAndInvertMask('/masks/BeijingMap.png', { scale: 1.08 }),
    loadAndInvertMask('/masks/Jing.png', { scale: 1.08 })
    ])

    // 背景用：裁边（不反色）
    const [bgBei, bgMap, bgJing] = await Promise.all([
    loadAndInvertMask('/masks/Bei.png', { forCss: true, scale: 1.08 }),
    loadAndInvertMask('/masks/BeijingMap.png', { forCss: true, scale: 1.08 }),
    loadAndInvertMask('/masks/Jing.png', { forCss: true, scale: 1.08 })
    ])

    // 覆盖每列的 CSS 变量（用处理后的遮罩）
    const bgEls = Array.from(document.querySelectorAll<HTMLDivElement>('.cloud-bg'))
    ;[bgBei, bgMap, bgJing].forEach((img, i) => {
    const el = bgEls[i]
    if (el) el.style.setProperty('--mask-url', `url(${img.src})`)
    })


    // 2) 准备数据
    const peopleData: WordItem[] = (wordcloud as any).people || []
    const placeData = (wordcloud as any).places || []
    const yearData = (wordcloud as any).years || []

    // 3) 人物词云
    if (peopleEl.value && peopleData.length > 0) {
      peopleChart = echarts.init(peopleEl.value)
      peopleChart.setOption(buildOption(peopleData, '#B9C4B4', maskBei))
      peopleChart.setOption({
        series: [{
            width: '92%',     // ← 你要再小就 88% / 86%
            height: '90%',
            sizeRange: [12, 40],
            gridSize: 6
        }]
        })
      // 点击人物 -> 显示详情
      peopleChart.on('click', (params: any) => {
        const found = peopleData.find(p => p.name === params.name)
        if (found?.detail) {
          activePerson.value = found
          showPerson.value = true
        }
      })
    }

    // 4) 地点词云
    if (placeEl.value && placeData.length > 0) {
      placeChart = echarts.init(placeEl.value)
      placeChart.setOption(buildOption(placeData, '#D59E80', maskMap))
    }

    // 5) 年份词云
    if (yearEl.value && yearData.length > 0) {
      yearChart = echarts.init(yearEl.value)
      yearChart.setOption(buildOption(yearData, '#D7C393', maskJing))
      // 原有设置

        // 仅缩小词云区域，不动背景
        yearChart.setOption({
        series: [{
            width: '74%',     // ← 若仍偏大，调到 72% / 70%
            height: '74%',
            sizeRange: [10, 36],
            gridSize: 5
        }]
        })
    }
  } catch (error) {
    console.error('词云渲染失败:', error)
  }
}

// 响应式调整
let ro: ResizeObserver | null = null
onMounted(() => {
  render()
  
  // 监听容器尺寸变化
  ro = new ResizeObserver(() => {
    peopleChart?.resize()
    placeChart?.resize()
    yearChart?.resize()
  })
  
  if (peopleEl.value) ro.observe(peopleEl.value)
  if (placeEl.value) ro.observe(placeEl.value)
  if (yearEl.value) ro.observe(yearEl.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  peopleChart?.dispose()
  placeChart?.dispose()
  yearChart?.dispose()
})
</script>

<style scoped>
.cloud-wrapper {
  position: relative;
  width: 100%;
  height: 400px;
  min-height: 300px;
}

/* 通过mask实现彩色轮廓背景 */
.cloud-bg[data-color]::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--mask-color);
  -webkit-mask-image: var(--mask-url);
  mask-image: var(--mask-url);
  
  /* 
  ============================================
  🎨 调整背景轮廓大小和位置：
  ============================================
  */
  /* 裁边后，用 contain 让主体尽可能大且不被裁剪 */
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-position: center center;
  mask-position: center center;
  
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  
  opacity: 0.9;                        /* 👈 调整透明度：0.25 / 0.35 / 0.5 */
  pointer-events: none;
  z-index: 1;
}

.cloud-bg[data-color="#B9C4B4"]::before {
  --mask-color: #B9C4B4;
  --mask-url: url('/masks/Bei.png');
}

.cloud-bg[data-color="#D59E80"]::before {
  --mask-color: #D59E80;
  --mask-url: url('/masks/BeijingMap.png');
}

.cloud-bg[data-color="#D7C393"]::before {
  --mask-color: #D7C393;
  --mask-url: url('/masks/Jing.png');
}

.cloud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;  /* 词云在背景图之上 */
}


</style>