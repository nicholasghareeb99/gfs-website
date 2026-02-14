/**
 * Firestore data layer for GFS Website
 * SSR: fetches content from Firestore at build/request time
 * Falls back to static JSON if Firestore is unavailable
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import siteJson from '../content/site.json';

// Initialize Firebase (singleton)
let db = null;

function getDb() {
  if (db) return db;
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
      authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.projectId) {
      console.warn('[Firestore] No project ID — using JSON fallback');
      return null;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getFirestore(app);
    return db;
  } catch (e) {
    console.warn('[Firestore] Init failed:', e.message);
    return null;
  }
}

/**
 * Get site settings — merges Firestore overrides with static JSON
 */
export async function getSiteSettings() {
  const database = getDb();
  if (!database) return siteJson;

  try {
    const snap = await getDoc(doc(database, 'settings', 'site'));
    if (snap.exists()) {
      return deepMerge(siteJson, snap.data());
    }
  } catch (e) {
    console.warn('[Firestore] getSiteSettings error:', e.message);
  }
  return siteJson;
}

/**
 * Get homepage content — site settings + dynamic sections
 */
export async function getHomepageContent() {
  const site = await getSiteSettings();
  const database = getDb();

  let whyUs = site.whyChooseUs || [];
  let reviews = [];
  let gallery = [];

  if (database) {
    try {
      // Fetch featured reviews
      const reviewsSnap = await getDocs(
        query(collection(database, 'content', 'reviews', 'items'), orderBy('featured', 'desc'), limit(6))
      );
      if (!reviewsSnap.empty) {
        reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) { /* fallback to empty */ }

    try {
      // Fetch gallery images
      const gallerySnap = await getDocs(
        query(collection(database, 'content', 'gallery', 'items'), orderBy('order'), limit(12))
      );
      if (!gallerySnap.empty) {
        gallery = gallerySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (e) { /* fallback to empty */ }
  }

  return { site, whyUs, reviews, gallery };
}

/**
 * Get all reviews for the reviews page
 */
export async function getAllReviews() {
  const database = getDb();
  if (!database) return [];

  try {
    const snap = await getDocs(
      query(collection(database, 'content', 'reviews', 'items'), orderBy('date', 'desc'))
    );
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getAllReviews error:', e.message);
    return [];
  }
}

/**
 * Get gallery images, optionally filtered by fence type
 */
export async function getGalleryImages(fenceType = null) {
  const database = getDb();
  if (!database) return [];

  try {
    let q;
    if (fenceType) {
      q = query(collection(database, 'content', 'gallery', 'items'), where('type', '==', fenceType), orderBy('order'));
    } else {
      q = query(collection(database, 'content', 'gallery', 'items'), orderBy('order'));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getGalleryImages error:', e.message);
    return [];
  }
}

/**
 * Submit a contact/quote form
 */
export async function submitForm(data) {
  const database = getDb();
  if (!database) throw new Error('Database unavailable');

  const { addDoc, serverTimestamp } = await import('firebase/firestore');
  return addDoc(collection(database, 'submissions'), {
    ...data,
    createdAt: serverTimestamp(),
    status: 'new'
  });
}

// Deep merge utility
function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && target[key]) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}
