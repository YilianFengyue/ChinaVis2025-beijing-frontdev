
import menuLanding from "./menus/landing.menu";
import menuUI from "./menus/ui.menu";
import menuPages from "./menus/pages.menu";

export default {
  menu: [
    {
      text: "",
      items: [
        // {

        //   text: "仪表盘",
        //   link: "/dashboard",
        //   icon: "mdi-view-dashboard-outline",
        // },
        {

          text: "D3基本",
          link: "/D3",
          icon: "mdi-graph",
        },
        {

          text: "D3形状",
          link: "/d3-selection",
          icon: "mdi-graph",
        },
        {

          text: "D3比例尺",
          link: "/d3-scale",
          icon: "mdi-graph",
        },
        {

          text: "D3统计图",
          link: "/d3-charts",
          icon: "mdi-chart-bar",
        },
        {

          text: "D3力模拟",
          link: "/d3-force",
          icon: "mdi-atom-variant",
        },
        {

          text: "D3ArknightsLogo",
          link: "/d3-arknights",
          icon: "mdi-atom-variant",
        },
        {
          text: "层次结构图",
          link: "/d3-hierarchy",
          icon: "mdi-family-tree",
        },
        {
          text: "地图可视化",
          link: "/d3-geo",
          icon: "mdi-earth",
        },
        {
          text: "ChinaVis2024",
          link: "/LearnClusterVis",
          icon: "mdi-brain",
        },
        //  {
        //   text: "地图",
        //   link: "/mapbox",
        //   icon: "mdi-map",
        // },
      ],
    },

    // {
    //   text: "Landing",
    //   items: [
    //     ...menuLanding,

    //   ],
    // },
    // {
    //   text: "UI - Theme Preview",
    //   items: menuUI,
    // },
    // {
    //   text: "Pages",
    //   items: menuPages,
    // },

  ],
};
