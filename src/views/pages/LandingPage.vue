<template>
  <v-app class="bg-[#E6E6E6] font-mono overflow-hidden">
    <v-main>
      <div class="horizontal-container w-100 h-screen overflow-hidden relative">

        <div class="horizontal-wrapper d-flex flex-nowrap h-100" ref="wrapper">

          <section
            v-for="(task, index) in tasks"
            :key="index"
            class="panel h-100 border-r border-gray-400 relative"
            style="min-width: 100vw; width: 100vw;"
          >
            <v-container fluid class="fill-height pa-0">
              <div class="w-100 h-100 d-flex flex-column pa-10">

                <div class="absolute top-0 left-0 p-4 z-10">
                   <span class="text-[120px] font-weight-black text-[#F0F0F0] leading-none select-none opacity-50">
                     0{{ index + 1 }}
                   </span>
                </div>

                <div class="d-flex align-center justify-space-between mb-8 z-20 relative">
                  <div>
                    <div class="bg-[#FFFA00] px-2 py-1 d-inline-block mb-2">
                       <span class="text-caption font-weight-bold text-black">SECTION_0{{ index + 1 }}</span>
                    </div>
                    <h2 class="text-h4 font-weight-bold text-uppercase">{{ task.title }}</h2>
                  </div>
                  <div class="text-right">
                    <div class="text-caption text-grey">DATA_SOURCE</div>
                    <div class="font-weight-bold">CHINAVIS_2025</div>
                  </div>
                </div>

                <v-row class="fill-height z-20" dense>
                  <v-col cols="7" class="h-100">
                    <v-card class="rounded-0 h-100 border border-gray-400 bg-white d-flex align-center justify-center elevation-0">
                      <v-icon size="80" color="grey-lighten-2">{{ task.icon }}</v-icon>
                      <span class="absolute bottom-4 right-4 text-caption text-grey">VISUAL_COMPONENT</span>
                    </v-card>
                  </v-col>

                  <v-col cols="5" class="h-100 d-flex flex-column pl-6">
                    <div class="flex-grow-1 border-l-4 border-[#FFFA00] pl-6 py-4">
                      <h3 class="text-h6 font-weight-bold mb-4">{{ task.sub }}</h3>
                      <p class="text-body-1 text-grey-darken-2 leading-relaxed">
                        {{ task.desc }}
                      </p>
                    </div>
                    <div class="h-[100px] bg-[#333] mt-4 w-100 d-flex align-center justify-center text-white">
                      <span class="text-overline">INTERACTIVE_MODULE</span>
                    </div>
                  </v-col>
                </v-row>

              </div>
            </v-container>
          </section>
        </div>

      </div>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const wrapper = ref(null);

const tasks = ref([
  { title: '生态环境', sub: 'ECOLOGICAL', desc: '水系与植被演化...', icon: 'mdi-water' },
  { title: '冲击事件', sub: 'SHOCK EVENTS', desc: '战争与灾害分布...', icon: 'mdi-flash' },
  { title: '内部机制', sub: 'MECHANISM', desc: '人地产循环效应...', icon: 'mdi-cogs' },
  { title: '制度经济', sub: 'ECONOMY', desc: '建制与商业变迁...', icon: 'mdi-bank' },
  { title: '综合叙事', sub: 'SYNTHESIS', desc: '时空叙事图谱...', icon: 'mdi-map-clock' }
]);

let ctx: gsap.Context;

onMounted(() => {
  ctx = gsap.context(() => {
    // 核心逻辑：横向滚动
    // 1. 获取所有的 section 数量
    const sections = gsap.utils.toArray(".panel");

    // 2. 创建一个 ScrollTrigger
    gsap.to(sections, {
      xPercent: -100 * (sections.length - 1), // 向左移动 (N-1) 个屏幕的宽度
      ease: "none", // 匀速，必须设为 none 否则滚动感觉很奇怪
      scrollTrigger: {
        trigger: ".horizontal-container", // 触发容器
        pin: true,     // 钉住容器！
        scrub: 1,      // 绑定滚动条（带1秒平滑缓冲）
        snap: 1 / (sections.length - 1), // (可选) 自动吸附到每一页
        // end: () => "+=" + document.querySelector(".horizontal-container").offsetWidth // 滚动的总长度
        end: "+=3000" // 或者简单点，滚 3000px 完成播放
      }
    });
  });
});

onUnmounted(() => {
  ctx && ctx.revert();
});
</script>
