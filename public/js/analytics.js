/**
 * GFS Analytics - Comprehensive Website Tracking
 * Tracks: Page views, CTR, sources, scroll depth, form submissions, time on site
 * 
 * SETUP: Replace GA_MEASUREMENT_ID with your Google Analytics 4 Measurement ID
 * Get your ID at: https://analytics.google.com → Admin → Data Streams → Web
 */

const GA_MEASUREMENT_ID = 'G-30R7SKG69Y'; // REPLACE WITH YOUR GA4 ID

// Initialize Google Analytics 4
(function() {
    // Load gtag.js
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(script);
    
    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
        page_title: document.title,
        page_location: window.location.href,
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
    });
})();

// ==================== EVENT TRACKING ====================

// Track all CTA button clicks
document.addEventListener('click', function(e) {
    var btn = e.target.closest('a.cta-btn, a.btn, button[type="submit"], .hero-btn, .nav-quote-btn, [class*="btn-"]');
    if (btn && window.gtag) {
        var label = btn.textContent?.trim().substring(0, 50) || btn.getAttribute('aria-label') || 'Unknown';
        gtag('event', 'cta_click', {
            event_category: 'CTA',
            event_label: label,
            page_path: window.location.pathname,
            button_text: label
        });
    }
});

// Track phone number clicks
document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="tel:"]');
    if (link && window.gtag) {
        gtag('event', 'phone_call', {
            event_category: 'Contact',
            event_label: link.href.replace('tel:', ''),
            page_path: window.location.pathname,
            conversion: true
        });
    }
});

// Track email clicks
document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href^="mailto:"]');
    if (link && window.gtag) {
        gtag('event', 'email_click', {
            event_category: 'Contact',
            event_label: link.href.replace('mailto:', ''),
            page_path: window.location.pathname
        });
    }
});

// Track outbound link clicks
document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (link && link.href && link.hostname !== window.location.hostname && window.gtag) {
        gtag('event', 'outbound_click', {
            event_category: 'Outbound',
            event_label: link.href,
            transport_type: 'beacon'
        });
    }
});

// Track navigation clicks
document.addEventListener('click', function(e) {
    var navLink = e.target.closest('.nav-link, .nav-dropdown-link');
    if (navLink && window.gtag) {
        gtag('event', 'navigation_click', {
            event_category: 'Navigation',
            event_label: navLink.textContent?.trim() || navLink.getAttribute('href'),
            destination: navLink.getAttribute('href')
        });
    }
});

// ==================== SCROLL DEPTH TRACKING ====================

var scrollDepths = [10, 25, 50, 75, 90, 100];
var scrollDepthTracked = {};

window.addEventListener('scroll', function() {
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    
    var scrollPct = Math.round((window.scrollY / docHeight) * 100);
    
    scrollDepths.forEach(function(depth) {
        if (scrollPct >= depth && !scrollDepthTracked[depth] && window.gtag) {
            scrollDepthTracked[depth] = true;
            gtag('event', 'scroll_depth', {
                event_category: 'Engagement',
                event_label: depth + '%',
                value: depth,
                page_path: window.location.pathname
            });
        }
    });
});

// ==================== TIME ON PAGE TRACKING ====================

var pageLoadTime = Date.now();
var timeIntervals = [30, 60, 120, 300, 600]; // seconds
var timeTracked = {};

setInterval(function() {
    var timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
    
    timeIntervals.forEach(function(interval) {
        if (timeOnPage >= interval && !timeTracked[interval] && window.gtag) {
            timeTracked[interval] = true;
            gtag('event', 'time_on_page', {
                event_category: 'Engagement',
                event_label: interval + ' seconds',
                value: interval,
                page_path: window.location.pathname
            });
        }
    });
}, 5000);

// ==================== FORM TRACKING ====================

// Track form starts (first interaction)
document.addEventListener('focus', function(e) {
    var form = e.target.closest('form');
    if (form && !form.dataset.formStarted && window.gtag) {
        form.dataset.formStarted = 'true';
        gtag('event', 'form_start', {
            event_category: 'Forms',
            event_label: form.id || form.getAttribute('name') || 'Unknown Form',
            page_path: window.location.pathname
        });
    }
}, true);

// Track form submissions
document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && window.gtag) {
        gtag('event', 'form_submit', {
            event_category: 'Forms',
            event_label: form.id || form.getAttribute('name') || 'Unknown Form',
            page_path: window.location.pathname,
            conversion: true
        });
    }
});

// ==================== QUOTE/LEAD TRACKING ====================

// Track quote page views
if (window.location.pathname.includes('/quote')) {
    if (window.gtag) {
        gtag('event', 'quote_page_view', {
            event_category: 'Quote Funnel',
            event_label: window.location.pathname,
            page_path: window.location.pathname
        });
    }
}

// Track ballpark calculator interactions
if (window.location.pathname.includes('/ballpark')) {
    document.addEventListener('change', function(e) {
        var input = e.target;
        if (input.closest('#quoteCalculator, .calculator, .quote-tool') && window.gtag) {
            gtag('event', 'calculator_interaction', {
                event_category: 'Quote Funnel',
                event_label: input.name || input.id || 'calculator_field',
                page_path: window.location.pathname
            });
        }
    });
}

// ==================== SOURCE TRACKING ====================

// Track UTM parameters
var urlParams = new URLSearchParams(window.location.search);
var utmSource = urlParams.get('utm_source');
var utmMedium = urlParams.get('utm_medium');
var utmCampaign = urlParams.get('utm_campaign');

if (utmSource && window.gtag) {
    gtag('set', 'user_properties', {
        traffic_source: utmSource,
        traffic_medium: utmMedium || 'direct',
        traffic_campaign: utmCampaign || 'none'
    });
}

// Track referrer
if (document.referrer && window.gtag) {
    var referrerHost = new URL(document.referrer).hostname;
    if (referrerHost !== window.location.hostname) {
        gtag('event', 'referral', {
            event_category: 'Traffic',
            event_label: referrerHost,
            referrer_url: document.referrer
        });
    }
}

// ==================== FENCE TYPE INTEREST TRACKING ====================

// Track which fence type pages are visited
var fenceTypes = ['cedar', 'vinyl', 'aluminum', 'chainlink', 'chain-link', 'wood', 'split-rail', 'ranch-rail'];
fenceTypes.forEach(function(fenceType) {
    if (window.location.pathname.toLowerCase().includes(fenceType) && window.gtag) {
        gtag('event', 'fence_type_interest', {
            event_category: 'Product Interest',
            event_label: fenceType.replace('-', ' '),
            fence_type: fenceType
        });
    }
});

// ==================== CONVERSION TRACKING ====================

// Custom function to track conversions (call from form handlers)
window.GFS_trackConversion = function(conversionType, value, label) {
    if (window.gtag) {
        gtag('event', 'conversion', {
            event_category: 'Conversions',
            event_label: label || conversionType,
            conversion_type: conversionType,
            value: value || 0,
            currency: 'USD'
        });
    }
};

// Track lead submissions
window.GFS_trackLead = function(leadSource, fenceType) {
    if (window.gtag) {
        gtag('event', 'generate_lead', {
            event_category: 'Conversions',
            event_label: leadSource || 'Website',
            lead_source: leadSource,
            fence_type: fenceType || 'Not specified',
            value: 100, // Estimated lead value
            currency: 'USD'
        });
    }
};

// ==================== PERMITS PAGE TRACKING ====================

if (window.location.pathname.includes('/permits')) {
    // Track municipality lookups
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.municipality-btn');
        if (btn && window.gtag) {
            var city = btn.textContent?.trim() || 'Unknown';
            gtag('event', 'permit_lookup', {
                event_category: 'Permits',
                event_label: city,
                municipality: city
            });
        }
    });
}

// ==================== DEVICE & PERFORMANCE ====================

// Track device type
if (window.gtag) {
    var deviceType = window.innerWidth < 768 ? 'mobile' : (window.innerWidth < 1024 ? 'tablet' : 'desktop');
    gtag('set', 'user_properties', {
        device_category: deviceType,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight
    });
}

// Track page load performance
window.addEventListener('load', function() {
    setTimeout(function() {
        if (window.performance && window.gtag) {
            var perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                gtag('event', 'page_performance', {
                    event_category: 'Performance',
                    event_label: window.location.pathname,
                    load_time: Math.round(perfData.loadEventEnd - perfData.startTime),
                    dom_ready: Math.round(perfData.domContentLoadedEventEnd - perfData.startTime)
                });
            }
        }
    }, 1000);
});

console.log('[GFS Analytics] Loaded - Tracking active');
