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
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
        });

        // Initialize Google Maps Native Drawing Manager Component
        drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false, // Hidden standard toolbar to rely on our custom HTML navbar layout choices
            polygonOptions: {
                fillColor: '#5691b2',
                fillOpacity: 0.35,
                strokeColor: '#5691b2',
                strokeWeight: 3,
                clickable: true,
                editable: true,
                zIndex: 1
            }
        });
        drawingManager.setMap(map);

        // Bind callback listener for complete geometry construction events handled by Google Maps engine
        google.maps.event.addListener(drawingManager, 'polygoncomplete', function(polygon) {
            activeMapPolygons.push(polygon);
            drawingManager.setDrawingMode(null); // Return to default map pan interactions immediately after placement
            
            // Extract and calculate the coordinate path length parameters dynamically
            const vertices = polygon.getPath();
            let coordinatesSummary = [];
            for (let i = 0; i < vertices.getLength(); i++) {
                let xy = vertices.getAt(i);
                coordinatesSummary.push(`[${xy.lat().toFixed(4)}, ${xy.lng().toFixed(4)}]`);
            }

            showMessageModal(`Area Scan Polygon successfully registered! Monitored Vertices Count: ${vertices.getLength()}. Geometry loaded inside tracking buffer registers successfully.`);
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
            
            let searchMarker = new google.maps.Marker({
                map: map,
                position: results[0].geometry.location,
                animation: google.maps.Animation.DROP
            });
            activeMapMarkers.push(searchMarker);
        } else {
            showMessageModal("Unable to isolate administrative boundaries for specified criteria. Try another Philippine municipality name.");
        }
    });
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

    document.querySelectorAll('.map-feature-btn').forEach(btn => {
        btn.classList.remove('bg-app-blue', 'text-white');
        btn.classList.add('text-gray-700');
    });

    if (elementReference) {
        elementReference.classList.add('bg-app-blue', 'text-white');
        elementReference.classList.remove('text-gray-700');
    }

    if (featureKey === 'faults') {
        // Construct native Google Maps Polyline structure referencing West Valley coordinate trace tracks
        activePolylineFault = new google.maps.Polyline({
            path: MARIKINA_WEST_FAULT_COORDS,
            geodesic: true,
            strokeColor: '#DC2626',
            strokeOpacity: 0.85,
            strokeWeight: 5,
            map: map
        });

        // Place custom info windows over specific critical fault segments
        MARIKINA_WEST_FAULT_COORDS.forEach((coord, index) => {
            if (index % 2 === 0) {
                let faultMarker = new google.maps.Marker({
                    position: coord,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 3,
                        strokeColor: "#DC2626"
                    }
                });
                
                let infoWindow = new google.maps.InfoWindow({
                    content: `<div class="p-1"><b class="text-red-600">Active Trace Node #${index+1}</b><br><span class="text-xs text-gray-600">West Valley Structural Subsystem Line</span></div>`
                });

                faultMarker.addListener('click', () => infoWindow.open(map, faultMarker));
                activeMapMarkers.push(faultMarker);
            }
        });

        map.setCenter(MARIKINA_WEST_FAULT_COORDS[2]);
        map.setZoom(11);

    } else if (featureKey === 'draw') {
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        showMessageModal("Drawing profile initialized. Tap unique point vertices on the map framework canvas below to assemble your bounding box envelope scan.");

    } else if (featureKey === 'provinces') {
        PH_HOTSPOT_LOCATIONS.forEach(loc => {
            let hotspotCircle = new google.maps.Circle({
                strokeColor: '#D97706',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FBBF24',
                fillOpacity: 0.25,
                map: map,
                center: { lat: loc.lat, lng: loc.lng },
                radius: 40000 // 40 Kilometer Tracking Vulnerability Radii Groupings
            });
            activeHotspotCircles.push(hotspotCircle);

            let marker = new google.maps.Marker({
                position: { lat: loc.lat, lng: loc.lng },
                map: map,
                title: loc.name,
                label: { text: "⚠", color: "#B45309", fontWeight: "bold" }
            });
            
            let infoWindow = new google.maps.InfoWindow({
                content: `<div class="p-2"><h4 class="font-bold text-gray-800">${loc.name}</h4><p class="text-xs text-amber-700">${loc.risk}</p></div>`
            });
            marker.addListener('click', () => infoWindow.open(map, marker));
            
            activeMapMarkers.push(marker);
        });

        map.setCenter({ lat: 12.0000, lng: 122.0000 }); // Frame out standard aggregate macro view bounds of PH archipelago region
        map.setZoom(6);
    }
}

/**
 * Handle structural scan calculations and matching hotline notification reports
 */
function triggerScanReport() {
    showMessageModal("Running structural polygon intersection algorithm... Geometry scan safe bounds match zero immediate rupture offsets. Target Philippine Hotlines notified of baseline reporting parameters.");
    
    // Flash structural notification banner on home board dashboard layout positions
    const banner = document.getElementById('alert-banner');
    if (banner) {
        banner.classList.remove('hidden');
        setTimeout(() => banner.classList.add('hidden'), 8000);
    }
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
            // Lazy load initialization callback checks against external Google endpoint script libraries
            if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
                initMap();
            } else {
                document.getElementById('map-container').innerHTML = `<div class="p-8 text-center text-xs text-gray-500 flex flex-col items-center justify-center h-full"><i class="fas fa-triangle-exclamation text-xl text-amber-500 mb-2"></i>Google Maps API Script blocked or structural key tokens missing. Check network settings.</div>`;
            }
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

        showMessageModal("Offline Cache Mode engaged. Mapping canvas traces use pre-fetched vector boundaries. Geo-computations fallback to estimated approximations.");
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
        // Prevent default browser viewport adjustments when moving purposefully across interactive grid screens
        const activeContainerMap = document.getElementById('map-container');
        if (currentScreenId === 'map-screen') return; // Do not interrupt drag pan logic if user interactions hit the Google canvas wrapper layer
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
