let activeTab = 'login';
let currentScreenId = 'auth-screen';
let currentUserRole = 'staff'; // Configured dynamically: 'staff' or 'user'

let map = null;
let espanaMap = null;
let drawingManager = null;
let currentUserMarker = null;

let faultArrows = [];
let hotspotCircles = [];
let hotspotMarkers = [];
let randomThreatDots = [];

let clickPolyline = null;
let clickPolyPoints = [];
let clickPolyMarkers = [];
let completedPolygons = [];
let activeDrawListener = null;

let espanaCameraMarkers = [];
let activeCameraIndex = null;

const PH_BASE_LOCATION = { lat: 14.5615, lng: 121.0260 };
const ESPANA_LOCK_LOCATION = { lat: 14.6080, lng: 121.0015 };

const ESPANA_CCTV_NODES = [
    { id: "CAM-ESP-03", name: "España Blvd / Lacson Ave", lat: 14.6091, lng: 120.9978, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSyZNifOnBc7Cy48LHLUnXTzP_AB7rTErqoQ&s" },
    { id: "CAM-ESP-04", name: "España Blvd / Vicente Cruz", lat: 14.6108, lng: 121.0024, image: "https://sa.kapamilya.com/absnews/abscbnnews/media/2023/news/08/31/20230831-habagat-flooding-manila-mh2-s.jpg" },
    { id: "CAM-ESP-05", name: "España Blvd / Blumentritt Rd", lat: 14.6125, lng: 121.0071, image: "https://images.gmanews.tv/v3/webpics/v3/2014/02/2014_02_12_16_50_24.jpg " }
];

const ACTIVE_FAULT_ARROW_LOCATIONS = [
    { lat: 14.6545, lng: 121.0832 },
    { lat: 14.5988, lng: 121.0711 },
    { lat: 14.5510, lng: 121.0640 }
];

const PH_HOTSPOT_DATA = [
    { name: "Marikina Core Zone", lat: 14.6340, lng: 121.0990, radius: 2500 },
    { name: "Taguig Danger Pocket", lat: 14.5170, lng: 121.0500, radius: 1800 },
    { name: "Pasig Convergence Area", lat: 14.5660, lng: 121.0820, radius: 2000 }
];

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

function initMap() {
    if (map === null && currentUserRole === 'staff') {
        map = new google.maps.Map(document.getElementById('map-container'), {
            center: PH_BASE_LOCATION,
            zoom: 12,
            disableDefaultUI: false,
            zoomControl: true,
            gestureHandling: "greedy", 
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });

        currentUserMarker = new google.maps.Marker({
            position: PH_BASE_LOCATION,
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 7,
                fillColor: "#FD1F4A",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
            }
        });

        clickPolyline = new google.maps.Polyline({
            path: [],
            geodesic: true,
            strokeColor: '#06b6d4',
            strokeOpacity: 0.9,
            strokeWeight: 3,
            map: map
        });

        createFaultAssets();
        createHotspotAssets();
        generateRandomThreatDots();
    }
}

function generateRandomThreatDots() {
    if(!map) return;
    randomThreatDots.forEach(dot => dot.setMap(null));
    randomThreatDots = [];

    const baseLat = PH_BASE_LOCATION.lat;
    const baseLng = PH_BASE_LOCATION.lng;

    for (let i = 0; i < 15; i++) {
        const offsetLat = (Math.random() - 0.5) * 0.12;
        const offsetLng = (Math.random() - 0.5) * 0.12;
        
        let threatMarker = new google.maps.Marker({
            position: { lat: baseLat + offsetLat, lng: baseLng + offsetLng },
            map: map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 5,
                fillColor: "#dc2626",
                fillOpacity: 0.9,
                strokeColor: "#ffffff",
                strokeWeight: 1.5
            }
        });
        randomThreatDots.push(threatMarker);
    }
}

function createFaultAssets() {
    ACTIVE_FAULT_ARROW_LOCATIONS.forEach(loc => {
        let arrowMarker = new google.maps.Marker({
            position: loc,
            map: null,
            icon: {
                path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                fillColor: "#FD1F4A",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                scale: 1.4,
                rotation: 145,
                anchor: new google.maps.Point(12, 12)
            }
        });
        faultArrows.push(arrowMarker);
    });
}

function createHotspotAssets() {
    PH_HOTSPOT_DATA.forEach(data => {
        let circle = new google.maps.Circle({
            map: null,
            center: { lat: data.lat, lng: data.lng },
            radius: data.radius,
            fillColor: "#FD1F4A",
            fillOpacity: 0.12,
            strokeColor: "#FD1F4A",
            strokeWeight: 1.5
        });
        hotspotCircles.push(circle);

        let pinMarker = new google.maps.Marker({
            position: { lat: data.lat, lng: data.lng },
            map: null,
            title: data.name,
            icon: {
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                fillColor: "#FD1F4A",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1.5,
                scale: 1.5,
                anchor: new google.maps.Point(12, 24)
            }
        });
        hotspotMarkers.push(pinMarker);
    });
}

function toggleMapFeatures(featureKey, elementReference) {
    if(currentUserRole !== 'staff') return;
    document.querySelectorAll('.map-feature-btn').forEach(btn => {
        btn.classList.remove('bg-medium-red', 'text-white');
        btn.classList.add('text-slate-700');
    });
    if (elementReference) {
        elementReference.classList.add('bg-medium-red', 'text-white');
    }

    const undoControl = document.getElementById('map-undo-control');
    if (undoControl) undoControl.classList.add('hidden');

    if (activeDrawListener) {
        google.maps.event.removeListener(activeDrawListener);
        activeDrawListener = null;
    }

    faultArrows.forEach(arrow => arrow.setMap(null));
    hotspotCircles.forEach(c => c.setMap(null));
    hotspotMarkers.forEach(m => m.setMap(null));

    if (featureKey === 'faults') {
        faultArrows.forEach(arrow => arrow.setMap(map));
    } else if (featureKey === 'draw') {
        if (undoControl) undoControl.classList.remove('hidden');
        updateUndoButtonState();
        
        activeDrawListener = map.addListener('click', function(e) {
            handleMapClickNode(e.latLng);
        });
    } else if (featureKey === 'provinces') {
        hotspotCircles.forEach(c => c.setMap(map));
        hotspotMarkers.forEach(m => m.setMap(map));
    }
}

function handleMapClickNode(latLng) {
    clickPolyPoints.push(latLng);
    clickPolyline.setPath(clickPolyPoints);

    let isFirstNode = (clickPolyPoints.length === 1);

    let nodeMarker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isFirstNode ? 7 : 5,
            fillColor: isFirstNode ? "#06b6d4" : "#FD1F4A",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2
        }
    });

    if (isFirstNode) {
        nodeMarker.addListener('click', function(e) {
            if (clickPolyPoints.length >= 3) {
                closeCurrentPolygon();
            }
            e.stop();
        });
    }

    clickPolyMarkers.push(nodeMarker);
    updateUndoButtonState();
}

function closeCurrentPolygon() {
    let closedPolygon = new google.maps.Polygon({
        paths: clickPolyPoints,
        fillColor: '#FD1F4A',
        fillOpacity: 0.35,
        strokeColor: '#06b6d4',
        strokeWeight: 3,
        map: map
    });

    completedPolygons.push(closedPolygon);

    clickPolyPoints = [];
    clickPolyline.setPath([]);
    clickPolyMarkers.forEach(mkr => mkr.setMap(null));
    clickPolyMarkers = [];

    updateUndoButtonState();
}

function undoLastDrawnShape() {
    if (clickPolyPoints.length > 0) {
        clickPolyPoints.pop();
        clickPolyline.setPath(clickPolyPoints);
        
        let lastMkr = clickPolyMarkers.pop();
        if (lastMkr) lastMkr.setMap(null);
    } else if (completedPolygons.length > 0) {
        let lastPoly = completedPolygons.pop();
        lastPoly.setMap(null);
    }
    updateUndoButtonState();
}

function clearAllDrawnShapes() {
    clickPolyPoints = [];
    clickPolyline.setPath([]);
    clickPolyMarkers.forEach(mkr => mkr.setMap(null));
    clickPolyMarkers = [];

    completedPolygons.forEach(poly => poly.setMap(null));
    completedPolygons = [];

    updateUndoButtonState();
}

function updateUndoButtonState() {
    const undoBtn = document.getElementById('map-undo-btn');
    const clearBtn = document.getElementById('map-clear-btn');
    if (!undoBtn || !clearBtn) return;

    let hasElements = (clickPolyPoints.length > 0 || completedPolygons.length > 0);

    if (!hasElements) {
        undoBtn.disabled = true;
        undoBtn.classList.add('opacity-40', 'cursor-not-allowed');
        clearBtn.disabled = true;
        clearBtn.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
        undoBtn.disabled = false;
        undoBtn.classList.remove('opacity-40', 'cursor-not-allowed');
        clearBtn.disabled = false;
        clearBtn.classList.remove('opacity-40', 'cursor-not-allowed');
    }
}

function initEspanaMap() {
    if(currentUserRole !== 'staff') return;
    if (espanaMap === null) {
        espanaMap = new google.maps.Map(document.getElementById('espana-map-container'), {
            center: ESPANA_LOCK_LOCATION,
            zoom: 15,
            disableDefaultUI: false,
            gestureHandling: "greedy",
            zoomControl: true,
            draggable: true, 
            scrollwheel: true,
            disableDoubleClickZoom: false
        });

        ESPANA_CCTV_NODES.forEach((cam, index) => {
            let mkr = new google.maps.Marker({
                position: { lat: cam.lat, lng: cam.lng },
                map: espanaMap,
                title: cam.name,
                icon: {
                    path: "M16 16v-3.5c0-.83-.67-1.5-1.5-1.5H11V9h1.5c.83 0 1.5-.67 1.5-1.5V4c0-.83-.67-1.5-1.5-1.5h-5C6.67 2.5 6 3.17 6 4v3.5C6 8.33 6.67 9 7.5 9H9v2H5.5C4.67 11 4 11.67 4 12.5V16h12z",
                    fillColor: "#FD1F4A",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 1.5,
                    scale: 1.5
                }
            });

            mkr.addListener('click', () => {
                launchCctvMonitor(index);
            });
            espanaCameraMarkers.push(mkr);
        });
    } else {
        google.maps.event.trigger(espanaMap, 'resize');
        espanaMap.setCenter(ESPANA_LOCK_LOCATION);
    }
}

function launchCctvMonitor(index) {
    activeCameraIndex = index;
    const camData = ESPANA_CCTV_NODES[index];
    document.getElementById('monitor-cam-id').innerText = `${camData.id} // ${camData.name}`;
    document.getElementById('monitor-cam-coords').innerText = `LAT: ${camData.lat.toFixed(4)} | LNG: ${camData.lng.toFixed(4)}`;
    document.getElementById('monitor-image-placeholder').src = camData.image;
    document.getElementById('cctv-monitor-view').classList.remove('hidden');
}

function exitCctvMonitor() {
    document.getElementById('cctv-monitor-view').classList.add('hidden');
    activeCameraIndex = null;
}

function nextCctvMonitor() {
    if (activeCameraIndex === null) return;
    let nextIndex = (activeCameraIndex + 1) % ESPANA_CCTV_NODES.length;
    launchCctvMonitor(nextIndex);
}

function geocodeSearch() {
    const query = document.getElementById('map-search-bar').value;
    if (!query || !map) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query + ", Philippines" }, function(results, status) {
        if (status === "OK" && results[0]) {
            map.setCenter(results[0].geometry.location);
            map.setZoom(13);
            generateRandomThreatDots();
        }
    });
}

function applyRoleAccessUIConfiguration() {
    const mapNavBtn = document.getElementById('nav-map');
    const cctvNavBtn = document.getElementById('nav-contacts');
    const sideMapBtn = document.getElementById('sidebar-map-btn');
    const sideCctvBtn = document.getElementById('sidebar-cctv-btn');
    const badgeRole = document.getElementById('badge-role-indicator');
    
    const staffDash = document.getElementById('staff-dashboard-view');
    const userDash = document.getElementById('user-dashboard-view');
    const feedActionViewPoly = document.getElementById('feed-action-view-poly');

    if (currentUserRole === 'staff') {
        if(mapNavBtn) mapNavBtn.style.display = 'flex';
        if(cctvNavBtn) cctvNavBtn.style.display = 'flex';
        if(sideMapBtn) sideMapBtn.style.display = 'flex';
        if(sideCctvBtn) sideCctvBtn.style.display = 'flex';
        
        if(badgeRole) {
            badgeRole.innerText = "Staff";
            badgeRole.className = "text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-600 uppercase tracking-wide";
        }

        if(staffDash) staffDash.classList.remove('hidden');
        if(userDash) userDash.classList.add('hidden');
        if(feedActionViewPoly) feedActionViewPoly.style.display = 'inline-block';

        document.getElementById('sidebar-dashboard-label').innerText = "Scan Dashboard";
        document.getElementById('sidebar-faults-label').innerText = "Fault Parameters";
        document.getElementById('faults-screen-title').innerText = "Philippine Fault Lines";
        document.getElementById('faults-screen-subtitle').innerText = "Privileged Operational Emergency Directives";
        
        document.getElementById('profile-display-name').innerText = "Officer John Doe";
        document.getElementById('profile-display-role').innerText = "MDRRMO Command Base Center";
        document.getElementById('profile-input-name').value = "Officer John Doe";

    } else {
        // Normal User Authentication Config
        if(mapNavBtn) mapNavBtn.style.display = 'none';
        if(cctvNavBtn) cctvNavBtn.style.display = 'none';
        if(sideMapBtn) sideMapBtn.style.display = 'none';
        if(sideCctvBtn) sideCctvBtn.style.display = 'none';
        
        if(badgeRole) {
            badgeRole.innerText = "User Profile";
            badgeRole.className = "text-[9px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-600 uppercase tracking-wide";
        }

        if(staffDash) staffDash.classList.add('hidden');
        if(userDash) userDash.classList.remove('hidden');
        if(feedActionViewPoly) feedActionViewPoly.style.display = 'none';

        document.getElementById('sidebar-dashboard-label').innerText = "User Workspace";
        document.getElementById('sidebar-faults-label').innerText = "Fault Guidance";
        document.getElementById('faults-screen-title').innerText = "Fault Safety Information";
        document.getElementById('faults-screen-subtitle').innerText = "Public Structural Exposure Framework Guide";

        document.getElementById('profile-display-name').innerText = "Civilian User Workspace";
        document.getElementById('profile-display-role').innerText = "Verified ThreatScan Mobile Profile";
        document.getElementById('profile-input-name').value = "Civilian Account Profile";
    }

    renderFaultParametersView();
}

function renderFaultParametersView() {
    const container = document.getElementById('faults-parameters-dynamic-container');
    if (!container) return;
    container.innerHTML = "";

    if (currentUserRole === 'staff') {
        container.innerHTML = `
            <div class="p-4 bg-rose-950/20 border-2 border-rose-600 rounded-xl shadow-md">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-bold text-base text-rose-600">1. West Valley Fault Grid</h3>
                    <span class="text-[9px] font-bold px-2 py-0.5 bg-rose-600 text-white uppercase rounded">CRITICAL HAZARD</span>
                </div>
                <p class="text-xs text-slate-700 font-bold mb-2">Metrics: High Tectonic Strain | Potential Magnitude: 7.2 M_w</p>
                <p class="text-xs text-slate-600">The buffer envelope intercepts strategic commercial arterial networks across Metro Manila. Expected damage structural index is exceptionally extreme.</p>
                <div class="mt-3 p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                    <p class="text-[11px] font-bold text-rose-700 uppercase tracking-tight flex items-center gap-1">
                        <i class="fas fa-truck-field"></i> Emergency Suggestion Command:
                    </p>
                    <p class="text-xs text-slate-800 font-semibold mt-0.5">Situation is very very bad. Instantly deploy 3 Fire Trucks, 2 Heavy Rescue Emergency Units, and establish primary LGU staging lanes immediately.</p>
                </div>
            </div>

            <div class="p-4 bg-amber-950/10 border border-amber-500 rounded-xl shadow-md">
                <div class="flex justify-between items-center mb-1">
                    <h3 class="font-bold text-base text-amber-700">2. East Valley Trace</h3>
                    <span class="text-[9px] font-bold px-2 py-0.5 bg-amber-500 text-white uppercase rounded">ELEVATED RISK</span>
                </div>
                <p class="text-xs text-slate-700 font-bold mb-2">Metrics: Moderate Creep Rate | Potential Magnitude: 6.5 M_w</p>
                <p class="text-xs text-slate-600">Structural strain accumulating in surrounding Rizal province corridors. Vulnerability factors scale high for localized unreinforced masonry setups.</p>
                <div class="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <p class="text-[11px] font-bold text-amber-800 uppercase tracking-tight flex items-center gap-1">
                        <i class="fas fa-shield-halved"></i> Emergency Suggestion Command:
                    </p>
                    <p class="text-xs text-slate-800 font-semibold mt-0.5">Pre-position 1 Fire Truck and dispatch regular secondary civilian patrol loops to clear evacuation choke-points.</p>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="p-4 bg-mint-green/60 rounded-xl shadow-md border border-teal-200">
                <h3 class="font-bold text-base text-slate-800 flex items-center gap-1.5">
                    <i class="fas fa-heart-pulse text-teal-600"></i> Marikina Valley Fault Info
                </h3>
                <p class="text-xs text-slate-600 mt-1">This system has major lines running through parts of Bulacan, Rizal, Metro Manila, and Laguna. Local citizens should look out for official public advisory signals and learn nearby open community assembly points.</p>
            </div>

            <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-md">
                <h3 class="font-bold text-base text-slate-800 flex items-center gap-1.5">
                    <i class="fas fa-circle-info text-blue-500"></i> What is an Active Fault Zone?
                </h3>
                <p class="text-xs text-slate-600 mt-1">It is a fracture line structure on the earth's crust that has shown signs of movement within historical memory. Keeping clear of old brick walls and structures during active seismic anomalies is strongly advised.</p>
            </div>
        `;
    }
}

function submitUserFeedbackData() {
    const category = document.getElementById('feedback-category').value;
    const msg = document.getElementById('feedback-message').value;

    if (!msg.trim()) {
        showMessageModal("Please supply data message notes into the workspace form text area box before sending.");
        return;
    }

    const modal = document.getElementById('scan-telemetry-modal');
    const logContainer = document.getElementById('telemetry-log');
    const closeBtn = document.getElementById('telemetry-close-btn');
    
    document.getElementById('telemetry-modal-headline').innerText = "📡 PROTOTYPE USER SUBMISSION";
    logContainer.innerHTML = "";
    modal.classList.remove('hidden');
    closeBtn.disabled = true;
    closeBtn.innerText = "Uploading Form...";
    closeBtn.classList.add('opacity-40');

    const feedbackLogs = [
        `[FEEDBACK ENGINE] Initiating civilian telemetry communication uplink...`,
        `[METRICS] Category flag caught: ${category.toUpperCase()}`,
        `[PACKING] Injecting localized message parameters safely...`,
        `[TRANSMIT] Transferring log text strings directly to QA system database nodes...`,
        `[SUCCESS] Dispatch submission complete. Prototype simulated data saved successfully!`
    ];

    let i = 0;
    function printFeedbackLog() {
        if (i < feedbackLogs.length) {
            const entry = document.createElement('p');
            entry.className = "mb-1 text-xs border-l-2 pl-2 border-emerald-500";
            entry.innerText = feedbackLogs[i++];
            logContainer.appendChild(entry);
            setTimeout(printFeedbackLog, 400);
        } else {
            closeBtn.disabled = false;
            closeBtn.classList.remove('opacity-40');
            closeBtn.innerText = "Close Submission Log";
            document.getElementById('feedback-message').value = "";
        }
    }
    printFeedbackLog();
}

function navigateTo(targetScreenId, direction = 'right') {
    if (currentUserRole !== 'staff' && (targetScreenId === 'map-screen' || targetScreenId === 'contacts-screen')) {
        return; // Safety guard clause preventing programmatic jumps for normal users
    }

    const currentScreen = document.getElementById(currentScreenId);
    const targetScreen = document.getElementById(targetScreenId);
    if (!targetScreen) return;

    currentScreen.classList.remove('screen-visible');
    currentScreen.classList.add(direction === 'right' ? 'screen-hidden-left' : 'screen-hidden-right');
    targetScreen.classList.remove('screen-hidden-left', 'screen-hidden-right');

    setTimeout(() => {
        targetScreen.classList.add('screen-visible');
        if (targetScreenId === 'map-screen') {
            initMap();
            generateRandomThreatDots();
        } else if (targetScreenId === 'contacts-screen') {
            setTimeout(initEspanaMap, 200);
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

function triggerScanReport() {
    const modal = document.getElementById('scan-telemetry-modal');
    const logContainer = document.getElementById('telemetry-log');
    const closeBtn = document.getElementById('telemetry-close-btn');
    
    document.getElementById('telemetry-modal-headline').innerText = "🛰️ LGU DISPATCH LINK";
    logContainer.innerHTML = "";
    modal.classList.remove('hidden');
    closeBtn.disabled = true;
    closeBtn.innerText = "Transmitting...";
    closeBtn.classList.add('opacity-40');

    let customCoordinatesNotice = "Using center viewport array reference...";
    if (completedPolygons.length > 0) {
        customCoordinatesNotice = `Captured data boundary envelope containing ${completedPolygons.length} custom polygon configurations.`;
    } else if (clickPolyPoints.length > 0) {
        customCoordinatesNotice = `Captured ongoing line trace setup with ${clickPolyPoints.length} map coordinate locks.`;
    }

    const telemetryLogs = [
        `[CONNECTING] Establishing handshakes over encrypted LGU server nodes...`,
        `[PACKET] ${customCoordinatesNotice}`,
        `[TRANSMIT] Packaging geometric layout data into GeoJSON format...`,
        `[ROUTE] Directing hazard parameters to Local Municipal Command Base Center...`,
        `[SUCCESS] Dispatch update mock simulation delivered flawlessly to LGU portal.`
    ];

    let i = 0;
    function printLog() {
        if (i < telemetryLogs.length) {
            const entry = document.createElement('p');
            entry.className = "mb-1 text-xs border-l-2 pl-2 border-emerald-500";
            entry.innerText = telemetryLogs[i++];
            logContainer.appendChild(entry);
            setTimeout(printLog, 500);
        } else {
            closeBtn.disabled = false;
            closeBtn.classList.remove('opacity-40');
            closeBtn.innerText = "Simulation Complete";
        }
    }
    printLog();
}

function closeTelemetryModal() {
    document.getElementById('scan-telemetry-modal').classList.add('hidden');
}

function setActiveTab(tab) {
    activeTab = tab;
    updateTabs();
}

function handleContinue() {
    const emailField = document.getElementById('login-email-input').value.trim();
    
    if (activeTab === 'login') {
        if (emailField.toLowerCase().endsWith('@threat.com')) {
            currentUserRole = 'staff';
        } else if (emailField.toLowerCase().endsWith('@gmail.com')) {
            currentUserRole = 'user';
        } else {
            currentUserRole = 'user'; // Default Fallback safe state assignment
        }
        applyRoleAccessUIConfiguration();
        navigateTo('home-screen', 'right');
    } else {
        navigateTo('detailed-signup-screen', 'right');
    }
}

function commitDetailedSignupRegistration() {
    const signupEmail = document.getElementById('signup-email-input').value.trim();
    if (signupEmail.toLowerCase().endsWith('@threat.com')) {
        currentUserRole = 'staff';
    } else {
        currentUserRole = 'user';
    }
    applyRoleAccessUIConfiguration();
    navigateTo('home-screen', 'right');
}

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
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

function handleSettingsClick() { toggleSidebar(); showMessageModal("Settings context unavailable."); }
function handleTermsClick() { toggleSidebar(); showMessageModal("Local encryption standard active."); }
function handleLogout() { toggleSidebar(); navigateTo('auth-screen', 'left'); }

function updateNavBar(screenId) {
    document.querySelectorAll('.bottom-nav button').forEach(button => {
        button.classList.remove('text-medium-red');
        button.classList.add('text-nav-color');
    });

    const faultImg = document.getElementById('fault-nav-icon');
    if (faultImg) faultImg.classList.remove('active-red-tint');

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
            if (targetButtonId === 'nav-tips') {
                if (faultImg) faultImg.classList.add('active-red-tint');
            } else {
                activeButton.classList.remove('text-nav-color');
                activeButton.classList.add('text-medium-red');
            }
        }
    }
}

function updateTabs() {
    if (activeTab === 'login') {
        loginTab.classList.add('bg-medium-red', 'text-white');
        signupTab.classList.remove('bg-medium-red', 'text-white');
        loginFields.classList.remove('hidden-content');
        signupFields.classList.add('hidden-content');
        authContinueButton.innerText = 'Authenticate Operator';
    } else {
        signupTab.classList.add('bg-medium-red', 'text-white');
        loginTab.classList.remove('bg-medium-red', 'text-white');
        signupFields.classList.remove('hidden-content');
        loginFields.classList.add('hidden-content');
        authContinueButton.innerText = 'Register Registry Profile';
    }
}

let touchStartX = 0;
let touchStartY = 0;

mainContentWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1 && SWIPEABLE_SCREENS.includes(currentScreenId)) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
});

mainContentWrapper.addEventListener('touchend', (e) => {
    if (!SWIPEABLE_SCREENS.includes(currentScreenId) || currentScreenId === 'contacts-screen' || currentScreenId === 'map-screen') return;
    const diffX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diffX) > 60) {
        const currentIndex = SWIPEABLE_SCREENS.indexOf(currentScreenId);
        let newIndex = diffX > 0 ? currentIndex - 1 : currentIndex + 1;
        
        if (newIndex >= 0 && newIndex < SWIPEABLE_SCREENS.length) {
            let nextScreenKey = SWIPEABLE_SCREENS[newIndex];
            // Skip map view or cctv views during finger swipes if the user lacks authority privileges
            if (currentUserRole !== 'staff' && (nextScreenKey === 'map-screen' || nextScreenKey === 'contacts-screen')) {
                return;
            }
            navigateTo(nextScreenKey, diffX > 0 ? 'left' : 'right');
        }
    }
});

function showMessageModal(message) {
    document.getElementById('modal-message').innerText = message;
    document.getElementById('custom-modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('custom-modal').classList.add('hidden'); }

window.onload = () => {
    updateTabs();
    applyRoleAccessUIConfiguration();
};
