import React from "react";
import { createRoot } from "react-dom/client";
import App from "./KingsAndPeasants.jsx";

// Persistent storage shim: the game calls window.storage (an artifact API).
// On the web we back it with localStorage so profiles and lobbies still work.
if (!window.storage) {
  const K = (k, shared) => (shared ? "kp-shared:" : "kp-local:") + k;
  window.storage = {
    async get(key, shared = false) {
      const v = localStorage.getItem(K(key, shared));
      if (v === null) throw new Error("not found");
      return { key, value: v, shared };
    },
    async set(key, value, shared = false) {
      localStorage.setItem(K(key, shared), value);
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      localStorage.removeItem(K(key, shared));
      return { key, deleted: true, shared };
    },
    async list(prefix = "", shared = false) {
      const p = K(prefix, shared);
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(p)) keys.push(k.slice(K("", shared).length));
      }
      return { keys, prefix, shared };
    },
  };
}

createRoot(document.getElementById("root")).render(React.createElement(App));
