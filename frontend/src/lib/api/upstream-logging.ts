type UpstreamFailureDetails = {
  status?: number;
  errorType?: string;
};

/**
 * Log API fallbacks without response bodies, credentials, exception messages, or
 * query strings (which can contain user search terms or tokens).
 */
export function logUpstreamFailure(
  service: string,
  endpoint: string,
  details: UpstreamFailureDetails,
): void {
  const safeEndpoint = endpoint.split("?", 1)[0] || "/";
  const record = {
    service,
    endpoint: safeEndpoint,
    ...(details.status !== undefined ? { status: details.status } : {}),
    ...(details.errorType ? { error_type: details.errorType } : {}),
  };

  if (details.status !== undefined && details.status < 500) {
    console.warn("upstream_request_failed", record);
    return;
  }
  console.error("upstream_request_failed", record);
}

export function getSafeErrorType(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
