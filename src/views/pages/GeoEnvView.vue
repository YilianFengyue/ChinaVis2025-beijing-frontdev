<script setup lang="ts">
import RiversCard from "@/components/GeoEnvironment/RiversCard.vue";
import ClimateCard from "@/components/UrbanMorphology/ClimateCard.vue";
import EcolndexCard from "@/components/UrbanMorphology/EcoIndexCard.vue"
</script>

<template>
  <div class="pa-5">
    <!-- ---------------------------------------------- -->
    <!---First Row 河流甘特图 -->
    <!-- ---------------------------------------------- -->
    <v-row class="flex-0" dense>
      <v-col cols="12" xl="4">
        <!-- Sales Card -->
        <v-card class="card-shadow" height="430">
          <rivers-card></rivers-card>
        </v-card>
      </v-col>
      <v-col cols="6" md="6" xl="4">
        <!-- Activity Card -->
        <v-card class="card-shadow" height="420">
          <climate-card></climate-card>
        </v-card>
      </v-col>
      <v-col cols="6" md="6" xl="4">
        <!-- Trafiic Card-->
        <v-card class="card-shadow h-full" height="420">
          <ecolndex-card></ecolndex-card>
        </v-card>
      </v-col>
    </v-row>
    <!-- ---------------------------------------------- -->
    <!---Second Row -->
    <!-- ---------------------------------------------- -->
    <v-row class="card-shadow flex-grow-0" dense>
      <v-col cols="12" xl="6">
        <!-- Table Card-->
        <v-card class="card-shadow" height="420">
          <table-card></table-card>
        </v-card>
      </v-col>
      <v-col cols="12" xl="6">
        <!-- Task Card-->
        <v-card class="card-shadow" height="420">
          <task-card></task-card>
        </v-card>
      </v-col>
    </v-row>
    <!-- ---------------------------------------------- -->
    <!---Third Row -->
    <!-- ---------------------------------------------- -->
    <v-row class="card-shadow flex-grow-0" dense>
      <v-col cols="12" xl="6">
        <!-- Target Card-->
        <v-card class="card-shadow" height="420"
          ><todo-card></todo-card
        ></v-card>
      </v-col>
      <v-col cols="12" xl="6">
        <v-card class="card-shadow" height="420"
          ><tickets-card></tickets-card>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
<style lang="scss" scoped></style>
