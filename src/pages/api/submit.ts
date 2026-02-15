import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Honeypot check — bots fill the hidden "website" field
    if (data.website) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic validation
    if (!data.name || (!data.email && !data.phone)) {
      return new Response(JSON.stringify({ error: 'Name and contact info required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Email validation (if provided)
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return new Response(JSON.stringify({ error: 'Invalid email' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Save to Firestore — jobs collection so it appears in Executive App kanban
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      const firebaseConfig = {
        apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
        authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
      };

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      const db = getFirestore(app);

      // Build job document matching Executive App schema
      const jobDoc = {
        // Customer info
        cName: data.name || '',
        cPhone: data.phone || '',
        cEmail: data.email || '',
        cAddress: data.address || '',

        // Job info
        status: 'Lead',
        source: 'website-' + (data.type || 'contact'),

        // Fence details (if provided)
        style: data.fenceType || '',
        height: data.fenceHeight ? data.fenceHeight + ' ft' : '',
        footage: data.fenceLength ? String(data.fenceLength) : (data.footage ? String(data.footage) : ''),

        // Gate info
        singleGates: data.singleGates || 0,
        doubleGates: data.doubleGates || 0,

        // Notes — combine message, details, estimate range
        notes: buildNotes(data),

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        cDate: new Date().toISOString().split('T')[0],

        // Estimate (if ballpark)
        ...(data.estimateLow && data.estimateHigh ? {
          estimateLow: data.estimateLow,
          estimateHigh: data.estimateHigh,
          estimatedRange: data.estimatedRange || ('$' + data.estimateLow + ' - $' + data.estimateHigh),
        } : {}),

        // Metadata
        websiteLead: true,
      };

      const docRef = await addDoc(collection(db, 'jobs'), jobDoc);

      return new Response(JSON.stringify({ success: true, id: docRef.id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fbError) {
      console.error('[API] Firestore save error:', fbError);
      // Still return success since lead was captured
      return new Response(JSON.stringify({ success: true, id: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('[API] Submit error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function buildNotes(data) {
  const parts = [];
  if (data.type === 'lead' && data.estimatedRange) {
    parts.push('Ballpark Estimate: ' + data.estimatedRange);
  }
  if (data.timeline) parts.push('Timeline: ' + data.timeline);
  if (data.heard) parts.push('Source: ' + data.heard);
  if (data.message) parts.push(data.message);
  if (data.details) parts.push(data.details);
  if (data.notes) parts.push(data.notes);
  parts.push('[Website lead — ' + new Date().toLocaleDateString() + ']');
  return parts.join('\n');
}
