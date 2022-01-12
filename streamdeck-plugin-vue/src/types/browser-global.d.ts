// eslint-disable-next-line import/prefer-default-export
export declare global {
  interface Window {
    // Basic types to stop compiler from complaining, needs improvement.
    globalSettings?: { [k: string]: unknown }
    connectElgatoStreamDeckSocket?: unknown;
    gotCallbackFromWindow?: unknown;
  }
}
