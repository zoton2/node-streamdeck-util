<template>
  <div class="sdpi-wrapper">
    <div class="sdpi-item">
      <div class="sdpi-item-label">Node.js Server URL</div>
      <input v-model="url" class="sdpi-item-value">
    </div>
    <div class="sdpi-item">
      <div class="sdpi-item-label">Key</div>
      <input v-model="key" class="sdpi-item-value">
    </div>
    <div class="sdpi-item">
      <button class="sdpi-item-value" @click="save" :style="{ margin: 0 }">
        Save
      </button>
    </div>
    <details class="message">
      <summary>
        Node.js Server Status:
        <span v-if="globalSettings.connected" :style="{ color: 'lightgreen' }">CONNECTED</span>
        <span v-else :style="{ color: 'red' }">DISCONNECTED</span>
      </summary>
    </details>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';

@Component
export default class extends Vue {
  globalSettings: { connected?: boolean, url?: string, key?: string } = {};
  url = '';
  key = '';

  mounted(): void {
    this.globalSettings = window.opener.globalSettings || {};
    this.url = this.globalSettings.url || '';
    this.key = this.globalSettings.key || '';
  }

  save(): void {
    // If we need to update the stored values, do that now.
    if (this.url !== this.globalSettings.url || this.key !== this.globalSettings.key) {
      window.opener.gotCallbackFromWindow({
        url: this.url,
        key: this.key,
      });
    }

    window.close();
  }
}
</script>

<style>
  body {
    height: auto;
    padding: 30px;
  }

  .sdpi-wrapper {
    height: auto;
  }

  .sdpi-item-label {
    width: 120px;
  }

  .sdpi-item-value {
    margin-right: 0;
    min-width: unset !important;
  }

  .message summary {
    text-align: center;
  }
</style>
