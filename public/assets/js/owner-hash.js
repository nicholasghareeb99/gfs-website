/* owner-hash.js - GFS, Nov 2026. Loaded by /admin/. edit-mode.js carries the same code. */
(function (w) {
  /* Small synchronous SHA-256, so editor addresses never sit in page source. */
  function sha256(s) {
    var K = [], H = [], i, j, n = 2, c = 0;
    function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    while (c < 64) { for (j = 2; j * j <= n && n % j; j++); if (j * j > n) { if (c < 8) H[c] = frac(Math.pow(n, 0.5)); K[c++] = frac(Math.pow(n, 1 / 3)); } n++; }
    var b = unescape(encodeURIComponent(s)), l = b.length, w32 = [], bits = l * 8;
    for (i = 0; i < l; i++) w32[i >> 2] |= b.charCodeAt(i) << (24 - (i % 4) * 8);
    w32[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
    w32[(((l + 8) >> 6) << 4) + 15] = bits;
    function r(x, k) { return (x >>> k) | (x << (32 - k)); }
    for (i = 0; i < w32.length; i += 16) {
      var W = [], a = H.slice(0);
      for (j = 0; j < 64; j++) {
        W[j] = j < 16 ? (w32[i + j] | 0) : (((r(W[j - 2], 17) ^ r(W[j - 2], 19) ^ (W[j - 2] >>> 10)) + W[j - 7] + (r(W[j - 15], 7) ^ r(W[j - 15], 18) ^ (W[j - 15] >>> 3)) + W[j - 16]) | 0);
        var t1 = (a[7] + (r(a[4], 6) ^ r(a[4], 11) ^ r(a[4], 25)) + ((a[4] & a[5]) ^ (~a[4] & a[6])) + K[j] + W[j]) | 0;
        var t2 = ((r(a[0], 2) ^ r(a[0], 13) ^ r(a[0], 22)) + ((a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]))) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (j = 0; j < 8; j++) H[j] = (H[j] + a[j]) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  w.GFSOwner = w.GFSOwner || {
    sha256: sha256,
    is: function (email) {
      var list = w.GFS_AUTHORIZED_EMAIL_HASHES || [];
      return !!email && list.indexOf(sha256(String(email).toLowerCase().trim())) !== -1;
    }
  };
})(typeof window !== 'undefined' ? window : this);
