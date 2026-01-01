
```
ChinaVis2025-Beijing
├─ .browserslistrc
├─ .dockerignore
├─ .editorconfig
├─ auto-imports.d.ts
├─ index.html
├─ LICENSE
├─ package-lock.json
├─ package.json
├─ public
│  ├─ data
│  │  ├─ disaster_events(3).json
│  │  ├─ disaster_events.json
│  │  ├─ events_step2_processed.csv
│  │  ├─ events_step3_modern_locations.csv
│  │  ├─ maps
│  │  │  ├─ beijing_full.json
│  │  │  ├─ china.json
│  │  │  ├─ china_cities.json
│  │  │  └─ china_full.json
│  │  ├─ merged_disaster_events.json
│  │  └─ rivers
│  ├─ favicon.ico
│  ├─ favicon.png
│  ├─ images
│  │  ├─ build.jpg
│  │  ├─ center.jpg
│  │  ├─ centerC.jpg
│  │  └─ texas.png
│  ├─ masks
│  │  ├─ Bei.png
│  │  ├─ BeijingMap.png
│  │  └─ Jing.png
│  └─ _redirects
├─ README.md
├─ README.zh-CN.md
├─ src
│  ├─ App.vue
│  ├─ assets
│  │  ├─ arknights
│  │  │  ├─ rhodes.png
│  │  │  └─ sui.png
│  │  ├─ claude-icon.svg
│  │  ├─ google-gemini.svg
│  │  ├─ images
│  │  │  ├─ 404.svg
│  │  │  ├─ 500.svg
│  │  │  ├─ avatars
│  │  │  │  ├─ avatar_assistant.jpg
│  │  │  │  └─ avatar_user.jpg
│  │  │  ├─ card2
│  │  │  │  ├─ yoimiya.png
│  │  │  │  └─ yoimiya_bg.jpg
│  │  │  ├─ center.jpg
│  │  │  ├─ chat-bg-2.png
│  │  │  ├─ svg1.svg
│  │  │  └─ texas.png
│  │  ├─ loading.svg
│  │  ├─ logo.back.png
│  │  ├─ logo.back.svg
│  │  ├─ logo.png
│  │  ├─ logo.svg
│  │  ├─ logo_dark.svg
│  │  ├─ logo_light.svg
│  │  ├─ previews
│  │  │  ├─ Card.png
│  │  │  ├─ ChatGPT.png
│  │  │  ├─ Color.png
│  │  │  ├─ DashBoard.png
│  │  │  ├─ DataTable.png
│  │  │  ├─ Gradient.png
│  │  │  ├─ Login.png
│  │  │  ├─ TaskBoard.png
│  │  │  ├─ Todo.png
│  │  │  ├─ Unsplash.png
│  │  │  └─ Unsplash2.png
│  │  ├─ wechat-qrcode.png
│  │  ├─ wechat.jpg
│  │  └─ x.svg
│  ├─ components
│  │  ├─ Breadcrumb.vue
│  │  ├─ chinavis
│  │  │  ├─ CityCloudCard.vue
│  │  │  ├─ CityEvolutionCard.vue
│  │  │  └─ rivers
│  │  │     ├─ AdministrativeEvolution
│  │  │     │  └─ AdminEvoSankeyCard.vue
│  │  │     └─ RiversCard.vue
│  │  ├─ common
│  │  │  ├─ BackToTop.vue
│  │  │  ├─ CopyBtn.vue
│  │  │  ├─ CopyLabel.vue
│  │  │  ├─ PercentTrend.vue
│  │  │  └─ Snackbar.vue
│  │  ├─ CustomizationMenu.vue
│  │  ├─ D3components
│  │  │  ├─ BubbleChart.vue
│  │  │  ├─ CircularChartEvent.vue
│  │  │  ├─ CircularDynastyChart.vue
│  │  │  ├─ GreatEvent.vue
│  │  │  ├─ MapLocation.vue
│  │  │  ├─ RadialAreaChart.vue
│  │  │  ├─ SequencesSunburst.vue
│  │  │  └─ SpikeMap.vue
│  │  ├─ dashboard
│  │  │  ├─ SalesCard.vue
│  │  │  └─ TicketsCard.vue
│  │  ├─ FeatureCard.vue
│  │  ├─ GlobalLoading.vue
│  │  ├─ ImagePreview.vue
│  │  ├─ LoadingView.vue
│  │  ├─ material
│  │  ├─ navigation
│  │  │  ├─ MainMenu.vue
│  │  │  └─ MainSidebar.vue
│  │  ├─ PageTitle.vue
│  │  ├─ RichEditorMenubar.vue
│  │  ├─ toolbar
│  │  │  ├─ LanguageSwitcher.vue
│  │  │  ├─ MainAppbar.vue
│  │  │  ├─ StatusMenu.vue
│  │  │  ├─ ToolbarNotifications.vue
│  │  │  └─ ToolbarUser.vue
│  │  └─ Toolbox.vue
│  ├─ configs
│  │  ├─ currencies.ts
│  │  ├─ index.ts
│  │  ├─ locales.ts
│  │  ├─ menus
│  │  │  ├─ landing.menu.ts
│  │  │  ├─ pages.menu.ts
│  │  │  └─ ui.menu.ts
│  │  └─ navigation.ts
│  ├─ data
│  │  ├─ logos.ts
│  │  ├─ members.ts
│  │  ├─ population_processed.json
│  │  ├─ rivers_merged.json
│  │  ├─ users.ts
│  │  └─ wordcloud_data.json
│  ├─ layouts
│  │  ├─ AuthLayout.vue
│  │  ├─ DefaultLayout.vue
│  │  ├─ LandingLayout.vue
│  │  └─ UILayout.vue
│  ├─ locales
│  │  ├─ en.ts
│  │  ├─ ja.ts
│  │  └─ zhHans.ts
│  ├─ main.ts
│  ├─ plugins
│  │  ├─ echarts.ts
│  │  ├─ i18n.ts
│  │  ├─ plantuml.ts
│  │  └─ vuetify.ts
│  ├─ router
│  │  ├─ auth.routes.ts
│  │  ├─ index.ts
│  │  └─ landing.routes.ts
│  ├─ stores
│  │  ├─ appStore.ts
│  │  ├─ authStore.ts
│  │  ├─ customizeTheme.ts
│  │  └─ snackbarStore.ts
│  ├─ styles
│  │  ├─ common
│  │  │  ├─ animation.scss
│  │  │  ├─ beautify.scss
│  │  │  └─ gradients.scss
│  │  ├─ main.scss
│  │  ├─ pages
│  │  │  └─ _editor.scss
│  │  ├─ variables.scss
│  │  ├─ vuetify
│  │  │  └─ _elevations.scss
│  │  └─ _override.scss
│  ├─ test
│  │  ├─ demo.test.ts
│  │  ├─ demo.ts
│  │  └─ Demo.vue
│  ├─ types
│  │  ├─ config.d.ts
│  │  └─ env.d.ts
│  ├─ utils
│  │  ├─ aiUtils.ts
│  │  ├─ clipboardUtils.ts
│  │  ├─ colorUtils.ts
│  │  ├─ common.ts
│  │  ├─ csvToJson.ts
│  │  ├─ deepMerge.ts
│  │  ├─ formatCurrency.ts
│  │  ├─ index.ts
│  │  └─ type-chanlleges.ts
│  └─ views
│     ├─ auth
│     │  ├─ ForgotPage.vue
│     │  ├─ ResetPage.vue
│     │  ├─ SigninPage.vue
│     │  ├─ SignupPage.vue
│     │  └─ VerifyEmailPage.vue
│     ├─ demo
│     │  └─ D3tryPage.vue
│     ├─ errors
│     │  ├─ NotFoundPage.vue
│     │  └─ UnexpectedPage.vue
│     ├─ landing
│     │  ├─ HomePage.vue
│     │  └─ toolbar
│     │     ├─ components
│     │     │  ├─ Toolbar1.vue
│     │     │  ├─ Toolbar2.vue
│     │     │  ├─ Toolbar3.vue
│     │     │  ├─ Toolbar4.vue
│     │     │  └─ Toolbar5.vue
│     │     └─ ToolbarPage.vue
│     ├─ pages
│     │  ├─ CardPage.vue
│     │  ├─ DashBoard.vue
│     │  └─ LandingPage.vue
│     └─ ui
│        └─ LottieAnimationPage.vue
├─ tsconfig.json
├─ vite.config.ts
└─ yarn.lock

```