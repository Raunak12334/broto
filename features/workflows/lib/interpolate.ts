/**
 * Safely resolves a nested property path on an object.
 * Supports dot notation ("a.b.c"), bracket notation with array indices ("items[0].name"),
 * and quoted property names ("items['name']").
 */
export function getByPath(target: unknown, path: string): unknown {
  if (target == null || typeof target !== "object") return undefined

  if (Object.prototype.hasOwnProperty.call(target, path)) {
    return (target as Record<string, unknown>)[path]
  }

  // Normalize bracket notation to dot notation:
  // e.g. a[0] -> a.0, a['b'] -> a.b, a["b"] -> a.b
  const normalized = path.replace(/\[\s*['"]?([^'"\]\s]+)['"]?\s*\]/g, ".$1")
  const segments = normalized.split(".").filter((seg) => seg.length > 0)

  let current: unknown = target
  for (let i = 0; i < segments.length; i++) {
    if (current == null || typeof current !== "object") return undefined

    const segment = segments[i]
    if (Object.prototype.hasOwnProperty.call(current, segment)) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      // Check composite keys in case a node identifier or key contains dots
      let found = false
      for (let j = segments.length; j > i; j--) {
        const compositeKey = segments.slice(i, j).join(".")
        if (Object.prototype.hasOwnProperty.call(current, compositeKey)) {
          current = (current as Record<string, unknown>)[compositeKey]
          i = j - 1
          found = true
          break
        }
      }
      if (!found) {
        current = (current as Record<string, unknown>)[segment]
      }
    }
  }

  return current
}

/**
 * Replaces placeholders in a workflow field's text with values from node outputs.
 *
 * Supports placeholders like `{{ someNodeId.title }}` or `{{ someNodeId.items[0].name }}`
 * (as well as `({ ... }}`).
 *
 * - If a placeholder resolves to nothing (null / undefined / missing), it is replaced with an empty string.
 * - If a placeholder resolves to an object or array, it drops in the JSON representation.
 * - If it resolves to a primitive, it drops in the string representation.
 */
export function interpolate(
  text: string,
  outputs: Record<string, unknown> = {}
): string {
  if (!text || typeof text !== "string") return ""

  const placeholderRegex = /(?:\{\{|\(\{)\s*([^}]*?)\s*\}\}/g

  return text.replace(placeholderRegex, (_match, rawPath) => {
    const trimmedPath = rawPath.trim()
    if (!trimmedPath) return ""

    const resolved = getByPath(outputs, trimmedPath)

    if (resolved === null || resolved === undefined) {
      return ""
    }

    if (typeof resolved === "object") {
      try {
        return JSON.stringify(resolved)
      } catch {
        return String(resolved)
      }
    }

    return String(resolved)
  })
}

