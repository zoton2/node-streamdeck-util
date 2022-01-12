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
import PropertyInspector from './pi';

@Component
export default class extends Vue {
  pi!: PropertyInspector;

  beforeCreate(): void {
    this.pi = new PropertyInspector();
    window.connectElgatoStreamDeckSocket = (
      inPort: string,
      inPropertyInspectorUUID: string,
      inRegisterEvent: string,
      inInfo: string,
      inActionInfo: string,
    ) => {
      this.pi.connectElgatoStreamDeckSocket(
        inPort,
        inPropertyInspectorUUID,
        inRegisterEvent,
        inInfo,
        inActionInfo,
      );
    };
    window.gotCallbackFromWindow = (data: { url: string, key: string }) => {
      this.pi.gotCallbackFromWindow(data);
    };
  }

  openSettings(): void {
    this.pi.openSettings();
  }
}
</script>
