export function success(data = null, meta = {}) {
  return Object.freeze({ ok: true, data, error: null, meta: Object.freeze({ ...meta }) });
}

export function failure(code, message, details = null, meta = {}) {
  return Object.freeze({
    ok: false,
    data: null,
    error: Object.freeze({ code, message, details }),
    meta: Object.freeze({ ...meta })
  });
}
