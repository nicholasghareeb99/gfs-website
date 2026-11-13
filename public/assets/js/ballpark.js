// Nov 1 pixel audit. Display selection only; stored originals are retained.
// Match exact legacy files so later staff uploads remain authoritative.
(function(root){
  const rules={
  "Cedar Privacy 6ft (PT/Cedar)": {
    "exclude": [
      "1787428067340_0jwfa.jpg",
      "1787428068675_puxqw.jpg",
      "1787428069768_6hts9.jpg",
      "1787428071038_7uq2r.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "6' P/T Capped Shadowbox": {
    "exclude": [
      "1793476861154_wfp9k.jpg",
      "1793476862651_5d9b3.jpg",
      "1793476864230_1siin.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - Adobe 3ft": {
    "exclude": [
      "1787441166136_p5fst.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - Adobe 4ft": {
    "exclude": [
      "1787441171091_2pdwc.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - Adobe 5ft": {
    "exclude": [
      "1787441175089_4r0ch.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - Tan 3ft": {
    "exclude": [
      "1787441179096_9rzbf.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - Tan 4ft": {
    "exclude": [
      "1787441183099_60pc5.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - Tan 5ft": {
    "exclude": [
      "1787441187100_0yewa.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - White 3ft": {
    "exclude": [
      "1787441191108_ompbu.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - White 4ft": {
    "exclude": [
      "1787441195099_vvamb.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Bedford - White 5ft": {
    "exclude": [
      "1787441199110_7zd7o.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - Adobe 3ft": {
    "exclude": [
      "1787441228116_72hkf.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - Adobe 4ft": {
    "exclude": [
      "1787441232098_dzzme.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - Adobe 5ft": {
    "exclude": [
      "1787441236098_x4ecz.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - Tan 3ft": {
    "exclude": [
      "1787441240095_5vuaj.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - Tan 4ft": {
    "exclude": [
      "1787441244099_jfydx.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - Tan 5ft": {
    "exclude": [
      "1787441248099_bxen5.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - White 3ft": {
    "exclude": [
      "1787441252099_jfgbl.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - White 4ft": {
    "exclude": [
      "1787441256096_bebx7.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Cascade Traditional - White 5ft": {
    "exclude": [
      "1787441260097_ne1j0.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "HW Bedford - Mocha Walnut 3ft": {
    "exclude": [
      "1787441288126_vnvsg.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "HW Bedford - Mocha Walnut 4ft": {
    "exclude": [
      "1787441292104_7j3ik.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "HW Bedford - Mocha Walnut 5ft": {
    "exclude": [
      "1787441296098_mc3cm.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "HW Rockport-Bedford Top - Mocha Walnut 6ft": {
    "exclude": [
      "1787433796162_06t26.jpg",
      "1787433797158_3pjbh.jpg"
    ],
    "labels": {
      "1787888856325_mwgrx.jpg": {
        "auditImageKind": "style illustration",
        "auditCaption": "Style illustration; not an installation photo."
      },
      "1787441322103_ng2a7.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": [
      "1787888856325_mwgrx.jpg"
    ]
  },
  "HW Rockport-Concave Top - Mocha Walnut 6ft": {
    "exclude": [
      "1787433799931_ipozu.jpg",
      "1787433800781_htwrn.jpg"
    ],
    "labels": {
      "1787888861273_wgeu5.jpg": {
        "auditImageKind": "style illustration",
        "auditCaption": "Style illustration; not an installation photo."
      },
      "1787433802175_s7jo3.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      },
      "1787441327098_ky54e.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": [
      "1787888861273_wgeu5.jpg"
    ]
  },
  "HW Rockport-Hartford Top - Mocha Walnut 6ft": {
    "exclude": [
      "1787433804011_vp0al.jpg",
      "1787433804909_be5pp.jpg"
    ],
    "labels": {
      "1787888866283_e7y2o.jpg": {
        "auditImageKind": "style illustration",
        "auditCaption": "Style illustration; not an installation photo."
      },
      "1787433806384_vkani.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      },
      "1787441332104_goy8s.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": [
      "1787888866283_e7y2o.jpg"
    ]
  },
  "Kingston - White/tan 6ft": {
    "exclude": [
      "1787433863199_nouae.jpg"
    ],
    "labels": {
      "1787441411097_3kusc.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Concave Top - Adobe 6ft": {
    "exclude": [
      "1787433870066_yaz63.jpg"
    ],
    "labels": {
      "1787441427119_skgkb.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Concave Top - Tan 6ft": {
    "exclude": [
      "1787433872250_rnaoy.jpg"
    ],
    "labels": {
      "1787441431086_ti0kc.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Concave Top - White 6ft": {
    "exclude": [
      "1787433874090_g8wlt.jpg"
    ],
    "labels": {
      "1787441435102_wd9et.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Hartford Top - Adobe 6ft": {
    "exclude": [
      "1787433881813_zsped.jpg"
    ],
    "labels": {
      "1787441439122_2q9zz.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Hartford Top - White 6ft": {
    "exclude": [
      "1787433887868_5fwy2.jpg"
    ],
    "labels": {
      "1787441447084_k136a.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - Adobe 4ft": {
    "exclude": [
      "1787433890058_6mqje.jpg"
    ],
    "labels": {
      "1787441452088_snqgh.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - Adobe 5ft": {
    "exclude": [
      "1787433892301_rcw5r.jpg"
    ],
    "labels": {
      "1787441456085_p6p53.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - Adobe 6ft": {
    "exclude": [
      "1787433894456_kdyjj.jpg"
    ],
    "labels": {
      "1787441460083_g7jz4.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - Tan 4ft": {
    "exclude": [
      "1787433896275_b735k.jpg"
    ],
    "labels": {
      "1787441464084_yuwcc.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - Tan 5ft": {
    "exclude": [
      "1787433898184_aq6da.jpg"
    ],
    "labels": {
      "1787441468094_wjqct.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - Tan 6ft": {
    "exclude": [
      "1787433900232_getjo.jpg"
    ],
    "labels": {
      "1787441472083_yyfdh.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - White 4ft": {
    "exclude": [
      "1787433902494_eyphw.jpg"
    ],
    "labels": {
      "1787441476093_odg4q.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - White 5ft": {
    "exclude": [
      "1787433904592_fvyy5.jpg"
    ],
    "labels": {
      "1787441480086_sby7c.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Lattice Top - White 6ft": {
    "exclude": [
      "1787433906621_b2x9c.jpg"
    ],
    "labels": {
      "1787441484096_zndd0.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Traditional Top - Adobe 6ft": {
    "exclude": [
      "1787433909084_8ab2u.jpg"
    ],
    "labels": {
      "1787441490116_xzwfq.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Traditional Top - Tan 6ft": {
    "exclude": [
      "1787433911256_ztllu.jpg"
    ],
    "labels": {
      "1787441494086_91cff.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Traditional Top - White 6ft": {
    "exclude": [
      "1787433913064_fbzfe.jpg"
    ],
    "labels": {
      "1787441498098_32ogf.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Victorian Top - Adobe 6ft": {
    "exclude": [
      "1787433929554_z90l8.jpg"
    ],
    "labels": {
      "1787441504122_3bjz9.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Victorian Top - Tan 6ft": {
    "exclude": [
      "1787433932560_xkzex.jpg"
    ],
    "labels": {
      "1787441508099_f2ivn.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Windsor Top - Adobe 6ft": {
    "exclude": [
      "1787433938826_v3e8z.jpg"
    ],
    "labels": {
      "1787441518119_f6d45.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Kingston-Windsor Top - Tan 6ft": {
    "exclude": [
      "1787433941924_svwg5.jpg"
    ],
    "labels": {
      "1787441522085_1ezlk.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Midland Ranch 2-Rail - Adobe 3ft": {
    "exclude": [
      "1787441530115_nocqs.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 2-Rail - Tan 3ft": {
    "exclude": [
      "1787441534101_8sr7z.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 2-Rail - White 3ft": {
    "exclude": [
      "1787441538082_g4wwn.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 3-Rail - Adobe 4ft": {
    "exclude": [
      "1787441542098_sjerp.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 3-Rail - Tan 4ft": {
    "exclude": [
      "1787441546099_cupvk.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 3-Rail - White 4ft": {
    "exclude": [
      "1787441550101_p18vn.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 4-Rail - Adobe 5ft": {
    "exclude": [
      "1787441554098_1bkh5.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 4-Rail - Tan 5ft": {
    "exclude": [
      "1787441558084_s0owg.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Midland Ranch 4-Rail - White 5ft": {
    "exclude": [
      "1787441562101_zdrxf.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Rockport- white post/rail tan picket": {
    "exclude": [
      "1787434053148_jcf4h.jpg"
    ],
    "labels": {
      "1787441643098_9p3ir.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "manufacturer drawing",
        "auditCaption": "Manufacturer drawing; finish is not shown."
      }
    },
    "preferred": []
  },
  "Rockport-Midrail - Adobe 7ft": {
    "exclude": [
      "1787441732098_8lsbv.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Rockport-Midrail - Adobe 8ft": {
    "exclude": [
      "1787441736097_4e2xj.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Rockport-Midrail - Tan 7ft": {
    "exclude": [
      "1787441740097_ngfhl.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Rockport-Midrail - Tan 8ft": {
    "exclude": [
      "1787441744089_43877.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Rockport-Midrail - White 7ft": {
    "exclude": [
      "1787441748099_vjjnx.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Rockport-Midrail - White 8ft": {
    "exclude": [
      "1787441752099_6rfqm.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "Shadowbox - Adobe 4ft": {
    "exclude": [],
    "labels": {
      "1787441757102_4nbmq.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - Adobe 5ft": {
    "exclude": [],
    "labels": {
      "1787441761097_4xbia.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - Adobe 6ft": {
    "exclude": [],
    "labels": {
      "1787441765098_1pqt6.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - Tan 4ft": {
    "exclude": [],
    "labels": {
      "1787441769095_e75f8.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - Tan 5ft": {
    "exclude": [],
    "labels": {
      "1787441773090_1i4yv.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - Tan 6ft": {
    "exclude": [],
    "labels": {
      "1787441777097_dje9v.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - White 4ft": {
    "exclude": [],
    "labels": {
      "1787441781096_aj1i2.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - White 5ft": {
    "exclude": [],
    "labels": {
      "1787441785089_nidxe.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "Shadowbox - White 6ft": {
    "exclude": [],
    "labels": {
      "1787441789088_7f1l4.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "4.5' 4 Board Ranch Rail": {
    "exclude": [
      "1771727957186_85x07.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "6' Cedar semi privacy 2 rail": {
    "exclude": [
      "1780370503488_ecqdu.jpg"
    ],
    "labels": {},
    "preferred": []
  },
  "5' Bronze ornamental aluminum": {
    "exclude": [],
    "labels": {
      "1787760457123_3hu19.jpg": {
        "referenceKind": "manufacturer-drawing",
        "auditImageKind": "reference drawing",
        "auditCaption": "Reference drawing; finish and exact product details require confirmation."
      }
    },
    "preferred": []
  },
  "4'scallop cut privacy fence P/t": {
    "exclude": [],
    "labels": {
      "1787921385183_0tvwq.jpg": {
        "referenceKind": "generated-preview",
        "auditImageKind": "3D model preview",
        "auditCaption": "3D model preview; not an installation photo."
      },
      "1787921385826_ngmz8.jpg": {
        "referenceKind": "generated-preview",
        "auditImageKind": "3D model preview",
        "auditCaption": "3D model preview; not an installation photo."
      }
    },
    "preferred": []
  },
  "4' ranch rail 4 boards blk welded wire": {
    "exclude": [
      "1791757238808_uex3o.jpg",
      "1791757239982_wj0wu.jpg"
    ],
    "labels": {},
    "preferred": []
  }
};
  function key(row){try{return decodeURIComponent(String(row?.url||'').split('?')[0]).split('/').pop();}catch(_){return '';}}
  function select(name,photos){
    const rows=Array.isArray(photos)?photos:[],rule=Object.hasOwn(rules,name)?rules[name]:null;
    if(!rule)return rows.slice();
    const kept=rows.filter(row=>!rule.exclude.includes(key(row))).map(row=>rule.labels[key(row)]?{...row,...rule.labels[key(row)]}:row);
    // Promote the accurate existing illustration only within the reviewed old
    // set; a newly uploaded first image remains first.
    const allReviewed=rows.every(row=>rule.exclude.includes(key(row))||Object.hasOwn(rule.labels,key(row)));
    if(allReviewed&&rule.preferred.length)kept.sort((a,b)=>{const rank=r=>{const i=rule.preferred.indexOf(key(r));return i<0?999:i;};return rank(a)-rank(b);});
    return kept;
  }
  function excluded(name,row){const rule=Object.hasOwn(rules,name)?rules[name]:null;return !!rule?.exclude.includes(key(row));}
  root.GFSAuditedPhotos=Object.freeze({select,excluded});
})(typeof window==='object'?window:globalThis);

/* ============================================================
   GHAREEB FENCING — BALLPARK QUOTE TOOL  (v3.2: diagnostics + cache-bust)
   ============================================================
   Build stamp logged to console at load — gives you a way to tell if
   you're seeing the latest code or a browser-cached older version.
   ============================================================ */

(function() {
  'use strict';

  // Build stamp — visible in DevTools console. If you see an OLD stamp,
  // your browser cached an older ballpark.js. Hard-reload with Ctrl+Shift+R
  // (Windows/Linux) or Cmd+Shift+R (Mac) to force-fetch the latest.
  const BUILD = 'ballpark-20261113-pass3';
  console.log('%c[Ghareeb Ballpark] ' + BUILD, 'background:#1A2E40;color:#B8945A;padding:3px 8px;border-radius:3px;font-weight:bold;');

  // -------- GEOMETRY CAPTURE (Exec-app sketch handoff) --------
  // Serializes every drawn fence line + gate position as {lat,lng} objects
  // (NEVER [lat,lng] arrays — exec-side consumers index by property).
  // Emitted as a JSON string in the lead's `geometry` field so the
  // Executive app can rebuild the customer's drawing on its sketch canvas.
  function collectGeometry() {
    try {
      if(layoutAddress!==null&&layoutAddress!==draftAddress(state.address))return '';
      var lines = [];
      var gates = [];
      var rnd = function (n) { return Math.round(n * 1e6) / 1e6; };
      // Leaflet engine
      if (activeDrawingEngine==='leaflet' && typeof lFenceLines !== 'undefined' && lFenceLines && lFenceLines.length) {
        lFenceLines.forEach(function (line) {
          var pts = line.getLatLngs().map(function (p) { return { lat: rnd(p.lat), lng: rnd(p.lng) }; });
          if (pts.length >= 2) lines.push(pts);
        });
        if (typeof lWalkGates !== 'undefined') lWalkGates.forEach(function (m) {
          var p = m.getLatLng(); gates.push({ type: 'walk', lat: rnd(p.lat), lng: rnd(p.lng) });
        });
        if (typeof lDriveGates !== 'undefined') lDriveGates.forEach(function (m) {
          var p = m.getLatLng(); gates.push({ type: 'drive', lat: rnd(p.lat), lng: rnd(p.lng) });
        });
      }
      // Google engine
      if (activeDrawingEngine==='google' && !lines.length && typeof gFenceLines !== 'undefined' && gFenceLines && gFenceLines.length) {
        gFenceLines.forEach(function (line) {
          var path = line.getPath();
          var pts = [];
          for (var i = 0; i < path.getLength(); i++) {
            var p = path.getAt(i);
            pts.push({ lat: rnd(p.lat()), lng: rnd(p.lng()) });
          }
          if (pts.length >= 2) lines.push(pts);
        });
        if (typeof gWalkGates !== 'undefined') gWalkGates.forEach(function (m) {
          var p = m.getPosition(); gates.push({ type: 'walk', lat: rnd(p.lat()), lng: rnd(p.lng()) });
        });
        if (typeof gDriveGates !== 'undefined') gDriveGates.forEach(function (m) {
          var p = m.getPosition(); gates.push({ type: 'drive', lat: rnd(p.lat()), lng: rnd(p.lng()) });
        });
      }
      if (!lines.length) return '';
      // Runs the customer tied to an added style carry that style, so the
      // Executive app draws each run in its own style. Other runs use the
      // lead's main style.
      var runStyles = [];
      state.sections.forEach(function (section) {
        var fence = FENCE_PRICING[section.fenceId];
        if (fence && Number.isInteger(section.run) && section.run >= 0 && section.run < lines.length && !runStyles.some(function (r) { return r.run === section.run; })) runStyles.push({ run: section.run, style: fence.name, height: Number(section.height) || null });
      });
      var out = JSON.stringify(runStyles.length ? { v: 1, lines: lines, gates: gates, runStyles: runStyles } : { v: 1, lines: lines, gates: gates });
      // Intake validation reports oversized drawings before submission,
      // preserving the customer's layout rather than silently dropping it.
      return out;
    } catch (e) {
      console.warn('[Ghareeb Ballpark] geometry capture failed:', e);
      return '';
    }
  }

  // Step-3 sync hook: assigned inside bindStep3, callable from the map
  // code and draft restore. MUST be declared — this module is strict mode,
  // and the bare assignment was a ReferenceError that killed init (live bug).
  let syncStep3 = function () {};

  // -------- CUSTOMER YARD PHOTO (optional) -----------------------
  // Compressed hard (900px / q0.72, floor q0.55) so the lead doc stays
  // far under Firestore's 1MB ceiling even alongside a big geometry.
  let leadPhoto = '';
  let leadPhotoPending = false;
  function photoReadyForSubmission() {
    if (!leadPhotoPending) return true;
    const status = el('bp-photo-status');
    if (status) status.textContent = 'Please wait for your photo to finish, or remove it to continue without a photo.';
    el('bp-form-photo')?.focus();
    return false;
  }
  (function bindLeadPhoto() {
    const inp = el('bp-form-photo');
    if (!inp) return;
    const preview = el('bp-photo-preview'), status = el('bp-photo-status'), remove = el('bp-photo-remove');
    let revision = 0, activeUrl = '';
    function clear(message = '') {
      revision++;
      if (activeUrl) URL.revokeObjectURL(activeUrl);
      activeUrl = ''; leadPhoto = ''; leadPhotoPending = false;
      if (preview) { preview.removeAttribute('src'); preview.style.display = 'none'; }
      if (remove) { remove.hidden = true; remove.style.display = 'none'; }
      if (status) status.textContent = message;
    }
    remove?.addEventListener('click', () => { clear('Photo removed. You can continue without one.'); inp.value = ''; inp.focus(); });
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      clear();
      if (!f) return;
      const current = revision;
      leadPhotoPending = true;
      if (remove) { remove.hidden = false; remove.style.display = 'inline-flex'; }
      if (status) status.textContent = 'Preparing your photo…';
      const img = new Image();
      const url = activeUrl = URL.createObjectURL(f);
      function failed(message) {
        if (current !== revision) return;
        clear(message); inp.value = '';
      }
      img.onload = () => {
        if (current !== revision) return;
        try {
        const s = Math.min(1, 900 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/jpeg', 0.72);
        if (out.length > 380000) out = c.toDataURL('image/jpeg', 0.55);
        if (out.length > 380000) { failed('That photo is too large. Try another photo, or continue without one.'); return; }
        leadPhoto = out;
        leadPhotoPending = false;
        if (preview) { preview.src = out; preview.style.display = 'block'; }
        if (status) status.textContent = 'Photo ready. It will be included when you submit your request.';
        URL.revokeObjectURL(url); activeUrl = '';
        } catch (error) { failed('This photo could not be prepared. Try a JPG, PNG or WebP, or continue without one.'); }
      };
      img.onerror = () => failed('This photo could not be opened. Try a JPG, PNG or WebP, or continue without one.');
      img.src = url;
    });
  })();

  // -------- ADDRESS AUTOCOMPLETE (Google Places) -----------------
  // The map search has its own single autocomplete in initGoogleMap.
  function initAutocomplete() {
    if (!(window.google && google.maps && google.maps.places)) return;
    const opts = {
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry'],
      types: ['address']
    };
    const formAddr = el('bp-form-address');
    if (formAddr && !formAddr.dataset.acBound) {
      formAddr.dataset.acBound = '1';
      const ac2 = new google.maps.places.Autocomplete(formAddr, opts);
      ac2.addListener('place_changed', () => {
        const p = ac2.getPlace();
        if (p && p.formatted_address) { formAddr.value = p.formatted_address; setProjectAddress(p.formatted_address); }
      });
    }
  }
  // Contact-address autocomplete is bound only after the requested map SDK is ready.

  // -------- FUNNEL TRACKING (admin dashboard) --------
  // Fires each funnel milestone once per session via analytics.js.
  function track(label) {
    try {
      track._seen = track._seen || {};
      if (track._seen[label]) return;
      track._seen[label] = 1;
      if (typeof window.GFSTrack === 'function') window.GFSTrack('tool', 'bp:' + label);
    } catch (e) {}
  }

  // Global error trap — any crash inside this module surfaces as a visible
  // banner on the map area, so the user can SEE what went wrong instead of
  // staring at a silent gray box.
  window.addEventListener('error', function(e) {
    const fname = (e.filename || '').split('/').pop();
    if (fname && fname.indexOf('ballpark.js') >= 0) {
      console.error('[Ghareeb Ballpark] Top-level error:', e.message, 'at line', e.lineno);
      const banner = document.getElementById('bp-map-status');
      if (!banner) {
        const wrap = document.getElementById('bp-map');
        if (wrap) {
          const b = document.createElement('div');
          b.id = 'bp-map-status';
          b.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(120,30,30,0.94);color:#fafafa;padding:14px 22px;border-radius:6px;font-size:14px;line-height:1.5;text-align:center;max-width:80%;z-index:5;box-shadow:0 8px 24px rgba(0,0,0,0.3);';
          b.textContent = 'The planning tool could not finish loading. Please reload, or call us for help with your estimate.';
          wrap.style.position = 'relative';
          wrap.appendChild(b);
        }
      }
    }
  });

  // -------- PRICING DATA (Executive app v23.1 calibrated) --------
  // perFoot: $/ft for the style as named
  // gates: $ per gate at standard build
  // photo: Squarespace CDN URL for the style preview
  // category: which fence type page the style belongs to
  const FENCE_PRICING = {
    'cedar-privacy': {
      name: 'Cedar Privacy',
      detail: 'Western Red Cedar, classic dog-ear or flat-top',
      perFoot: 35, singleGate: 200, doubleGate: 400,
      photo: 'https://gfs-website.netlify.app/images/gallery/cedar-shadowbox.jpg',
      category: 'cedar',
      style: 'privacy',
      removalType: 'wood',
    },
    'cedar-shadowbox': {
      name: 'Cedar Shadowbox',
      detail: 'Alternating boards, privacy from both sides',
      perFoot: 38, singleGate: 200, doubleGate: 400,
      photo: 'https://gfs-website.netlify.app/images/gallery/cedar-lattice-shadowbox.jpg',
      category: 'cedar',
      style: 'shadowbox',
      removalType: 'wood',
    },
    'wood-privacy': {
      name: 'Pressure-Treated Wood Privacy',
      detail: 'Budget-friendly privacy, dog-ear pickets',
      perFoot: 22, singleGate: 150, doubleGate: 300,
      photo: 'https://gfs-website.netlify.app/images/gallery/pt-privacy.jpg',
      category: 'wood',
      style: 'privacy',
      removalType: 'wood',
    },
    'vinyl-privacy': {
      name: 'Vinyl Privacy',
      detail: 'Privacy options with simple upkeep',
      perFoot: 55, singleGate: 350, doubleGate: 700,
      photo: 'https://gfs-website.netlify.app/images/gallery/vinyl-white.jpg',
      category: 'vinyl',
      style: 'privacy',
      removalType: 'other',
    },
    'vinyl-picket': {
      name: 'Vinyl Picket',
      detail: 'Classic decorative, multiple colors',
      perFoot: 48, singleGate: 350, doubleGate: 700,
      photo: 'https://gfs-website.netlify.app/images/gallery/vinyl-tan-privacy.jpg',
      category: 'vinyl',
      style: 'picket',
      removalType: 'other',
    },
    'aluminum': {
      name: 'Ornamental Aluminum',
      detail: 'Open views with matching gate options',
      perFoot: 45, singleGate: 250, doubleGate: 500,
      photo: 'https://gfs-website.netlify.app/images/gallery/aluminum-black.jpg',
      category: 'aluminum',
      style: 'ornamental',
      removalType: 'other',
    },
    'chainlink': {
      name: 'Chain Link (Galvanized)',
      detail: 'Affordable, durable, fast install',
      perFoot: 18, singleGate: 150, doubleGate: 300,
      photo: 'https://gfs-website.netlify.app/images/gallery/chainlink-1.jpg',
      category: 'chainlink',
      style: 'galvanized',
      removalType: 'chain',
    },
    'chainlink-vinyl': {
      name: 'Chain Link (Vinyl-Coated)',
      detail: 'Black, green or brown coating',
      perFoot: 22, singleGate: 175, doubleGate: 350,
      photo: 'https://gfs-website.netlify.app/images/gallery/chainlink-1.jpg',
      category: 'chainlink',
      style: 'vinyl-coated',
      removalType: 'chain',
    },
    'split-rail': {
      name: 'Split Rail (2-Rail)',
      detail: 'Rustic property line marker',
      perFoot: 15, singleGate: 125, doubleGate: 250,
      photo: 'https://gfs-website.netlify.app/images/gallery/split-rail-1.jpg',
      category: 'split-rail',
      style: '2-rail',
      removalType: 'wood',
    },
    'split-rail-3': {
      name: 'Split Rail (3-Rail)',
      detail: 'Taller rustic option',
      perFoot: 18, singleGate: 125, doubleGate: 250,
      photo: 'https://gfs-website.netlify.app/images/gallery/split-rail-1.jpg',
      category: 'split-rail',
      style: '3-rail',
      removalType: 'wood',
    },
  };

  // -------- STATE --------
  const state = {
    linearFeet: 0,
    fenceId: '',
    height: '6',
    singleGates: 0,
    doubleGates: 0,
    removeOldFence: false,
    existingFenceMaterial: '',
    address: '',
    priceUnlocked: false,
    // Added styles for part of the fence: {uid, fenceId, feet, height, singleGates, doubleGates}
    sections: [],
    // Optional yard notes the customer ticked (information only, not priced)
    siteNotes: [],
    sawDetails: false,
  };
  let pendingDraftStyle = '', styleCatalogSettled = false;
  let acceptedBallparkReceipt = '';

  // Prices are shown only after the customer contact submission is accepted.
  // Legacy page overrides must not bypass this requirement.

  // -------- CORE PRICING ENGINE --------
  // Returns the calculated total + a ±5% range. Returns null if state is
  // insufficient to price.
  // ---- EXECUTIVE APP PRICING ENGINE (faithful port) ----------------------
  // Mirrors the Executive app's option-total formula:
  //   billable = roundToSections(len, styleName)
  //   total    = billable*price + removalFt*removalRate + sg*sgPrice + dg*dgPrice
  // Each height is its own style with its own price, so there is no height
  // multiplier. Removal rates come from the Executive app's settings so the
  // website and the app stay in lockstep; the defaults match its fallbacks.
  const PRICING_FACTORS = {
    remWood: 5,
    remChain: 3,
    remOther: 6,
  };

  // Section sizes — ported from the Executive app's getSectionSize().
  // Order matters: most specific match first.
  const SECTION_SIZE_OVERRIDES = {
    'rockport-midrail': 6,
    'rockport midrail': 6,
    'midrail': 6,
  };
  function getSectionSize(styleName) {
    if (!styleName) return 0;
    const s = String(styleName).toLowerCase();
    for (const pattern in SECTION_SIZE_OVERRIDES) {
      if (s.indexOf(pattern.toLowerCase()) >= 0) return SECTION_SIZE_OVERRIDES[pattern];
    }
    if (s.includes('split rail') || s.includes('splitrail') || s.includes('split-rail')) return 10;
    if (s.includes('chain link') || s.includes('chainlink') || s.includes('chain-link')) return 10;
    if (s.includes('vinyl')) return 8;
    if (s.includes('aluminum') || s.includes('ornamental')) return 6;
    if (s.includes('wood') || s.includes('cedar') || s.includes('treated') ||
        s.includes('dog ear') || s.includes('dog-ear') || s.includes('board on board') ||
        s.includes('board-on-board') || s.includes('shadow box') || s.includes('shadowbox') ||
        s.includes('hybrid')) return 8;
    return 0;  // picket / ranch rail / unknown → no rounding
  }
  function roundToSections(footage, styleName) {
    const ft = parseFloat(footage) || 0;
    const sectionSize = getSectionSize(styleName);
    if (!sectionSize || ft <= 0) return { billable: ft, sections: 0, sectionSize: 0, waste: 0 };
    const sections = Math.ceil(ft / sectionSize);
    const billable = sections * sectionSize;
    return { billable, sections, sectionSize, waste: billable - ft };
  }
  function removalRateFor(removalType) {
    if (removalType === 'wood')  return PRICING_FACTORS.remWood;
    if (removalType === 'chain') return PRICING_FACTORS.remChain;
    return PRICING_FACTORS.remOther;
  }

  // Financing offers come from the lender, not from the planning total.
  // The financing page retains the business's existing application link.
  function renderFinance(price) {
    const box = el('bp-finance');
    if (!box) return;
    // Clear stale terms in older cached markup as well as current markup.
    const amt = el('bp-finance-monthly');
    const terms = el('bp-finance-terms');
    const link = el('bp-finance-link');
    if (amt) { amt.textContent = ''; if (amt.parentElement) amt.parentElement.style.display = 'none'; }
    if (terms) terms.textContent = '';
    if (link) { link.href = '/financing/'; link.textContent = 'Explore financing options'; }
    box.style.display = price && Number.isFinite(price.total) && price.total > 0 ? 'block' : 'none';
  }

  // `primaryId` prices the same project with a different main style (used
  // by the comparison list); leave it out for the customer's own pick.
  function calculatePrice(primaryId) {
    const mainId = primaryId || state.fenceId;
    if (!mainId || !FENCE_PRICING[mainId] || !Number.isFinite(state.linearFeet) || state.linearFeet <= 0 || state.linearFeet > 2000) return null;
    if (sectionsIssue()) return null;
    // Each part is billed at the next full panel for styles installed in
    // sections, the way the Executive app does it. A missing rate is not a
    // free fence, so any part that cannot be priced leaves the whole
    // project unpriced. Every style is priced at its own rate (see pricePart).
    const parts = projectParts(mainId).map(pricePart);
    if (parts.some(part => !part)) return null;
    if (state.removeOldFence && !existingFenceMaterialLabel()) return null;
    // Ballpark assumes removal of the same run length being installed
    const removalCost = state.removeOldFence
      ? state.linearFeet * removalRateFor(existingRemovalType())
      : 0;
    const fenceCost = parts.reduce((sum, part) => sum + part.fenceCost, 0);
    const gateCost = parts.reduce((sum, part) => sum + part.gateCost, 0);
    const total = fenceCost + gateCost + removalCost;

    // Existing planning band; this is not a measured prediction of accuracy.
    const low  = total * 0.95;
    const high = total * 1.05;

    return {
      total: Math.round(total),
      low:   Math.round(low / 100) * 100,    // round to nearest $100
      high:  Math.round(high / 100) * 100,
      breakdown: {
        fence: Math.round(fenceCost),
        gates: Math.round(gateCost),
        removal: Math.round(removalCost),
      },
      billableFeet: parts[0].billableFeet,
      sectionSize: parts[0].sectionSize,
      waste: parts[0].waste,
      parts: parts,
    };
  }

  function existingFenceMaterialLabel(value = state.existingFenceMaterial) {
    if (!['wood','chain','vinyl','aluminum','other'].includes(value)) return '';
    return ({wood:'Wood',chain:'Chain link',vinyl:'Vinyl',aluminum:'Aluminum / metal',other:'Other / mixed materials'})[value] || '';
  }
  function existingRemovalType() {
    return ['wood','chain'].includes(state.existingFenceMaterial) ? state.existingFenceMaterial : 'other';
  }
  function removalScopeNote() {
    return state.removeOldFence ? 'Existing fence removal: '+existingFenceMaterialLabel()+'. Planning allowance assumes '+state.linearFeet+' ft, the same length as the new fence; final removal scope to confirm.' : '';
  }

  function formatPrice(n) {
    return '$' + n.toLocaleString('en-US');
  }

  // -------- DOM HELPERS --------
  function el(id) { return document.getElementById(id); }
  function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

  // -------- STEP 1: address + linear feet --------
  function bindStep1() {
    const lfInput = el('bp-linear-feet');
    if (!lfInput) return;
    lfInput.addEventListener('input', () => {
      state.linearFeet = Number(lfInput.value) || 0;
      const invalid = !Number.isFinite(state.linearFeet) || state.linearFeet < 0 || state.linearFeet > 2000;
      const notice = el('bp-length-status');
      if (notice) { notice.hidden = !invalid; notice.textContent = state.linearFeet > 2000 ? 'For more than 2,000 feet, request a detailed quote. Your length has not been reduced.' : 'Enter a positive fence length, up to 2,000 feet.'; }
      if (invalid) lfInput.setAttribute('aria-invalid', 'true'); else lfInput.removeAttribute('aria-invalid');
      el('bp-summary-length').textContent = Number.isFinite(state.linearFeet) && state.linearFeet > 0 ? state.linearFeet + ' ft' : '—';
      updateAll();
    });
    const formAddress=el('bp-form-address');if(formAddress)formAddress.addEventListener('input',()=>setProjectAddress(formAddress.value));
    const search=el('bp-map-search');if(search)search.addEventListener('input',handleMapSearchInput);
    const addrInput = el('bp-address');
    if (addrInput) {
      addrInput.addEventListener('input', () => {
        setProjectAddress(addrInput.value);
        // Also propagate to step-4 address field if empty
        const a4 = el('bp-form-address');
        if (a4 && !a4.value) a4.value = addrInput.value;
      });
    }
  }

  function handleMapSearchInput(){pendingLayoutDraft=null;retireParcelContext();if(typeof saveDraft==='function')saveDraft();}

  // -------- STEP 2: fence style picker (photo grid) --------
  // ---- HTML ESCAPING ----------------------------------------------
  // Anything interpolated into innerHTML must be escaped first. Two sources
  // here are outside our control:
  //   * style names/details from settings/global (owner-written, but a name
  //     like 'Chain Link 2" Mesh' silently truncated every alt attribute)
  //   * geocoder results from OpenStreetMap (third-party, publicly editable)
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Shared selection function — used by BOTH the photo grid and the dropdown
  function selectFenceStyle(id, preserveHeight = false) {
    if (!FENCE_PRICING[id]) return;
    const changedStyle = state.fenceId !== id;
    pendingDraftStyle = '';
    state.fenceId = id;
    const fence = FENCE_PRICING[id];

    // Each catalog height is its own style with its own price, so a style
    // that names a height always sets the height. The few styles without
    // one keep the customer's pick from the 4/5/6/8 ft ladder.
    const namedHeight = supportedStyleHeight(fence.name);
    const heightSelect = el('bp-height');
    if (namedHeight !== null) {
      setHeightControl(heightSelect, namedHeight);
      state.height = String(namedHeight);
    } else if (changedStyle && !preserveHeight && heightSelect && ![4, 5, 6, 8].includes(Number(heightSelect.value))) {
      setHeightControl(heightSelect, 6);
      state.height = '6';
    }
    const heightSummary = el('bp-summary-height');
    if (heightSummary) heightSummary.textContent = state.height + ' ft';

    // Update photo-grid visual state
    $$('#bp-fence-options .ballpark-photo-opt').forEach(l => {
      const active = l.dataset.id === id;
      l.style.borderColor = active ? '#1d5eb6' : 'var(--gray-300)';
      l.style.boxShadow = active ? '0 8px 24px rgba(184,148,90,0.25)' : 'none';
      const c = l.querySelector('.bp-check');
      if (c) c.style.display = active ? 'flex' : 'none';
      const radio = l.querySelector('input[type="radio"]');
      if (radio) radio.checked = active;
    });

    // Update dropdown
    const sel = el('bp-fence-select');
    if (sel && sel.value !== id) sel.value = id;

    // Update summary
    const sumStyle = el('bp-summary-style');
    if (sumStyle) sumStyle.textContent = fence.name;

    markComplete('bp-step-2');
    markActive('bp-step-3');
    track('style');
    updateDraftStyleNotice();
    paintStylePickerSelection();
    updateAll();
  }

  function supportedStyleHeight(name) {
    const text = String(name || '').replace(/[‘’ʼ´′]/g, "'");
    const matches = Array.from(text.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:ft\b|feet\b|foot\b|')/gi));
    const heights = [...new Set(matches.map(match => Number(match[1])))];
    // Ranges and multiple choices need a deliberate customer selection.
    // A named height is a specification, not permission to invent a price factor.
    if (heights.length !== 1 || /\d\s*(?:\/|-|–|—|to)\s*\d/i.test(text) || /(?:ft\b|feet\b|foot\b|')\s*\d+(?:\.\d+)?\s*(?:["″]|inches\b|in\b)/i.test(text)) return null;
    return heights[0] >= 2 && heights[0] <= 12 ? heights[0] : null;
  }

  function setHeightControl(select, height) {
    const n = Number(height);
    if (!select || !Number.isFinite(n) || n < 2 || n > 12) return false;
    if (![...select.options].some(option => option.value === String(n))) {
      const option = document.createElement('option');
      option.value = String(n);
      option.textContent = n + ' feet';
      select.appendChild(option);
    }
    select.value = String(n);
    return true;
  }

  function heightNeedsReview() {
    // A style that names its height carries its own price; nothing to review.
    const fence = FENCE_PRICING[state.fenceId];
    if (fence && supportedStyleHeight(fence.name) !== null) return false;
    const height = Number(state.height);
    return Number.isFinite(height) && height >= 2 && height <= 12 && ![4, 5, 6, 8].includes(height);
  }

  function quoteSubmitLabel() {
    return heightNeedsReview() ? 'Request My Free Quote' : 'Unlock My Price';
  }

  function updateDraftStyleNotice() {
    let note=el('bp-saved-style-notice');
    if(!pendingDraftStyle){note?.remove();return;}
    if(!note){const grid=el('bp-style-summary')||el('bp-fence-options');if(!grid)return;note=document.createElement('p');note.id='bp-saved-style-notice';note.setAttribute('role','status');note.setAttribute('data-gfs-protected','');note.style.cssText='padding:16px;background:#edf2f4;border:1px solid #c4d2d9;border-radius:6px;font-size:16px;';grid.before(note);}
    note.textContent=styleCatalogSettled?'Your saved style is unavailable in the loaded catalog. Choose another style to continue; your measurements are kept.':'Restoring your saved fence style. Your measurements are kept while the catalog loads.';
  }

  // Compact catalog browser; selection still flows through selectFenceStyle.
  let styleSearch = '';
  let styleReturnFocus = null;
  let styleBodyOverflow = '';
  let stylePickerWasOpen = false;
  let styleFallbackInert = [];
  function orderedStyleFamilies() {
    return [...new Set(FAMILY_ORDER.concat(Object.keys(FENCE_PRICING).map(familyOf)))];
  }
  function stylePhotoChoices(fence) {
    const safe = url => {
      if (typeof url !== 'string' || url.length > 4096) return '';
      try { const u = new URL(url, location.href); return /^https?:$/.test(u.protocol) ? url : ''; } catch (_) { return ''; }
    };
    const rows = [{url:fence.photoThumb || fence.photo, kind:fence.imageKind || 'material example'}];
    (Array.isArray(fence._allPhotos) ? fence._allPhotos : []).slice(0, 50).forEach((photo, i) => {
      if (!photo || photo.hidden === true || photo.private === true || photo.visible === false || photo.customerVisible === false) return;
      // The reviewed product rendering replaces the older first brochure image.
      if (i === 0 && fence.imageKind === 'product rendering') return;
      rows.push({url:photo.url, kind:photo.auditImageKind || 'photo'});
    });
    const seen = new Set();
    return rows.filter(row => { row.url=safe(row.url); if (!row.url || seen.has(row.url)) return false; seen.add(row.url); return true; }).slice(0, 3);
  }
  function paintStylePickerSelection() {
    const id = state.fenceId, fence = FENCE_PRICING[id], gridId = pickerSelectedId();
    $$('#bp-fence-options .ballpark-photo-opt').forEach(label => {
      const active = label.dataset.id === gridId;
      label.style.borderColor = active ? 'var(--cedar)' : 'var(--line)';
      label.style.boxShadow = active ? '0 0 0 1px var(--cedar)' : 'none';
      const check=label.querySelector('.bp-check'),radio=label.querySelector('input[type="radio"]');
      if(check)check.style.display=active?'flex':'none'; if(radio)radio.checked=active;
    });
    const summary=el('bp-style-summary'); if(!summary)return;
    const photos=fence?stylePhotoChoices(fence):[];
    const signature=JSON.stringify([id,fence?.name,fence?.detail,photos]);
    if(summary.dataset.signature===signature){syncStylePickerPhoto();return;} summary.dataset.signature=signature;
    el('bp-style-selected-name').textContent=fence?fence.name:'Find the fence that fits your yard';
    el('bp-style-selected-detail').textContent=fence?fence.detail:'Browse by material or search a style name. Your measurements stay in place.';
    el('bp-style-browse').textContent=fence?'Change fence style':'Browse fence styles';
    const gallery=el('bp-style-selected-gallery');gallery.replaceChildren();gallery.hidden=!photos.length;
    photos.forEach((photo,i)=>{
      const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
      img.src=thumbOf(photo.url,800);img.dataset.full=photo.url;img.alt=photo.kind==='material example'?'Fence example; not the exact selected style':fence.name+(photo.kind==='product rendering'?' — product rendering':' — style reference '+(i+1));img.loading='lazy';img.decoding='async';
      if(i===0){img.setAttribute('data-editable-img','bp.fence.'+id+'.photo');img.addEventListener('click',event=>{if(!document.body.classList.contains('editing')||img.hasAttribute('data-editable-img'))return;const card=$$('#bp-fence-options .ballpark-photo-opt').find(card=>card.dataset.id===state.fenceId),target=card?.querySelector('img');if(target){event.preventDefault();event.stopImmediatePropagation();target.click();}});}
      caption.textContent=photo.kind==='material example'?'Example photo — not the exact style':photo.kind==='product rendering'?'Product rendering':'Style reference';
      figure.append(img,caption);gallery.append(figure);
    });
    syncStylePickerPhoto();
    if(window.GFSEdit?.refresh)window.GFSEdit.refresh();
    syncStylePickerPhoto();
  }
  function syncStylePickerPhoto() {
    const image=el('bp-style-selected-gallery')?.querySelector('img');if(!image||!FENCE_PRICING[state.fenceId])return;
    const card=$$('#bp-fence-options .ballpark-photo-opt').find(card=>card.dataset.id===state.fenceId),source=card?.querySelector('img');
    // Keep exactly one editor target for the existing persisted image key.
    if(!source){image.setAttribute('data-editable-img','bp.fence.'+state.fenceId+'.photo');return;}
    image.removeAttribute('data-editable-img');image.src=source.src;image.alt=source.alt||FENCE_PRICING[state.fenceId].name;
    image.style.objectFit=source.style.objectFit||'contain';image.style.objectPosition=source.style.objectPosition||'50% 50%';
  }
  // ---- BACK CLOSES OVERLAYS ----
  // On a phone the full-screen map and the style picker feel like screens of
  // their own, so Back should close them instead of leaving the page. Each
  // one adds a history entry while it is open and removes it when closed.
  const overlays = [];
  const afterPops = [];
  let ignorePops = 0;
  function overlayOpened(name, close) {
    if (overlays.some(overlay => overlay.name === name)) return;
    const overlay = { name, close, hasEntry: false };
    overlays.push(overlay);
    const addEntry = () => {
      if (!overlays.includes(overlay)) return; // closed again before we got here
      try { history.pushState({ bpOverlay: true }, ''); overlay.hasEntry = true; } catch (e) { /* history unavailable: Back simply leaves */ }
    };
    // A Back we triggered ourselves (see overlayClosed) may still be on its
    // way. Adding an entry before it lands would be undone by it.
    if (ignorePops > 0) afterPops.push(addEntry); else addEntry();
  }
  function overlayClosed(name) {
    const index = overlays.findIndex(overlay => overlay.name === name);
    if (index < 0) return; // Back already closed it
    const [overlay] = overlays.splice(index, 1);
    if (!overlay.hasEntry) return;
    try { if (history.state && history.state.bpOverlay) { ignorePops += 1; history.back(); } } catch (e) {}
  }
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops -= 1;
      if (!ignorePops) afterPops.splice(0).forEach(addEntry => addEntry());
      return;
    }
    const top = overlays.pop();
    if (top) top.close();
  });

  function closeStylePicker() {
    const dialog=el('bp-style-dialog');if(!dialog?.open)return;
    if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');
    finishStylePickerClose();
  }
  function finishStylePickerClose() {
    if(!stylePickerWasOpen||el('bp-style-dialog')?.open)return;stylePickerWasOpen=false;pickerTarget=null;
    overlayClosed('picker');
    document.body.style.overflow=styleBodyOverflow;
    styleFallbackInert.forEach(([node,value])=>{node.inert=value;});styleFallbackInert=[];
    const focus=styleReturnFocus;styleReturnFocus=null;
    if(focus?.isConnected)focus.focus({preventScroll:true});
  }
  function openStylePicker(target) {
    ensureStylePicker();const dialog=el('bp-style-dialog');if(!dialog||dialog.open)return;
    // `target` is an added style from state.sections; anything else (a click
    // event, nothing) means the main fence.
    pickerTarget=target&&state.sections.includes(target)?target:null;
    const pickerTitle=el('bp-style-dialog-title');if(pickerTitle)pickerTitle.textContent=pickerTarget?'Choose the style for this part':'Choose your fence';
    const pickerSelect=el('bp-fence-select');if(pickerSelect)pickerSelect.value=FENCE_PRICING[pickerSelectedId()]?pickerSelectedId():'';
    styleReturnFocus=document.activeElement;styleBodyOverflow=document.body.style.overflow;stylePickerWasOpen=true;
    document.body.style.overflow='hidden';
    if(typeof dialog.showModal==='function')dialog.showModal();
    else{dialog.setAttribute('open','');styleFallbackInert=[...document.body.children].filter(node=>node!==dialog).map(node=>[node,node.inert]);styleFallbackInert.forEach(([node])=>{node.inert=true;});}
    overlayOpened('picker',closeStylePicker);
    renderMaterialFilter();renderStyleGrid();el('bp-style-search').focus({preventScroll:true});
  }
  function ensureStylePicker() {
    if(el('bp-style-dialog'))return;
    const grid=el('bp-fence-options'),filter=el('bp-material-filter'),select=el('bp-fence-select');if(!grid||!filter||!select)return;
    const summary=document.createElement('section');summary.id='bp-style-summary';summary.className='bp-style-summary';summary.setAttribute('aria-label','Your fence style');
    summary.innerHTML='<div class="bp-style-summary-copy"><span class="bp-style-kicker">YOUR FENCE</span><h3 id="bp-style-selected-name"></h3><p id="bp-style-selected-detail"></p><div id="bp-style-variants" class="bp-variants" data-gfs-protected></div><button type="button" class="btn btn-primary" id="bp-style-browse" aria-haspopup="dialog" aria-controls="bp-style-dialog">Browse fence styles</button></div><div id="bp-style-selected-gallery" class="bp-style-selected-gallery" hidden></div>';
    filter.before(summary);
    const dialog=document.createElement('dialog');dialog.id='bp-style-dialog';dialog.className='bp-style-dialog';dialog.setAttribute('aria-labelledby','bp-style-dialog-title');dialog.setAttribute('aria-describedby','bp-style-dialog-hint');dialog.setAttribute('aria-modal','true');
    dialog.innerHTML='<header class="bp-style-dialog-header"><div><span class="bp-style-kicker">FENCE COLLECTION</span><h2 id="bp-style-dialog-title">Choose your fence</h2><p id="bp-style-dialog-hint">Compare styles without changing your measurements.</p></div><button type="button" id="bp-style-close" aria-label="Close fence styles">×</button></header><div class="bp-style-dialog-tools"><label class="form-label" for="bp-style-search">Search styles</label><input id="bp-style-search" type="search" class="form-input" placeholder="Try Wellington, cedar, black, or 6ft" autocomplete="off"><div id="bp-style-filter-slot"></div><details class="bp-style-quick"><summary>Choose by name</summary><div id="bp-style-select-slot"></div></details></div><p id="bp-style-results" class="bp-style-results" role="status" aria-live="polite"></p>';
    dialog.querySelector('#bp-style-filter-slot').append(filter);
    const selectWrap=select.parentElement;selectWrap.querySelector('label').textContent='All available styles';dialog.querySelector('#bp-style-select-slot').append(selectWrap);
    dialog.append(grid);document.body.append(dialog);
    grid.setAttribute('aria-label','Available fence styles');grid.setAttribute('role','group');
    el('bp-style-browse').addEventListener('click',()=>openStylePicker());el('bp-style-close').addEventListener('click',closeStylePicker);
    grid.addEventListener('click',event=>{if(document.body.classList.contains('editing')&&event.target.closest?.('[data-editable-img]'))closeStylePicker();},true);
    // The existing photo editor can finish after this dialog has closed.
    if(typeof MutationObserver==='function')new MutationObserver(syncStylePickerPhoto).observe(grid,{subtree:true,attributes:true,attributeFilter:['src','alt','style']});
    dialog.addEventListener('close',finishStylePickerClose);
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeStylePicker();});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeStylePicker();});
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();closeStylePicker();return;}
      if(event.key!=='Tab')return;
      const list=[...dialog.querySelectorAll('button,input,select,summary,[tabindex]')].filter(node=>!node.disabled&&node.tabIndex>=0&&node.getClientRects().length);
      if(!list.length){event.preventDefault();return;}const first=list[0],last=list[list.length-1];
      if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
    });
    el('bp-style-search').addEventListener('input',event=>{styleSearch=event.target.value;renderStyleGrid();});
    paintStylePickerSelection();
  }

  // Which material family is currently being shown ('' = all)
  let activeFamily = '';

  // Human labels for the families categoryForName() produces
  const FAMILY_LABELS = {
    'cedar': 'Cedar',
    'treated': 'Treated wood',
    'wood': 'Other wood',
    'picket': 'Picket',
    'vinyl': 'Vinyl',
    'aluminum': 'Aluminum',
    'chainlink': 'Chain link',
    'split-rail': 'Split rail',
  };
  const FAMILY_ORDER = ['cedar', 'treated', 'wood', 'picket', 'vinyl', 'aluminum', 'chainlink', 'split-rail'];

  function familyOf(id) {
    const f = FENCE_PRICING[id];
    return (f && f.category) || categoryForName((f && f.name) || id);
  }

  function renderMaterialFilter() {
    const wrap = el('bp-material-filter');
    if (!wrap) return;
    const present = orderedStyleFamilies().filter(fam =>
      Object.keys(FENCE_PRICING).some(id => familyOf(id) === fam));

    if (activeFamily && !present.includes(activeFamily)) activeFamily = '';
    wrap.style.display = 'flex';

    const chip = (value, label, sub, active) =>
      '<button type="button" data-family="' + esc(value) + '" ' +
      'aria-pressed="' + (active ? 'true' : 'false') + '" ' +
      'style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;' +
      'padding:10px 16px;border-radius:5px;cursor:pointer;font-family:var(--body);' +
      'border:1.5px solid ' + (active ? 'var(--cedar)' : 'var(--line)') + ';' +
      'background:' + (active ? 'var(--cedar)' : 'var(--paper)') + ';' +
      'color:' + (active ? '#fff' : 'var(--ink)') + ';min-height:48px;">' +
      '<span style="font-weight:600;font-size:14px;">' + esc(label) + '</span>' +
      (sub ? '<span style="font-family:var(--mono);font-size:12px;opacity:0.9;">' + esc(sub) + '</span>' : '') +
      '</button>';

    // Count models (one per tile), not every color and height entry.
    const models = ids => modelCards(ids, '').length;
    let html = chip('', 'All styles', models(Object.keys(FENCE_PRICING)) + ' styles', activeFamily === '');
    present.forEach(fam => {
      const count = models(Object.keys(FENCE_PRICING).filter(id => familyOf(id) === fam));
      html += chip(fam, FAMILY_LABELS[fam] || fam,
                   count + (count === 1 ? ' style' : ' styles'),
                   activeFamily === fam);
    });
    wrap.innerHTML = html;

    wrap.querySelectorAll('button[data-family]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFamily = btn.dataset.family || '';
        renderMaterialFilter();
        renderStyleGrid();
        const grid = el('bp-fence-options');
        if (grid) grid.scrollTop = 0;
        wrap.querySelectorAll('button[data-family]').forEach(button=>{if(button.dataset.family===activeFamily)button.focus({preventScroll:true});});
      });
    });
  }

  function visibleStyleIds() {
    const ids = Object.keys(FENCE_PRICING);
    const words=styleSearch.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return ids.filter(id=>(!activeFamily||familyOf(id)===activeFamily)&&words.every(word=>(FENCE_PRICING[id].name+' '+FENCE_PRICING[id].detail+' '+(FAMILY_LABELS[familyOf(id)]||familyOf(id))).toLowerCase().includes(word)));
  }

  function renderStyleGrid() {
    const grid = el('bp-fence-options');
    if (!grid) return;
    if(el('bp-style-dialog')&&!el('bp-style-dialog').open){paintStylePickerSelection();return;}
    const ids = visibleStyleIds();
    // Customers see one tile per model and pick color and height after.
    // In Edit Mode every catalog entry keeps its own tile so each photo
    // and name stays editable.
    const grouped = !document.body.classList.contains('editing');
    const cards = grouped ? modelCards(ids, pickerSelectedId()) : ids.map(id => ({ id: id, title: FENCE_PRICING[id].name, options: '' }));
    const results=el('bp-style-results');if(results)results.textContent=(grouped?cards.length+' fence styles'+(cards.length!==ids.length?' · '+ids.length+' color and height options':''):ids.length+' of '+Object.keys(FENCE_PRICING).length+' styles')+(activeFamily?' · '+(FAMILY_LABELS[activeFamily]||activeFamily):'');
    grid.scrollTop=0;
    if (!ids.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--galv);">No styles match. Try another name or material.</div>';
      return;
    }
    grid.innerHTML = cards.map(card => {
      const id = card.id, fence = FENCE_PRICING[id];
      return `
        <label class="ballpark-photo-opt" data-id="${esc(id)}" style="position:relative;cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid var(--gray-300);transition:all 0.2s ease;display:flex;flex-direction:column;background:var(--white);">
          <input type="radio" name="fenceStyle" value="${esc(id)}" style="position:absolute;opacity:0;pointer-events:none;">
          <div style="aspect-ratio:4/3;background:#e5e7eb;overflow:hidden;display:block;">
            <img src="${esc(thumbOf(fence.photoThumb || fence.photo, 480))}" data-full="${esc(fence.photoThumb || fence.photo)}" alt="${!fence.imageKind||fence.imageKind==='material example'?'Fence example; not the exact selected style':esc(fence.name)+(fence.imageKind==='product rendering'?' — product rendering':'')}" data-editable-img="bp.fence.${esc(id)}.photo" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;display:block;">
          </div>
          <div style="padding:14px 16px;">
            ${fence.photoCaption?'<p style="margin:0 0 8px;font-size:12px;line-height:1.4;color:var(--navy);">'+esc(fence.photoCaption)+'</p>':!fence.imageKind||fence.imageKind==='material example'?'<p style="margin:0 0 8px;font-size:12px;line-height:1.4;color:var(--navy);">'+(fence.photo.endsWith('photo-needed.svg')?'Reference photo needed for this style':'Example photo — not the exact style')+'</p>':''}
            <div style="font-family:var(--serif);font-size:16px;font-weight:600;color:var(--navy);margin-bottom:4px;line-height:1.2;"${grouped?'':' data-editable="bp.fence.'+esc(id)+'.name"'}>${esc(card.title)}</div>
            <div style="font-size:12px;color:var(--gray-700);line-height:1.4;"${grouped?'':' data-editable="bp.fence.'+esc(id)+'.detail"'}>${esc(fence.detail)}</div>
            ${card.options?'<div style="margin-top:6px;font-family:var(--mono);font-size:12px;color:var(--cedar-dk,#174a90);line-height:1.4;">'+esc(card.options)+'</div>':''}
          </div>
          <div class="bp-check" style="position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--navy);font-weight:700;display:none;align-items:center;justify-content:center;font-size:16px;">✓</div>
        </label>
      `;
    }).join('');

    grid.querySelectorAll('.ballpark-photo-opt').forEach(label => {
      label.addEventListener('change', (e) => {
        if(e.target.type!=='radio'||!e.target.checked)return;
        applyPickedStyle(label.dataset.id);
        if(!document.body.classList.contains('editing'))closeStylePicker();
      });
    });
    // Re-apply the selected state after a re-render
    paintStylePickerSelection();
    if (window.GFSEdit && window.GFSEdit.refresh) window.GFSEdit.refresh();
  }

  // ---- YARD SIZE PRESETS -------------------------------------------
  // Drawing a fence line on a satellite map is precise but slow, and it is
  // genuinely awkward on a phone — which is where most of this traffic is.
  // Illustrative linear lengths only; acreage does not define the fence run.
  // Customers can adjust the number or draw their actual layout.
  const SIZE_PRESETS = [
    { label: '100 ft', feet: 100, note: 'small back yard' },
    { label: '150 ft', feet: 150, note: 'typical back yard' },
    { label: '220 ft', feet: 220, note: 'large back yard' },
    { label: '320 ft', feet: 320, note: 'whole lot' },
  ];

  function renderSizePresets() {
    const wrap = el('bp-size-presets');
    if (!wrap) return;
    wrap.innerHTML = SIZE_PRESETS.map(p =>
      '<button type="button" data-feet="' + p.feet + '" ' +
      'style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;' +
      'padding:10px 14px;border:1.5px solid var(--line);background:var(--paper);' +
      'border-radius:5px;cursor:pointer;min-height:48px;font-family:var(--body);color:var(--ink);">' +
      '<span style="font-weight:600;font-size:14px;">' + esc(p.label) + '</span>' +
      '<span style="font-size:12px;color:var(--galv);">' + esc(p.note) + '</span>' +
      '</button>').join('');

    wrap.querySelectorAll('button[data-feet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const lf = el('bp-linear-feet');
        if (!lf) return;
        lf.value = btn.dataset.feet;
        // The pressed state follows the length (see renderSizePresetState).
        lf.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function renderFenceOptions() {
    ensureStylePicker();
    paintStylePickerSelection();
    renderMaterialFilter();
    renderStyleGrid();

    // Dropdown always lists every style, grouped by material, for people who
    // already know what they want.
    const sel = el('bp-fence-select');
    if (sel) {
      let html = '<option value="">— Choose a style —</option>';
      orderedStyleFamilies().forEach(fam => {
        const ids = Object.keys(FENCE_PRICING).filter(id => familyOf(id) === fam);
        if (!ids.length) return;
        html += '<optgroup label="' + esc(FAMILY_LABELS[fam] || fam) + '">';
        ids.forEach(id => {
          const f = FENCE_PRICING[id];
          // Style name only. Publishing the per-foot rate exposes the
          // pricing structure to competitors, and a bare $/ft figure also
          // misleads customers — it ignores gates, height factors, removal
          // and panel rounding, so it never matches the real quote.
          html += `<option value="${esc(id)}">${esc(f.name)}</option>`;
        });
        html += '</optgroup>';
      });
      sel.innerHTML = html;
      if (!sel._bound) {
        sel.addEventListener('change', () => { if (sel.value) {applyPickedStyle(sel.value);closeStylePicker();} });
        sel._bound = true;
      }
      if (state.fenceId) sel.value = state.fenceId;
    }
  }
  function bindStep3() {
    const heightSel = el('bp-height');
    const sgSel     = el('bp-single-gates');
    const dgSel     = el('bp-double-gates');
    const removeChk = el('bp-remove-old');
    const removalMaterial = el('bp-existing-material'), removalFields = el('bp-removal-fields');

    function update() {
      if (heightSel) state.height = heightSel.value;
      // A style that names its height sets the height (see selectFenceStyle).
      const lockedHeight = FENCE_PRICING[state.fenceId] ? supportedStyleHeight(FENCE_PRICING[state.fenceId].name) : null;
      if (lockedHeight !== null && Number(state.height) !== lockedHeight) { setHeightControl(heightSel, lockedHeight); state.height = String(lockedHeight); }
      if (sgSel)     state.singleGates = Number(sgSel.value);
      if (dgSel)     state.doubleGates = Number(dgSel.value);
      if (removeChk) state.removeOldFence = removeChk.checked;
      state.existingFenceMaterial = removalMaterial && existingFenceMaterialLabel(removalMaterial.value) ? removalMaterial.value : '';
      if (removalFields) { removalFields.hidden = !state.removeOldFence; removalFields.style.display = state.removeOldFence ? '' : 'none'; }
      if (removalMaterial) { removalMaterial.disabled = !state.removeOldFence; removalMaterial.required = state.removeOldFence; if (!state.removeOldFence || state.existingFenceMaterial) removalMaterial.removeAttribute('aria-invalid'); }
      el('bp-summary-height').textContent = state.height + ' ft';
      const gates = [];
      if (state.singleGates) gates.push(state.singleGates + ' walk');
      if (state.doubleGates) gates.push(state.doubleGates + ' drive');
      el('bp-summary-gates').textContent = gates.length ? gates.join(', ') : 'None';
      el('bp-summary-removal').textContent = state.removeOldFence ? (existingFenceMaterialLabel() || 'Choose existing material') : 'No';
      updateAll();
    }
    [heightSel, sgSel, dgSel, removeChk, removalMaterial].filter(Boolean).forEach(c => c.addEventListener('change', update));
    syncStep3 = update;   // let the map drawing code reuse this exact path
    window.syncStep3 = update;  // mirror on window: bulletproof against any
                                // stale-cache page calling it from outside
    update();
  }

  // -------- STEP 4: lead capture (unlocks price reveal) --------
  function submissionPrice(errorEl) {
    let message = '', target = null;
    if (!state.fenceId || !FENCE_PRICING[state.fenceId]) {
      message = 'Choose a fence style before requesting your planning range.';
      target = el('bp-fence-select');
    } else if (!Number.isFinite(Number(state.linearFeet)) || Number(state.linearFeet) <= 0) {
      message = 'Draw your fence line or enter a length greater than zero before continuing.';
      target = el('bp-linear-feet');
    }
    if (!message && state.linearFeet > 2000) { message = 'For a fence longer than 2,000 feet, request a detailed quote. The online calculator cannot price this length.'; target = el('bp-linear-feet'); }
    if (!message && state.removeOldFence && !existingFenceMaterialLabel()) { message = 'Choose the material of the existing fence to include its removal.'; target = el('bp-existing-material'); }
    if (!message) { const sectionIssue = sectionsIssue(); if (sectionIssue) { message = sectionIssue; target = el('bp-sections'); state.sectionsFlagged = true; renderSections(); } }
    if (!message && typeof currentMapIssue==='function') { message=currentMapIssue(); if(message)target=el('bp-map-measurements'); }
    let price = null;
    if (!message) {
      // Keep the existing contact/receipt flow for heights that need staff pricing.
      if (heightNeedsReview()) return { requiresReview: true };
      price = calculatePrice();
      if (!price || ![price.low, price.high, price.total].every(Number.isFinite) || price.low < 0 || price.high < price.low || price.total <= 0) {
        message = 'Pricing is unavailable for this selection. Choose another style or request an on-site estimate.';
        target = el('bp-fence-select');
      }
    }
    if (message) {
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        errorEl.classList.add('show');
      }
      if (target) {
        target.setAttribute('aria-invalid', 'true');
        target.focus();
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      return null;
    }
    for (const id of ['bp-fence-select', 'bp-linear-feet', 'bp-existing-material']) el(id)?.removeAttribute('aria-invalid');
    return price;
  }

  function bindStep4() {
    const form = el('bp-form');
    if (!form) return;
    window.GFSRequestFlow?.bindForm(form,'ballpark',{
      onUpdate(){const button=form.querySelector('button[type="submit"]');if(button)button.disabled=false;resetEmailRequest();},
      onNew(){acceptedBallparkReceipt='';state.priceUnlocked=false;resetEmailRequest();el('bp-success')?.classList.remove('show');updateAll();}
    });
    function resetEmailRequest(){const emailButton=el('bp-action-email'),emailInput=el('bp-email-address');if(emailButton){emailButton.disabled=false;emailButton.textContent='Request emailed estimate';}if(emailInput)emailInput.disabled=false;const status=el('bp-email-status');if(status){status.textContent='';status.style.display='none';}}

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const successEl = el('bp-success');
      const errorEl = el('bp-error');
      if (submitBtn.disabled) return;
      if (!photoReadyForSubmission()) return;
      const price = submissionPrice(errorEl);
      if (!price) return;
      // A message from an earlier try no longer applies.
      errorEl.textContent = ''; errorEl.classList.remove('show'); errorEl.style.display = '';
      const fd = new FormData(form);
      const fence = FENCE_PRICING[state.fenceId] || {};
      const payload = {
        name: fd.get('name'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        address: fd.get('address') || state.address,
        fenceType: fence.category || '',
        // Use the style's real name (Executive-app synced styles have no
        // separate `style` field, so this was arriving empty and the lead
        // reached the Executive app with no style information at all).
        fenceStyle: fence.name || fence.style || '',
        linearFeet: state.linearFeet,
        height: state.height,
        singleGates: state.singleGates,
        doubleGates: state.doubleGates,
        removeOldFence: state.removeOldFence,
        existingFenceMaterial: state.existingFenceMaterial,
        source: 'ballpark-quote-tool',
        notes: [fd.get('notes'), removalScopeNote(), price.requiresReview ? 'Quote review requested: '+state.height+' ft height. No automatic price range was provided.' : 'Ballpark range: '+formatPrice(price.low)+'–'+formatPrice(price.high)].filter(Boolean).join(' · '),
        geometry: collectGeometry(),
        photo: leadPhoto || '',
        // How to reach them, when they want it built, what they told us
        // about the yard, and each fence style when there is more than one.
        contactMethod: fd.get('contactMethod') || '',
        bestTime: fd.get('bestTime') || '',
        timeline: fd.get('timeline') || '',
        siteNotes: state.siteNotes.slice(),
        sections: state.sections.length ? sectionLines().join('\n') : '',
        priceRange: price.requiresReview ? '' : formatPrice(price.low)+'–'+formatPrice(price.high),
      };

      submitBtn.disabled = true;
      submitBtn.textContent = price.requiresReview ? 'Sending your quote request…' : 'Unlocking your quote…';
      successEl.classList.remove('show');
      errorEl.classList.remove('show');
      errorEl.style.display = '';

      // Defensive: if leads.js failed to load (ad blocker, network hiccup, or
      // a script error), don't throw an unhandled TypeError that silently
      // swallows the customer's request. Tell them how to reach us instead.
      if (!window.GFSLeads || typeof window.GFSLeads.submit !== 'function') {
        console.error('[Ghareeb Ballpark] GFSLeads unavailable — lead capture script did not load');
        errorEl.textContent = 'We couldn\'t submit your request right now. Please call (419) 214-2107 and we\'ll get you a quote right away.';
        errorEl.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = quoteSubmitLabel();
        return;
      }

      let result;
      try {
        window.GFSRequestFlow?.setBusy(form,true);
        result = await window.GFSLeads.submit(payload,window.GFSRequestFlow?.optionsFor(form)||{});
        window.GFSRequestFlow?.setBusy(form,false);
        window.GFSRequestFlow?.showResult(form,result);
      } catch (err) {
        // Network failure, Firestore rejection, anything unexpected — never
        // leave the button stuck on "Unlocking your quote…" with no recourse.
        window.GFSRequestFlow?.setBusy(form,false);
        console.error('[Ghareeb Ballpark] Lead submission threw:', err);
        errorEl.textContent = 'Something went wrong submitting your request. Please try again, or call (419) 214-2107.';
        errorEl.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = quoteSubmitLabel();
        return;
      }

      if (result.ok) {
        const originalReceipt=result.acquisitionReceipt||result.id;
        acceptedBallparkReceipt = /^web_[a-zA-Z0-9_-]{16,80}$/.test(originalReceipt || '') ? originalReceipt : '';
        successEl.textContent=result.reused?'This project request has already been received.':result.requestAction==='project_update'?'Your project update has been received for review.':price.requiresReview?'Your quote request has been received. Our team will review your selected height and project details, then follow up with you.':'Your planning range is ready.';
        const emailInput = el('bp-email-address');
        if (emailInput && !emailInput.value) emailInput.value = String(fd.get('email') || '').trim();
        // UNLOCK the price reveal
        state.priceUnlocked = true;
        if(!result.reused&&!result.requestAction&&!price.requiresReview)track('unlocked');
        clearDraft();
        updateAll();
        successEl.classList.add('show');
        // Replace form with success message but keep the price visible
        form.style.display = 'none';
        markComplete('bp-step-4');
        // Smooth scroll to the price reveal so users see it
        const priceEl = el('bp-price-card');
        if (priceEl) priceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        errorEl.textContent = (result.errors || ['Submission failed']).join('. ');
        errorEl.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = quoteSubmitLabel();
        if (result.field === 'contactMethod' && window.GFSLeads.flagReach) window.GFSLeads.flagReach(form);
      }
    });
  }

  // -------- LIVE PRICE REVEAL --------
  function updateAll() {
    try { normalizeSections(); } catch (e) { console.warn('[Ghareeb Ballpark] section check skipped:', e); }
    updateAllCore();
    try { renderPlus(); } catch (e) { console.warn('[Ghareeb Ballpark] control refresh skipped:', e); }
  }
  function updateAllCore() {
    saveDraft();
    const reviewHeight = heightNeedsReview();
    const reviewNotice = el('bp-height-review');
    if (reviewNotice) {
      reviewNotice.hidden = !reviewHeight;
      reviewNotice.textContent = reviewHeight ? 'Your '+state.height+' ft height needs a quote review. Keep your selections and send the form below; our team will confirm options and pricing.' : '';
    }
    const submitButton = el('bp-form')?.querySelector('button[type="submit"]');
    if (submitButton && !submitButton.disabled) submitButton.textContent = quoteSubmitLabel();
    const formTitle = el('bp-contact-title'), formHint = el('bp-contact-hint');
    if (formTitle) formTitle.textContent = state.priceUnlocked ? 'Your request is in.' : reviewHeight ? 'Request your free quote.' : 'Unlock your estimate.';
    if (formHint) formHint.textContent = state.priceUnlocked ? 'We have your details and will reach out the way you asked.' : reviewHeight ? 'Send your selections to our team for a height and price review. No automatic price range is available for this height.' : 'Share your details to view the range and request a project review from our team.';
    const price = calculatePrice();
    const priceCard = el('bp-price-card');
    const priceRange = el('bp-price-range');
    const priceHint  = el('bp-price-hint');
    const priceBreakdown = el('bp-price-breakdown');

    if (!priceCard) return;

    if (!price) {
      // Not enough info yet
      const needsQuote = state.fenceId && state.linearFeet > 0 && FENCE_PRICING[state.fenceId];
      const missingRemoval = state.removeOldFence && !existingFenceMaterialLabel();
      const sectionIssue = needsQuote ? sectionsIssue() : '';
      if (priceRange) priceRange.textContent = state.linearFeet > 2000 ? 'This length needs a custom quote' : missingRemoval ? 'Choose the existing fence material' : sectionIssue ? 'Finish your added fence style' : needsQuote ? (reviewHeight ? 'This height needs a quote review' : 'This style needs a custom quote') : 'Your price in 4 quick steps';
      if (priceHint) {
        priceHint.replaceChildren();
        if (state.linearFeet > 2000) {
          const quoteLink = document.createElement('a');
          quoteLink.href = '/quote/form/'; quoteLink.textContent = 'Request a free detailed quote'; quoteLink.style.color = 'inherit'; priceHint.appendChild(quoteLink);
        } else if (missingRemoval) {
          priceHint.textContent = 'Select the fence being removed in step 3, or turn off removal if it is not needed.';
        } else if (sectionIssue) {
          priceHint.textContent = sectionIssue;
        } else if (needsQuote && reviewHeight) {
          priceHint.textContent = state.priceUnlocked ? 'Your request is received. Our team will follow up about specifications and pricing.' : 'Use step 4 to send your plan for a free quote. Your measurements and selections stay with your request.';
        } else if (needsQuote) {
          const quoteLink = document.createElement('a');
          quoteLink.href = '/quote/form/';
          quoteLink.textContent = 'Request a free detailed quote';
          quoteLink.style.color = 'inherit';
          priceHint.appendChild(quoteLink);
        } else priceHint.textContent = 'Then unlock your price in step 4';
      }
      if (priceBreakdown) priceBreakdown.style.display = 'none';
      renderFinance(null);
      renderComparePanel(false);
      renderPostUnlockActions(false);
      return;
    }

    const showDetail = state.priceUnlocked === true;

    if (showDetail) {
      // Show the actual range
      if (priceRange) {
        priceRange.innerHTML = `${formatPrice(price.low)} – ${formatPrice(price.high)}`;
      }
      if (priceHint) priceHint.textContent = 'Planning range. A site review confirms the final scope and price.';
      if (priceBreakdown) {
        priceBreakdown.style.display = 'block';
        priceBreakdown.innerHTML = `
          ${price.parts.map(part => `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.12);">
            <span style="opacity:0.8;">${price.parts.length > 1 ? esc(part.name) : 'Fence'} (${part.feet} ft):</span>
            <span style="font-weight:600;white-space:nowrap;">${formatPrice(Math.round(part.fenceCost))}</span>
          </div>
          ${part.waste > 0 ? `<div style="padding:6px 0 10px;font-size:12px;color:rgba(250,246,239,0.6);line-height:1.5;border-bottom:1px solid rgba(255,255,255,0.12);">
            Billed at ${part.billableFeet} ft &mdash; this style installs in ${part.sectionSize} ft sections,
            so the last panel is charged whole. Same way we quote it in person.
          </div>` : ''}`).join('')}
          ${price.breakdown.gates ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.12);">
            <span style="opacity:0.8;">Gates:</span>
            <span style="font-weight:600;">${formatPrice(price.breakdown.gates)}</span>
          </div>` : ''}
          ${price.breakdown.removal ? `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.12);">
            <span style="opacity:0.8;">Removal:</span>
            <span style="font-weight:600;">${formatPrice(price.breakdown.removal)}</span>
          </div>` : ''}
        `;
      }
      renderFinance(price);
      renderComparePanel(true);
      renderPostUnlockActions(true);
    } else {
      if (priceRange) priceRange.textContent = 'Your estimate is ready';
      if (priceHint) priceHint.textContent = 'Add your contact details in step 4 to see your price.';
      if (priceBreakdown) { priceBreakdown.style.display = 'none'; priceBreakdown.innerHTML = ''; }
      renderFinance(null);
      renderComparePanel(false);
      renderPostUnlockActions(false);
    }

    // Step progress
    if (state.linearFeet > 0) markComplete('bp-step-1');
    if (state.fenceId) markComplete('bp-step-2');
    if (state.fenceId && state.height) markComplete('bp-step-3');
  }

  // ---- COMPARE MATERIALS PANEL ----
  // Shown after unlock. Keep the customer's pick and a small material comparison
  // instead of rendering hundreds of near-identical catalog rows and photos.
  function renderComparePanel(unlocked) {
    const panel = el('bp-compare-panel');
    if (!panel) return;
    if (!unlocked || !state.linearFeet) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'block';
    // Re-price the customer's project with each other style as the main fence
    const rows = comparisonRows();

    const list = panel.querySelector('#bp-compare-list');
    if (!list) return;
    list.innerHTML = pickComparisonSet(rows, state.fenceId, 8).map(r => {
      const isSelected = r.id === state.fenceId;
      return `
        <button type="button" data-id="${esc(r.id)}" class="bp-compare-row" style="display:grid;grid-template-columns:64px 1fr auto;gap:14px;padding:14px;border:2px solid ${isSelected ? 'var(--gold)' : 'var(--gray-100)'};border-radius:6px;background:${isSelected ? 'rgba(184,148,90,0.05)' : 'var(--white)'};cursor:pointer;width:100%;text-align:left;transition:all 0.15s ease;align-items:center;">
          <img src="${esc(r.fence.photo)}" alt="" width="64" height="48" loading="lazy" decoding="async" style="width:64px;height:48px;border-radius:4px;object-fit:cover;background:#e5e7eb;">
          <div>
            <div style="font-family:var(--serif);font-size:15px;font-weight:600;color:var(--navy);">${esc(r.fence.name)}${isSelected ? '  <span style="color:var(--gold-deep);font-size:11px;letter-spacing:0.1em;">YOUR PICK</span>' : ''}</div>
            <div style="font-size:12px;color:var(--gray-700);">${esc(r.fence.detail)}</div>
          </div>
          <div style="font-family:var(--serif);font-size:17px;font-weight:600;color:var(--navy);white-space:nowrap;">
            ${formatPrice(r.price.low)} – ${formatPrice(r.price.high)}
          </div>
        </button>
      `;
    }).join('');
    // Allow clicking a row to switch the selection
    list.querySelectorAll('.bp-compare-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        selectFenceStyle(id);
        // Scroll the price card into view
        const priceCard = el('bp-price-card');
        if (priceCard) priceCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  // Other styles priced for the same project. Only styles at the same
  // height as the customer's pick are compared (a 4 ft picket against a
  // 6 ft privacy fence is not a like-for-like comparison). Cheapest first.
  function comparisonRows() {
    const current = FENCE_PRICING[state.fenceId];
    const height = current ? partHeight(current, state.height) : Number(state.height);
    return Object.entries(FENCE_PRICING).map(([id, fence]) => {
      const named = supportedStyleHeight(fence.name);
      if (id !== state.fenceId && named !== null && named !== height) return null;
      const price = calculatePrice(id);
      return price ? { id, fence, price, name: fence.name, low: price.low, high: price.high, family: categoryForName(fence.name || id) } : null;
    }).filter(Boolean).sort((a, b) => a.price.total - b.price.total);
  }

  // ---- POST-UNLOCK ACTIONS: 3D Preview + PDF Download ----
  // A line under the buttons, instead of a pop-up, when one is not ready yet.
  function actionNote(message) {
    const status = el('bp-email-status');
    if (!status) return;
    status.style.display = 'block'; status.style.color = 'var(--stop)'; status.textContent = message;
  }
  function renderPostUnlockActions(unlocked) {
    const area = el('bp-actions');
    if (!area) return;
    if (!unlocked) {
      area.style.display = 'none';
      return;
    }
    area.style.display = 'flex';
    const bookingLink=area.querySelector('a[href*="quote/book"]');
    if(bookingLink&&window.GFSRequestFlow)bookingLink.href=window.GFSRequestFlow.bookingUrl(el('bp-form'));
    // Wire buttons (only once)
    if (!area.dataset.bound) {
      area.dataset.bound = 'yes';
      const view3d = el('bp-action-3d');
      const dlPdf  = el('bp-action-pdf');
      if (view3d) view3d.addEventListener('click', () => {
        if (window.GFSFence3D) {
          // Expose pricing data so the 3D module can show the right title
          window.GFS_BALLPARK_FENCES = FENCE_PRICING;
          track('3d');
          window.GFSFence3D.open(state.fenceId, parseFloat(state.height), state.linearFeet);
        } else {
          actionNote('The 3D preview is still loading. Give it a moment and try again.');
        }
      });
      if (dlPdf) dlPdf.addEventListener('click', () => {
        if (!state.priceUnlocked) return;
        const price = calculatePrice();
        if (!price) return;
        const fence = FENCE_PRICING[state.fenceId];
        // Build comparisons for the PDF — same spec priced across materials.
        // With ~100 styles synced from the Executive app, dumping every one
        // would overflow the PDF page (it fits ~10 rows). Instead show the
        // customer's pick plus one representative per fence family.
        const allPriced = comparisonRows().map(row => ({ id: row.id, name: row.name, low: row.low, high: row.high, family: row.family }));

        const comparisons = pickComparisonSet(allPriced, state.fenceId, 8);

        if (window.GFSEstimatePDF) {
          // Try to pull customer name + address from the submitted form
          const form = el('bp-form');
          const customerName = (form && form.querySelector('[name="name"]') && form.querySelector('[name="name"]').value) || '';
          const address = (el('bp-form-address') && el('bp-form-address').value) || state.address || '';
          const contact = form ? new FormData(form) : null;
          window.GFSEstimatePDF.download({
            customerName, address,
            fenceId: state.fenceId,
            fenceName: fence.name,
            linearFeet: state.linearFeet,
            height: state.height,
            singleGates: state.singleGates,
            doubleGates: state.doubleGates,
            removeOldFence: state.removeOldFence,
        existingFenceMaterial: state.existingFenceMaterial,
            priceLow: price.low,
            priceHigh: price.high,
            comparisons,
            // Every fence style in the project, what the customer told us
            // and the drawing, so the printed sheet matches the request.
            parts: describeParts(),
            siteNotes: state.siteNotes.slice(),
            contactMethod: (contact && contact.get('contactMethod')) || '',
            bestTime: (contact && contact.get('bestTime')) || '',
            timeline: (contact && contact.get('timeline')) || '',
            reference: acceptedBallparkReceipt,
            geometry: collectGeometry(),
            photoUrl: thumbOf(fence.photoThumb || fence.photo, 900),
            // Say what the picture is: many styles only have a material example.
            photoCaption: !fence.imageKind || fence.imageKind === 'material example' ? 'Example photo. Not the exact style.'
              : fence.imageKind === 'product rendering' ? 'Product rendering of ' + fence.name + '.' : fence.name + '.',
          });
        } else {
          actionNote('The estimate is still loading. Give it a moment and try again.');
        }
      });
    }
  }

  // -------- STEP 1B: SATELLITE MAP + FENCE LINE DRAWING --------
  // Uses Leaflet + ESRI World Imagery (free, no API key required).
  // Address geocoding via OpenStreetMap's Nominatim (free, no API key).
  // User draws a polyline along their fence path; we calculate total
  // length from the geo coordinates using each segment's distanceTo.
  let map = null;

  // -------- MAP STATUS BANNER --------
  // Shows the user (and us, when debugging) exactly what's happening with
  // the map. Without this, silent failures are impossible to diagnose.
  function showMapStatus(message, kind) {
    const wrap = el('bp-map');
    if (!wrap) return;
    let banner = el('bp-map-status');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'bp-map-status';
      banner.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(15,23,42,0.92);color:#fafafa;padding:14px 22px;border-radius:6px;font-size:14px;line-height:1.5;text-align:center;max-width:80%;z-index:5;backdrop-filter:blur(6px);box-shadow:0 8px 24px rgba(0,0,0,0.3);';
      wrap.style.position = 'relative';
      wrap.appendChild(banner);
    }
    const colors = {
      loading: 'rgba(15,23,42,0.92)',
      error:   'rgba(120,30,30,0.94)',
      success: 'rgba(20,90,50,0.92)',
    };
    banner.style.background = colors[kind] || colors.loading;
    banner.innerHTML = message;
  }
  function hideMapStatus() {
    const banner = el('bp-map-status');
    if (banner) banner.remove();
  }

  function initCoach() {
    // Instructions stay beside the map, and can be reopened at any time.
    const help=el('bp-sketch-help');if(help)help.open=true;
  }

  let mapOpening = null, mapReady = false;
  function bindMapLauncher() {
    const mapHost=el('bp-map');if(mapHost)mapHost.style.isolation='isolate';
    el('bp-open-map')?.addEventListener('click', async () => {await requestMap();el('bp-map-tools')?.scrollIntoView?.({block:'start',behavior:'auto'});});
    el('bp-use-length')?.addEventListener('click',()=>{const input=el('bp-linear-feet');input?.focus?.({preventScroll:true});input?.scrollIntoView?.({block:'center',behavior:'auto'});});
    window.addEventListener('gfs-gmaps-auth-failed', () => {
      // Authentication can fail after the SDK callback and even after Map().
      // Let an in-progress launch settle before making one recovery attempt.
      Promise.resolve(mapOpening).then(() => {
        if (activeDrawingEngine !== 'google') return;
        mapReady=false;
        return requestMap();
      });
    });
  }
  function requestMap() {
    if (mapOpening) return mapOpening;
    if (mapReady) return Promise.resolve(true);
    const button=el('bp-open-map'), tools=el('bp-map-tools'), note=el('bp-map-load-note');
    if(tools)tools.hidden=false;
    if(button){button.disabled=true;button.textContent='Loading drawing map…';button.setAttribute('aria-expanded','true');}
    if(note)note.textContent='You can keep entering your length and choosing a style while the map loads.';
    const resuming=!!pendingLayoutDraft||(window.GFS_GOOGLE_MAPS_AUTH_FAILED&&activeDrawingEngine==='google');
    mapOpening=initMap().then(ready=>{
      mapReady=ready;
      if(button){button.disabled=ready;button.textContent=ready?'Drawing map open':'Try loading the map again';}
      if(note)note.textContent=ready?'Map measurements are approximate. Final measurements are confirmed on site.':'The map is unavailable right now. You can still enter your approximate length above.';
      if(ready&&!resuming){initCoach();openMapForPhone();}
      return ready;
    }).finally(()=>{mapOpening=null;});
    return mapOpening;
  }
  async function initMap() {
    showMapStatus('Loading map…', 'loading');
    const loader=window.GFSBallparkMapLoader;
    if(!loader){showMapStatus('Map unavailable. Enter your approximate length above.', 'error');return false;}
    try {
      if(window.GFS_GOOGLE_MAPS_AUTH_FAILED&&activeDrawingEngine==='leaflet'&&map&&pendingLayoutDraft){
        if(restoreDraftGeometry()){hideMapStatus();return true;}
        showMapStatus('Your drawing is kept, but could not be restored. Try loading the map again before sending.', 'error');return false;
      }
      if(window.GFS_GOOGLE_MAPS_AUTH_FAILED && gMap && !prepareGoogleFallback())return false;
      if(await loader.loadGoogle()) {
        try {
          initGoogleMap();initAutocomplete();hideMapStatus();return true;
        } catch(error) { console.warn('Google map initialization failed:',error); }
      }
      showMapStatus('Loading an alternative map…', 'loading');
      await loader.loadLeaflet();
      initLeafletMap();
      if(pendingLayoutDraft){showMapStatus('Your drawing is kept, but could not be restored. Try loading the map again before sending.', 'error');return false;}
      hideMapStatus();return true;
    } catch(error) {
      console.warn('Drawing map unavailable:',error);
      showMapStatus('Map unavailable. Enter your approximate length above.', 'error');return false;
    }
  }

  function prepareGoogleFallback() {
    const paths=mapPaths('google'),gates=mapGates('google');
    const hasDrawing=paths.some(line=>line.length)||gates.length;
    const geometry=hasDrawing?captureDraftGeometry():null;
    // Retain incomplete or address-mismatched drawings on the original map.
    // Only replace a map when every drawn point can be restored unchanged.
    if(hasDrawing&&(!geometry||paths.some(line=>line.length===1))){
      showMapStatus('The map became unavailable. Your drawing is kept. Clear the drawing to load an alternative map, or enter your length and request a detailed quote.', 'error');
      return false;
    }
    if(geometry)pendingLayoutDraft={geometry,address:draftAddress(state.address),snapshot:draftInputSnapshot()};
    clearDrawingPreview('google');retireParcelContext();
    if(gClickListener)google.maps.event.removeListener(gClickListener);gClickListener=null;
    for(const item of [...gFenceLines,...gWalkGates,...gDriveGates,gActivePolyline].filter(Boolean)){
      google.maps.event.clearInstanceListeners(item);item.setMap(null);
    }
    google.maps.event.clearInstanceListeners(gMap);
    gMap=null;gFenceLines=[];gWalkGates=[];gDriveGates=[];gActivePolyline=null;gUndoStack=[];activeDrawingEngine=null;
    el('bp-map')?.replaceChildren();
    // Remove Google Places/search handlers before wiring the fallback search.
    for(const id of ['bp-map-search','bp-map-search-btn']){
      const node=el(id);if(!node)continue;
      const replacement=node.cloneNode(true);if('value' in node)replacement.value=node.value;
      delete replacement.dataset.acBound;
      if(id==='bp-map-search')replacement.addEventListener('input',handleMapSearchInput);
      node.replaceWith(replacement);
    }
    return true;
  }

  // Measurement and placement share one coordinate model; lead/pricing units stay gross feet.
  let mapMeasurementUnit='ft',lastMapFeet=0,mapPreview=null,activeDrawingEngine=null;
  let gMoveListener=null,gDoubleClickListener=null,lMoveHandler=null,lDoubleClickHandler=null;
  let gPreviewLine=null,lPreviewLine=null,parcelLookupRevision=0;
  // Restore only this tab's bounded geometry, after its chosen map is ready.
  let pendingLayoutDraft=null,restoringLayoutDraft=false,layoutAddress=null;
  let parcelAddress=null;
  function draftAddress(value){return String(value||'').trim();}
  function draftInputSnapshot(){return JSON.stringify([draftAddress(state.address),Number(state.linearFeet)||0,Number(state.singleGates)||0,Number(state.doubleGates)||0]);}
  function validDraftGeometry(value){
    try{
      if(!value||value.v!==1||JSON.stringify(value).length>45000||!Array.isArray(value.lines)||!value.lines.length||value.lines.length>100||!Array.isArray(value.gates)||value.gates.length>200)return null;
      const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
      if(value.lines.some(line=>!Array.isArray(line)||line.length<2||!line.every(valid))||value.lines.reduce((n,line)=>n+line.length,0)>3000||value.gates.some(g=>!valid(g)||!['walk','drive'].includes(g.type)))return null;
      const point=p=>({lat:p.lat,lng:p.lng});
      return {v:1,lines:value.lines.map(line=>line.map(point)),gates:value.gates.map(g=>({type:g.type,...point(g)}))};
    }catch{return null;}
  }
  function captureDraftGeometry(){
    const kind=activeDrawingEngine;
    if(!kind||layoutAddress!==null&&layoutAddress!==draftAddress(state.address))return null;
    const lines=mapPaths(kind).filter(line=>line.length>=2);
    const gates=mapGates(kind).map(g=>({type:g.type,...g.point}));
    return validDraftGeometry({v:1,lines,gates});
  }
  function retireParcelContext(){
    parcelLookupRevision++;clearParcelShapes();parcelRing=null;parcelHoles=[];parcelAddress=null;
    const panel=el('bp-setback');if(panel)panel.style.display='none';
    const info=el('bp-parcel-info');if(info)info.replaceChildren();
  }
  function setProjectAddress(value){
    const next=String(value||'');
    if(draftAddress(next)!==draftAddress(state.address)){
      pendingLayoutDraft=null;retireParcelContext();
    }
    state.address=next;
    for(const id of ['bp-address','bp-form-address']){const input=el(id);if(input&&input.value!==next)input.value=next;}
    if(typeof saveDraft==='function')saveDraft();
    if(activeDrawingEngine)renderMapMeasurements(activeDrawingEngine);
  }
  function confirmDrawingAddress(){
    if(!activeDrawingEngine||!mapPaths(activeDrawingEngine).some(line=>line.length>=2)||layoutAddress===null||layoutAddress===draftAddress(state.address))return;
    layoutAddress=draftAddress(state.address);renderMapMeasurements(activeDrawingEngine);
    if(typeof saveDraft==='function')saveDraft();
  }
  function queueDraftGeometry(d){
    pendingLayoutDraft=null;
    if(d.version!==2||!Number.isFinite(d.savedAt)||d.savedAt<=0||d.savedAt>Date.now()+60000||Date.now()-d.savedAt>86400000)return;
    if(d.unit==='m'||d.unit==='ft')mapMeasurementUnit=d.unit;
    const units=el('bp-map-units');if(units)units.value=mapMeasurementUnit;
    const geometry=validDraftGeometry(d.geometry);
    if(!geometry||draftAddress(d.geometryAddress)!==draftAddress(d.address)||draftAddress(d.address)!==draftAddress(state.address))return;
    pendingLayoutDraft={geometry,address:draftAddress(d.address),snapshot:draftInputSnapshot()};
    restoreDraftGeometry();
  }
  function restoreDraftGeometry(){
    const pending=pendingLayoutDraft,kind=activeDrawingEngine;
    if(!pending||!kind||!window.GFSMapGeometry)return false;
    if(pending.snapshot!==draftInputSnapshot()||pending.address!==draftAddress(state.address)||(kind==='google'?gActivePolyline:lActivePolyline)||mapPaths(kind).some(line=>line.length)||mapGates(kind).length){pendingLayoutDraft=null;return false;}
    pendingLayoutDraft=null;restoringLayoutDraft=true;
    const lines=[],gates=[],undo=kind==='google'?gUndoStack:lUndoStack,undoStart=undo.length;
    const originalLines=(kind==='google'?gFenceLines:lFenceLines).slice(),originalWalk=(kind==='google'?gWalkGates:lWalkGates).slice(),originalDrive=(kind==='google'?gDriveGates:lDriveGates).slice();
    try{
      for(const points of pending.geometry.lines){
        if(kind==='google'){
          const line=new google.maps.Polyline({path:points,strokeColor:'#00E5A0',strokeWeight:6,strokeOpacity:1,editable:true,map:gMap});
          lines.push(line);gFenceLines.push(line);gUndoStack.push({type:'fence',item:line});
          ['set_at','insert_at','remove_at'].forEach(event=>line.getPath().addListener(event,updateGoogleStats));
        }else{
          const line=L.polyline(points.map(p=>[p.lat,p.lng]),{color:'#00E5A0',weight:6}).addTo(map);
          lines.push(line);lFenceLines.push(line);lUndoStack.push({type:'fence',item:line});enableLeafletEditing(line);
        }
      }
      for(const gate of pending.geometry.gates){
        // Keep the saved centre exactly, including an invalid gate needing review.
        const marker=kind==='google'?addGoogleGate(gate.type,gate,true):addLeafletGate(gate.type,gate,true);gates.push(marker);
      }
      layoutAddress=pending.address;
      lastMapFeet=Math.round(window.GFSMapGeometry.summary(mapPaths(kind),mapGates(kind)).totalFeet);
      if(kind==='google'){
        const bounds=new google.maps.LatLngBounds();pending.geometry.lines.flat().forEach(p=>bounds.extend(p));gMap.fitBounds(bounds);
      }else map.fitBounds(pending.geometry.lines.flat().map(p=>[p.lat,p.lng]));
      renderMapMeasurements(kind);
      const hint=el('bp-draw-hint');if(hint)hint.textContent='Your saved fence layout is restored. Review the drawing and gate locations before sending.';
      return true;
    }catch(error){
      pendingLayoutDraft=pending;
      // A failed map constructor cannot leave a partial drawing paired with full saved totals.
      const added=(kind==='google'?[...gFenceLines,...gWalkGates,...gDriveGates]:[...lFenceLines,...lWalkGates,...lDriveGates]).filter(x=>![...originalLines,...originalWalk,...originalDrive].includes(x));
      for(const item of new Set([...lines,...gates,...added].filter(Boolean))){try{if(kind==='google')item.setMap(null);else map.removeLayer(item);}catch{}}
      if(kind==='google'){gFenceLines=originalLines;gWalkGates=originalWalk;gDriveGates=originalDrive;}
      else{lFenceLines=originalLines;lWalkGates=originalWalk;lDriveGates=originalDrive;}
      undo.length=undoStart;layoutAddress=null;
      const hint=el('bp-draw-hint');if(hint)hint.textContent='Your saved drawing and numbers are kept. Try loading the map again to restore the drawing before sending.';
      console.warn('[Ghareeb Ballpark] saved layout could not be restored',error);
      return false;
    }finally{restoringLayoutDraft=false;}
  }

  function mapPaths(mapKind,active=true){
    const lines=mapKind==='google'?gFenceLines.slice():lFenceLines.slice();
    const pending=mapKind==='google'?gActivePolyline:lActivePolyline;if(active&&pending)lines.push(pending);
    return lines.map(line=>mapKind==='google'?line.getPath().getArray().map(p=>({lat:p.lat(),lng:p.lng()})):line.getLatLngs().map(p=>({lat:p.lat,lng:p.lng})));
  }
  function mapGates(mapKind,except){
    const all=mapKind==='google'?[[gWalkGates,'walk'],[gDriveGates,'drive']]:[[lWalkGates,'walk'],[lDriveGates,'drive']];
    return all.flatMap(([items,type])=>items.filter(marker=>marker!==except).map(marker=>({type,point:window.GFSMapGeometry.point(mapKind==='google'?marker.getPosition():marker.getLatLng())})));
  }
  function placementMessage(reason){return {'off-line':'Tap closer to a drawn fence line to place this gate.','short-run':'This fence segment is too short for that gate opening.','overlap':'That opening overlaps another gate. Choose a clear part of the fence.'}[reason]||'Draw a fence line before placing a gate.';}
  function snapMapGate(mapKind,type,point,except){
    const result=window.GFSMapGeometry.snapGate({paths:mapPaths(mapKind,false),point,type,gates:mapGates(mapKind,except),maxDistanceFeet:8});
    if(!result.ok){const message=placementMessage(result.reason);for(const id of ['bp-draw-hint','bp-measure-review']){const node=el(id);if(node)node.textContent=message;}return null;}return result.point;
  }
  function currentMapIssue(){
    if(pendingLayoutDraft&&pendingLayoutDraft.snapshot===draftInputSnapshot()&&pendingLayoutDraft.address===draftAddress(state.address))return 'Your saved drawing has not finished loading. Wait for the map, or try loading it again before submitting your project.';
    if(!window.GFSMapGeometry)return '';
    const kind=activeDrawingEngine;if(!kind)return '';
    const paths=mapPaths(kind),gates=mapGates(kind);
    if((paths.some(line=>line.length)||gates.length)&&layoutAddress!==null&&layoutAddress!==draftAddress(state.address))return 'The address changed after this fence was drawn. Review the layout and confirm it for this address, restore the earlier address, or redraw.';
    const facts=window.GFSMapGeometry.summary(paths,gates);
    if(facts.totalFeet>2000.01)return 'This drawing is longer than the online estimator’s 2,000 ft limit. Request an on-site estimate for this layout.';
    return facts.issues.length?'Move the gate locations onto a long enough fence segment, without overlapping another opening.':'';
  }
  function setupMapMeasurements(mapKind){
    if(activeDrawingEngine!==mapKind){activeDrawingEngine=mapKind;retireParcelContext();mapPreview=null;}
    const host=el('bp-map');if(!host)return;
    if(el('bp-map-measurements')){restoreDraftGeometry();return;}
    const toolbar=el('bp-draw-toolbar');if(toolbar)toolbar.classList.add('bp-draw-toolbar-ready');
    const panel=document.createElement('section');panel.id='bp-map-measurements';panel.className='bp-map-measurements';panel.setAttribute('aria-label','Fence drawing measurements');panel.tabIndex=-1;
    panel.innerHTML='<div class="bp-measure-heading"><strong>Your fence layout</strong><label>Units <select id="bp-map-units" aria-label="Drawing measurement units"><option value="ft">Feet</option><option value="m">Metres</option></select></label></div><p id="bp-measure-total">Draw a fence to see each measured segment.</p><p id="bp-measure-opening">Walk gates use a 4 ft opening; drive gates use a 10 ft opening.</p><p id="bp-measure-review" role="status" aria-live="polite"></p><button type="button" id="bp-confirm-drawing-address" class="btn btn-outline btn-sm" style="display:none" hidden>Use this drawing for this address</button><ol id="bp-measure-segments"></ol><button type="button" id="bp-drawing-next" class="btn btn-primary" disabled>Use this layout · choose a style →</button><p class="bp-measure-note">Map measurements are approximate. Total run includes gate openings. Gate installation is priced separately. Final measurements are confirmed on site.</p>';
    const slot=el('bp-measure-slot');if(slot)slot.appendChild(panel);else host.parentElement.after(panel);
    el('bp-map-units').addEventListener('change',e=>{mapMeasurementUnit=e.target.value==='m'?'m':'ft';renderMapMeasurements(activeDrawingEngine);if(typeof saveDraft==='function')saveDraft();});
    el('bp-confirm-drawing-address')?.addEventListener('click',confirmDrawingAddress);
    el('bp-drawing-next')?.addEventListener('click',()=>{if(typeof openStylePicker==='function')openStylePicker();});
    const stats=el('bp-draw-stats');if(stats)stats.hidden=true;
    const search=el('bp-map-search');if(search&&!search.getAttribute('aria-label'))search.setAttribute('aria-label','Property address');
    const units=el('bp-map-units');if(units)units.value=mapMeasurementUnit;
    restoreDraftGeometry();
  }
  function renderMapMeasurements(mapKind){
    if(!window.GFSMapGeometry||mapKind!==activeDrawingEngine)return;
    const paths=mapPaths(mapKind),gates=mapGates(mapKind),facts=window.GFSMapGeometry.summary(paths,gates),format=n=>window.GFSMapGeometry.format(n,mapMeasurementUnit);
    const finish=document.querySelector('#bp-draw-toolbar [data-mode="finish"]');
    const active=mapKind==='google'?gActivePolyline?.getPath().getLength():lActivePolyline?.getLatLngs().length;
    if(finish)finish.disabled=gDrawingMode!=='fence'||!(active>=2);
    const next=el('bp-drawing-next');if(next)next.disabled=!(facts.totalFeet>0)||!!facts.issues.length||gDrawingMode==='fence';
    const hint=el('bp-draw-hint');if(hint&&gDrawingMode==='idle'&&facts.totalFeet>0)hint.textContent='Line saved. Draw another section, open Add gates, or continue to choose a style. Drag a corner to adjust the layout.';
    const total=el('bp-measure-total');if(total)total.textContent='Total run '+format(facts.totalFeet)+' · '+gates.length+' gate'+(gates.length===1?'':'s');
    const openings=el('bp-measure-opening');if(openings)openings.textContent='Gate openings '+format(facts.openingsFeet)+' · Fence outside openings '+format(facts.netFenceFeet)+(facts.issues.length?' (review gate placement)':'');
    const review=el('bp-measure-review');if(review)review.textContent=layoutAddress!==null&&layoutAddress!==draftAddress(state.address)&&paths.some(line=>line.length)?'The address changed. Review the layout, then confirm it for this property or redraw.':facts.issues.length?'Gate '+facts.issues.map(i=>i+1).join(', ')+': drag onto a clear fence segment long enough for its opening.':'';
    const confirmAddress=el('bp-confirm-drawing-address');if(confirmAddress){confirmAddress.hidden=!(layoutAddress!==null&&layoutAddress!==draftAddress(state.address)&&paths.some(line=>line.length>=2));confirmAddress.style.display=confirmAddress.hidden?'none':'';}
    const rows=el('bp-measure-segments');if(rows){rows.replaceChildren();facts.segments.forEach(row=>{const item=document.createElement('li');item.textContent='Run '+(row.line+1)+', segment '+(row.segment+1)+': '+format(row.feet);rows.appendChild(item);});}
    const chip=el('bp-live-feet');if(chip){
      const last=facts.segments.at(-1),preview=mapPreview&&mapPreview.kind===mapKind?mapPreview.feet:null;
      chip.textContent=preview!=null?'Next '+format(preview)+' · Total if added '+format(facts.totalFeet+preview):'Total '+format(facts.totalFeet)+(last?' · Last '+format(last.feet):'');
      chip.style.display=facts.totalFeet>0||preview!=null?'block':'none';
    }
  }
  function clearDrawingPreview(mapKind){
    mapPreview=null;
    if(mapKind==='google'){
      if(gMoveListener)google.maps.event.removeListener(gMoveListener);gMoveListener=null;
      if(gPreviewLine)gPreviewLine.setMap(null);gPreviewLine=null;
      if(gDoubleClickListener)google.maps.event.removeListener(gDoubleClickListener);gDoubleClickListener=null;
    }else{
      if(lMoveHandler)map.off('mousemove',lMoveHandler);lMoveHandler=null;
      if(lPreviewLine)map.removeLayer(lPreviewLine);lPreviewLine=null;
      if(lDoubleClickHandler)map.off('dblclick',lDoubleClickHandler);lDoubleClickHandler=null;
    }
  }
  function snappedDrawingPoint(mapKind,value){
    const paths=mapPaths(mapKind),active=mapKind==='google'?gActivePolyline:lActivePolyline;
    const last=active?paths.at(-1)?.at(-1):null,enabled=mapKind==='google'?gSnapEnabled:lSnapEnabled;
    if(!last||!enabled)return value;
    const target=window.GFSMapGeometry.point(value),rad=Math.PI/180,R=6378137;
    const a=last.lat*rad,b=target.lat*rad,d=(target.lng-last.lng)*rad;
    const bearing=Math.atan2(Math.sin(d)*Math.cos(b),Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(d));
    const heading=Math.round(bearing/(Math.PI/4))*(Math.PI/4),distance=window.GFSMapGeometry.distanceFeet(last,target)*.3048/R;
    const lat=Math.asin(Math.sin(a)*Math.cos(distance)+Math.cos(a)*Math.sin(distance)*Math.cos(heading));
    const lng=last.lng*rad+Math.atan2(Math.sin(heading)*Math.sin(distance)*Math.cos(a),Math.cos(distance)-Math.sin(a)*Math.sin(lat));
    return mapKind==='google'?new google.maps.LatLng(lat/rad,lng/rad):L.latLng(lat/rad,lng/rad);
  }
  function previewDrawingPoint(mapKind,value){
    const active=mapKind==='google'?gActivePolyline:lActivePolyline;if(!active)return;
    const paths=mapPaths(mapKind),last=paths.at(-1)?.at(-1);if(!last)return;
    const point=window.GFSMapGeometry.point(snappedDrawingPoint(mapKind,value));
    mapPreview={kind:mapKind,feet:window.GFSMapGeometry.distanceFeet(last,point)};
    if(mapKind==='google'){
      if(!gPreviewLine)gPreviewLine=new google.maps.Polyline({map:gMap,clickable:false,strokeColor:'#ffffff',strokeOpacity:.8,strokeWeight:3});
      gPreviewLine.setPath([last,point]);
    }else{
      if(!lPreviewLine)lPreviewLine=L.polyline([],{color:'#ffffff',weight:3,dashArray:'6 6',interactive:false}).addTo(map);
      lPreviewLine.setLatLngs([last,point]);
    }
    renderMapMeasurements(mapKind);
  }
  function enableLeafletEditing(line){
    if(!line.editing&&L.Edit?.Poly)line.editing=new L.Edit.Poly(line,{poly:{allowIntersection:false}});
    if(line.editing)line.editing.enable();
    if(!line._gfsMeasureBound){line.on('edit',updateLeafletStats);line._gfsMeasureBound=true;}
  }

  // -------- GOOGLE MAPS IMPLEMENTATION (premium drawing UX) --------
  let gMap = null;
  let gFenceLines = [];
  let gWalkGates = [];
  let gDriveGates = [];
  let gDrawingMode = 'idle';       // 'idle' | 'fence' | 'walk-gate' | 'drive-gate'
  let gActivePolyline = null;      // polyline being drawn right now
  let gClickListener = null;       // active map click handler
  let gUndoStack = [];             // chronological action stack for undo
  let gSnapEnabled = false;        // 90/45° snap toggle for fence drawing
  let lUndoStack = [];             // Leaflet equivalent
  let lSnapEnabled = false;

  // Hint text per mode — drives the bottom status bar
  const MODE_HINTS = {
    'idle':       '<strong>Move map:</strong> drag to position your property and zoom in. Choose <strong>Draw fence</strong> when ready. Drag a saved corner to adjust it.',
    'fence':      'Tap each corner of your fence, then press <strong>Finish line</strong>. ' +
                  '<span id="bp-snap-on" style="display:none;color:#FFC83D;">· Snap 90° ON</span>',
    'walk-gate':  'Tap near a drawn fence to snap a 4 ft walk gate into the run. Drag it to move; tap it to remove.',
    'drive-gate': 'Tap near a drawn fence to snap a 10 ft drive gate into the run. Openings cannot overlap.',
  };

  // Gate marker icons — match the Executive app's layout-canvas symbols
  // (architectural swing-arc gates). NO heavy white-circle background —
  // instead each navy stroke gets a thin white casing for visibility against
  // grass, pavement, or rooftops. Clean blueprint look.
  const SG_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="-28 -28 56 56">' +
      // White casing under all lines for cartographic legibility
      '<g stroke="white" stroke-width="6" fill="none" stroke-linecap="round">' +
        '<line x1="0" y1="0" x2="16" y2="-16"/>' +
        '<path d="M 16 -16 A 22.6 22.6 0 0 0 22.6 0"/>' +
      '</g>' +
      // Navy strokes on top — the actual symbol
      '<line x1="0" y1="0" x2="16" y2="-16" stroke="#1A2E40" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M 16 -16 A 22.6 22.6 0 0 0 22.6 0" fill="none" stroke="#1A2E40" stroke-width="2" stroke-dasharray="3,2"/>' +
      // Pivot dot with white halo
      '<circle cx="0" cy="0" r="5.5" fill="white"/>' +
      '<circle cx="0" cy="0" r="3.5" fill="#1A2E40"/>' +
      // Label with paint-order stroke trick for white halo around text
      '<text x="0" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#1A2E40" stroke="white" stroke-width="3" stroke-linejoin="round" paint-order="stroke">SG</text>' +
    '</svg>';

  const DG_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="56" viewBox="-32 -28 64 56">' +
      // White casing
      '<g stroke="white" stroke-width="6" fill="none" stroke-linecap="round">' +
        '<line x1="-9" y1="0" x2="-9" y2="-18"/>' +
        '<line x1="9" y1="0" x2="9" y2="-18"/>' +
        '<path d="M -9 -18 A 18 18 0 0 1 -25 -4"/>' +
        '<path d="M 9 -18 A 18 18 0 0 0 25 -4"/>' +
      '</g>' +
      // Navy strokes
      '<line x1="-9" y1="0" x2="-9" y2="-18" stroke="#1A2E40" stroke-width="2.5" stroke-linecap="round"/>' +
      '<line x1="9" y1="0" x2="9" y2="-18" stroke="#1A2E40" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M -9 -18 A 18 18 0 0 1 -25 -4" fill="none" stroke="#1A2E40" stroke-width="2" stroke-dasharray="3,2"/>' +
      '<path d="M 9 -18 A 18 18 0 0 0 25 -4" fill="none" stroke="#1A2E40" stroke-width="2" stroke-dasharray="3,2"/>' +
      // Two pivots with white halos
      '<circle cx="-9" cy="0" r="5" fill="white"/>' +
      '<circle cx="9" cy="0" r="5" fill="white"/>' +
      '<circle cx="-9" cy="0" r="3" fill="#1A2E40"/>' +
      '<circle cx="9" cy="0" r="3" fill="#1A2E40"/>' +
      // Label with white halo
      '<text x="0" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="bold" fill="#1A2E40" stroke="white" stroke-width="3" stroke-linejoin="round" paint-order="stroke">DG</text>' +
    '</svg>';

  const WALK_GATE_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(SG_SVG);
  const DRIVE_GATE_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(DG_SVG);

  function initGoogleMap() {
    const mapEl = el('bp-map');
    if (!mapEl) return;

    gMap = new google.maps.Map(mapEl, {
      center: { lat: 41.6528, lng: -83.5379 },  // Toledo default
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      tilt: 0,
      streetViewControl: false,
      fullscreenControl: false,   // the tool's own Full screen button keeps the drawing tools with the map
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        mapTypeIds: ['hybrid', 'satellite', 'roadmap'],
        position: google.maps.ControlPosition.BOTTOM_LEFT,
      },
    });

    // Wire the custom drawing toolbar
    wireDrawToolbar('google');
    initParcelTools('google');

    // Places Autocomplete — premium UX, type-as-you-search dropdown
    const searchInput = el('bp-map-search');
    let searchRevision = 0;
    searchInput?.addEventListener('input', () => { searchRevision++; });
    if (searchInput && google.maps.places && !searchInput.dataset.acBound) {
      searchInput.dataset.acBound = '1';
      const ac = new google.maps.places.Autocomplete(searchInput, {
        componentRestrictions: { country: 'us' },
        fields: ['geometry', 'formatted_address'],
        types: ['address'],
      });
      ac.bindTo('bounds', gMap);
      ac.addListener('place_changed', () => {
        if(activeDrawingEngine!=='google'||window.GFS_GOOGLE_MAPS_AUTH_FAILED)return;
        searchRevision++;
        const place = ac.getPlace();
        if (place && place.geometry && place.geometry.location) {
          gMap.setCenter(place.geometry.location);
          gMap.setZoom(20);
          gMap.setTilt(0);
          searchInput.value = place.formatted_address || searchInput.value;
          el('bp-address').value = place.formatted_address || '';
          const a4 = el('bp-form-address');
          if (a4 && !a4.value) a4.value = el('bp-address').value;
          setProjectAddress(el('bp-address').value);
        }
      });
    }

    // Find button (geocoder fallback for non-autocomplete usage)
    const searchBtn = el('bp-map-search-btn');
    if (searchBtn && searchInput) {
      const doSearch = async () => {
        if(activeDrawingEngine!=='google'||window.GFS_GOOGLE_MAPS_AUTH_FAILED)return;
        const q = (searchInput.value || '').trim();
        const request = ++searchRevision;
        if (q.length < 3) return;
        const geocoder = new google.maps.Geocoder();
        try {
          const result = await geocoder.geocode({ address: q });
          if (activeDrawingEngine!=='google'||window.GFS_GOOGLE_MAPS_AUTH_FAILED||request !== searchRevision || searchInput.value.trim() !== q) return;
          if (result.results && result.results[0]) {
            gMap.setCenter(result.results[0].geometry.location);
            gMap.setZoom(20);
            gMap.setTilt(0);
            el('bp-address').value = result.results[0].formatted_address;
            const a4 = el('bp-form-address');
            if (a4 && !a4.value) a4.value = el('bp-address').value;
            setProjectAddress(el('bp-address').value);
          }
        } catch (e) {
          console.warn('Geocoding failed:', e);
        }
      };
      searchBtn.addEventListener('click', doSearch);
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (!document.querySelector('.pac-container:not([style*="display: none"])')) doSearch();
        }
      });
    }
  }

  // ================= PROPERTY LINE TOOLS =========================
  // Fetches the parcel boundary for the current map centre, draws it, and
  // offers to trace the fence along it offset inside by a chosen setback.
  // Building on or over the line is the most common cause of fence rework,
  // so showing it during planning is worth the extra call.
  let parcelRing = null;        // [[lng,lat], ...] closed boundary
  let parcelHoles = [];
  let parcelShapes = [];        // overlays currently on the map

  function parcelsReady() {
    return !!(window.GFSParcels && window.GFSParcels.isConfigured());
  }

  function setbackMetres() {
    const input = el('bp-setback-in');
    const inches = input ? Number(input.value) : 6;
    return inches * 0.0254;
  }

  function clearParcelShapes() {
    parcelShapes.forEach(shape => {
      try {
        if (shape.setMap) shape.setMap(null);
        else if (map && map.removeLayer) map.removeLayer(shape);
      } catch (e) { /* already gone */ }
    });
    parcelShapes = [];
  }

  function drawParcel(mapKind) {
    if(mapKind!==activeDrawingEngine||parcelAddress!==draftAddress(state.address)){retireParcelContext();return;}
    clearParcelShapes();
    if (!parcelRing) return;
    const inset = window.GFSParcels.offsetRingInward(parcelRing, setbackMetres());

    if (mapKind === 'google' && gMap) {
      parcelShapes.push(new google.maps.Polygon({
        paths: [parcelRing,...parcelHoles].map(ring=>ring.map(([lng, lat]) => ({ lat, lng }))),
        strokeColor: '#FFC83D', strokeWeight: 2, strokeOpacity: 0.95,
        fillColor: '#FFC83D', fillOpacity: 0.07, clickable: false, map: gMap, zIndex: 1,
      }));
      parcelShapes.push(new google.maps.Polygon({
        paths: inset.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: '#00E5A0', strokeWeight: 2, strokeOpacity: 0.85,
        strokeDashArray: [4, 4], fillOpacity: 0, clickable: false, map: gMap, zIndex: 2,
      }));
      const bounds = new google.maps.LatLngBounds();
      parcelRing.forEach(([lng, lat]) => bounds.extend({ lat, lng }));
      gMap.fitBounds(bounds);
    } else if (mapKind === 'leaflet' && map) {
      parcelShapes.push(L.polygon([parcelRing,...parcelHoles].map(ring=>ring.map(([lng, lat]) => [lat, lng])),
        { color: '#FFC83D', weight: 2, fillOpacity: 0.07 }).addTo(map));
      parcelShapes.push(L.polygon(inset.map(([lng, lat]) => [lat, lng]),
        { color: '#00E5A0', weight: 2, dashArray: '4,4', fill: false }).addTo(map));
      map.fitBounds(parcelShapes[0].getBounds());
    }

    const perimeter = window.GFSParcels.ringPerimeterFeet(inset);
    const info = el('bp-parcel-info');
    if (info) {
      // County parcel geometry is reference grade, not survey grade — lines
      // can be off by feet. Say so plainly on screen, not just in the docs:
      // someone planning a fence to a boundary needs to know this before
      // they dig, not after a neighbour disputes it.
      info.innerHTML = '<span style="display:block;margin-bottom:6px;color:var(--warn);">' +
        'County map data &mdash; approximate, not a survey.</span>' +
        'Outer perimeter about <strong>' + perimeter + ' ft</strong>. ' +
        '<button type="button" id="bp-trace" style="background:none;border:none;padding:0;color:var(--cedar);' +
        'font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:0.08em;' +
        'cursor:pointer;border-bottom:1px solid currentColor;">Trace outer line</button>';
      const trace = el('bp-trace');
      const revision=parcelLookupRevision;
      if (trace) trace.addEventListener('click', () => traceParcel(mapKind, inset, revision));
    }
    const val = el('bp-setback-val');
    const inches = el('bp-setback-in') ? Number(el('bp-setback-in').value) : 6;
    if (val) val.textContent = inches === 0 ? 'On the line' : inches + ' in';
  }

  // Turn the offset boundary into an editable fence line the customer can
  // trim — most people don't fence all four sides, so this is a start point.
  function traceParcel(mapKind, inset, revision=parcelLookupRevision) {
    if(revision!==parcelLookupRevision||mapKind!==activeDrawingEngine||!parcelRing||parcelAddress!==draftAddress(state.address))return;
    // Keep the ring closed. Dropping the repeated final point left the fence
    // missing one whole side, so the traced length disagreed with the
    // perimeter shown above it and under-quoted the job.
    const path = inset;
    if (mapKind === 'google' && gMap) {
      const poly = new google.maps.Polyline({
        path: path.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: '#00E5A0', strokeWeight: 6, strokeOpacity: 1,
        editable: true, map: gMap,
      });
      gFenceLines.push(poly);
      track('drew');
      gUndoStack.push({ type: 'fence', item: poly });
      ['set_at', 'insert_at', 'remove_at'].forEach(ev => poly.getPath().addListener(ev, updateGoogleStats));
      updateGoogleStats();
    } else if (mapKind === 'leaflet' && map) {
      const line = L.polyline(path.map(([lng, lat]) => [lat, lng]),
        { color: '#00E5A0', weight: 6 }).addTo(map);
      enableLeafletEditing(line);
      lFenceLines.push(line);
      lUndoStack.push({ type: 'fence', item: line });
      updateLeafletStats();
    }
    const hint = el('bp-draw-hint');
    if (hint) {
      hint.innerHTML = 'Traced the full property line. <strong>Drag any corner</strong> to adjust, ' +
        'or use <strong>↶ Undo</strong> if you only need part of it.';
    }
  }

  async function lookupParcel(mapKind) {
    if (!parcelsReady()) return;
    const request=++parcelLookupRevision,address=state.address;
    clearParcelShapes();parcelRing=null;parcelHoles=[];const oldPanel=el('bp-setback');if(oldPanel)oldPanel.style.display='none';
    let lat, lng;
    if (mapKind === 'google' && gMap) {
      const c = gMap.getCenter(); lat = c.lat(); lng = c.lng();
    } else if (map) {
      const c = map.getCenter(); lat = c.lat; lng = c.lng;
    } else return;

    showMapStatus('Looking up the property line…', 'loading');
    const result = await window.GFSParcels.lookup(lat, lng);
    if(request!==parcelLookupRevision||mapKind!==activeDrawingEngine)return;
    const current=window.GFSMapGeometry.point(mapKind==='google'?gMap.getCenter():map.getCenter());
    if(state.address!==address||!current||window.GFSMapGeometry.distanceFeet({lat,lng},current)>10){hideMapStatus();return;}
    if (!result.ok) {
      const why = {
        'not-found': 'No parcel found at this spot. Center the map on the property and try again.',
        'no-coverage': 'We don\'t have parcel data for this county yet.',
        'timeout': 'The county parcel service is slow right now. Draw your fence line instead.',
        'network': 'Could not reach the county parcel service. Draw your fence line instead.',
        'bad-geometry': 'The county response does not contain this location. Draw manually or move the map centre onto your property.',
      }[result.reason] || 'Could not load the property line. Draw your fence line instead.';
      showMapStatus(why, 'error');
      setTimeout(hideMapStatus, 4500);
      return;
    }
    hideMapStatus();
    parcelRing = result.rings[0];parcelHoles=result.rings.slice(1);parcelAddress=draftAddress(state.address);
    const panel = el('bp-setback');
    if (panel) panel.style.display = 'block';
    drawParcel(mapKind);

    const setback = el('bp-setback-in');
    if (setback && !setback._bound) {
      setback.addEventListener('input', () => drawParcel(activeDrawingEngine));
      setback._bound = true;
    }
  }

  // Reveal the button only when a parcel service is actually configured
  function initParcelTools(mapKind) {
    const btn = document.querySelector('#bp-draw-toolbar [data-mode="parcel"]');
    if (!btn) return;
    if (!parcelsReady()) { btn.style.display = 'none'; return; }
    btn.style.display = 'flex';
    btn.addEventListener('click', () => {if(mapKind===activeDrawingEngine)lookupParcel(mapKind);});
  }

  // -------- DRAWING TOOLBAR WIRING (works for Google Maps + Leaflet) --------
  function wireDrawToolbar(mapKind) {
    setupMapMeasurements(mapKind);
    const buttons = document.querySelectorAll('#bp-draw-toolbar .bp-draw-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        if(mapKind!==activeDrawingEngine)return;
        const mode = btn.dataset.mode;
        if (mode === 'clear') {
          clearAll(mapKind);
          return;
        }
        if (mode === 'undo') {
          undoLast(mapKind);
          return;
        }
        if (mode === 'snap') {
          toggleSnap(mapKind, btn);
          return;
        }
        if (mode === 'parcel') return;   // handled by initParcelTools
        if (mode === 'finish') {
          // Explicit finish — the only reliable way to end a fence on touch
          // devices, where double-tap is the browser's zoom gesture.
          if (mapKind === 'google') finalizeGooglePolyline();
          else finalizeLeafletPolyline();
          setDrawMode('idle', mapKind);
          return;
        }
        setDrawMode(mode, mapKind);
        el('bp-map')?.scrollIntoView?.({block:'start',behavior:'auto'});
      });
    });
    setDrawMode('idle',mapKind);
  }

  function toggleSnap(mapKind, btn) {
    if (mapKind === 'google') {
      gSnapEnabled = !gSnapEnabled;
      btn.style.background = gSnapEnabled ? '#1d5eb6' : 'var(--white)';
      btn.style.color = gSnapEnabled ? '#fff' : 'var(--navy)';
      btn.style.borderColor = gSnapEnabled ? 'var(--navy)' : 'transparent';
      btn.style.boxShadow = gSnapEnabled ? '0 4px 12px rgba(184,148,90,0.4)' : 'none';
    } else {
      lSnapEnabled = !lSnapEnabled;
      btn.style.background = lSnapEnabled ? '#1d5eb6' : 'var(--white)';
      btn.style.color = lSnapEnabled ? '#fff' : 'var(--navy)';
      btn.style.borderColor = lSnapEnabled ? 'var(--navy)' : 'transparent';
      btn.style.boxShadow = lSnapEnabled ? '0 4px 12px rgba(184,148,90,0.4)' : 'none';
    }
    btn.setAttribute('aria-pressed',String(mapKind==='google'?gSnapEnabled:lSnapEnabled));
    // Update the snap-on indicator in the fence-mode hint if currently shown
    const indicator = el('bp-snap-on');
    if (indicator) {
      const isOn = mapKind === 'google' ? gSnapEnabled : lSnapEnabled;
      indicator.style.display = isOn ? 'inline' : 'none';
    }
  }

  function undoLast(mapKind) {
    if (mapKind === 'google') {
      undoLastGoogle();
    } else if (mapKind === 'leaflet') {
      undoLastLeaflet();
    }
  }

  function undoLastGoogle() {
    const action = gUndoStack.pop();
    if (!action) return;
    if (action.type === 'point' && gActivePolyline) {
      const path = gActivePolyline.getPath();
      if (path.getLength() > 0) path.removeAt(path.getLength() - 1);
    } else if (action.type === 'fence' && action.item) {
      action.item.setMap(null);
      const idx = gFenceLines.indexOf(action.item);
      if (idx >= 0) gFenceLines.splice(idx, 1);
    } else if (action.type === 'walk' && action.item) {
      action.item.setMap(null);
      const idx = gWalkGates.indexOf(action.item);
      if (idx >= 0) gWalkGates.splice(idx, 1);
    } else if (action.type === 'drive' && action.item) {
      action.item.setMap(null);
      const idx = gDriveGates.indexOf(action.item);
      if (idx >= 0) gDriveGates.splice(idx, 1);
    }
    updateGoogleStats();
  }

  function undoLastLeaflet() {
    const action = lUndoStack.pop();
    if (!action) return;
    if (action.type === 'point' && lActivePolyline) {
      const latlngs = lActivePolyline.getLatLngs();
      if (latlngs.length > 0) {
        latlngs.pop();
        lActivePolyline.setLatLngs(latlngs);
      }
    } else if (action.type === 'fence' && action.item) {
      map.removeLayer(action.item);
      const idx = lFenceLines.indexOf(action.item);
      if (idx >= 0) lFenceLines.splice(idx, 1);
    } else if (action.type === 'walk' && action.item) {
      map.removeLayer(action.item);
      const idx = lWalkGates.indexOf(action.item);
      if (idx >= 0) lWalkGates.splice(idx, 1);
    } else if (action.type === 'drive' && action.item) {
      map.removeLayer(action.item);
      const idx = lDriveGates.indexOf(action.item);
      if (idx >= 0) lDriveGates.splice(idx, 1);
    }
    updateLeafletStats();
  }

  function setDrawMode(mode, mapKind) {
    gDrawingMode = mode;
    // Update button visual state
    document.querySelectorAll('#bp-draw-toolbar .bp-draw-btn').forEach(btn => {
      const active = btn.dataset.mode === mode;
      if (btn.dataset.mode === 'clear') return;   // clear is never "active"
      if (btn.dataset.mode === 'undo') return;    // undo is an action, not a mode
      if (btn.dataset.mode === 'snap') return;    // snap manages its own toggle state
      if (btn.dataset.mode === 'parcel') return;  // an action, not a mode
      if (btn.dataset.mode === 'finish') {
        btn.style.display='flex';btn.disabled=mode!=='fence';return;
      }
      btn.setAttribute('aria-pressed',String(active));
      btn.style.background = active ? '#1d5eb6' : (btn.dataset.mode === 'fence' ? 'var(--navy)' : 'var(--white)');
      btn.style.color = active ? '#fff' : (btn.dataset.mode === 'fence' ? 'var(--cream)' : 'var(--navy)');
      btn.style.borderColor = active ? 'var(--navy)' : 'transparent';
      btn.style.boxShadow = active ? '0 4px 12px rgba(184,148,90,0.4)' : 'none';
    });
    // Update hint text
    const hint = el('bp-draw-hint');
    if (hint) hint.innerHTML = MODE_HINTS[mode] || MODE_HINTS.idle;

    // Activate the right map handler
    if (mapKind === 'google' && gMap) {
      activateGoogleMode(mode);
    } else if (mapKind === 'leaflet' && map) {
      activateLeafletMode(mode);
    }
    renderMapMeasurements(mapKind);
  }

  // -------- GOOGLE MAPS — MODE ACTIVATION --------
  function activateGoogleMode(mode) {
    // Remove any prior click listener
    if (gClickListener) { google.maps.event.removeListener(gClickListener); gClickListener = null; }
    // Gate taps must reach the map instead of being consumed by the fence stroke.
    const placingGate=mode==='walk-gate'||mode==='drive-gate';
    gFenceLines.forEach(line=>{line.setEditable(mode==='idle');line.setOptions({clickable:!placingGate});});
    // Disable any in-progress polyline editing while not in fence mode
    if (mode !== 'fence' && gActivePolyline) {
      finalizeGooglePolyline();
    }
    gFenceLines.forEach(line=>{line.setEditable(mode==='idle');line.setOptions({clickable:!placingGate});});

    if (mode === 'fence') {
      startGoogleFenceDrawing();
    } else if (mode === 'walk-gate' || mode === 'drive-gate') {
      gMap.setOptions({ draggableCursor: 'crosshair' });
      gClickListener = gMap.addListener('click', e => {
        addGoogleGate(mode === 'walk-gate' ? 'walk' : 'drive', e.latLng);
        // Stay in mode for placing multiple — user clicks button again or another mode to exit
      });
    } else {
      gMap.setOptions({ draggableCursor: null });
    }
  }

  function startGoogleFenceDrawing() {
    if(gActivePolyline)finalizeGooglePolyline();clearDrawingPreview('google');
    gMap.setOptions({draggableCursor:'crosshair',disableDoubleClickZoom:true});
    const path=new google.maps.MVCArray();
    gActivePolyline=new google.maps.Polyline({strokeColor:'#00E5A0',strokeWeight:6,strokeOpacity:1,editable:false,map:gMap,path});
    gClickListener=gMap.addListener('click',e=>{const pt=snappedDrawingPoint('google',e.latLng);path.push(pt);mapPreview=null;if(gPreviewLine)gPreviewLine.setPath([]);gUndoStack.push({type:'point'});updateGoogleStats();});
    gMoveListener=gMap.addListener('mousemove',e=>previewDrawingPoint('google',e.latLng));
    gDoubleClickListener=gMap.addListener('dblclick',e=>{e.stop?.();finalizeGooglePolyline();setDrawMode('idle','google');});
  }

  function finalizeGooglePolyline() {
    clearDrawingPreview('google');gMap.setOptions({disableDoubleClickZoom:false});
    if (!gActivePolyline) return;
    const path = gActivePolyline.getPath();
    if (path.getLength() < 2) {
      // Too short — discard
      gActivePolyline.setMap(null);
      // Strip the point-undos that built up during this aborted attempt
      while (gUndoStack.length && gUndoStack[gUndoStack.length - 1].type === 'point') gUndoStack.pop();
    } else {
      // Make editable so user can drag corners
      gActivePolyline.setEditable(true);
      gFenceLines.push(gActivePolyline);
      track('drew');
      path.addListener('set_at', updateGoogleStats);
      path.addListener('insert_at', updateGoogleStats);
      path.addListener('remove_at', updateGoogleStats);
      // Replace the individual point-undos with one fence-level undo
      while (gUndoStack.length && gUndoStack[gUndoStack.length - 1].type === 'point') gUndoStack.pop();
      gUndoStack.push({ type: 'fence', item: gActivePolyline });
    }
    gActivePolyline = null;
    if (gClickListener) { google.maps.event.removeListener(gClickListener); gClickListener = null; }
    gMap.setOptions({ draggableCursor: null });
    updateGoogleStats();
  }

  function addGoogleGate(type, latLng, restorePosition=false) {
    if(!restorePosition){const snapped=snapMapGate('google',type,latLng);if(!snapped)return;latLng=snapped;}
    const icon = {
      url: type === 'walk' ? WALK_GATE_ICON : DRIVE_GATE_ICON,
      scaledSize: new google.maps.Size(type === 'walk' ? 50 : 54, 50),
      anchor: new google.maps.Point(type === 'walk' ? 25 : 27, 25),
    };
    const marker = new google.maps.Marker({
      position: latLng,
      map: gMap,
      icon,
      draggable: true,
      title: type === 'walk' ? 'Walk-through gate (click to remove)' : 'Drive gate (click to remove)',
      zIndex: 100,
    });
    let lastPosition=marker.getPosition();
    marker.addListener('dragstart',()=>{lastPosition=marker.getPosition();});
    marker.addListener('dragend',()=>{const point=snapMapGate('google',type,marker.getPosition(),marker);marker.setPosition(point||lastPosition);updateGoogleStats();});
    // Click to remove
    marker.addListener('click', () => {
      if (confirm('Remove this gate?')) {
        marker.setMap(null);
        const arr = type === 'walk' ? gWalkGates : gDriveGates;
        const idx = arr.indexOf(marker);
        if (idx >= 0) arr.splice(idx, 1);
        updateGoogleStats();
      }
    });
    (type === 'walk' ? gWalkGates : gDriveGates).push(marker);
    gUndoStack.push({ type: type, item: marker });
    updateGoogleStats();
    return marker;
  }

  function updateGoogleStats() {
    if(activeDrawingEngine!=='google')return;
    const facts=window.GFSMapGeometry.summary(mapPaths('google'),mapGates('google'));
    setLiveStats(Math.round(facts.totalFeet),gWalkGates.length,gDriveGates.length);renderMapMeasurements('google');
  }

  // Shared stats keep the existing gross-footage pricing convention.

  function setLiveStats(feet, walkCount, driveCount) {
    if(restoringLayoutDraft)return;
    if(feet>0||walkCount||driveCount){if(layoutAddress===null)layoutAddress=draftAddress(state.address);}else layoutAddress=null;
    // v8: giant in-map footage chip — visible WHILE drawing, where the
    // customer is actually looking (the stats panel below the map is off
    // screen on phones mid-draw).
    const chip = el('bp-live-feet');
    if (chip) {
      if (feet > 0) {
        chip.textContent = feet + ' ft' + (walkCount + driveCount ? ' · ' + (walkCount + driveCount) + ' gate' + (walkCount + driveCount === 1 ? '' : 's') : '');
        chip.style.display = 'block';
      } else {
        chip.style.display = 'none';
      }
    }
    const sLen = el('bp-stat-length');
    const sWalk = el('bp-stat-walk');
    const sDrive = el('bp-stat-drive');
    if (sLen) sLen.textContent = feet + ' ft';
    if (sWalk) sWalk.textContent = walkCount;
    if (sDrive) sDrive.textContent = driveCount;

    if (feet > 0 || lastMapFeet>0 && Number(el('bp-linear-feet')?.value)===lastMapFeet) {
      const lfInput = el('bp-linear-feet');
      if (lfInput && (!lfInput.value || parseInt(lfInput.value) !== feet)) {
        lfInput.value = feet;
        lfInput.dispatchEvent(new Event('input'));
      }
    }

    lastMapFeet=feet;

    // Push gate counts into the step-3 dropdowns, growing them if the map has
    // more gates than the preset options. Previously these were clamped
    // (Math.min(count,3)) which made the displayed count disagree with the
    // priced count — the customer saw "3 walk" while being quoted for 5.
    const sgSel = el('bp-single-gates');
    const dgSel = el('bp-double-gates');
    ensureSelectCovers(sgSel, walkCount, 'walk gate');
    ensureSelectCovers(dgSel, driveCount, 'drive gate');
    if (sgSel) sgSel.value = String(walkCount);
    if (dgSel) dgSel.value = String(driveCount);

    // Drive the SAME update path the dropdowns use, so state, summary panel,
    // and price are all derived from one source instead of drifting apart.
    syncStep3();
    if(typeof saveDraft==='function')saveDraft();
  }

  // Make sure a gate <select> has an option for `count`, appending any that are
  // missing. Keeps the visible dropdown truthful when the map has more gates
  // than the default option list.
  function ensureSelectCovers(sel, count, label) {
    if (!sel) return;
    let max = -1;
    for (let i = 0; i < sel.options.length; i++) {
      const v = parseInt(sel.options[i].value, 10);
      if (!isNaN(v) && v > max) max = v;
    }
    for (let v = max + 1; v <= count; v++) {
      const opt = document.createElement('option');
      opt.value = String(v);
      opt.textContent = v === 0 ? 'None' : (v + ' ' + label + (v === 1 ? '' : 's'));
      sel.appendChild(opt);
    }
  }

  function clearAll(mapKind) {
    if (!confirm('Clear all drawn fence lines and gates?')) return;
    clearDrawingPreview(mapKind);
    if (mapKind === 'google') {
      gFenceLines.forEach(l => l.setMap(null)); gFenceLines = [];
      gWalkGates.forEach(m => m.setMap(null));  gWalkGates = [];
      gDriveGates.forEach(m => m.setMap(null)); gDriveGates = [];
      if (gActivePolyline) { gActivePolyline.setMap(null); gActivePolyline = null; }
      if (gClickListener) { google.maps.event.removeListener(gClickListener); gClickListener = null; }
      gMap.setOptions({ draggableCursor: null });
      gUndoStack = [];
      updateGoogleStats();
    } else if (mapKind === 'leaflet') {
      clearLeaflet();
      lUndoStack = [];
    }
    setDrawMode('idle', mapKind);
  }

  // -------- LEAFLET FALLBACK (kept for when Google Maps isn't configured) --------
  // Tracks for Leaflet mode-based drawing
  let lFenceLines = [];
  let lWalkGates = [];
  let lDriveGates = [];
  let lActivePolyline = null;
  let lClickHandler = null;

  // Custom HTML icons matching the Executive app's gate symbols
  function lWalkGateIcon() {
    return L.divIcon({
      className: 'gfs-gate-icon',
      html: SG_SVG,
      iconSize: [50, 50], iconAnchor: [25, 25],
    });
  }
  function lDriveGateIcon() {
    return L.divIcon({
      className: 'gfs-gate-icon',
      html: DG_SVG,
      iconSize: [54, 50], iconAnchor: [27, 25],
    });
  }

  function initLeafletMap() {
    // Default view: Toledo, OH
    map = L.map('bp-map', { zoomControl: true, doubleClickZoom: false }).setView([41.6528, -83.5379], 17);

    // ESRI World Imagery — free satellite tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
    }).addTo(map);

    // Wire the custom drawing toolbar
    wireDrawToolbar('leaflet');
    initParcelTools('leaflet');

    // Fix Leaflet's "I don't know my own size" issue
    setTimeout(() => map.invalidateSize(), 100);

    bindLeafletAddressSearch();
  }

  function bindLeafletAddressSearch() {
    const searchBtn=el('bp-map-search-btn'),searchInput=el('bp-map-search');
    if(!searchInput||searchInput.dataset.leafletSearchBound)return;
    searchInput.dataset.leafletSearchBound='1';
    const wrap=searchInput.parentElement;if(!wrap)return;
    wrap.style.position='relative';
    let suggestionsBox=el('bp-map-suggestions');
    if(!suggestionsBox){
      suggestionsBox=document.createElement('div');suggestionsBox.id='bp-map-suggestions';
      suggestionsBox.style.cssText='position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--gray-300);border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.12);max-height:280px;overflow-y:auto;z-index:1000;display:none;';
      wrap.appendChild(suggestionsBox);
    }
    let revision=0,controller=null,debounceTimer;
    function cancelSearch(){revision++;controller?.abort();controller=null;clearTimeout(debounceTimer);}
    function selectResult(data){
      const lat=Number(data.lat),lon=Number(data.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
      cancelSearch();
      map.setView([lat,lon],19);searchInput.value=String(data.display_name||'');
      el('bp-address').value=searchInput.value.split(',').slice(0,3).map(part=>part.trim()).join(', ');
      const a4=el('bp-form-address');if(a4&&!a4.value)a4.value=el('bp-address').value;
      setProjectAddress(el('bp-address').value);suggestionsBox.style.display='none';hideMapStatus();
    }
    async function search(q,chooseFirst=false){
      cancelSearch();const request=revision;
      if(q.length<3){suggestionsBox.style.display='none';return;}
      controller=new AbortController();const current=controller;
      const timeout=setTimeout(()=>current.abort(),8000);
      if(chooseFirst)showMapStatus('Searching…','loading');
      try{
        // Keep the entered state/city intact: this service area spans Ohio and Michigan.
        const url='https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(q)+'&limit=5&countrycodes=us&addressdetails=1';
        const res=await fetch(url,{signal:current.signal});
        if(!res.ok)throw new Error('Address search unavailable');
        const data=await res.json();
        if(request!==revision||searchInput.value.trim()!==q)return;
        if(current.signal.aborted)throw new Error('Address search timed out');
        hideMapStatus();suggestionsBox.replaceChildren();
        if(!Array.isArray(data)||!data.length){suggestionsBox.style.display='none';if(chooseFirst)showMapStatus('No matching address. Try including your city and state.','error');return;}
        if(chooseFirst){selectResult(data[0]);return;}
        for(const result of data){
          const button=document.createElement('button');button.type='button';
          button.style.cssText='display:block;width:100%;min-height:48px;text-align:left;padding:12px 14px;border:none;background:#fff;border-bottom:1px solid #e5e7eb;cursor:pointer;font-size:14px;color:#243447;';
          button.textContent=String(result.display_name||'');
          button.addEventListener('click',()=>selectResult(result));suggestionsBox.appendChild(button);
        }
        suggestionsBox.style.display='block';
      }catch(error){
        if(request!==revision||searchInput.value.trim()!==q)return;
        suggestionsBox.style.display='none';
        showMapStatus('Address search is unavailable. Try again, or enter your approximate length above.','error');
      }finally{clearTimeout(timeout);if(controller===current)controller=null;}
    }
    searchInput.addEventListener('input',()=>{cancelSearch();hideMapStatus();suggestionsBox.style.display='none';debounceTimer=setTimeout(()=>search(searchInput.value.trim()),300);});
    // Keep suggestions open when keyboard focus moves from the input onto a result.
    wrap.addEventListener('focusout',event=>{if(!wrap.contains(event.relatedTarget)){cancelSearch();suggestionsBox.style.display='none';}});
    const doSearch=()=>{const q=searchInput.value.trim();if(q.length<3){cancelSearch();showMapStatus('Enter an address with your city and state.','error');return;}search(q,true);};
    searchBtn?.addEventListener('click',doSearch);
    searchInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();doSearch();}if(event.key==='Escape'){cancelSearch();suggestionsBox.style.display='none';hideMapStatus();}});

    // (No legacy clear button needed — Clear is part of the new toolbar)
  }

  // -------- LEAFLET MODE ACTIVATION (mirrors Google Maps approach) --------
  function activateLeafletMode(mode) {
    // Stop any prior click handler + close any active polyline
    if (lClickHandler) { map.off('click', lClickHandler); lClickHandler = null; }
    clearDrawingPreview('leaflet');
    lFenceLines.forEach(line=>{if(mode==='idle')enableLeafletEditing(line);else line.editing?.disable();});
    if (mode !== 'fence' && lActivePolyline) {
      finalizeLeafletPolyline();
    }
    lFenceLines.forEach(line=>{if(mode==='idle')enableLeafletEditing(line);else line.editing?.disable();});

    if (mode === 'fence') {
      startLeafletFenceDrawing();
    } else if (mode === 'walk-gate' || mode === 'drive-gate') {
      // Crosshair cursor + click-to-place
      const container = map.getContainer();
      container.style.cursor = 'crosshair';
      lClickHandler = (e) => addLeafletGate(mode === 'walk-gate' ? 'walk' : 'drive', e.latlng);
      map.on('click', lClickHandler);
    } else {
      map.getContainer().style.cursor = '';
    }
  }

  function startLeafletFenceDrawing() {
    if(lActivePolyline)finalizeLeafletPolyline();clearDrawingPreview('leaflet');
    map.getContainer().style.cursor='crosshair';
    const polyline=L.polyline([],{color:'#00E5A0',weight:6,opacity:1}).addTo(map);lActivePolyline=polyline;
    lClickHandler=e=>{const pt=snappedDrawingPoint('leaflet',e.latlng);polyline.addLatLng(pt);mapPreview=null;if(lPreviewLine)lPreviewLine.setLatLngs([]);lUndoStack.push({type:'point'});updateLeafletStats();};
    map.on('click',lClickHandler);lMoveHandler=e=>previewDrawingPoint('leaflet',e.latlng);map.on('mousemove',lMoveHandler);
    lDoubleClickHandler=()=>{finalizeLeafletPolyline();setDrawMode('idle','leaflet');};map.on('dblclick',lDoubleClickHandler);
  }

  function finalizeLeafletPolyline() {
    clearDrawingPreview('leaflet');
    if (!lActivePolyline) return;
    const latlngs = lActivePolyline.getLatLngs();
    if (latlngs.length < 2) {
      map.removeLayer(lActivePolyline);
      while (lUndoStack.length && lUndoStack[lUndoStack.length - 1].type === 'point') lUndoStack.pop();
    } else {
      enableLeafletEditing(lActivePolyline);
      lFenceLines.push(lActivePolyline);
      track('drew');
      while (lUndoStack.length && lUndoStack[lUndoStack.length - 1].type === 'point') lUndoStack.pop();
      lUndoStack.push({ type: 'fence', item: lActivePolyline });
    }
    lActivePolyline = null;
    if (lClickHandler) { map.off('click', lClickHandler); lClickHandler = null; }
    map.getContainer().style.cursor = '';
    updateLeafletStats();
  }

  function addLeafletGate(type, latlng, restorePosition=false) {
    if(!restorePosition){const snapped=snapMapGate('leaflet',type,latlng);if(!snapped)return;latlng=snapped;}
    const icon = type === 'walk' ? lWalkGateIcon() : lDriveGateIcon();
    const marker = L.marker(latlng, { icon, draggable: true, zIndexOffset: 100 }).addTo(map);
    marker.bindTooltip(type === 'walk' ? 'Walk-through gate (click to remove)' : 'Drive gate (click to remove)');
    let lastPosition=marker.getLatLng();
    marker.on('dragstart',()=>{lastPosition=marker.getLatLng();});
    marker.on('dragend',()=>{const point=snapMapGate('leaflet',type,marker.getLatLng(),marker);marker.setLatLng(point||lastPosition);updateLeafletStats();});
    marker.on('click', () => {
      if (confirm('Remove this gate?')) {
        map.removeLayer(marker);
        const arr = type === 'walk' ? lWalkGates : lDriveGates;
        const idx = arr.indexOf(marker);
        if (idx >= 0) arr.splice(idx, 1);
        updateLeafletStats();
      }
    });
    (type === 'walk' ? lWalkGates : lDriveGates).push(marker);
    lUndoStack.push({ type: type, item: marker });
    updateLeafletStats();
    return marker;
  }

  function updateLeafletStats() {
    if(activeDrawingEngine!=='leaflet')return;
    const facts=window.GFSMapGeometry.summary(mapPaths('leaflet'),mapGates('leaflet'));
    setLiveStats(Math.round(facts.totalFeet),lWalkGates.length,lDriveGates.length);renderMapMeasurements('leaflet');
  }

  function clearLeaflet() {
    lFenceLines.forEach(l => map.removeLayer(l)); lFenceLines = [];
    lWalkGates.forEach(m => map.removeLayer(m)); lWalkGates = [];
    lDriveGates.forEach(m => map.removeLayer(m)); lDriveGates = [];
    if (lActivePolyline) { map.removeLayer(lActivePolyline); lActivePolyline = null; }
    if (lClickHandler) { map.off('click', lClickHandler); lClickHandler = null; }
    map.getContainer().style.cursor = '';
    updateLeafletStats();
  }

  // -------- UTILITIES --------
  function markActive(id)   { const e = el(id); if (e) e.classList.add('active'); }
  function markComplete(id) { const e = el(id); if (e) { e.classList.add('complete'); e.classList.remove('active'); } }


  // =====================================================================
  //  2026-11 TOOL UPGRADE
  //  - resized style photos
  //  - one tile per model in the picker, with color and height chips
  //  - more than one fence style in a project (each priced on its own),
  //    and which drawn run each added style covers
  //  - gate steppers, yard notes, full-screen map
  //  - progress: step rail, done checks, checklist, phone bar
  //  - styles handed in by a link or from the 3D Studio
  //  Per-foot rates are never shown. Dollar amounts appear only after the
  //  contact step.
  // =====================================================================

  // ---- SMALL PICTURES -----------------------------------------------------------
  // Style photos in Firebase Storage are full size (about 1600 px). Tiles get
  // a resized copy from Netlify's image service; if that ever fails, the
  // image falls back to the original (see the error listener in initPlus).
  function thumbOf(url, width) {
    const src = String(url || '');
    if (!/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/ghareeb-fencing\.firebasestorage\.app\//.test(src)) return src;
    if (!/\.netlify\.app$|ghareebfence\.com$/.test(location.hostname)) return src;
    return '/.netlify/images?url=' + encodeURIComponent(src) + '&w=' + (width || 480) + '&fm=webp&q=72';
  }

  // ---- STYLE VARIANTS ---------------------------------------------------
  // The price list has one entry per model, color and height
  // ("Kingston - White 6ft"). Entries that differ only by color or height
  // are one model: the picker shows it once and the customer taps a color
  // and a height. Each entry keeps its own price.
  const COLOR_WORDS = [['white/tan', 'White / Tan'], ['mocha walnut', 'Mocha Walnut'], ['aspen latte', 'Aspen Latte'], ['chai gray', 'Chai Gray'], ['dark gray', 'Dark Gray'], ['adobe', 'Adobe'], ['tan', 'Tan'], ['white', 'White'], ['black', 'Black'], ['blk', 'Black'], ['galvanized', 'Galvanized'], ['galv', 'Galvanized'], ['bronze', 'Bronze']];
  const HEIGHT_TOKEN = /\b\d+(?:\.\d+)?\s*(?:ft\b|feet\b|foot\b|')/i;
  const variantCache = new Map();
  function variantOf(name) {
    const raw = String(name || '');
    let info = variantCache.get(raw);
    if (info) return info;
    const height = supportedStyleHeight(raw);
    let text = raw.replace(/[‘’ʼ´′]/g, "'"), model = text, color = '';
    if (height !== null) { text = text.replace(HEIGHT_TOKEN, ' \u0001 '); model = model.replace(HEIGHT_TOKEN, ' '); }
    for (const [word, label] of COLOR_WORDS) {
      const pattern = new RegExp('(^|[^a-z])' + word.replace('/', '\\/') + '(?![a-z])', 'i');
      if (!pattern.test(text)) continue;
      text = text.replace(pattern, '$1 \u0002 '); model = model.replace(pattern, '$1 '); color = label;
      break;
    }
    model = model.replace(/\(\s*\)/g, ' ').replace(/\s+/g, ' ').replace(/\s*[-–—]\s*$/, '').replace(/^\s*[-–—]\s*/, '').trim();
    info = { key: text.toLowerCase().replace(/[^a-z0-9\u0001\u0002]+/g, ''), height: height, color: color, model: model ? model.charAt(0).toUpperCase() + model.slice(1) : raw };
    variantCache.set(raw, info);
    return info;
  }
  // Every catalog entry of the same model (same family, same name once the
  // color and height are set aside), in price-list order.
  function variantGroup(id) {
    const fence = FENCE_PRICING[id];
    if (!fence) return [];
    const key = variantOf(fence.name).key, family = familyOf(id);
    return Object.keys(FENCE_PRICING).filter(other => familyOf(other) === family && variantOf(FENCE_PRICING[other].name).key === key);
  }
  function pickVariant(id, want) {
    const fence = FENCE_PRICING[id];
    if (!fence) return id;
    const me = variantOf(fence.name);
    const height = want.height !== undefined ? want.height : me.height, color = want.color !== undefined ? want.color : me.color;
    const group = variantGroup(id).map(other => ({ id: other, info: variantOf(FENCE_PRICING[other].name) }));
    const exact = group.find(v => v.info.height === height && v.info.color === color);
    if (exact) return exact.id;
    if (want.color !== undefined) {
      const sameColor = group.filter(v => v.info.color === color).sort((a, b) => Math.abs((a.info.height || 0) - (height || 0)) - Math.abs((b.info.height || 0) - (height || 0)));
      if (sameColor.length) return sameColor[0].id;
    }
    if (want.height !== undefined) {
      const sameHeight = group.find(v => v.info.height === height);
      if (sameHeight) return sameHeight.id;
    }
    return id;
  }
  // One card per model for the picker grid. `ids` is what the search and
  // material filter left; the card shows the customer's current pick when
  // it is in the model, otherwise white at 6 ft when there is one.
  function modelCards(ids, selectedId) {
    const groups = new Map();
    ids.forEach(id => {
      const key = familyOf(id) + '|' + variantOf(FENCE_PRICING[id].name).key;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(id);
    });
    return Array.from(groups.values()).map(members => {
      const all = variantGroup(members[0]).map(id => variantOf(FENCE_PRICING[id].name));
      const info = id => variantOf(FENCE_PRICING[id].name);
      const pick = members.includes(selectedId) ? selectedId
        : members.find(id => info(id).color === 'White' && info(id).height === 6)
        || members.find(id => info(id).height === 6)
        || members[0];
      const colors = Array.from(new Set(all.map(v => v.color).filter(Boolean)));
      const heights = Array.from(new Set(all.map(v => v.height).filter(h => h !== null))).sort((a, b) => a - b);
      const several = all.length > 1;
      return {
        id: pick,
        title: several ? info(pick).model : FENCE_PRICING[pick].name,
        options: several ? [colors.length > 1 ? colors.length + ' colors' : '', heights.length > 1 ? heights.join(', ') + ' ft' : ''].filter(Boolean).join(' · ') : '',
      };
    });
  }
  function chipButton(label, pressed, onClick) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'bp-chip'; button.textContent = label;
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    button.addEventListener('click', onClick);
    return button;
  }
  // Color and height chips for one chosen style. `ladder` covers the few
  // styles whose name carries no height: {value, set(height)}.
  function renderVariantChips(host, id, onPick, ladder) {
    if (!host) return;
    const fence = FENCE_PRICING[id];
    const signature = fence ? JSON.stringify([id, ladder ? String(ladder.value) : '', Object.keys(FENCE_PRICING).length]) : '';
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    host.replaceChildren();
    if (!fence) return;
    const me = variantOf(fence.name), group = variantGroup(id).map(other => variantOf(FENCE_PRICING[other].name));
    const row = (label, chips, note) => {
      const wrap = document.createElement('div'); wrap.className = 'bp-variants__row'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', label);
      const title = document.createElement('span'); title.className = 'bp-variants__label'; title.textContent = label;
      wrap.append(title, ...chips);
      host.appendChild(wrap);
      if (note) { const p = document.createElement('p'); p.className = 'bp-variants__note'; p.textContent = note; host.appendChild(p); }
    };
    const colors = Array.from(new Set(group.map(v => v.color).filter(Boolean)));
    if (colors.length > 1) row('Color', colors.map(color => chipButton(color, color === me.color, () => onPick(pickVariant(id, { color: color })))));
    if (me.height !== null) {
      const heights = Array.from(new Set(group.filter(v => v.color === me.color && v.height !== null).map(v => v.height))).sort((a, b) => a - b);
      row('Height', heights.map(h => chipButton(h + ' ft', h === me.height, () => onPick(pickVariant(id, { height: h })))),
        heights.length === 1 ? 'This style comes in ' + me.height + ' ft. Need a different height? Tell us in the notes and we will price it.' : '');
    } else if (ladder) {
      row('Height', [4, 5, 6, 8].map(h => chipButton(h + ' ft', Number(ladder.value) === h, () => ladder.set(h))));
    }
  }

  // ---- STYLE PICKER TARGET ----------------------------------------------
  // The same picker serves the main fence and any added style.
  let pickerTarget = null;
  function pickerSelectedId() { return pickerTarget && state.sections.includes(pickerTarget) ? pickerTarget.fenceId : state.fenceId; }
  function setSectionStyle(section, id) {
    if (!FENCE_PRICING[id]) return;
    section.fenceId = id;
    const named = supportedStyleHeight(FENCE_PRICING[id].name);
    if (named !== null) section.height = String(named);
    else if (![4, 5, 6, 8].includes(Number(section.height))) section.height = '6';
  }
  function applyPickedStyle(id) {
    if (!FENCE_PRICING[id]) return;
    if (pickerTarget && state.sections.includes(pickerTarget)) { setSectionStyle(pickerTarget, id); track('style-added'); updateAll(); }
    else selectFenceStyle(id);
  }

  // ---- PROJECT PARTS: THE MAIN FENCE PLUS ANY ADDED STYLES -------------------
  // The length from step 1 and the gate counts from step 3 are totals for
  // the whole project (the map keeps them in sync). An added style takes
  // its feet and gates out of those totals; the main style gets the rest.
  let sectionSeq = 0;
  function newSection() { sectionSeq += 1; return { uid: 's' + sectionSeq, fenceId: '', feet: 0, height: '6', singleGates: 0, doubleGates: 0 }; }
  function sectionTotals() {
    return state.sections.reduce((sum, s) => ({ feet: sum.feet + (Number(s.feet) || 0), single: sum.single + (Number(s.singleGates) || 0), double: sum.double + (Number(s.doubleGates) || 0) }), { feet: 0, single: 0, double: 0 });
  }
  function normalizeSections() {
    let single = Math.max(0, Number(state.singleGates) || 0), double = Math.max(0, Number(state.doubleGates) || 0);
    state.sections.forEach(section => {
      section.feet = Math.max(0, Math.min(2000, Number(section.feet) || 0));
      section.singleGates = Math.max(0, Math.min(single, Math.floor(Number(section.singleGates) || 0))); single -= section.singleGates;
      section.doubleGates = Math.max(0, Math.min(double, Math.floor(Number(section.doubleGates) || 0))); double -= section.doubleGates;
      const fence = FENCE_PRICING[section.fenceId];
      if (!fence) { if (section.fenceId && styleCatalogSettled) section.fenceId = ''; return; }
      const named = supportedStyleHeight(fence.name);
      if (named !== null) section.height = String(named);
      else if (![4, 5, 6, 8].includes(Number(section.height))) section.height = '6';
    });
  }
  function sectionsIssue() {
    if (!state.sections.length) return '';
    for (let i = 0; i < state.sections.length; i++) {
      const section = state.sections[i], fence = FENCE_PRICING[section.fenceId];
      if (!fence) return 'Choose a style for fence style ' + (i + 2) + ', or remove it.';
      if (!(section.feet > 0)) return 'Enter how many feet of ' + fence.name + ' you need, or remove it.';
    }
    const used = sectionTotals().feet;
    if (Number(state.linearFeet) > 0 && used >= state.linearFeet) return overAllocatedText(used, state.linearFeet);
    return '';
  }
  function overAllocatedText(used, total) {
    const main = FENCE_PRICING[state.fenceId];
    return 'Your added styles add up to ' + used + ' ft and the whole fence is ' + total + ' ft, so nothing is left for ' + (main ? main.name : 'the main style') + '. Lower the added feet or raise the total length in step 1.';
  }
  function projectParts(primaryId) {
    const totals = sectionTotals();
    const parts = [{ primary: true, fenceId: primaryId || state.fenceId, feet: Math.round((Number(state.linearFeet) - totals.feet) * 100) / 100, height: state.height, singleGates: state.singleGates - totals.single, doubleGates: state.doubleGates - totals.double }];
    state.sections.forEach(section => parts.push({ primary: false, fenceId: section.fenceId, feet: section.feet, height: section.height, singleGates: section.singleGates, doubleGates: section.doubleGates }));
    return parts;
  }
  function partHeight(fence, requested) {
    const named = fence ? supportedStyleHeight(fence.name) : null;
    return named !== null ? named : Number(requested);
  }
  // Every style is priced at its own rate. Heights are separate styles in
  // the Executive app, so no height multiplier is applied, including for
  // the few styles whose name has no height.
  function pricePart(part) {
    const fence = FENCE_PRICING[part.fenceId];
    if (!fence || !Number.isFinite(fence.perFoot) || fence.perFoot <= 0) return null;
    if (!Number.isFinite(part.feet) || part.feet <= 0) return null;
    const named = supportedStyleHeight(fence.name), height = partHeight(fence, part.height);
    if (named === null && ![4, 5, 6, 8].includes(height)) return null;
    const rounding = roundToSections(part.feet, fence.name);
    return {
      primary: !!part.primary, id: part.fenceId, name: fence.name, height: height, heightInName: named !== null,
      feet: part.feet, billableFeet: rounding.billable, sectionSize: rounding.sectionSize, waste: rounding.waste,
      singleGates: Math.max(0, part.singleGates), doubleGates: Math.max(0, part.doubleGates),
      fenceCost: rounding.billable * fence.perFoot,
      gateCost: Math.max(0, part.singleGates) * fence.singleGate + Math.max(0, part.doubleGates) * fence.doubleGate,
    };
  }
  function gateWords(single, double) {
    const bits = [];
    if (single > 0) bits.push(single + ' walk gate' + (single === 1 ? '' : 's'));
    if (double > 0) bits.push(double + ' drive gate' + (double === 1 ? '' : 's'));
    return bits.join(', ');
  }
  // Plain description of each part, without prices. Used in the lead, the
  // summary card and the PDF.
  function describeParts() {
    return projectParts().filter(part => FENCE_PRICING[part.fenceId] && part.feet > 0).map(part => {
      const fence = FENCE_PRICING[part.fenceId], named = supportedStyleHeight(fence.name), height = partHeight(fence, part.height);
      return { primary: part.primary, id: part.fenceId, name: fence.name, feet: part.feet, height: height, heightInName: named !== null, singleGates: Math.max(0, part.singleGates), doubleGates: Math.max(0, part.doubleGates), gates: gateWords(Math.max(0, part.singleGates), Math.max(0, part.doubleGates)) };
    });
  }
  function sectionLines() {
    return describeParts().map(part => part.feet + ' ft of ' + part.name + (part.heightInName ? '' : ', ' + part.height + ' ft tall') + (part.gates ? ', ' + part.gates : ''));
  }
  // Feet of each run drawn on the map, for one-tap fill of an added style.
  function mapRunFeet() {
    try {
      if (!activeDrawingEngine || !window.GFSMapGeometry) return [];
      const facts = window.GFSMapGeometry.summary(mapPaths(activeDrawingEngine, false), mapGates(activeDrawingEngine));
      const runs = [];
      facts.segments.forEach(row => { runs[row.line] = (runs[row.line] || 0) + row.feet; });
      // Keep each run's own index so a style can be tied to the run it covers.
      return runs.map((feet, run) => ({ run: run, feet: Math.round(feet || 0) })).filter(row => row.feet > 0);
    } catch (e) { return []; }
  }

  // ---- STEPPERS ------------------------------------------------------------
  function stepperHtml(kind, labelId) {
    return '<div class="bp-stepper" role="group" data-stepper="' + kind + '"' + (labelId ? ' aria-labelledby="' + labelId + '"' : '') + '>' +
      '<button type="button" data-step="-1" aria-label="One fewer">&minus;</button><output aria-live="polite">0</output><button type="button" data-step="1" aria-label="One more">+</button></div>';
  }
  function setStepper(node, value, max) {
    if (!node) return;
    const out = node.querySelector('output'), minus = node.querySelector('[data-step="-1"]'), plus = node.querySelector('[data-step="1"]');
    if (out && out.textContent !== String(value)) out.textContent = String(value);
    if (minus) minus.disabled = value <= 0;
    if (plus) plus.disabled = value >= max;
  }
  function ensureMainSteppers() {
    const grid = document.querySelector('.bp-step-3-grid');
    if (!grid || grid.dataset.plus === 'yes') return;
    grid.dataset.plus = 'yes';
    // Height now lives with the style (step 2), as chips.
    const heightSelect = el('bp-height'), heightCol = heightSelect && heightSelect.parentElement;
    if (heightCol && heightCol.parentElement === grid) {
      const review = el('bp-height-review');
      if (review) grid.after(review);
      heightCol.classList.add('bp-col-hidden');
    }
    [['bp-single-gates', 'single', 'Walk gates', 'About 4 ft wide.', 12, 'walk gate'], ['bp-double-gates', 'double', 'Drive gates', 'Double gate, about 10 ft wide.', 6, 'drive gate']].forEach(([id, kind, title, help, max, noun]) => {
      const select = el(id), col = select && select.parentElement;
      if (!select || !col) return;
      const label = col.querySelector('label');
      if (label) { label.id = id + '-label'; label.removeAttribute('for'); label.textContent = title; }
      select.classList.add('bp-visually-hidden'); select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
      col.insertAdjacentHTML('beforeend', stepperHtml(kind, id + '-label') + '<p class="bp-stepper__help">' + help + '</p><div class="bp-gate-assign" data-assign="' + kind + '" data-gfs-protected></div>');
      col.querySelector('.bp-stepper').addEventListener('click', event => {
        const button = event.target.closest('button[data-step]');
        if (!button || button.disabled) return;
        const next = Math.max(0, Math.min(max, (Number(select.value) || 0) + Number(button.dataset.step)));
        ensureSelectCovers(select, next, noun);
        select.value = String(next);
        state.sawDetails = true;
        select.dispatchEvent(new Event('change'));
      });
    });
    const note = document.createElement('p');
    note.id = 'bp-gate-note'; note.className = 'bp-note'; note.hidden = true;
    note.setAttribute('role', 'status'); note.setAttribute('data-gfs-protected', '');
    grid.after(note);
  }
  // A gentle check, never a block: more gate than fence usually means a
  // count was tapped by mistake.
  const GATE_FEET = { single: 4, double: 10 };
  function renderGateNote() {
    const note = el('bp-gate-note');
    if (!note) return;
    const total = Number(state.linearFeet) || 0;
    const gateFeet = (Number(state.singleGates) || 0) * GATE_FEET.single + (Number(state.doubleGates) || 0) * GATE_FEET.double;
    const tooMany = total > 0 && gateFeet > total;
    note.hidden = !tooMany;
    note.textContent = tooMany ? 'That is about ' + gateFeet + ' ft of gates on a ' + total + ' ft fence. Check the gate counts.' : '';
  }
  // With more than one style, say how many of the gates belong to each
  // added style; the rest stay with the main style.
  function renderGateAssign() {
    [['single', 'singleGates', 'walk'], ['double', 'doubleGates', 'drive']].forEach(([kind, key, noun]) => {
      const host = document.querySelector('.bp-gate-assign[data-assign="' + kind + '"]');
      if (!host) return;
      const total = Number(state[key]) || 0, rows = state.sections.filter(section => FENCE_PRICING[section.fenceId]);
      const signature = JSON.stringify([total > 0, rows.map(section => [section.uid, section.fenceId])]);
      if (host.dataset.signature !== signature) {
        host.dataset.signature = signature;
        host.replaceChildren();
        if (total > 0) rows.forEach(section => {
          const row = document.createElement('div'), labelId = 'bp-assign-' + kind + '-' + section.uid;
          row.className = 'bp-gate-assign__row'; row.dataset.uid = section.uid;
          row.innerHTML = '<span class="bp-gate-assign__label" id="' + labelId + '">How many ' + noun + ' gates go in the ' + esc(FENCE_PRICING[section.fenceId].name) + '?</span>' + stepperHtml(kind, labelId);
          row.querySelector('.bp-stepper').addEventListener('click', event => {
            const button = event.target.closest('button[data-step]');
            if (!button || button.disabled) return;
            section[key] = Math.max(0, (Number(section[key]) || 0) + Number(button.dataset.step));
            updateAll();
          });
          host.appendChild(row);
        });
      }
      const used = state.sections.reduce((sum, section) => sum + (Number(section[key]) || 0), 0);
      rows.forEach(section => setStepper(host.querySelector('[data-uid="' + section.uid + '"] .bp-stepper'), Number(section[key]) || 0, total - (used - (Number(section[key]) || 0))));
    });
  }

  // ---- ADDED STYLES (STEP 2) ---------------------------------------------------
  function ensureSectionsHost() {
    let host = el('bp-sections');
    if (host) return host;
    const summary = el('bp-style-summary');
    if (!summary) return null;
    host = document.createElement('div');
    host.id = 'bp-sections'; host.className = 'bp-sections'; host.tabIndex = -1;
    host.setAttribute('data-gfs-protected', '');
    summary.after(host);
    return host;
  }
  function buildSections(host, runs) {
    host.replaceChildren();
    state.sections.forEach((section, index) => {
      const fence = FENCE_PRICING[section.fenceId], card = document.createElement('section');
      card.className = 'bp-sec'; card.dataset.uid = section.uid; card.setAttribute('aria-label', 'Fence style ' + (index + 2));
      card.innerHTML =
        '<div class="bp-sec__head"><strong>Fence style ' + (index + 2) + '</strong><button type="button" class="bp-sec__remove">Remove</button></div>' +
        '<button type="button" class="bp-sec__style" aria-haspopup="dialog" aria-controls="bp-style-dialog">' +
          (fence ? '<img alt="" src="' + esc(thumbOf(fence.photoThumb || fence.photo, 200)) + '" data-full="' + esc(fence.photoThumb || fence.photo) + '" loading="lazy" decoding="async"><span><b>' + esc(fence.name) + '</b><small>Change style</small></span>'
                 : '<span><b>Choose the style for this part</b><small>Browse fence styles</small></span>') +
        '</button>' +
        '<div class="bp-variants" data-role="variants"></div>' +
        '<div class="bp-sec__feetwrap"><label class="form-label" for="bp-sec-feet-' + section.uid + '">How many feet of this style?</label>' +
        '<input id="bp-sec-feet-' + section.uid + '" class="form-input bp-sec__feet" type="number" inputmode="decimal" min="1" max="2000" step="any" placeholder="e.g. 60">' +
        (runs.length > 1 ? '<div class="bp-sec__runs" role="group" aria-label="Use a run you drew on the map">' + runs.map((row, i) => '<button type="button" class="bp-chip" aria-pressed="' + (section.run === row.run) + '" data-run-index="' + row.run + '" data-run-feet="' + row.feet + '">Run ' + (i + 1) + ' \u00b7 ' + row.feet + ' ft</button>').join('') + '</div>' : '') +
        '</div><p class="bp-sec__issue" role="status" aria-live="polite"></p>';
      card.querySelector('.bp-sec__remove').addEventListener('click', () => {
        state.sections = state.sections.filter(other => other !== section);
        updateAll();
        el('bp-add-section')?.focus({ preventScroll: true });
      });
      card.querySelector('.bp-sec__style').addEventListener('click', () => openStylePicker(section));
      const feet = card.querySelector('.bp-sec__feet');
      feet.addEventListener('blur', () => { if (!section.touched) { section.touched = true; updateAll(); } });
      feet.addEventListener('input', () => { section.feet = Math.max(0, Number(feet.value) || 0); section.run = undefined; card.querySelectorAll('[data-run-feet]').forEach(other => other.setAttribute('aria-pressed', 'false')); updateAll(); });
      card.querySelectorAll('[data-run-feet]').forEach(button => button.addEventListener('click', () => { section.feet = Number(button.dataset.runFeet) || 0; section.run = Number(button.dataset.runIndex); feet.value = section.feet; card.querySelectorAll('[data-run-feet]').forEach(other => other.setAttribute('aria-pressed', String(other === button))); updateAll(); }));
      host.appendChild(card);
    });
    if (state.sections.length) {
      const split = document.createElement('p');
      split.className = 'bp-split'; split.id = 'bp-split'; split.setAttribute('role', 'status'); split.setAttribute('aria-live', 'polite');
      host.appendChild(split);
    }
    if (state.sections.length < 3) {
      const add = document.createElement('button');
      add.type = 'button'; add.id = 'bp-add-section'; add.className = 'bp-add-section';
      add.textContent = state.sections.length ? '+ Add another style' : '+ Add a second style for part of the fence';
      add.addEventListener('click', () => { const section = newSection(); state.sections.push(section); track('style-add'); updateAll(); openStylePicker(section); });
      host.appendChild(add);
    }
    if (!state.sections.length) {
      const hint = document.createElement('p');
      hint.className = 'bp-add-hint';
      hint.textContent = 'For example privacy across the back and chain link down the sides. Each style is priced on its own.';
      host.appendChild(hint);
    }
  }
  function renderSections() {
    const host = ensureSectionsHost();
    if (!host) return;
    const runs = mapRunFeet();
    // A style stays tied to a drawn run only while that run still has the
    // length it had when it was tapped; redrawing the map clears the tie.
    if (runs.length) state.sections.forEach(section => {
      if (section.run !== undefined && !runs.some(row => row.run === section.run && row.feet === section.feet)) section.run = undefined;
    });
    const signature = JSON.stringify([state.sections.map(section => [section.uid, section.fenceId, section.run]), Object.keys(FENCE_PRICING).length, runs]);
    if (host.dataset.signature !== signature) { host.dataset.signature = signature; buildSections(host, runs); }
    host.hidden = !FENCE_PRICING[state.fenceId] && !state.sections.length;
    state.sections.forEach(section => {
      const card = host.querySelector('.bp-sec[data-uid="' + section.uid + '"]');
      if (!card) return;
      const fence = FENCE_PRICING[section.fenceId];
      renderVariantChips(card.querySelector('[data-role="variants"]'), section.fenceId, id => { setSectionStyle(section, id); updateAll(); }, { value: section.height, set: height => { section.height = String(height); updateAll(); } });
      const feet = card.querySelector('.bp-sec__feet');
      if (feet && document.activeElement !== feet) feet.value = section.feet > 0 ? String(section.feet) : '';
      const issue = card.querySelector('.bp-sec__issue');
      if (issue) {
        issue.textContent = !fence ? 'Choose a style for this part, or remove it.' : !(section.feet > 0) ? 'Enter how many feet of this style you need.' : '';
        issue.classList.toggle('is-prompt', !section.touched && !state.sectionsFlagged);
      }
    });
    const split = el('bp-split');
    if (split) {
      const total = Number(state.linearFeet) || 0, used = sectionTotals().feet, main = FENCE_PRICING[state.fenceId];
      split.replaceChildren();
      if (!total) split.textContent = 'Enter the total fence length in step 1. Your added styles come out of that total.';
      else if (used >= total) split.textContent = overAllocatedText(used, total);
      else {
        const lead = document.createElement('b'); lead.textContent = total + ' ft total';
        split.append(lead, ' = ' + [(Math.round((total - used) * 100) / 100) + ' ft ' + (main ? main.name : 'main style')].concat(state.sections.filter(section => section.feet > 0).map(section => section.feet + ' ft ' + (FENCE_PRICING[section.fenceId] ? FENCE_PRICING[section.fenceId].name : 'added style'))).join(' + '));
      }
    }
  }

  // A typical-size button shows as pressed while the length equals its size.
  function renderSizePresetState() {
    $$('#bp-size-presets button[data-feet]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.feet) === Number(state.linearFeet) ? 'true' : 'false'));
  }

  // ---- SITE NOTES (STEP 3) ------------------------------------------------------
  function siteNoteButtons() { return $$('#bp-site-notes [data-note]'); }
  function bindSiteNotes() {
    siteNoteButtons().forEach(button => {
      if (button.dataset.bound === 'yes') return;
      button.dataset.bound = 'yes';
      button.addEventListener('click', () => {
        const note = button.dataset.note;
        state.siteNotes = state.siteNotes.includes(note) ? state.siteNotes.filter(other => other !== note) : state.siteNotes.concat(note);
        state.sawDetails = true;
        updateAll();
      });
    });
  }
  function renderSiteNotes() {
    siteNoteButtons().forEach(button => button.setAttribute('aria-pressed', state.siteNotes.includes(button.dataset.note) ? 'true' : 'false'));
  }

  // ---- SUMMARY CARD ---------------------------------------------------------------
  // Made once at start-up, in place. Edit Mode re-seats the page's original
  // elements whenever content is applied, which would push a list added
  // later to the top of the card.
  function ensureSummaryParts() {
    let list = el('bp-summary-parts');
    if (list) return list;
    const cta = el('bp-summary-cta-area');
    if (!cta) return null;
    list = document.createElement('ul');
    list.id = 'bp-summary-parts'; list.className = 'bp-parts'; list.hidden = true;
    list.setAttribute('data-gfs-protected', '');
    cta.before(list);
    return list;
  }
  function renderSummaryParts() {
    const fence = FENCE_PRICING[state.fenceId], style = el('bp-summary-style');
    const parts = describeParts(), extra = parts.filter(part => !part.primary);
    if (style && fence) style.textContent = extra.length ? fence.name + ' + ' + extra.length + ' more' : fence.name;
    const list = ensureSummaryParts();
    if (!list) return;
    list.hidden = !extra.length;
    if (!extra.length) { list.replaceChildren(); return; }
    list.replaceChildren(...parts.map(part => {
      const item = document.createElement('li'), name = document.createElement('b');
      name.textContent = part.name;
      item.append(name, part.feet + ' ft' + (part.gates ? ' · ' + part.gates : ''));
      return item;
    }));
  }

  // ---- FULL-SCREEN MAP ------------------------------------------------------------
  function setMapFullscreen(on) {
    const tools = el('bp-map-tools'), button = el('bp-map-fullscreen');
    if (!tools) return;
    tools.classList.toggle('bp-map-full', !!on);
    document.documentElement.classList.toggle('bp-map-open', !!on);
    if (on) overlayOpened('map', () => setMapFullscreen(false)); else overlayClosed('map');
    if (button) button.textContent = on ? 'Close full screen' : 'Full screen';
    const refresh = () => {
      try {
        if (map && typeof map.invalidateSize === 'function') map.invalidateSize();
        if (gMap && window.google && google.maps && google.maps.event) google.maps.event.trigger(gMap, 'resize');
      } catch (e) {}
    };
    refresh(); setTimeout(refresh, 80); setTimeout(refresh, 400);
    if (!on) el('bp-map')?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
  }
  function ensureMapFullscreen() {
    const mapNode = el('bp-map'), frame = mapNode && mapNode.parentElement, tools = el('bp-map-tools');
    if (!frame || !tools || el('bp-map-fullscreen')) return;
    frame.classList.add('bp-map-frame');
    const address = el('bp-map-search-row') && el('bp-map-search-row').parentElement;
    if (address) address.classList.add('bp-map-address');
    const button = document.createElement('button');
    button.type = 'button'; button.id = 'bp-map-fullscreen'; button.textContent = 'Full screen';
    button.setAttribute('data-gfs-protected', '');
    frame.appendChild(button);
    button.addEventListener('click', () => setMapFullscreen(!tools.classList.contains('bp-map-full')));
    // Keep the map drawn to its real size whenever the space around it changes
    // (full screen, a tool group opening, the phone turning).
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { try { if (map && typeof map.invalidateSize === 'function') map.invalidateSize({ pan: false }); } catch (e) {} }).observe(mapNode);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && tools.classList.contains('bp-map-full') && !el('bp-style-dialog')?.open) setMapFullscreen(false); });
    // Leaving the map for the style picker or the length box closes it first.
    document.addEventListener('click', event => { if (tools.classList.contains('bp-map-full') && event.target.closest?.('#bp-drawing-next,#bp-use-length')) setMapFullscreen(false); }, true);
  }
  // On a phone the in-page map is too small to draw on, so it opens full screen.
  function openMapForPhone() {
    try { if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches && !el('bp-map-tools')?.hidden) setMapFullscreen(true); } catch (e) {}
  }

  // ---- PHONE PROGRESS BAR ---------------------------------------------------------
  let barAction = null;
  function ensureBar() {
    let bar = el('bp-bar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.id = 'bp-bar'; bar.setAttribute('data-gfs-protected', ''); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Your estimate progress');
    bar.innerHTML = '<div class="bp-bar__text"><span class="bp-bar__step"></span><span class="bp-bar__now"></span></div><button type="button" class="bp-bar__go"></button>';
    document.body.appendChild(bar);
    bar.querySelector('.bp-bar__go').addEventListener('click', () => { if (barAction) barAction(); });
    // Step aside for the on-screen keyboard.
    const typing = node => !!(node && node.closest && node.closest('input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),textarea'));
    // The bar must not come back between press and release: a button pressed
    // low on the screen right after typing would have the bar slide in under
    // the pointer and swallow the click.
    let pressing = false;
    const syncTyping = () => document.body.classList.toggle('bp-typing', typing(document.activeElement));
    const syncSoon = () => setTimeout(() => { if (!pressing) syncTyping(); }, 60);
    document.addEventListener('pointerdown', () => { pressing = true; }, true);
    ['pointerup', 'pointercancel'].forEach(type => document.addEventListener(type, () => { pressing = false; syncSoon(); }, true));
    document.addEventListener('focusin', event => { if (typing(event.target)) document.body.classList.add('bp-typing'); else syncSoon(); });
    document.addEventListener('focusout', syncSoon);
    return bar;
  }
  function renderBar() {
    document.body.classList.toggle('bp-unlocked', !!state.priceUnlocked);
    const bar = ensureBar(), step = bar.querySelector('.bp-bar__step'), now = bar.querySelector('.bp-bar__now'), go = bar.querySelector('.bp-bar__go');
    const feet = Number(state.linearFeet) > 0 ? state.linearFeet + ' ft' : '', fence = FENCE_PRICING[state.fenceId];
    const jump = (id, focusId) => () => {
      const node = el(id);
      if (!node) return;
      node.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (focusId) setTimeout(() => el(focusId)?.focus({ preventScroll: true }), 500);
    };
    const name = fence ? fence.name + (state.sections.length ? ' + ' + state.sections.length + ' more' : '') : '';
    let view;
    if (state.priceUnlocked) {
      const price = heightNeedsReview() ? null : calculatePrice();
      view = ['Your planning range', price ? formatPrice(price.low) + ' – ' + formatPrice(price.high) : 'Request received', 'Book a free measure', () => { location.href = (window.GFSRequestFlow && window.GFSRequestFlow.bookingUrl(el('bp-form'))) || '/quote/book/'; }];
    } else if (!feet) view = ['Step 1 of 4', 'How long is the fence?', 'Enter length', jump('bp-step-1', 'bp-linear-feet')];
    else if (!fence) view = ['Step 2 of 4', feet, 'Pick a style', () => openStylePicker()];
    else if (sectionsIssue()) view = ['Step 2 of 4', 'Finish your added style', 'Go to it', jump('bp-sections')];
    else if (!state.sawDetails) view = ['Step 3 of 4', feet + ' · ' + name, 'Gates and details', () => { state.sawDetails = true; jump('bp-step-3')(); renderBar(); }];
    else view = ['Step 4 of 4', feet + ' · ' + name, heightNeedsReview() ? 'Request my quote' : 'See my price', jump('bp-step-4', 'bpf-name')];
    if (step.textContent !== view[0]) step.textContent = view[0];
    if (now.textContent !== view[1]) now.textContent = view[1];
    if (go.textContent !== view[2]) go.textContent = view[2];
    barAction = view[3];
  }

  // ---- STYLE REQUESTED BY A LINK (?style=Name) ----------------------------------------
  // Style pages link straight here with a style name. If the name matches
  // one catalog model it is selected for the visitor, unless they already
  // have a saved plan with its own style.
  let requestedStyle = '';
  function readRequestedStyle() {
    try {
      const values = new URLSearchParams(location.search).getAll('style');
      const value = values.length === 1 ? values[0].trim() : '';
      requestedStyle = value && value.length <= 120 && /^[\p{L}\p{N} '’"().,\/#&+–—-]+$/u.test(value) ? value : '';
    } catch (e) { requestedStyle = ''; }
  }
  function matchRequestedStyle(wanted) {
    const words = wanted.toLowerCase().replace(/[‘’]/g, "'").split(/[^a-z0-9.']+/).filter(Boolean);
    if (!words.length) return '';
    const ids = Object.keys(FENCE_PRICING);
    const plain = text => String(text).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
    const exact = ids.find(id => plain(FENCE_PRICING[id].name) === plain(wanted));
    if (exact) return exact;
    const hits = ids.filter(id => { const name = ' ' + FENCE_PRICING[id].name.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9.']+/g, ' ') + ' '; return words.every(word => name.includes(' ' + word + ' ') || name.includes(' ' + word)); });
    if (!hits.length) return '';
    // Every hit must be the same model; then take its usual first pick.
    const models = new Set(hits.map(id => familyOf(id) + '|' + variantOf(FENCE_PRICING[id].name).key));
    if (models.size !== 1) return '';
    return modelCards(hits, '')[0].id;
  }
  function applyRequestedStyle() {
    if (!requestedStyle || state.fenceId || pendingDraftStyle) return;
    const id = matchRequestedStyle(requestedStyle);
    requestedStyle = '';
    if (id) { selectFenceStyle(id); track('style-link'); }
  }

  // ---- STYLE CARRIED OVER FROM THE 3D STUDIO (?studio-style=Name) -----------------------
  // The studio hands over a style name as a reference only. When that name
  // is one model in the price list, offer to price it in one tap. The host
  // is made at start-up so Edit Mode keeps it in place; it stays empty and
  // hidden unless there is something to offer.
  function ensureStyleOffer() {
    let host = el('bp-style-offer');
    if (host) return host;
    const summary = el('bp-style-summary');
    if (!summary) return null;
    host = document.createElement('div');
    host.id = 'bp-style-offer'; host.className = 'bp-offer'; host.hidden = true;
    host.setAttribute('data-gfs-protected', '');
    summary.before(host);
    return host;
  }
  function offerStudioStyle() {
    const host = ensureStyleOffer();
    if (!host) return;
    let wanted = '';
    try { const values = new URLSearchParams(location.search).getAll('studio-style'); wanted = values.length === 1 ? values[0].trim().slice(0, 180) : ''; } catch (e) {}
    const id = wanted ? matchRequestedStyle(wanted) : '';
    if (!id || id === state.fenceId) { host.hidden = true; host.replaceChildren(); return; }
    if (host.dataset.offer === id) return;
    host.dataset.offer = id;
    const text = document.createElement('p'), button = document.createElement('button');
    text.textContent = 'You were looking at ' + FENCE_PRICING[id].name + ' in the 3D Studio.';
    button.type = 'button'; button.className = 'btn btn-primary'; button.textContent = 'Price this style';
    button.addEventListener('click', () => { selectFenceStyle(id); host.hidden = true; host.replaceChildren(); track('style-studio'); });
    host.replaceChildren(text, button);
    host.hidden = false;
  }

  // ---- PROGRESS: STEP RAIL, DONE CHECKS, PRICE-CARD CHECKLIST ----------------------------
  const RAIL = [['bp-step-1', 'Length'], ['bp-step-2', 'Style'], ['bp-step-3', 'Gates & details'], ['bp-step-4', 'Your price']];
  function stepsDone() {
    return [Number(state.linearFeet) > 0, !!FENCE_PRICING[state.fenceId] && !sectionsIssue(), !!state.sawDetails, !!state.priceUnlocked];
  }
  function ensureProgress() {
    const first = el('bp-step-1');
    if (first && !el('bp-rail')) {
      const rail = document.createElement('nav');
      rail.id = 'bp-rail'; rail.setAttribute('aria-label', 'Estimate steps'); rail.setAttribute('data-gfs-protected', '');
      rail.innerHTML = RAIL.map(([id, label], i) => '<button type="button" data-step="' + id + '"><span class="bp-rail__n">' + (i + 1) + '</span>' + label + '</button>').join('');
      rail.addEventListener('click', event => { const button = event.target.closest('button[data-step]'); if (button) el(button.dataset.step)?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      first.before(rail);
    }
    const range = el('bp-price-range');
    if (range && !el('bp-checklist')) {
      const list = document.createElement('ul');
      list.id = 'bp-checklist'; list.setAttribute('data-gfs-protected', '');
      list.innerHTML = ['Fence length', 'Fence style', 'Gates and details', 'Your contact details'].map(text => '<li>' + text + '</li>').join('');
      range.after(list);
    }
  }
  function renderProgress() {
    const done = stepsDone(), now = done.indexOf(false);
    $$('#bp-rail button').forEach((button, i) => {
      button.classList.toggle('is-done', done[i]);
      button.classList.toggle('is-now', i === now);
      if (i === now) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    RAIL.forEach(([id], i) => el(id)?.classList.toggle('is-done', done[i]));
    const list = el('bp-checklist');
    if (list) { list.hidden = !!state.priceUnlocked; $$('#bp-checklist li').forEach((item, i) => item.classList.toggle('is-done', done[i])); }
  }

  // ---- ONE PASS AFTER EVERY UPDATE ---------------------------------------------------
  function renderPlus() {
    ensureMainSteppers();
    ensureMapFullscreen();
    setStepper(document.querySelector('.bp-step-3-grid [data-stepper="single"]'), Number(state.singleGates) || 0, 12);
    setStepper(document.querySelector('.bp-step-3-grid [data-stepper="double"]'), Number(state.doubleGates) || 0, 6);
    renderVariantChips(el('bp-style-variants'), state.fenceId, id => selectFenceStyle(id), {
      value: state.height,
      set: height => { const select = el('bp-height'); if (!select) return; setHeightControl(select, height); select.dispatchEvent(new Event('change')); },
    });
    renderSizePresetState();
    renderSections();
    renderGateAssign();
    renderGateNote();
    renderSummaryParts();
    renderSiteNotes();
    renderProgress();
    renderBar();
  }
  function initPlus() {
    document.body.classList.add('bp-page');
    // A resized picture that fails to load falls back to the original.
    document.addEventListener('error', event => {
      const img = event.target;
      if (img && img.tagName === 'IMG' && img.dataset.full && img.getAttribute('src') !== img.dataset.full) img.src = img.dataset.full;
    }, true);
    ensureSummaryParts();
    ensureStyleOffer();
    ensureProgress();
    bindSiteNotes();
    readRequestedStyle();
    const form = el('bp-form');
    if (form && window.GFSLeads && typeof window.GFSLeads.wireReach === 'function') window.GFSLeads.wireReach(form);
    // Reaching step 3 counts as having seen the gate and detail options.
    // The step is taller than a phone screen, so a third of it in view counts.
    const details = el('bp-step-3');
    if (details && typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => {
        if (state.sawDetails || !FENCE_PRICING[state.fenceId] || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.35)) return;
        state.sawDetails = true; renderProgress(); renderBar();
      }, { threshold: [0.35] }).observe(details);
    }
  }

  // -------- FIRESTORE PRICING + PHOTOS SYNC (EXACT SAME ENGINE AS EXECUTIVE APP) --------
  // The Executive app stores BOTH pricing and style photos in ONE document:
  //
  //   /settings/global
  //   ├── .pricing        (string, newline-separated "Name : perFoot : sg : dg")
  //   └── .stylePhotos    (object, keyed by style name)
  //                       { "Cedar Privacy": [ { url, name }, ... ], ... }
  //
  // The deployed Firestore rules make settings/ publicly readable, so the
  // website reads the SAME document the Executive app reads and writes.
  // Whatever styles, prices, AND photos the owner manages in the Executive
  // app's admin panel show up here automatically.
  async function syncPricingFromFirestore() {
    if (!window.GFS_DB) return;
    try {
      // v7.8: prefer the trimmed public mirror (pricing + photos only);
      // fall back to the legacy global doc until the exec app has
      // mirrored at least once.
      let snap = await window.GFS_DB.collection('settings').doc('public').get()
        .catch(() => ({ exists: false }));
      if (!snap.exists || !(snap.data() && snap.data().pricing)) {
        snap = await window.GFS_DB.collection('settings').doc('global').get();
      }
      if (snap.exists) {
        const data = snap.data();
        if (data && typeof data.pricing === 'string' && data.pricing.trim()) {
          // Pull the same removal rates the Executive app uses, so a change
          // made in its admin settings takes effect here too.
          ['remWood','remChain','remOther']
            .forEach(k => {
              const v = parseFloat(data[k]);
              if (!isNaN(v) && v > 0) PRICING_FACTORS[k] = v;
            });
          buildStylesFromExecPricing(data.pricing, data.stylePhotos || {});
          window.GFS_BALLPARK_MODEL_OVERRIDES = data.styleSpecs && typeof data.styleSpecs === "object" ? data.styleSpecs : undefined;
          if (pendingDraftStyle && FENCE_PRICING[pendingDraftStyle]) selectFenceStyle(pendingDraftStyle, true);
          // If a previously-selected style no longer exists, clear selection
          if (state.fenceId && !FENCE_PRICING[state.fenceId]) {
            pendingDraftStyle = state.fenceId;
            state.fenceId = '';
          }
          renderFenceOptions();
          updateAll();

          // Count how many have real photos vs keyword-inferred fallback
          const styleCount = Object.keys(FENCE_PRICING).length;
          const withRealPhotos = Object.values(FENCE_PRICING).filter(f => f._hasExecPhoto).length;
          console.log('%c[Ghareeb Ballpark] Synced from settings/global — ' +
            styleCount + ' styles (' + withRealPhotos + ' with Executive app photos)',
            'color:#1A7A3C;font-weight:bold;');
          return;
        }
      }
      console.log('[Ghareeb Ballpark] settings/global has no pricing field; using built-in defaults');
    } catch (e) {
      console.log('[Ghareeb Ballpark] Could not read settings/global (using defaults):', e.message || e);
    } finally {
      styleCatalogSettled = true;
      updateDraftStyleNotice();
      try { applyRequestedStyle(); offerStudioStyle(); updateAll(); } catch (e) { console.warn('[Ghareeb Ballpark] post-catalog refresh skipped:', e); }
    }
  }

  // Parse the Executive app's pricing string AND map each style to its photo
  // from .stylePhotos. Falls back to keyword-inferred photo only when the
  // Executive app has no photo uploaded for that style.
  function buildStylesFromExecPricing(pricingStr, stylePhotos) {
    const lines = pricingStr.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;

    const built = {};
    lines.forEach(line => {
      const parts = line.split(':').map(s => s.trim());
      if (parts.length < 4) return;
      const name = parts[0];
      const perFoot = parseFloat(parts[1]);
      const singleGate = parseFloat(parts[2]);
      const doubleGate = parseFloat(parts[3]);
      if (!name || isNaN(perFoot)) return;

      // Look up the photo from settings/global.stylePhotos[styleName]
      // It's an array of { url, name } — use the first one as the preview
      const execPhotos = window.GFSAuditedPhotos.select(name, publicStylePhotos(stylePhotos[name]));
      const execPhoto = execPhotos[0]?.url || null;
      const upgraded = window.GFS_STYLE_IMAGE_UPGRADES?.[name];
      let originalPhoto = execPhoto?.split('?')[0] || '';
      try { originalPhoto = decodeURIComponent(originalPhoto); } catch (_) { originalPhoto = ''; }
      const useUpgrade = upgraded && (!execPhoto || originalPhoto.endsWith('/'+upgraded.original));
      const knownMismatch = (stylePhotos[name] || []).some(p=>window.GFSAuditedPhotos.excluded(name,p));
      const photo = useUpgrade ? upgraded.image : execPhoto || (knownMismatch?'/assets/img/style-references/photo-needed.svg':photoForName(name));

      const id = slugify(name);
      built[id] = {
        name: name,
        detail: detailForName(name),
        perFoot: perFoot,
        singleGate: isNaN(singleGate) ? 150 : singleGate,
        doubleGate: isNaN(doubleGate) ? 300 : doubleGate,
        photo: photo,
        photoThumb: useUpgrade ? photo.replace(/\.webp$/,'-640.webp') : null,
        imageKind: useUpgrade ? 'product rendering' : execPhoto ? execPhotos[0].auditImageKind || 'photo' : 'material example',
        photoCaption: execPhotos[0]?.auditCaption || '',
        category: categoryForName(name),
        style: '',
        removalType: removalTypeForName(name),
        _hasExecPhoto: !!execPhoto,   // diagnostic flag
        _allPhotos: Array.isArray(execPhotos) ? execPhotos : [],  // keep all photos for future gallery use
      };
    });

    if (Object.keys(built).length) {
      // Replace FENCE_PRICING in place (other code holds a reference)
      Object.keys(FENCE_PRICING).forEach(k => delete FENCE_PRICING[k]);
      Object.assign(FENCE_PRICING, built);
    }
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Only explicitly public, usable catalog images may enter cards or galleries.
  function publicStylePhotos(photos) {
    return (Array.isArray(photos) ? photos : []).filter(photo => {
      if (!photo || photo.hidden === true || photo.private === true || photo.visible === false || photo.customerVisible === false || typeof photo.url !== 'string' || photo.url.length > 4096) return false;
      if (!/^(https?:\/\/|\/(?!\/))/.test(photo.url)) return false;
      try { return /^https?:$/.test(new URL(photo.url, 'https://gfencing.netlify.app').protocol); } catch (_) { return false; }
    });
  }

  // Cedar-tone is a finish name, not evidence that the fence is cedar lumber.
  function woodMaterialName(name) {
    return String(name || '').toLowerCase().replace(/\bcedar[\s\u2010-\u2015-]*tone(?:d)?\b/g, '');
  }

  // Infer a photo URL from the style name by keyword. These are editable via
  // Edit Mode afterward. Inferred images are labeled as examples, not exact styles.
  function photoForName(name) {
    const n = name.toLowerCase();
    const base = 'https://gfs-website.netlify.app/images/gallery/';
    // Chain link and split rail are checked FIRST: a name like
    // "Chain Link Vinyl Coated" contains "vinyl" too, and matching that
    // first showed a vinyl privacy photo on a chain link style.
    if (n.includes('chain')) return '/assets/img/style-references/chain-link-'+(/black|blk|coated/.test(n)?'black':'galvanized')+'.jpg';
    if (n.includes('split') || n.includes('ranch rail')) return '/assets/img/style-references/photo-needed.svg';
    if (/spaced.*picket|picket.*spaced/i.test(n) && !/vinyl|pvc/i.test(n)) return '/assets/img/style-references/wood-spaced-picket.jpg';
    const material=woodMaterialName(name);
    if (material.includes('cedar')) return base + 'cedar-shadowbox.jpg';
    if (material!==n&&['wood','treated','picket'].includes(categoryForName(name))) return base + 'pt-privacy.jpg';
    if (n.includes('aluminum') || n.includes('ornamental') || n.includes('alum') || n.includes('estate')) return base + 'aluminum-black.jpg';
    if (n.includes('vinyl') && n.includes('picket')) return base + 'vinyl-tan-privacy.jpg';
    if (n.includes('vinyl') || n.includes('pvc')) return base + 'vinyl-white.jpg';
    if (categoryForName(name) === 'vinyl') return base + 'vinyl-white.jpg';
    if (n.includes('picket')) return base + 'vinyl-tan-privacy.jpg';
    if (n.includes('treated') || n.includes('dog ear') || n.includes('wood') || n.includes('pt') || n.includes('pine')) return base + 'pt-privacy.jpg';
    return base + 'cedar-shadowbox.jpg';  // default
  }

  function detailForName(name) {
    const n = name.toLowerCase();
    // Describe named design features without guessing privacy from a material
    // or family name. Owner-selected photos/specs may vary within a family.
    if (n.includes('chain')) return 'Chain-link mesh fence';
    if (n.includes('split') || n.includes('ranch')) return 'Open rail fence';
    if (n.includes('aluminum') || n.includes('ornamental')) return 'Open views with matching gate options';
    if (/^wellington\b/.test(n)) {
      if (/lattice[ -]*top/.test(n)) return 'Vinyl fence with a lattice top';
      if (/hartford[ -]*top/.test(n)) return 'Vinyl fence with a Hartford-style top';
      if (/windsor[ -]*top/.test(n)) return 'Vinyl fence with a Windsor-style top';
      return 'Vinyl panel fence; compare the selected design';
    }
    const material=woodMaterialName(name);
    if (/spaced/.test(n) && /picket/.test(n)) return 'Spaced pickets with openings between them';
    if (material!==n&&!material.includes('cedar')&&['wood','treated','picket'].includes(categoryForName(name))) {
      if (/\bp\s*\/\s*t\b|\bpt\b|pressure[ -]*treated|\btreated\b/.test(material)) return 'Pressure-treated wood with a cedar-tone finish';
      if (/pre[ -]*stain/.test(material)) return 'Pre-stained wood with a cedar-tone finish';
      return 'Cedar-tone finish; confirm the wood material in your quote';
    }
    if (n.includes('shadow')) return 'Alternating boards; review views at an angle';
    if (/board[ -]+on[ -]+board|\bbob\b/.test(n)) return 'Overlapping boards for greater privacy';
    if (material.includes('cedar')) return 'Cedar wood fence; confirm construction details in your quote';
    if (n.includes('vinyl') && n.includes('picket')) return 'Classic decorative, low maintenance';
    if (n.includes('vinyl')) return 'Vinyl fence; compare the selected design';
    if (n.includes('treated') || n.includes('dog ear') || n.includes('wood')) return 'Wood fence; compare the selected design';
    return 'Quality fence, professionally installed';
  }

  // Choose a readable comparison set for the PDF: always include the
  // customer's selected style, then one representative (cheapest) per fence
  // family, then fill remaining slots by price spread. Keeps the table
  // informative without overflowing the page when 100 styles are synced.
  function pickComparisonSet(allPriced, selectedId, maxRows) {
    if (allPriced.length <= maxRows) return allPriced;
    const chosen = [];
    const taken = new Set();
    const take = row => {
      if (row && !taken.has(row.id) && chosen.length < maxRows) {
        taken.add(row.id);
        chosen.push(row);
      }
    };

    take(allPriced.find(r => r.id === selectedId));

    // One per family — cheapest in each (allPriced is already price-sorted)
    const familyOrder = ['wood', 'treated', 'cedar', 'chainlink', 'split-rail', 'vinyl', 'aluminum', 'picket'];
    familyOrder.forEach(fam => take(allPriced.find(r => r.family === fam)));

    // Fill any remaining slots by walking the price range evenly
    if (chosen.length < maxRows) {
      const step = Math.max(1, Math.floor(allPriced.length / maxRows));
      for (let i = 0; i < allPriced.length && chosen.length < maxRows; i += step) {
        take(allPriced[i]);
      }
    }

    return chosen.sort((a, b) => a.low - b.low);
  }

  // Classify a style into a material family.
  //
  // Order matters and is not obvious. "Chain Link Vinyl Coated" contains
  // BOTH "chain" and "vinyl" — checking vinyl first filed it under Vinyl,
  // where nobody shopping chain link would ever find it. Compound names are
  // resolved first, then the plain families.
  function categoryForName(name) {
    const n = (name || '').toLowerCase();

    // Compound / ambiguous names first
    if (n.includes('chain')) return 'chainlink';          // incl. "vinyl coated"
    if (n.includes('split rail') || n.includes('split-rail') ||
        n.includes('splitrail') || n.includes('ranch rail')) return 'split-rail';

    const material=woodMaterialName(name);
    if (material.includes('cedar')) return 'cedar';
    if (material!==n&&/\bp\s*\/\s*t\b/.test(material)) return 'treated';
    if (n.includes('aluminum') || n.includes('ornamental') ||
        n.includes('wrought') || n.includes('estate')) return 'aluminum';
    if (n.includes('vinyl') || n.includes('pvc') || /^(?:hw\s+)?(?:wellington|kingston|rockport|hartford|bedford|cascade|montgomery|windsor|whitney|midland)\b/.test(n)) return 'vinyl';
    // These nine named catalog variants are vinyl; generic wood shadowbox stays wood.
    if (/^shadowbox - (?:adobe|tan|white) [456]ft$/.test(n)) return 'vinyl';

    // Pressure-treated pine is its own family in the trade and is usually the
    // budget option people ask for by name. Lumping it into a generic "wood"
    // bucket alongside everything unclassified made that bucket useless.
    if (n.includes('treated') || n.includes('pressure') || n.includes('pt ') ||
        n.includes('dog ear') || n.includes('dog-ear') || n.includes('pine')) return 'treated';

    if (n.includes('picket')) return 'picket';
    return 'wood';
  }

  function removalTypeForName(name) {
    const n = name.toLowerCase();
    if (n.includes('chain')) return 'chain';
    if (n.includes('vinyl') || n.includes('aluminum') || n.includes('ornamental')) return 'other';
    return 'wood';
  }

  // ---- DRAFT PERSISTENCE ------------------------------------------
  // A refresh, an accidental back-swipe, or following a link to compare
  // styles previously wiped everything the visitor had built. Their spec
  // is now kept in sessionStorage for the tab's lifetime and restored on
  // return. Contact details are deliberately NOT stored.
  const DRAFT_KEY = 'gfs_ballpark_draft';

  let draftSettled = false;   // true once boot restore has run

  function saveDraft() {
    if (!draftSettled) return;  // never clobber a stored draft pre-restore
    try {
      const geometry=captureDraftGeometry()||(pendingLayoutDraft&&pendingLayoutDraft.snapshot===draftInputSnapshot()?pendingLayoutDraft.geometry:null);
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        version:2,geometry,geometryAddress:geometry?draftAddress(state.address):'',unit:mapMeasurementUnit,
        fenceId: state.fenceId || pendingDraftStyle,
        linearFeet: state.linearFeet,
        height: state.height,
        singleGates: state.singleGates,
        doubleGates: state.doubleGates,
        removeOldFence: state.removeOldFence,
        existingFenceMaterial: state.existingFenceMaterial,
        address: state.address,
        sections: state.sections.map(section => ({ fenceId: section.fenceId, feet: section.feet, height: section.height, singleGates: section.singleGates, doubleGates: section.doubleGates, run: section.run })),
        siteNotes: state.siteNotes.slice(0, 12),
        savedAt: Date.now(),
      }));
    } catch (e) { /* private mode or storage full — not worth surfacing */ }
  }

  function restoreDraft() {
    let d;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      d = JSON.parse(raw);
    } catch (e) { return false; }
    if (!d || typeof d!=='object' || Array.isArray(d) || (!d.linearFeet && !d.fenceId && !d.geometry)) return false;

    if (d.fenceId) {
      pendingDraftStyle = d.fenceId;
      if (FENCE_PRICING[d.fenceId]) selectFenceStyle(d.fenceId, true);
      else updateDraftStyleNotice();
    }
    if (d.linearFeet) {
      const lf = el('bp-linear-feet');
      if (lf) { lf.value = d.linearFeet; lf.dispatchEvent(new Event('input')); }
    }
    const setSel = (id, val) => {
      const e2 = el(id);
      if (e2 && val != null) { ensureSelectCovers(e2, Number(val), id.indexOf('single') >= 0 ? 'walk gate' : 'drive gate'); e2.value = String(val); }
    };
    if (d.height) setHeightControl(el('bp-height'), d.height);
    setSel('bp-single-gates', d.singleGates);
    setSel('bp-double-gates', d.doubleGates);
    const rm = el('bp-remove-old'); if (rm) rm.checked = !!d.removeOldFence;
    const oldMaterial = el('bp-existing-material'); if (oldMaterial) oldMaterial.value = existingFenceMaterialLabel(d.existingFenceMaterial || '') ? d.existingFenceMaterial : '';
    if (Array.isArray(d.sections)) {
      state.sections = d.sections.slice(0, 3).filter(saved => saved && typeof saved === 'object').map(saved => Object.assign(newSection(), {
        fenceId: typeof saved.fenceId === 'string' ? saved.fenceId.slice(0, 200) : '',
        feet: Math.max(0, Math.min(2000, Number(saved.feet) || 0)),
        height: String(saved.height || '6').slice(0, 6),
        singleGates: Math.max(0, Math.floor(Number(saved.singleGates) || 0)),
        doubleGates: Math.max(0, Math.floor(Number(saved.doubleGates) || 0)),
        run: Number.isInteger(saved.run) && saved.run >= 0 && saved.run < 100 ? saved.run : undefined,
      }));
    }
    if (Array.isArray(d.siteNotes)) { const known = siteNoteButtons().map(button => button.dataset.note); state.siteNotes = d.siteNotes.filter(note => known.includes(note)); }
    if (d.address) {
      setProjectAddress(d.address);
      const a = el('bp-form-address'); if (a && !a.value) a.value = d.address;
      const ms = el('bp-map-search'); if (ms && !ms.value) ms.value = d.address;
    }
    syncStep3();
    queueDraftGeometry(d);
    return true;
  }

  function clearDraft() {
    pendingLayoutDraft=null;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  let initialized = false;
  // ---- EMAIL THE ESTIMATE -----------------------------------------
  // A lower-commitment path than waiting for a phone call: the customer gets
  // their spec in writing, and the request lands in the Executive app as a
  // lead like any other so nothing falls through.
  function bindEmailEstimate() {
    const btn = el('bp-action-email');
    if (!btn || btn._bound) return;
    btn._bound = true;

    // Older assembled pages did not include a reachable email field after
    // unlock. Add the same control there without requiring a form resubmit.
    let emailInput = el('bp-email-address');
    if (!emailInput) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'flex:1 0 100%;';
      const label = document.createElement('label');
      label.className = 'form-label';
      label.htmlFor = 'bp-email-address';
      label.textContent = 'Email for your estimate request';
      emailInput = document.createElement('input');
      emailInput.id = 'bp-email-address';
      emailInput.type = 'email';
      emailInput.autocomplete = 'email';
      emailInput.className = 'form-input';
      emailInput.placeholder = 'you@example.com';
      wrap.append(label, emailInput);
      btn.parentElement.appendChild(wrap);
    }
    emailInput.addEventListener('input', () => {
      emailInput.removeAttribute('aria-invalid');
    });
    btn.textContent = 'Request emailed estimate';

    btn.addEventListener('click', async () => {
      if (!state.priceUnlocked || btn.disabled) return;
      if (!photoReadyForSubmission()) return;
      const status = el('bp-email-status');
      const price = submissionPrice(status);
      const fence = FENCE_PRICING[state.fenceId];
      if (!price || !fence) return;

      const show = (msg, kind) => {
        if (!status) return;
        status.style.display = 'block';
        status.style.color = kind === 'error' ? 'var(--stop)' : 'var(--ok)';
        status.textContent = msg;
      };

      const form = el('bp-form');
      const fd = form ? new FormData(form) : null;
      const email = emailInput.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        show('Enter a valid email address above, then request your emailed estimate.', 'error');
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return;
      }
      if (!acceptedBallparkReceipt) {
        show('Please submit your project details again so we can link this email request.', 'error');
        if (form) {
          form.style.display = '';
          const submit = form.querySelector('button[type="submit"]');
          if (submit) { submit.disabled = false; submit.textContent = 'Submit project details'; }
          form.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return;
      }

      btn.disabled = true;
      emailInput.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Requesting…';

      const gates = [];
      if (state.singleGates) gates.push(state.singleGates + ' walk');
      if (state.doubleGates) gates.push(state.doubleGates + ' drive');

      const payload = {
        name: (fd && fd.get('name')) || '',
        firstName: (fd && fd.get('firstName')) || '',
        lastName: (fd && fd.get('lastName')) || '',
        phone: (fd && fd.get('phone')) || '',
        email: email,
        address: (fd && fd.get('address')) || state.address || '',
        source: 'ballpark-email-estimate',
        parentReceipt: acceptedBallparkReceipt,
        fenceStyle: fence.name || '',
        fenceType: fence.category || '',
        linearFeet: state.linearFeet,
        height: state.height,
        singleGates: state.singleGates,
        doubleGates: state.doubleGates,
        removeOldFence: state.removeOldFence,
        existingFenceMaterial: state.existingFenceMaterial,
        geometry: collectGeometry(),
        photo: leadPhoto || '',
        contactMethod: (fd && fd.get('contactMethod')) || '',
        bestTime: (fd && fd.get('bestTime')) || '',
        timeline: (fd && fd.get('timeline')) || '',
        siteNotes: state.siteNotes.slice(),
        sections: state.sections.length ? sectionLines().join('\n') : '',
        priceRange: price.requiresReview ? '' : formatPrice(price.low) + '–' + formatPrice(price.high),
        notes: [(fd && fd.get('notes')) || '', removalScopeNote(), 'EMAILED ESTIMATE REQUEST — ' +
               'Style: ' + fence.name + ' · Length: ' + state.linearFeet + ' ft · ' +
               'Height: ' + state.height + ' ft · Gates: ' + (gates.join(' + ') || 'none') + ' · ' +
               'Range: ' + formatPrice(price.low) + '-' + formatPrice(price.high)].filter(Boolean).join(' · '),
      };

      window.GFSRequestFlow?.setBusy(form,true);
      try {
        if (!window.GFSLeads || typeof window.GFSLeads.submit !== 'function') {
          throw new Error('lead module unavailable');
        }
        const result = await window.GFSLeads.submit(payload,window.GFSRequestFlow?.optionsFor(form)||{});
        if (result.ok) {
          show('Your estimate request reached our office. We will review it and email you at ' + email + '.', 'ok');
          btn.textContent = '\u2713 Estimate requested';
          return;
        }
        show((result.errors || ['Could not send that']).join('. ') + ' — call (419) 214-2107 and we will send it over.', 'error');
      } catch (err) {
        console.error('[Ghareeb Ballpark] email estimate failed:', err);
        show('Could not send that right now. Call (419) 214-2107 and we will get it to you.', 'error');
      } finally {
        window.GFSRequestFlow?.setBusy(form,false);
      }
      btn.disabled = false;
      emailInput.disabled = false;
      btn.textContent = original;
    });
  }

  function init() {
    if (!el('bp-step-1')) return;
    setTimeout(() => { draftSettled = true; }, 4000);  // failsafe unlock  // not on ballpark page
    // Idempotence guard — a second init() would stack a second map into the
    // same container, double every listener, and double the Firestore reads.
    if (initialized) return;
    initialized = true;
    renderFenceOptions();
    renderSizePresets();
    bindStep1();
    bindStep3();
    bindStep4();
    bindEmailEstimate();
    bindMapLauncher();
    try { initPlus(); } catch (e) { console.warn('[Ghareeb Ballpark] extra controls skipped:', e); }
    markActive('bp-step-1');
    markActive('bp-step-2');
    updateAll();
    // Now that fence-style cards are in the DOM (with data-editable-img
    // attributes), tell Edit Mode to rescan and apply any saved overrides
    if (window.GFSEdit && window.GFSEdit.refresh) {
      window.GFSEdit.refresh();
    }
    // Sync pricing from Firestore (same source as Executive app).
    // If Firebase is loaded but not ready yet, wait for the ready event.
    // Async — won't block initial render. Hardcoded defaults stay in effect
    // until/unless the remote pricing arrives.
    // Bring back anything the visitor had already built in this tab
    try {
      const resumed = restoreDraft();
      // A valid saved drawing resumes on its chosen map; plain saved numbers need no SDK.
      if (pendingLayoutDraft) requestMap();
      // A landing-page choice narrows browsing only; never replace a saved style.
      const requestedFamily = window.GFSProjectContext?.get()?.family;
      if (!resumed && !state.fenceId && requestedFamily && FAMILY_LABELS[requestedFamily]) {
        activeFamily = requestedFamily;
        renderFenceOptions();
      }
      draftSettled = true;          // saves allowed from here on
      saveDraft();                  // persist the restored state once
      if (resumed) {
        track('resumed');
        // Let the visitor know their earlier numbers came back.
        var note = document.createElement('div');
        note.textContent = '\u2713 Picked up where you left off \u2014 review your saved measurements and selections before continuing.';
        note.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1A2E40;color:#FBFAF7;padding:10px 18px;border-radius:5px;font-size:13.5px;z-index:9998;box-shadow:0 6px 20px rgba(0,0,0,0.25);max-width:92vw;text-align:center;';
        document.body.appendChild(note);
        setTimeout(function () { note.style.transition = 'opacity 0.4s'; note.style.opacity = '0'; }, 4200);
        setTimeout(function () { note.remove(); }, 4800);
      }
    } catch (e) { console.warn('[Ghareeb Ballpark] draft restore skipped:', e); }

    if (window.GFS_DB) {
      syncPricingFromFirestore();
    } else {
      window.addEventListener('gfs-firebase-ready', syncPricingFromFirestore, { once: true });
    }
  }

  // Public API — lets the 3D preview / PDF modules and console debugging read
  // the live pricing state instead of duplicating the calculation.
  window.GFSBallpark = {
    calculatePrice: calculatePrice,
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    getStyles: function () { return FENCE_PRICING; },
    getFactors: function () { return Object.assign({}, PRICING_FACTORS); },
    getSectionSize: getSectionSize,
    getGeometry: collectGeometry,
    getStyleSpecs: function () { return window.GFS_BALLPARK_MODEL_OVERRIDES; },
    getParts: function () { return describeParts(); },
    version: BUILD,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
