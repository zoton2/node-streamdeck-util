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

/**
 * Documentation reference:
 * https://developer.elgato.com/documentation/stream-deck/sdk/events-received/
 */
export namespace EventReceive {
  interface KeyDown {
    action: string;
    event: 'keyDown';
    context: string;
    device: string;
    payload: {
      settings: { [k: string]: unknown };
      coordinates: {
        column: number;
        row: number;
      };
      state: number;
      userDesiredState: 0 | 1;
      isInMultiAction: boolean;
    };
  }
  interface KeyUp extends Omit<KeyDown, 'event'> {
    event: 'keyUp';
  }
}
