<template>
  <v-app class="architectural-theme">
    <div class="hero-section position-relative">
      <v-img
        src="https://picsum.photos/id/122/1920/800"
        cover
        height="60vh"
        class="align-end grayscale-filter"
      >
        <div class="hero-overlay"></div>
        <v-container class="pb-12 position-relative z-index-2">
          <h1 class="text-h1 font-weight-thin mb-2 main-title gs-reveal">
            漫野之城 <span class="english-title">DIFFUSE SPACE</span>
          </h1>
          <div class="subtitle text-overline gs-reveal">
            ECOLOGICAL RECONSTRUCTION & RURAL REVITALIZATION
          </div>
        </v-container>
      </v-img>
      
      <div class="project-badge pa-4 bg-white position-absolute top-0 left-0 ma-8 elevation-2 gs-reveal">
        <v-icon icon="mdi-qrcode" size="48"></v-icon>
        <div class="text-caption mt-1 text-center">漫乐计划</div>
      </div>
    </div>

    <v-main class="bg-paper">
      <v-container fluid class="pa-md-8">
        
        <v-row class="mb-8 gs-reveal">
          <v-col cols="12">
            <v-card flat color="surface-variant" class="pa-6 d-flex flex-column flex-md-row align-center">
              <div class="text-body-2 text-grey-darken-2" style="max-width: 800px; line-height: 1.8;">
                该项目位于成都简阳三岔湖景区内，旨在为景区游客打造一个兼具自然之美与功能性的休闲空间。增强景区的可识别性和吸引力。场地三面环湖，风景优美，高差较小，为设计提供机遇与挑战...
                <br>
                This project is located in Sancha Lake Scenic Area, aiming to create a leisure space...
              </div>
              <v-spacer></v-spacer>
              <div class="barcode-decoration d-none d-md-block mx-8">
                ||| || ||| ||||| || |||
                <div class="text-caption text-center mt-1">REDCITY2021</div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="3" class="d-flex flex-column gap-4">
            <v-card flat class="arch-card mb-4 gs-reveal">
              <div class="card-header">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">区位分析 <span class="font-weight-light text-caption ml-2">Location Analysis</span></h3>
              </div>
              <v-img src="https://picsum.photos/id/11/400/300" height="200" cover class="mt-2 desaturated"></v-img>
              <div class="text-caption mt-2 text-grey">成都简阳 · 三岔湖景区 · 交通节点分析</div>
            </v-card>

            <v-card flat class="arch-card flex-grow-1 gs-reveal">
              <div class="card-header mb-4">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">体块生成 <span class="font-weight-light text-caption ml-2">Block Generation</span></h3>
              </div>
              
              <div v-for="(step, i) in blockSteps" :key="i" class="block-step mb-6 d-flex">
                <div class="step-visual mr-4">
                  <div class="step-cube"></div>
                </div>
                <div class="step-text">
                  <div class="text-subtitle-2 font-weight-bold text-brown-darken-1">{{ step.title }}</div>
                  <div class="text-caption text-grey-darken-1">{{ step.desc }}</div>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card flat class="arch-card fill-height gs-reveal">
              <div class="card-header mb-2">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">总平面图 1:500 <span class="font-weight-light text-caption ml-2">Master Plan</span></h3>
              </div>
              
              <div class="master-plan-container position-relative pa-4 border-thin">
                <v-img src="https://picsum.photos/id/235/800/1000" cover class="rounded-0 grayscale-high-contrast"></v-img>
                
                <div class="annotation position-absolute" style="top: 20%; left: 10%">
                  <v-chip size="x-small" variant="outlined" color="brown">主入口 Entrance</v-chip>
                </div>
                <div class="annotation position-absolute" style="top: 50%; right: 20%">
                  <v-chip size="x-small" variant="outlined" color="brown">亲水平台 Platform</v-chip>
                </div>

                <div class="tech-data position-absolute bottom-0 left-0 pa-4 bg-white-opacity">
                  <div class="text-caption font-weight-bold">经济技术指标:</div>
                  <div class="text-caption">用地面积: 4805 m²</div>
                  <div class="text-caption">建筑面积: 3351 m²</div>
                  <div class="text-caption">绿地率: 35%</div>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="3" class="d-flex flex-column gap-4">
            <v-card flat class="arch-card mb-4 gs-reveal">
              <div class="card-header">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">人群分析 <span class="font-weight-light text-caption ml-2">Crowd Analysis</span></h3>
              </div>
              <v-row dense class="mt-2">
                <v-col cols="6" v-for="n in 2" :key="n">
                  <v-avatar size="80" class="mb-2 bg-grey-lighten-3">
                    <v-icon icon="mdi-account-group" color="grey"></v-icon>
                  </v-avatar>
                  <div class="text-caption text-center">游客/Tourists</div>
                </v-col>
              </v-row>
            </v-card>

            <v-card flat class="arch-card mb-4 gs-reveal">
              <div class="card-header">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">概念思考 <span class="font-weight-light text-caption ml-2">Conceptual Thinking</span></h3>
              </div>
              <div class="concept-diagram mt-4 d-flex flex-wrap gap-2 justify-center">
                 <v-chip size="small" color="brown-lighten-2" variant="flat">直觉感受 Intuitive</v-chip>
                 <v-chip size="small" color="grey-lighten-1" variant="flat">景观先行 Landscape</v-chip>
                 <v-chip size="small" color="blue-grey-lighten-3" variant="flat">场景体验 Scene</v-chip>
              </div>
              <div class="mt-4 text-caption text-justify">
                打破传统界限，以模糊为导向。The boundary is blurred...
              </div>
            </v-card>

            <v-card flat class="arch-card flex-grow-1 gs-reveal">
              <div class="card-header">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">设计策略 <span class="font-weight-light text-caption ml-2">Design Strategy</span></h3>
              </div>
              <v-list density="compact" class="bg-transparent">
                <v-list-item prepend-icon="mdi-tree-outline" title="乡村与自然的融合"></v-list-item>
                <v-list-item prepend-icon="mdi-floor-plan" title="多样的空间体验"></v-list-item>
                <v-list-item prepend-icon="mdi-eye-outline" title="视线通廊设计"></v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mt-4 gs-reveal">
          <v-col cols="12">
            <v-card flat class="arch-card">
              <div class="card-header mb-2">
                <span class="box-mark"></span>
                <h3 class="text-h6 font-weight-bold">1-1 剖面图 1:200 <span class="font-weight-light text-caption ml-2">Section 1-1</span></h3>
              </div>
              <v-img src="https://picsum.photos/id/16/1600/300" height="150" cover class="grayscale-filter"></v-img>
              <div style="height: 10px; background: #3E3C38; width: 100%; margin-top: -5px; position: relative; z-index: 1;"></div>
            </v-card>
          </v-col>
        </v-row>

      </v-container>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default defineComponent({
  name: 'DiffuseSpacePoster',
  setup() {
    const blockSteps = [
      { title: '基地等高线处理', desc: 'Reshaping topography' },
      { title: '置入体块', desc: 'Insert blocks based on grid' },
      { title: '形态切削分析', desc: 'Shape cutting analysis' },
      { title: '进一步分割推敲', desc: 'Further segmentation' },
      { title: '屋顶构造', desc: 'Roof construction details' },
    ];

    onMounted(() => {
      // 1. Hero Title 动画：文字上浮
      gsap.from('.hero-section .main-title', {
        y: 50,
        opacity: 0,
        duration: 1.5,
        ease: 'power3.out',
      });
      
      gsap.from('.hero-section .subtitle', {
        y: 30,
        opacity: 0,
        duration: 1.5,
        delay: 0.3,
        ease: 'power3.out',
      });

      // 2. 核心内容的卡片依次显现 (Staggered Reveal)
      const elements = document.querySelectorAll('.gs-reveal');
      elements.forEach((el, index) => {
        gsap.fromTo(el, 
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%', // 当元素顶部到达视口85%处触发
              toggleActions: 'play none none reverse'
            },
            delay: index * 0.1 // 简单的错落感
          }
        );
      });
    });

    return {
      blockSteps
    };
  }
});
</script>

<style scoped>
/* ARCHITECTURE COLOR PALETTE 
  模拟建筑图纸的低饱和度、高级灰色系
*/
:root {
  --arch-bg: #F4F1EA; /* 米白纸张色 */
  --arch-dark: #3E3C38; /* 炭黑/深褐 */
  --arch-grey: #8C8C88; /* 水泥灰 */
  --arch-brown: #8D7B68; /* 枯木/泥土 */
  --arch-accent: #A8A196;
}

/* 覆盖 Vuetify 默认背景，制造纸张质感 */
.bg-paper {
  background-color: var(--arch-bg) !important;
  /* 添加一点点噪点纹理会更像纸 */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
}

.architectural-theme {
  font-family: "Helvetica Neue", "Arial", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--arch-dark);
}

/* 标题字体 */
.main-title {
  font-family: "Didot", "Playfair Display", serif !important; /* 衬线体 */
  letter-spacing: 0.2em !important;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.english-title {
  font-family: "Helvetica Neue", sans-serif;
  font-size: 0.6em;
  opacity: 0.8;
  letter-spacing: 0.05em;
}

.subtitle {
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.3em !important;
  border-top: 1px solid rgba(255,255,255,0.5);
  display: inline-block;
  padding-top: 8px;
}

/* 卡片风格 */
.arch-card {
  background-color: transparent !important; /* 透明背景，依靠内容 */
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

/* 鼠标悬停时，稍微增加一点点建筑图纸的线框感 */
.arch-card:hover {
  border-color: rgba(0,0,0,0.1);
}

/* 标题前的色块标记 (那个方形小块) */
.box-mark {
  display: inline-block;
  width: 12px;
  height: 12px;
  background-color: var(--arch-dark);
  margin-right: 8px;
}

/* 图片处理滤镜 */
.grayscale-filter {
  filter: grayscale(80%) contrast(90%); /* 低饱和 */
}

.grayscale-high-contrast {
  filter: grayscale(100%) contrast(110%) brightness(1.05); /* 线稿风格 */
}

.desaturated {
  filter: saturate(0.4) sepia(0.2);
}

.bg-white-opacity {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(0,0,0,0.1);
}

/* 条形码装饰 */
.barcode-decoration {
  font-family: 'Courier New', monospace;
  letter-spacing: -2px;
  font-weight: 900;
  font-size: 24px;
  opacity: 0.6;
  transform: scaleY(1.5);
}

/* 步骤图的小方块 */
.step-cube {
  width: 40px;
  height: 40px;
  background: #e0e0e0;
  border: 1px solid #999;
  transform: skewX(-10deg); /* 简单的伪透视 */
  box-shadow: 2px 2px 0px #bbb;
}
</style>