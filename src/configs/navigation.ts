
import menuLanding from "./menus/landing.menu";
import menuUI from "./menus/ui.menu";
import menuPages from "./menus/pages.menu";

export default {
  menu: [
    {
      text: "",
      items: [
        {

          text: "仪表盘",
          link: "/dashboard",
          icon: "mdi-view-dashboard-outline",
        },
        {

          text: "T1生态环境长期演化",
          link: "/ecology",
          icon: "mdi-earth",
        },
        {

          text: "T2事件演化",
          link: "/events",
          icon: "mdi-history",
        },
        {

          text: "T3城市演化",
          link: "/urban",
          icon: "mdi-city-variant",
        },
        {

          text: "T4制度经济",
          link: "/society",
          icon: "mdi-account-group",
        },

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
