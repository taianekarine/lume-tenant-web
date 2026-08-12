export interface ApiUsageSummary {
  readonly period: { readonly from: string; readonly to: string };
  readonly totals: {
    readonly requests: number;
    readonly requestBytes: number;
    readonly responseBytes: number;
    readonly averageDurationMs: number;
    readonly errors: number;
    readonly activeUsers: number;
  };
  readonly daily: readonly {
    readonly day: string;
    readonly requests: number;
    readonly bytes: number;
  }[];
  readonly users: readonly {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;
    readonly requests: number;
    readonly bytes: number;
    readonly averageDurationMs: number;
  }[];
  readonly actions: readonly {
    readonly action: string;
    readonly requests: number;
    readonly bytes: number;
    readonly averageDurationMs: number;
  }[];
}

export interface ApiUsageRequestList {
  readonly data: readonly {
    readonly id: string;
    readonly action: string;
    readonly result: string;
    readonly statusCode: number;
    readonly requestBytes: number;
    readonly responseBytes: number;
    readonly durationMs: number;
    readonly createdAt: string;
    readonly user: {
      readonly id: string;
      readonly name: string;
      readonly email: string | null;
    };
  }[];
  readonly meta: {
    readonly page: number;
    readonly pageSize: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

export type ApiUsageResultFilter = 'success' | 'client-error' | 'server-error';
