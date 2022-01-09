import { EventEmitter } from 'stream';

export interface StreamDeck extends EventEmitter {
  on(event: 'open', listener: () => void): this;
  on(event: 'init', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: (code: number, reason: string) => void): this;

  on(event: 'message', listener: (data: object) => void): this;
  // Currently a blanket definition for all events, can be expanded in the future.
  on(event: 'didReceiveSettings', listener: (data: object) => void): this;
  on(event: 'didReceiveGlobalSettings', listener: (data: object) => void): this;
  on(event: 'keyDown', listener: (data: KeyUpDown) => void): this;
  on(event: 'keyUp', listener: (data: KeyUpDown) => void): this;
  on(event: 'willAppear', listener: (data: object) => void): this;
  on(event: 'willDisappear', listener: (data: object) => void): this;
  on(event: 'titleParametersDidChange', listener: (data: object) => void): this;
  on(event: 'deviceDidConnect', listener: (data: object) => void): this;
  on(event: 'applicationDidLaunch', listener: (data: object) => void): this;
  on(event: 'applicationDidTerminate', listener: (data: object) => void): this;
  on(event: 'propertyInspectorDidAppear', listener: (data: object) => void): this;
  on(event: 'propertyInspectorDidDisappear', listener: (data: object) => void): this;
  on(event: 'sendToPlugin', listener: (data: object) => void): this;
  on(event: 'systemDidWakeUp', listener: (data: object) => void): this;

  on(event: string, listener: () => void): this;
}

export interface TitleParameters {
  fontFamily: string;
  fontSize: number;
  fontStyle: string;
  fontUnderline: boolean;
  showTitle: boolean;
  titleAlignment: string;
  titleColor: string;
}

export interface ButtonObject {
  context: string;
  action: string;
  title: string;
  isInMultiAction: boolean;
  state: number;
  titleParameters: TitleParameters;
}

export interface ButtonLocations {
  [device: string]: {
    [row: string]: {
      [column: string]: ButtonObject | null;
    };
  };
}

export interface KeyUpDown {
  action: string;
  event: string;
  context: string;
  device: string;
  payload: {
    settings: {
      [k: string]: any;
    };
    coordinates: {
      column: number;
      row: number;
    };
    state: number;
    userDesiredState: number;
    isInMultiAction: boolean;
  };
}
