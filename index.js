module.exports = function (RED) {
  const pluginId = 'node-red-dashboard-2-oauth2-auth';

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
  }

  function normaliseHeaderKeys(allHeaders) {
    const lower = {};
    Object.keys(allHeaders || {}).forEach(k => {
      lower[k.toLowerCase()] = allHeaders[k];
    });
    return lower;
  }

  function decodeJwtNoVerify(token) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      return JSON.parse(payload);
    } catch (e) {
      return null;
    }
  }

  // Default configuration (can be overridden from settings.js)
  const defaults = {
    // Only these headers (case-insensitive) are exposed to flows
    allowedHeaders: [
      'x-auth-request-user',
      'x-auth-request-email',
      'x-auth-request-preferred-username',
      'x-forwarded-user',
      'x-forwarded-email',
      'x-forwarded-preferred-username',
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto',
      'x-forwarded-host',
      'user-agent',
      'accept-language',
      'dnt',
      'sec-ch-ua',
      'sec-ch-ua-platform',
      'sec-ch-ua-mobile'
    ],
    // If present, decode (without verification) to expose safe, non-sensitive claims
    accessTokenHeader: 'x-forwarded-access-token',
    // Claims to expose from JWT (ignored if token missing). Keep minimal for privacy.
    allowedJwtClaims: [
      'sub', 'name', 'email', 'preferred_username', 'oid', 'tid', 'aud', 'iss', 'exp', 'iat'
    ],
    // Redact values of these headers completely when attaching to msg._client
    redactedHeaders: [
      'cookie', 'authorization', 'x-forwarded-access-token'
    ],
    // Attach under this path in msg._client
    clientPath: ['proxy'],
    // Whether to also mirror into msg.headers.* (false by default to avoid bloat)
    mirrorToMsgHeaders: false,
    // Require at least one of these headers to allow a connection (when requireAuth is true)
    requiredAuthHeaders: [
      'x-auth-request-user',
      'x-auth-request-email',
      'x-auth-request-preferred-username',
      'x-forwarded-user',
      'x-forwarded-email',
      'x-forwarded-preferred-username'
    ],
    requireAuth: true
  };

  // Helper to read config from settings.js
  function readSettings() {
    const userCfg = RED?.settings?.plugins?.[pluginId] || {};
    const allowedHeaders = userCfg.allowedHeaders
      ? toArray(userCfg.allowedHeaders)
      : defaults.allowedHeaders;
    const redactedHeaders = userCfg.redactedHeaders
      ? toArray(userCfg.redactedHeaders)
      : defaults.redactedHeaders;
    const allowedJwtClaims = userCfg.allowedJwtClaims
      ? toArray(userCfg.allowedJwtClaims)
      : defaults.allowedJwtClaims;
    const clientPath = userCfg.clientPath != null
      ? toArray(userCfg.clientPath)
      : defaults.clientPath;
    const requiredAuthHeaders = userCfg.requiredAuthHeaders
      ? toArray(userCfg.requiredAuthHeaders)
      : defaults.requiredAuthHeaders;
    return {
      ...defaults,
      ...userCfg,
      allowedHeaders: allowedHeaders.map(h => String(h).toLowerCase()),
      redactedHeaders: redactedHeaders.map(h => String(h).toLowerCase()),
      allowedJwtClaims,
      clientPath: clientPath.map(part => String(part)),
      requiredAuthHeaders: requiredAuthHeaders.map(h => String(h).toLowerCase()),
      requireAuth: userCfg.requireAuth != null ? Boolean(userCfg.requireAuth) : defaults.requireAuth
    };
  }

  function pickHeaders(allHeaders, cfg) {
    const out = {};
    // Normalise keys to lowercase
    const lower = normaliseHeaderKeys(allHeaders);

    cfg.allowedHeaders.forEach(h => {
      if (lower[h] != null) {
        // Redact if needed
        const isRedacted = cfg.redactedHeaders.includes(h);
        out[h] = isRedacted ? '__REDACTED__' : lower[h];
      }
    });

    // JWT decode (no verify) if configured
    const tokenHeader = (cfg.accessTokenHeader || '').toLowerCase();
    if (tokenHeader && lower[tokenHeader]) {
      const claims = decodeJwtNoVerify(lower[tokenHeader]);
      if (claims) {
        out.jwt = {};
        cfg.allowedJwtClaims.forEach(c => {
          if (claims[c] !== undefined) out.jwt[c] = claims[c];
        });
      }
    }
    return out;
  }

  function attachDeep(obj, pathArr, value) {
    let ref = obj;
    for (let i = 0; i < pathArr.length - 1; i++) {
      ref[pathArr[i]] = ref[pathArr[i]] || {};
      ref = ref[pathArr[i]];
    }
    ref[pathArr[pathArr.length - 1]] = value;
  }

  RED.plugins.registerPlugin(pluginId, {
    type: 'node-red-dashboard-2',
    hooks: {

      


      // Attach proxy info to msg._client right before messages leave Dashboard to flows
      onAddConnectionCredentials: (conn, msg) => {
        msg = msg || {};
        try {
          const cfg = readSettings();
          const headers = pickHeaders(conn?.request?.headers || {}, cfg);

          msg._client = msg._client || {};
          attachDeep(msg._client, cfg.clientPath, headers);

          if (cfg.mirrorToMsgHeaders) {
            msg.headers = Object.assign({}, msg.headers, headers);
          }
        } catch (e) {
          // Never throw; just annotate error and continue
          msg._client = msg._client || {};
          msg._client[pluginId] = { error: String(e && e.message || e) };
        }
        return msg;
      },

      // Also ensure actions/changes/loads contain proxy data (useful for initial widget-load events)
      onAction: (conn, id, msg) => {
        msg = msg || {};
        try {
          const cfg = readSettings();
          const headers = pickHeaders(conn?.request?.headers || {}, cfg);
          msg._client = msg._client || {};
          attachDeep(msg._client, cfg.clientPath, headers);
          if (cfg.mirrorToMsgHeaders) {
            msg.headers = Object.assign({}, msg.headers, headers);
          }
        } catch (e) {
          msg._client = msg._client || {};
          msg._client[pluginId] = { error: String((e && e.message) || e) };
        }
        return msg;
      },
      onChange: (conn, id, msg) => {
        msg = msg || {};
        try {
          const cfg = readSettings();
          const headers = pickHeaders(conn?.request?.headers || {}, cfg);
          msg._client = msg._client || {};
          attachDeep(msg._client, cfg.clientPath, headers);
          if (cfg.mirrorToMsgHeaders) {
            msg.headers = Object.assign({}, msg.headers, headers);
          }
        } catch (e) {
          msg._client = msg._client || {};
          msg._client[pluginId] = { error: String((e && e.message) || e) };
        }
        return msg;
      },
      onLoad: (conn, id, msg) => {
        msg = msg || {};
        try {
          const cfg = readSettings();
          const headers = pickHeaders(conn?.request?.headers || {}, cfg);
          msg._client = msg._client || {};
          attachDeep(msg._client, cfg.clientPath, headers);
          if (cfg.mirrorToMsgHeaders) {
            msg.headers = Object.assign({}, msg.headers, headers);
          }
        } catch (e) {
          msg._client = msg._client || {};
          msg._client[pluginId] = { error: String((e && e.message) || e) };
        }
        return msg;
      },
      onIsValidConnection: (conn) => {
        try {
          const cfg = readSettings();
          if (!cfg.requireAuth) {
            return true;
          }
          const lower = normaliseHeaderKeys(conn?.request?.headers || {});
          return cfg.requiredAuthHeaders.some(h => {
            const value = lower[h];
            if (value === undefined || value === null) return false;
            if (Array.isArray(value)) {
              return value.some(v => String(v ?? '').trim() !== '');
            }
            return String(value ?? '').trim() !== '';
          });
        } catch (e) {
          // Fail open if configuration parsing fails
          return true;
        }
      },

      // Optional: avoid storing per-client messages containing socket-bound targeting
      onCanSaveInStore: (msg) => {
        return !Boolean(msg?._client?.socketId);
      }
    }
  });
};