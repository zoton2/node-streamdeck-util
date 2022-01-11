<template>
  <div class="sdpi-wrapper">
    <div class="sdpi-item">
      <div class="sdpi-item-label">Settings</div>
      <button class="sdpi-item-value" id="settingsButton" @click="openSettings">
        Open Settings Dialog
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component
export default class extends Vue {
  openSettings(): void {
    window.open('settings.html');
  }
}
</script>
