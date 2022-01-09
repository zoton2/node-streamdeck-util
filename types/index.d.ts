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
      [k: string]: unknown;
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
