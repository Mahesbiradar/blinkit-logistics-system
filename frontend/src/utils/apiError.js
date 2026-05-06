/**
 * Extracts the real error message from any Axios error response.
 * Backend always returns one of these shapes:
 *   { status: "error", message: "...", errors: { field: ["msg"] } }
 *   { detail: "..." }  (DRF default)
 *   { non_field_errors: ["..."] }
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  const data = error?.response?.data;

  if (data) {
    // Shape 1: { message: "..." }
    if (typeof data.message === 'string' && data.message !== 'An error occurred') {
      return data.message;
    }

    // Shape 2: { errors: { field: ["msg"], non_field_errors: ["msg"] } }
    if (data.errors && typeof data.errors === 'object') {
      const entries = Object.entries(data.errors);
      if (entries.length > 0) {
        const [field, value] = entries[0];
        const msg = Array.isArray(value) ? value[0] : value;
        if (field === 'non_field_errors') return String(msg);
        return `${field}: ${msg}`;
      }
    }

    // Shape 3: { detail: "..." } — DRF default
    if (typeof data.detail === 'string') return data.detail;

    // Shape 4: flat validation { field: ["msg"] }
    if (typeof data === 'object' && !Array.isArray(data)) {
      const firstKey = Object.keys(data).find(k => k !== 'status');
      if (firstKey) {
        const val = data[firstKey];
        if (Array.isArray(val)) return `${firstKey}: ${val[0]}`;
        if (typeof val === 'string') return val;
      }
    }
  }

  // Network / timeout error
  if (error.message) return error.message;

  return fallback;
}
