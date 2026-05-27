export class ApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly code?: string,
    readonly type?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class TemplateMissingError extends Error {
  constructor(readonly variable: string) {
    super(`Missing template variable: ${variable}`);
    this.name = 'TemplateMissingError';
  }
}

export class TimeoutError extends Error {
  constructor(readonly ms: number) {
    super(`Request timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export class PollTimeoutError extends Error {
  constructor(readonly ms: number) {
    super(`Poll timed out after ${ms}ms`);
    this.name = 'PollTimeoutError';
  }
}
