/**
 * Server-side Firestore REST API client
 * No SDK needed — reads public Firestore data via REST
 */

const PROJECT_ID = 'ghareeb-fencing';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function parseValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseValue);
  if (v.mapValue) {
    const obj = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      obj[k] = parseValue(val);
    }
    return obj;
  }
  return null;
}

function parseDoc(doc) {
  if (!doc || !doc.fields) return null;
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = parseValue(v);
  }
  // Extract document ID from name
  if (doc.name) {
    obj._id = doc.name.split('/').pop();
  }
  return obj;
}

export async function getDoc(path) {
  try {
    const res = await fetch(`${BASE}/${path}`);
    if (!res.ok) return null;
    return parseDoc(await res.json());
  } catch (e) {
    console.error(`Firestore getDoc(${path}):`, e.message);
    return null;
  }
}

export async function getCollection(path) {
  try {
    const res = await fetch(`${BASE}/${path}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.documents || []).map(parseDoc).filter(Boolean);
  } catch (e) {
    console.error(`Firestore getCollection(${path}):`, e.message);
    return [];
  }
}

// ============================================================
// Content loaders with static fallbacks
// Every loader: try Firestore first → fall back to static JSON
// ============================================================

import siteJson from '../content/site.json';
import fencesJson from '../content/fences.json';
import reviewsJson from '../content/reviews.json';
import contactJson from '../content/contact.json';
import aboutJson from '../content/about.json';
import permitsJson from '../content/permits.json';
import serviceAreasJson from '../content/service-areas.json';

/** Deep merge: Firestore overrides on top of static JSON */
function deepMerge(base, override) {
  if (!override) return base;
  const result = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof result[k] === 'object' && !Array.isArray(result[k])) {
      result[k] = deepMerge(result[k], v);
    } else if (v !== null && v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

// Site settings
export async function getSiteSettings() {
  const doc = await getDoc('settings/site');
  return doc ? deepMerge(siteJson, doc) : siteJson;
}

// Fence types
export async function getFences() {
  const doc = await getDoc('content/fences');
  if (doc && doc.fenceTypes && doc.fenceTypes.length) return doc.fenceTypes;
  if (doc && doc.items && doc.items.length) return doc.items;
  return fencesJson.fenceTypes || [];
}

// Single fence by slug
export async function getFenceBySlug(slug) {
  const fences = await getFences();
  return fences.find(f => f.slug === slug || f.id === slug) || null;
}

// Fence comparison data
export async function getFenceComparison() {
  const doc = await getDoc('content/fences');
  if (doc && doc.comparison) return doc.comparison;
  return fencesJson.comparison || null;
}

// Reviews — full page data
export async function getReviewsPageData() {
  const doc = await getDoc('content/reviews');
  if (doc) return deepMerge(reviewsJson, doc);
  return reviewsJson;
}

// Reviews — just the list
export async function getReviews() {
  const doc = await getDoc('content/reviews');
  if (doc && doc.featured && doc.featured.length) return doc.featured;
  if (doc && doc.items && doc.items.length) return doc.items;
  return reviewsJson.featured || [];
}

// Why Us / selling points
export async function getWhyUs() {
  const doc = await getDoc('content/whyUs');
  if (doc && doc.items && doc.items.length) return doc.items;
  return siteJson.whyUs || [];
}

// Gallery
export async function getGallery() {
  const items = await getCollection('gallery');
  if (items.length) {
    return items.map(i => ({
      src: i.url || i.src || i.imageUrl || '',
      alt: i.alt || i.caption || i.title || 'Fence project',
      category: (i.category || i.type || 'other').toLowerCase(),
      _id: i._id || ''
    }));
  }
  return [];
}

// Contact info
export async function getContactInfo() {
  const doc = await getDoc('content/contact');
  return doc ? deepMerge(contactJson, doc) : contactJson;
}

// About
export async function getAboutInfo() {
  const doc = await getDoc('content/about');
  return doc ? deepMerge(aboutJson, doc) : aboutJson;
}

// Permits
export async function getPermits() {
  const doc = await getDoc('content/permits');
  return doc ? deepMerge(permitsJson, doc) : permitsJson;
}

// Service areas
export async function getServiceAreas() {
  const doc = await getDoc('content/serviceAreas');
  return doc ? deepMerge(serviceAreasJson, doc) : serviceAreasJson;
}

// Single service area by slug
export async function getServiceAreaBySlug(slug) {
  const data = await getServiceAreas();
  const areas = data.serviceAreas || [];
  return areas.find(a => a.slug === slug || a.id === slug) || null;
}

// Page-specific content (titles, subtitles, etc.)
export async function getPageContent(pageKey) {
  const doc = await getDoc('content/pages');
  return doc ? (doc[pageKey] || {}) : {};
}

// Available appointment slots (set from exec app)
export async function getAvailableSlots() {
  const items = await getCollection('availableSlots');
  if (items.length) return items;
  const items2 = await getCollection('appointmentSlots');
  if (items2.length) return items2;
  return [];
}

// Homepage content (all-in-one for homepage rendering)
export async function getHomepageContent() {
  const [site, whyUs, reviews, gallery] = await Promise.all([
    getSiteSettings(),
    getWhyUs(),
    getReviews(),
    getGallery()
  ]);
  return { site, whyUs, reviews, gallery };
}
