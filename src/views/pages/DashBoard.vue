<script setup lang="ts">
import SalesCard from "@/components/dashboard/SalesCard.vue";
import TicketsCard from "@/components/dashboard/TicketsCard.vue";
import RiversCard from "@/components/chinavis/rivers/RiversCard.vue";
import AdminEvoSankeyCard from "~/src/components/chinavis/rivers/AdministrativeEvolution/AdminEvoSankeyCard.vue";
import CityEvolutionCard from "~/src/components/chinavis/CityEvolutionCard.vue";
import CityCloudCard from "~/src/components/chinavis/CityCloudCard.vue";
</script>
<template>
  <div class="pa-5">
    <!-- ---------------------------------------------- -->
    <!---First Row -->
    <!-- ---------------------------------------------- -->
    <v-row class="flex-0" dense>
      <v-col cols="12" xl="4">
        <!-- Sales Card -->
        <v-card class="card-shadow" height="420">
          <!-- <sales-card></sales-card> -->
          <sales-card
            :value="1837.32"
            class="h-100"
            :percentage="3.2"
            style="min-height: 380px"
            percentage-label="上周"
            action-label="查看报告"
          ></sales-card>
        </v-card>
      </v-col>
      <v-col cols="6" xl="6">
        <v-card class="card-shadow" height="600"
          ><city-evolution-card></city-evolution-card>
        </v-card>
      </v-col>

      <v-col cols="6" xl="6">
        <v-card class="card-shadow"
          ><admin-evo-sankey-card></admin-evo-sankey-card>
        </v-card>
      </v-col>
      <v-col cols="12" xl="6">
        <v-card class="card-shadow"
          ><rivers-card></rivers-card>
        </v-card>
      </v-col>
    </v-row>

    <!-- ---------------------------------------------- -->
    <!---Second Row -->
    <!-- ---------------------------------------------- -->

    <!-- ---------------------------------------------- -->
    <!---Third Row -->
    <!-- ---------------------------------------------- -->
    <v-row class="card-shadow flex-grow-0" dense> 

      <v-col cols="6" xl="12">
        <city-cloud-card></city-cloud-card>
      </v-col>  
    </v-row>

  </div>
</template>
<style lang="scss" scoped></style>
