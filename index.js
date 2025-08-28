module.exports = function (RED) {
  const pluginId = 'node-red-dashboard-2-oauth2-auth';

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
    mirrorToMsgHeaders: false
  };

  // Helper to read config from settings.js
  function readSettings() {
    const userCfg = RED?.settings?.plugins?.[pluginId] || {};
    return {
      ...defaults,
      ...userCfg,
      allowedHeaders: (userCfg.allowedHeaders || defaults.allowedHeaders).map(h => String(h).toLowerCase()),
      redactedHeaders: (userCfg.redactedHeaders || defaults.redactedHeaders).map(h => String(h).toLowerCase()),
      allowedJwtClaims: (userCfg.allowedJwtClaims || defaults.allowedJwtClaims)
    };
  }

  function pickHeaders(allHeaders, cfg) {
    const out = {};
    // Normalise keys to lowercase
    const lower = {};
    Object.keys(allHeaders || {}).forEach(k => {
      lower[k.toLowerCase()] = allHeaders[k];
    });

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

      // Optional: avoid storing per-client messages containing socket-bound targeting
      onCanSaveInStore: (msg) => {
        return !Boolean(msg?._client?.socketId);
      }
    }
  });
};