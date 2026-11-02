type MessageContainer = Record<string, unknown> | unknown[];

const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_ARRAY_INDEX = 1_000;

function isMessageContainer(value: unknown): value is MessageContainer {
  return value !== null && typeof value === "object";
}

function isNumericSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

function isArrayIndex(segment: string): boolean {
  return /^(0|[1-9]\d*)$/.test(segment) && Number(segment) <= MAX_ARRAY_INDEX;
}

function getChild(container: MessageContainer, segment: string): unknown {
  if (Array.isArray(container)) {
    return isArrayIndex(segment) ? container[Number(segment)] : undefined;
  }
  return container[segment];
}

function setChild(container: MessageContainer, segment: string, value: unknown): boolean {
  if (Array.isArray(container)) {
    if (!isArrayIndex(segment)) return false;
    container[Number(segment)] = value;
    return true;
  }
  container[segment] = value;
  return true;
}

function setMessagePath(root: Record<string, unknown>, path: string, value: string): boolean {
  const segments = path.split(".");
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        FORBIDDEN_PATH_SEGMENTS.has(segment) ||
        (isNumericSegment(segment) && !isArrayIndex(segment)),
    )
  ) {
    return false;
  }

  let cursor: MessageContainer = root;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment) return false;
    if (isNumericSegment(segment) && !isArrayIndex(segment)) return false;
    if (Array.isArray(cursor) && !isArrayIndex(segment)) return false;

    if (index === segments.length - 1) {
      return setChild(cursor, segment, value);
    }

    const nextSegment = segments[index + 1];
    if (!nextSegment) return false;
    const existing = getChild(cursor, segment);
    const child: MessageContainer = isMessageContainer(existing)
      ? existing
      : isArrayIndex(nextSegment)
        ? []
        : {};
    if (!setChild(cursor, segment, child)) return false;
    cursor = child;
  }

  return false;
}

/**
 * Overlay database-managed localized strings on the checked-in next-intl
 * message tree. The JSON shape remains the contract consumed by components
 * using both `t()` and `t.raw()`; unknown, unsafe or malformed paths are
 * ignored and the bundled default remains intact.
 */
export function mergeDatabaseMessages(
  baseMessages: Record<string, unknown>,
  databaseMessages: Record<string, string>,
): Record<string, unknown> {
  const merged = structuredClone(baseMessages);
  for (const [path, value] of Object.entries(databaseMessages)) {
    if (typeof value === "string") setMessagePath(merged, path, value);
  }
  return merged;
}
