<template>
  <div></div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import Backend from './backend';

@Component
export default class extends Vue {
  backend!: Backend;

  beforeCreate(): void {
    this.backend = new Backend();
    window.connectElgatoStreamDeckSocket = (
      inPort: string,
      inPluginUUID: string,
      inRegisterEvent: string,
      inInfo: string,
    ) => {
      this.backend.connectElgatoStreamDeckSocket(
        inPort,
        inPluginUUID,
        inRegisterEvent,
        inInfo,
      );
    };
  }
}
</script>
