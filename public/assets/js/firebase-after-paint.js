/* Give the first render priority over the SDK used by public content and pricing. */
(function () {
  'use strict';

  const sdk = 'https://www.gstatic.com/firebasejs/9.22.0/';
  let appReady;
  let firestoreReady;
  let authReady;

  function load(component) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = sdk + 'firebase-' + component + '-compat.js';
      script.onload = resolve;
      script.onerror = () => {
        script.remove();
        reject(new Error('Could not load Firebase ' + component));
      };
      document.head.appendChild(script);
    });
  }

  function app() {
    return appReady ||= load('app').then(() => {
      window.firebase.initializeApp(window.GFS_FIREBASE_CONFIG);
    }).catch(error => {
      appReady = null;
      throw error;
    });
  }

  function start() {
    return firestoreReady ||= app().then(() => load('firestore')).then(() => {
      const firebase = window.firebase;
      window.GFS_DB = firebase.firestore();
      try {
        window.GFS_ANALYTICS = window.GFSTrackingPolicy?.initialize(firebase) || null;
      } catch (_) {}
      window.dispatchEvent(new Event('gfs-firebase-ready'));
    }).catch(error => {
      firestoreReady = null;
      throw error;
    });
  }

  window.GFS_LOAD_AUTH = function () {
    // Owners need the database as soon as the sign-in controls become available.
    return authReady ||= Promise.all([app().then(() => load('auth')), startQuietly()]).then(() => {
      const auth = window.firebase.auth;
      return auth().setPersistence(auth.Auth.Persistence.LOCAL).catch(() => {});
    }).catch(error => {
      authReady = null;
      throw error;
    });
  };

  function startQuietly() {
    return start().catch(error => console.warn('[GFS]', error.message));
  }

  function afterLoad() {
    if (window.requestIdleCallback) window.requestIdleCallback(startQuietly, { timeout: 1000 });
    else window.setTimeout(startQuietly, 0);
  }

  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });

  // Start pricing early if someone uses the planner before the page finishes loading.
  if (document.body.classList.contains('bp-page')) {
    const planner = document.querySelector('.ballpark-layout');
    for (const type of ['pointerdown', 'focusin']) {
      planner?.addEventListener(type, startQuietly, { once: true, passive: true });
    }
  }
})();
