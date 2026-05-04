export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.response?.data) {
    const data = error.response.data;
    if (data instanceof Blob) return error.message || fallback;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.detail) return data.detail;
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        if (Array.isArray(val)) return `${firstKey}: ${val[0]}`;
        if (typeof val === 'string') return `${firstKey}: ${val}`;
      }
    }
  }
  if (error.message) return error.message;
  return fallback;
}
