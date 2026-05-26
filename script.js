let activeTab = 'login';
let currentScreenId = 'auth-screen';
let isOfflineMode = false;

// Google Maps Specific Objects
let map = null;
let drawingManager = null;
let activePolylineFault = null;
let currentUserMarker = null;

// Track generated elements for quick clearing
let activeMapPolygons = [];
let activeMapMarkers = [];
let activeHotspotCircles = [];

// Base Philippines Coordinate Anchor Positions (Metro Manila Central)
const PH_BASE_LOCATION = { lat: 14.5615, lng: 121.0260 };
let currentScannedLocationName = "Makati City, Metro Manila";

// Real-world simulated coordinate geometry tracking for key Active Philippine Fault structures
const MARIKINA_WEST_FAULT_COORDS = [
    { lat: 14.7022, lng: 121.1010 },
    { lat: 14.6545, lng: 121.0832 },
    { lat: 14.5988, lng: 121.0711 },
    { lat: 14.5510, lng: 121.0640 },
    { lat: 14.4820, lng: 121.0425 },
    { lat: 14.3630, lng: 121.0410 }
];

const PH_HOTSPOT_LOCATIONS = [
    { name: "Marikina Fault Core", lat: 14.6300, lng: 121.0900, risk: "Critical Exposure Level" },
    { name: "Leyte Tectonic Segment", lat: 10.7000, lng: 124.8000, risk: "High Historical Shift Activity" },
    { name: "Surigao Subduction Node", lat: 9.7800, lng: 125.5000, risk: "Moderate Seismicity Trace" }
];

// Target UI Component Elements
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginFields = document.getElementById('login-fields');
const signupFields = document.getElementById('signup-fields');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const homeHeader = document.getElementById('home-header');
const bottomNav = document.getElementById('bottom-nav');
const screens = document.querySelectorAll('.screen');
const authContinueButton = document.getElementById('auth-continue-button'); 

const SWIPEABLE_SCREENS = ['home-screen', 'map-screen', 'tips-screen', 'contacts-screen'];
const mainContentWrapper = document.getElementById('main-content-wrapper');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

/**
 * Initialize Google Maps with complete Drawing Framework options
 */
function initMap() {
    if (map === null) {
        // Construct basic map layer layout instance inside phone view container boundaries
        map = new google.maps.Map(document.getElementById('map-container'), {
            center: PH_BASE_LOCATION,
            zoom: 12,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            styles: [
                { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
            ]
        });

        // Current User Marker Anchor placement
        currentUserMarker = new google.maps.Marker({
            position: PH_BASE_LOCATION,
            map: map,
            title: "Operator Location Node",
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#10B981",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
            }
        });

        // Track center target to feed live telemetry variables directly into CCTV display hud overlay
        map.addListener('bounds_changed', () => {
            const center = map.getCenter();
            document.getElementById('hud-lat').innerText = center.lat().toFixed(4);
            document.getElementById('hud-lng').innerText = center.lng().toFixed(4);
        });

        // Initialize Google Maps Native Drawing Manager Component
        drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false, 
            polygonOptions: {
                fillColor: '#10b981',
                fillOpacity: 0.25,
                strokeColor: '#10b981',
                strokeWeight: 2,
                clickable: true,
                editable: true,
                zIndex: 1
            }
        });
        drawingManager.setMap(map);

        // Bind callback listener for complete geometry construction events handled by Google Maps engine
        google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygon) {
            activeMapPolygons.push(polygon);
            drawingManager.setDrawingMode(null); 
            triggerScanReport();
        });

        // Trigger default active visual components immediately on map paint sequence
        const defaultButton = document.getElementById('map-nav-fault');
        if (defaultButton) {
            toggleMapFeatures('faults', defaultButton);
        }
    } else {
        google.maps.event.trigger(map, 'resize');
        map.setCenter(PH_BASE_LOCATION);
    }
}

/**
 * Handle custom Search geocoding and placement shifts
 */
function geocodeSearch() {
    const query = document.getElementById('map-search-bar').value;
    if (!query || !map) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query + ", Philippines" }, function(results, status) {
        if (status === "OK" && results[0]) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(13);
            currentScannedLocationName = results[0].formatted_address;
            
            let searchMarker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                animation: google.maps.Animation.DROP
            });
            activeMapMarkers.push(searchMarker);
            triggerCctvFlash();
        } else {
            showMessageModal("Unable to isolate administrative boundaries for specified criteria. Try another Philippine municipality name.");
        }
    });
}

function triggerCctvFlash() {
    const overlay = document.getElementById('cctv-overlay');
    overlay.style.opacity = '1';
    setTimeout(() => { overlay.style.opacity = '0.4'; }, 600);
}

/**
 * Switch drawing styles based on manual quick action selector commands from Home screen links
 */
function selectScanMode(mode) {
    setTimeout(() => {
        if (!map || !drawingManager) initMap();
        if (mode === 'polygon') {
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            const drawButton = document.getElementById('map-nav-draw');
            if (drawButton) toggleMapFeatures('draw', drawButton);
        } else if (mode === 'faultline') {
            const faultButton = document.getElementById('map-nav-fault');
            if (faultButton) toggleMapFeatures('faults', faultButton);
        }
    }, 500);
}

/**
 * Clean up active vector arrays inside map session references
 */
function clearMapOverlays() {
    if (activePolylineFault) {
        activePolylineFault.setMap(null);
        activePolylineFault = null;
    }
    activeMapPolygons.forEach(p => p.setMap(null));
    activeMapPolygons = [];
    activeMapMarkers.forEach(m => m.setMap(null));
    activeMapMarkers = [];
    activeHotspotCircles.forEach(c => c.setMap(null));
    activeHotspotCircles = [];
    
    if (drawingManager) {
        drawingManager.setDrawingMode(null);
    }
}

/**
 * Map Feature Management Layout Engine
 */
function toggleMapFeatures(featureKey, elementReference) {
    clearMapOverlays();
    triggerCctvFlash();

    document.querySelectorAll('.map-feature-btn').forEach(btn => {
        btn.classList.remove('bg-app-blue', 'text-white');
        btn.classList.add('text-gray-700');
    });

    if (elementReference) {
        elementReference.classList.add('bg-app-blue', 'text-white');
        elementReference.classList.remove('text-gray-700');
    }

    if (featureKey === 'faults') {
        document.getElementById('cctv-overlay').style.opacity = '0.5';
        activePolylineFault = new google.maps.Polyline({
            path: MARIKINA_WEST_FAULT_COORDS,
            geodesic: true,
            strokeColor: '#DC2626',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map: map
        });

        MARIKINA_WEST_FAULT_COORDS.forEach((coord, index) => {
            if (index % 2 === 0) {
                let faultMarker = new google.maps.Marker({
                    position: coord,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 2.5,
                        strokeColor: "#DC2626"
                    }
                });
                activeMapMarkers.push(faultMarker);
            }
        });
        map.setCenter(MARIKINA_WEST_FAULT_COORDS[2]);
        map.setZoom(11);

    } else if (featureKey === 'draw') {
        document.getElementById('cctv-overlay').style.opacity = '0.8';
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);

    } else if (featureKey === 'provinces') {
        document.getElementById('cctv-overlay').style.opacity = '0.3';
        PH_HOTSPOT_LOCATIONS.forEach(loc => {
            let hotspotCircle = new google.maps.Circle({
                strokeColor: '#D97706',
                strokeOpacity: 0.6,
                strokeWeight: 1.5,
                fillColor: '#FBBF24',
                fillOpacity: 0.15,
                map: map,
                center: { lat: loc.lat, lng: loc.lng },
                radius: 35000 
            });
            activeHotspotCircles.push(hotspotCircle);
            activeMapMarkers.push(new google.maps.Marker({
                position: { lat: loc.lat, lng: loc.lng },
                map: map,
                title: loc.name
            }));
        });
        map.setCenter({ lat: 13.0000, lng: 122.0000 }); 
        map.setZoom(6);
    }
}

/**
 * Simulated Telemetry Live Stream and Automatic Dispatch Integration
 */
function triggerScanReport() {
    const modal = document.getElementById('scan-telemetry-modal');
    const logContainer = document.getElementById('telemetry-log');
    const closeBtn = document.getElementById('telemetry-close-btn');
    
    // Read dynamic user settings inputs if configured
    const opName = document.getElementById('operator-name-input')?.value || "John Doe";
    const opPhone = document.getElementById('operator-phone-input')?.value || "+63 917 123 4567";
    const targetCity = document.getElementById('operator-city-input')?.value || currentScannedLocationName;

    logContainer.innerHTML = "";
    modal.classList.remove('hidden');
    closeBtn.disabled = true;
    closeBtn.classList.add('opacity-40', 'cursor-not-allowed');

    const telemetryLogs = [
        `[INFO] Initializing CCTV Surveillance Frame...`,
        `[SCAN] Locking geometric focus to area layer...`,
        `[DATA] Coordinates locked: ${map ? map.getCenter().lat().toFixed(4) : "14.5615"}, ${map ? map.getCenter().lng().toFixed(4) : "121.0260"}`,
        `[WARN] Structural collision checking against active fault matrices...`,
        `[ALERT] Critical intersection parameters identified nearby!`,
        `[CONN] Establishing pipeline to PH National Command Desk (911)...`,
        `[SEND] Packaging encrypted identity telemetry payload...`,
        `[DATA] Dispatching Operator: ${opName} (${opPhone})`,
        `[DATA] Dispatching Base Bounds: ${targetCity}`,
        `[SUCCESS] Dispatch broadcast verified. Response team units pinged automatically!`
    ];

    let currentLogIndex = 0;
    function printNextLog() {
        if (currentLogIndex < telemetryLogs.length) {
            const entry = document.createElement('p');
            entry.className = "border-l-2 pl-2 transition-all duration-200 " + 
                (telemetryLogs[currentLogIndex].includes('SUCCESS') ? 'border-emerald-400 text-emerald-300 font-bold' : 
                 telemetryLogs[currentLogIndex].includes('ALERT') ? 'border-red-500 text-red-400' : 'border-gray-500 text-emerald-500/80');
            
            entry.innerText = telemetryLogs[currentLogIndex];
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
            currentLogIndex++;
            setTimeout(printNextLog, 450);
        } else {
            closeBtn.disabled = false;
            closeBtn.classList.remove('opacity-40', 'cursor-not-allowed');
            closeBtn.innerText = "Complete Operational Verification";
            
            // Flash notification header banner
            const banner = document.getElementById('alert-banner');
            if (banner) {
                banner.classList.remove('hidden');
                setTimeout(() => banner.classList.add('hidden'), 7000);
            }
        }
    }
    printNextLog();
}

function closeTelemetryModal() {
    document.getElementById('scan-telemetry-modal').classList.add('hidden');
}

/**
 * Frame Routing State Manager Navigation Core
 */
function navigateTo(targetScreenId, direction = 'right') {
    const currentScreen = document.getElementById(currentScreenId);
    const targetScreen = document.getElementById(targetScreenId);
    
    if (!targetScreen) return;

    const isSwipeableTarget = SWIPEABLE_SCREENS.includes(targetScreenId);
    const isSwipeableCurrent = SWIPEABLE_SCREENS.includes(currentScreenId);
    let isSwipeNav = false;

    if (isSwipeableTarget && isSwipeableCurrent) {
        const currentIndex = SWIPEABLE_SCREENS.indexOf(currentScreenId);
        const targetIndex = SWIPEABLE_SCREENS.indexOf(targetScreenId);
        if (Math.abs(currentIndex - targetIndex) === 1) {
            isSwipeNav = true;
        }
    }

    if (isSwipeNav) {
        const currentIndex = SWIPEABLE_SCREENS.indexOf(currentScreenId);
        const targetIndex = SWIPEABLE_SCREENS.indexOf(targetScreenId);
        direction = targetIndex > currentIndex ? 'right' : 'left';
    }

    currentScreen.classList.remove('screen-visible');

    if (direction === 'right') {
        currentScreen.classList.add('screen-hidden-left');
    } else {
        currentScreen.classList.add('screen-hidden-right');
    }
    
    targetScreen.classList.remove('screen-hidden-left', 'screen-hidden-right');

    setTimeout(() => {
        targetScreen.classList.add('screen-visible');

        setTimeout(() => {
            if (direction === 'right') {
                currentScreen.classList.remove('screen-hidden-left');
            } else {
                currentScreen.classList.remove('screen-hidden-right');
            }
        }, 400); 

        targetScreen.scrollTop = 0;
        
        if (targetScreenId === 'map-screen') {
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                initMap();
                document.getElementById('cctv-overlay').style.opacity = '0.4';
            } else {
                document.getElementById('map-container').innerHTML = `<div class="p-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center h-full"><i class="fas fa-triangle-exclamation text-xl text-amber-500 mb-2"></i>Google Maps script loading layer failed. Ensure active internet network state.</div>`;
            }
        } else {
            const overlay = document.getElementById('cctv-overlay');
            if(overlay) overlay.style.opacity = '0';
        }

        if (SWIPEABLE_SCREENS.includes(targetScreenId)) {
            homeHeader.classList.remove('hidden');
            bottomNav.classList.remove('hidden');
        } else {
            homeHeader.classList.add('hidden');
            bottomNav.classList.add('hidden');
        }

        updateNavBar(targetScreenId);
        currentScreenId = targetScreenId;
    }, 10); 
}

function setActiveTab(tab) {
    activeTab = tab;
    updateTabs();
}

function handleContinue() {
    if (activeTab === 'login') {
        navigateTo('home-screen', 'right');
    } else {
        navigateTo('detailed-signup-screen', 'right');
    }
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    const eyeIcon = document.getElementById(`${id}-eye`);
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

function toggleOfflineMode() {
    isOfflineMode = !isOfflineMode;
    const offlineModeIcon = document.getElementById('offline-mode-icon');
    const offlineModeText = document.getElementById('offline-mode-text');
    const homeOfflineIcon = document.getElementById('home-offline-icon');
    const homeOfflineText = document.getElementById('home-offline-text');
    const phoneFrame = document.getElementById('phone-template');

    if (isOfflineMode) {
        phoneFrame.classList.add('grayscale-mode');
        offlineModeIcon.classList.remove('fa-plug-circle-xmark');
        offlineModeIcon.classList.add('fa-plug-circle-bolt');
        offlineModeText.innerText = 'Online State';
        
        if (homeOfflineIcon) {
            homeOfflineIcon.classList.remove('fa-plug-circle-xmark', 'text-gray-500');
            homeOfflineIcon.classList.add('fa-plug-circle-bolt', 'text-app-blue');
        }
        if (homeOfflineText) homeOfflineText.innerText = 'Online State';

        showMessageModal("Offline Cache Mode engaged. Mapping canvas traces use pre-fetched vector boundaries.");
    } else {
        phoneFrame.classList.remove('grayscale-mode');
        offlineModeIcon.classList.remove('fa-plug-circle-bolt');
        offlineModeIcon.classList.add('fa-plug-circle-xmark');
        offlineModeText.innerText = 'Offline Mode';
        
         if (homeOfflineIcon) {
            homeOfflineIcon.classList.remove('fa-plug-circle-bolt', 'text-app-blue');
            homeOfflineIcon.classList.add('fa-plug-circle-xmark', 'text-gray-500');
        }
         if (homeOfflineText) homeOfflineText.innerText = 'Offline Mode';
    }
}

function handleOfflineModeClick() {
    toggleOfflineMode();
}

function toggleSidebar() {
    const mainUI = document.querySelectorAll('.main-ui-element');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarOverlay.style.display = 'none';
        mainUI.forEach(el => el.classList.remove('slide-right'));
    } else {
        sidebar.classList.add('open');
        sidebarOverlay.style.display = 'block';
        mainUI.forEach(el => el.classList.add('slide-right'));
    }
}

function handleSettingsClick() {
    toggleSidebar();
    showMessageModal("Sensor threshold customization preferences screen not fully mounted in prototype context.");
}

function handleTermsClick() {
    toggleSidebar();
    showMessageModal("Data Encryption Standard Framework: All structural coordinates collected remain verified strictly locally inside individual tracking device hardware segments.");
}

function handleLogout() {
    toggleSidebar();
    if (isOfflineMode) toggleOfflineMode();
    navigateTo('auth-screen', 'left');
}

function updateNavBar(screenId) {
    document.querySelectorAll('.bottom-nav button').forEach(button => {
        button.classList.remove('text-medium-green');
        button.classList.add('text-nav-color');
    });

    const targetTabMapping = {
        'home-screen': 'nav-home',
        'map-screen': 'nav-map',
        'tips-screen': 'nav-tips',
        'contacts-screen': 'nav-contacts'
    };

    const targetButtonId = targetTabMapping[screenId];
    if (targetButtonId) {
        const activeButton = document.getElementById(targetButtonId);
        if (activeButton) {
            activeButton.classList.remove('text-nav-color');
            activeButton.classList.add('text-medium-green');
        }
    }
}

// Structural switch layout commands
function updateTabs() {
    if (activeTab === 'login') {
        loginTab.classList.add('bg-medium-green', 'text-white');
        signupTab.classList.remove('bg-medium-green', 'text-white');
        loginFields.classList.remove('hidden-content');
        signupFields.classList.add('hidden-content');
        forgotPasswordLink.classList.remove('hidden-content');
        authContinueButton.innerText = 'Authenticate Operator';
    } else {
        signupTab.classList.add('bg-medium-green', 'text-white');
        loginTab.classList.remove('bg-medium-green', 'text-white');
        signupFields.classList.remove('hidden-content');
        loginFields.classList.add('hidden-content');
        forgotPasswordLink.classList.add('hidden-content');
        authContinueButton.innerText = 'Register Registry Profile';
    }
}

// Mobile Interface Gestures & Swiping Computation Layout Boundaries
let touchStartX = 0;
let touchStartY = 0;
const swipeThreshold = 50; 
const lockSwipeY = 30;

mainContentWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && SWIPEABLE_SCREENS.includes(currentScreenId)) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
});

mainContentWrapper.addEventListener('touchmove', (e) => {
    const diffY = e.touches[0].clientY - touchStartY;
    if (Math.abs(e.touches[0].clientX - touchStartX) > Math.abs(diffY)) {
        if (currentScreenId === 'map-screen') return; 
        e.preventDefault();
    }
}, { passive: false }); 

mainContentWrapper.addEventListener('touchend', (e) => {
    if (!SWIPEABLE_SCREENS.includes(currentScreenId)) return;
    if (e.changedTouches.length !== 1) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffY) < lockSwipeY) {
        const currentIndex = SWIPEABLE_SCREENS.indexOf(currentScreenId);
        let newIndex = currentIndex;

        if (diffX > 0) {
            newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        } else {
            newIndex = currentIndex < SWIPEABLE_SCREENS.length - 1 ? currentIndex + 1 : currentIndex;
        }
        
        const nextPageId = SWIPEABLE_SCREENS[newIndex];
        if (nextPageId !== currentScreenId) {
            navigateTo(nextPageId, diffX > 0 ? 'left' : 'right');
        }
    }
});

function showMessageModal(message) {
    document.getElementById('modal-message').innerText = message;
    document.getElementById('custom-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('custom-modal').classList.add('hidden');
}

window.onload = () => {
    updateTabs();
    screens.forEach(screen => {
        if (screen.id !== 'auth-screen') {
            screen.classList.add('screen-hidden-right');
        } else {
            screen.classList.add('screen-visible');
        }
    });
};
