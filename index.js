// index.js
// FlowFuse Dashboard 2 plugin that trusts oauth2-proxy headers and
// appends user data to msg._client.
//
// NOTE: Node lowercases header names, so we should access them in lowercase.
let plugin_name = "node-red-dashboard-2-oauth2-auth";
module.exports = function (RED) {
    RED.plugins.registerPlugin(plugin_name, {
      // Must be exactly this for Dashboard 2 to load the plugin
      type: 'node-red-dashboard-2',
  
      hooks: {
        /**
         * Called when Dashboard is instantiated. Must return socketio.path if used.
         * @param {object} REDRuntime - Node-RED runtime (not used here)
         * @param {object} config - ui-base node config
         * @param {object} req - Express request
         * @param {object} res - Express response
         * @returns {object}
         */
        onSetup: (config, req, res) => {
          // Per docs, Dashboard expects "socketio.path" and the path name is "socketio"
          // (not "socket.io"). Use the ui-base path prefix provided in config.
          return {
            socketio: {
              path: `${config.path}/socketio`
            }
          };
        },
  
        /**
         * Inject connection credentials into outgoing messages before they enter flows.
         * @param {object} conn - Socket.IO connection (has request)
         * @param {object} msg - Node-RED msg
         * @returns {object} msg
         */
        onAddConnectionCredentials: (conn, msg) => {
          try {
            const h = (conn?.request?.headers) || {};
            // All lower-case because Node makes headers lower-case:
            const userId = h['x-forwarded-user'] || h['x-auth-request-user'] || null;
            const email = h['x-forwarded-email'] || h['x-auth-request-email'] || null;
            const preferred = h['x-forwarded-preferred-username'] || h['x-auth-request-preferred-username'] || null;
            const accessToken = h['x-forwarded-access-token'] || null;
  
            // Ensure msg._client exists
            msg._client = msg._client || {};
            msg._client.user = {
              userId,
              email,
              username: preferred || userId || (email ? email.split('@')[0] : null),
              accessTokenPresent: Boolean(accessToken)
            };
  
            // Optionally include the socket id/ip for auditing
            msg._client.socketId = conn?.id;
            msg._client.socketIp = conn?.request?.socket?.remoteAddress;
  
            return msg;
          } catch (e) {
            // In case anything unexpected happens, don't break message flow.
            return msg;
          }
        },
  
        /**
         * Gate whether the current connection is allowed to send this message.
         * If you want to require that _some_ identity exists, enforce it here.
         * @param {object} conn
         * @param {object} msg
         * @returns {boolean}
         */
        onIsValidConnection: (conn, msg) => {
          // If your policy requires an authenticated user, enforce here:
          const user = msg?._client?.user;
          if (!user || (!user.userId && !user.email && !user.username)) {
            // No identity -> reject the message
            return false;
          }
          // If msg specifies a specific socketId, enforce it matches:
          if (msg?._client?.socketId && msg._client.socketId !== conn?.id) {
            return false;
          }
          return true;
        },
  
        /**
         * Avoid saving user-targeted messages (e.g. scoped to a socket) in the shared store.
         * @param {object} msg
         * @returns {boolean}
         */
        onCanSaveInStore: (msg) => {
          if (msg?._client?.socketId) {
            // Scoped to a socket — don't store
            return false;
          }
          return true;
        },
  
        /**
         * Optionally enrich onInput/onAction/onChange/onLoad. Return msg or null to drop.
         */
        onInput: (msg) => msg,
        onAction: (conn, id, msg) => msg,
        onChange: (conn, id, msg) => msg,
        onLoad: (conn, id, msg) => msg
      }
    });
  };
  