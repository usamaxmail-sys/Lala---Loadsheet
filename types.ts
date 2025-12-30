export enum CourierType {
  LEOPARDS = 'LEOPARDS',
  POSTEX = 'POSTEX',
}

export interface ScannedShipment {
  id: string;
  trackingNumber: string;
  timestamp: number;
}

export interface ApiCredentials {
  leopardsApiKey: string;
  leopardsApiPassword: string;
  postExToken: string;
}

export interface LeopardsLoadsheetResponse {
  status: number;
  error?: string;
  load_sheet_id?: string;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning';
  message: string;
}
