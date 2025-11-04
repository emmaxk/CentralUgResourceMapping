
// Initialize map
let map;
let markers = [];
let markerClusterGroup;
let currentLayer;
let heatmapLayer;
let measureControl;
let routingControl = null;
let currentDistrictLayer = null;

// Initialize the map when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, starting initialization...');
    
    // Initialize facility images and likes first
    initFacilityImagesAndLikes();
    console.log('Facility images and likes initialized');
    
    // Initialize the map
    initializeMap();
    console.log('Map initialized');
    
    // Set up event listeners
    setupEventListeners();
    console.log('Event listeners set up');
    
    // Wait a brief moment to ensure all initialization is complete
    setTimeout(() => {
        // Load and display all facilities
        console.log('Loading facilities...');
        loadFacilities();
        
        // Log the number of facilities loaded
        console.log(`Loaded ${markers.length} facilities`);
        
        // Ensure the marker cluster group is on the map
        if (!map.hasLayer(markerClusterGroup)) {
            map.addLayer(markerClusterGroup);
            console.log('Added marker cluster group to map');
        }
    }, 100);
});

// Initialize Leaflet map
function initializeMap() {
    map = L.map('map', {
        center: [0.3476, 32.5825], // Kampala-centered
        zoom: 9,  // Better overview of central region
        minZoom: 8,  // Allow moderate zoom out while keeping focus
        maxZoom: CONFIG.map.maxZoom,
        zoomControl: false
    });

    // Initialize district boundary layers container
    window.districtLayers = L.featureGroup().addTo(map);
    window.districtFeatures = {};
    
    // Load district boundaries from GeoJSON file
    console.log('Loading district boundaries...');
    fetch('centralUgandaDistricts.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('GeoJSON response status:', response.status);
            return response.text();
        })
        .then(text => {
                console.log('GeoJSON content length:', text.length);
                console.log('GeoJSON content preview:', text.substring(0, 500));
                if (!text.trim()) {
                    throw new Error('Empty GeoJSON content');
                }
            return JSON.parse(text);
        })
        .then(data => {
                console.log('GeoJSON structure:', {
                    type: data.type,
                    featuresCount: data.features ? data.features.length : 0,
                    crs: data.crs
                });
            // Log the first feature's geometry to check coordinate structure
            if (data.features && data.features[0]) {
                console.log('First district geometry:', JSON.stringify(data.features[0].geometry, null, 2));
            }
            
            if (!data.features || !Array.isArray(data.features)) {
                throw new Error('Invalid GeoJSON structure: missing features array');
            }

            // Normalize and sort districts alphabetically
            const candidateNameKeys = ['name', 'NAME', 'Name', 'dname2019', 'dname', 'DNAME', 'district', 'District'];

            // Ensure each feature has a normalized `properties.name` using common alternatives
            const normalizedFeatures = data.features.map(f => {
                f.properties = f.properties || {};
                if (!f.properties.name) {
                    for (const key of candidateNameKeys) {
                        if (f.properties[key]) {
                            f.properties.name = f.properties[key];
                            break;
                        }
                    }
                }
                // If still not found, attempt to look one level deeper (e.g., properties.attributes?.NAME)
                if (!f.properties.name && f.properties.attributes && typeof f.properties.attributes === 'object') {
                    for (const key of candidateNameKeys) {
                        if (f.properties.attributes[key]) {
                            f.properties.name = f.properties.attributes[key];
                            break;
                        }
                    }
                }
                return f;
            }).filter(f => {
                if (!f.properties || !f.properties.name) {
                    console.warn('Skipping feature without name:', f);
                    return false;
                }
                return true;
            });

            const sortedFeatures = normalizedFeatures.sort((a, b) => 
                (a.properties.name || '').toString().localeCompare((b.properties.name || '').toString(), undefined, { sensitivity: 'base' })
            );

            // Add "All Districts" option first (reset dropdown)
            const districtFilter = document.getElementById('districtFilter');
            if (districtFilter) {
                districtFilter.innerHTML = '<option value="all">All Districts</option>';
            }

            // Process each feature in the GeoJSON
            sortedFeatures.forEach(feature => {
                const districtName = feature.properties.name;
                console.log(`Processing district: ${districtName}`);

                // Create the layer with district styling
                const layer = L.geoJSON(feature, {
                    style: CONFIG.districtStyle.default,
                    onEachFeature: function(feature, layer) {
                        console.log(`Creating layer for district: ${feature.properties.name}`);
                        try { console.log('District bounds:', layer.getBounds()); } catch (e) {}
                    }
                }).addTo(window.districtLayers);

                // Store reference and enable interactivity
                window.districtFeatures[districtName.toLowerCase()] = layer;
                enableDistrictInteractivity(layer);
s
                // Add to district filter dropdown
                if (districtFilter) {
                    const option = document.createElement('option');
                    option.value = districtName;
                    option.textContent = districtName;
                    districtFilter.appendChild(option);
                }
            });

            // Show all districts initially
            console.log('Showing all districts initially...');
            loadFacilities(); // Load facilities first
            showDistrictBoundary('all');
        })
        .catch(error => {
            console.error('Error loading district boundaries:', error);
        });

    // Add default tile layer
    currentLayer = L.tileLayer(CONFIG.tileLayers.street.url, {
        attribution: CONFIG.tileLayers.street.attribution,
        maxZoom: CONFIG.map.maxZoom
    }).addTo(map);

    // Initialize marker cluster group with original settings
    markerClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true
    });
    
    map.addLayer(markerClusterGroup);

    // Update coordinates display on mouse move
    map.on('mousemove', function(e) {
        const coords = e.latlng;
        document.getElementById('coordsDisplay').textContent = 
            `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`;
    });

    // Add legend toggle button into the legend container
    const legend = document.querySelector('.map-legend');
    if (legend) {
        const btn = document.createElement('button');
        btn.className = 'legend-toggle';
        btn.title = 'Minimize legend';
        btn.innerHTML = '<i class="fas fa-compress"></i>';
        btn.addEventListener('click', toggleLegend);
        legend.appendChild(btn);
    }

    // Add click handler for routing toggle
    const rtBtn = document.getElementById('routingToggleBtn');
    if (rtBtn) {
        rtBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            toggleRoutingWidget();
        });
    }
}

function toggleLegend() {
    const legend = document.querySelector('.map-legend');
    if (!legend) return;
    legend.classList.toggle('minimized');
    const btn = legend.querySelector('.legend-toggle');
    if (legend.classList.contains('minimized')) {
        btn.title = 'Expand legend';
        btn.innerHTML = '<i class="fas fa-expand"></i>';
    } else {
        btn.title = 'Minimize legend';
        btn.innerHTML = '<i class="fas fa-compress"></i>';
    }
}

function toggleRoutingWidget() {
    // Find the LRM container created by Leaflet Routing Machine
    const lrm = document.querySelector('.leaflet-routing-container');
    if (!lrm) {
        showNotification('No routing widget is active', 'info');
        return;
    }
    lrm.classList.toggle('minimized');
}

// Create custom marker icon
function createMarkerIcon(type) {
    const config = CONFIG.markerIcons[type];
    return L.divIcon({
        html: `<div style="
            background: ${config.color};
            width: ${config.size}px;
            height: ${config.size}px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: ${config.size * 0.5}px;
        ">${config.emoji}</div>`,
        className: '',
        iconSize: [config.size, config.size],
        iconAnchor: [config.size / 2, config.size / 2]
    });
}

// Create popup content
function createPopupContent(facility) {
    // ensure likes are shown (defaults handled elsewhere)
    const likes = typeof facility.likes === 'number' ? facility.likes : 0;
    const likedClass = facility.liked ? 'liked' : '';

    return `
        <div class="facility-popup">
            <div class="facility-info">
                <h3 class="facility-title">${facility.name}</h3>
                <div class="facility-meta">
                    <span class="facility-type-badge type-${facility.type.toLowerCase().replace(/\s+/g, '-')}">${facility.type}</span>
                    ${facility.rating ? `<div class="facility-rating"><span class="stars">${('★'.repeat(Math.floor(facility.rating)) + '☆'.repeat(5 - Math.floor(facility.rating)))}</span><span class="rating-count">${facility.rating}/5</span></div>` : ''}
                </div>

                <div class="facility-details">
                    <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${facility.district}</span></div>
                    <div class="detail-row"><i class="fas fa-phone"></i><span>${facility.contact}</span></div>
                    ${facility.openingHours ? `<div class="detail-row"><i class="fas fa-clock"></i><span>${facility.openingHours}</span></div>` : ''}
                </div>

                <div class="facility-actions">
                    <button onclick="getDirections(${facility.id})" class="facility-action-btn"><i class="fas fa-directions"></i> Directions</button>
                    <button onclick="showFacilityDetails(${facility.id})" class="facility-action-btn secondary"><i class="fas fa-info-circle"></i> More Info</button>
                </div>

                <div class="facility-like-row">
                    <button class="like-btn ${likedClass}" onclick="toggleLike(${facility.id}, event)">
                        <i class="fas fa-heart"></i>
                    </button>
                    <span class="like-count" id="like-count-${facility.id}">${likes}</span>
                </div>
            </div>
        </div>
    `;
}

// Initialize images and likes for facilities at runtime
function initFacilityImagesAndLikes() {
    // load persisted like counts and user liked state
    let likeCounts = {};
    let userLikes = {};
    try {
        likeCounts = JSON.parse(localStorage.getItem('facility_like_counts') || '{}');
        userLikes = JSON.parse(localStorage.getItem('facility_user_likes') || '{}');
    } catch (e) {
        console.warn('Could not parse likes from localStorage', e);
    }

    facilitiesData.forEach(f => {
        // ensure likes numeric
        f.likes = typeof likeCounts[f.id] === 'number' ? likeCounts[f.id] : (typeof f.likes === 'number' ? f.likes : 0);
        f.liked = !!userLikes[f.id];
    });
}

// Toggle like for a facility (increments/decrements and persists per-user state)
function toggleLike(facilityId, event) {
    // prevent map click/close
    if (event) event.stopPropagation();

    const facility = facilitiesData.find(f => f.id === facilityId);
    if (!facility) return;

    facility.liked = !facility.liked;
    facility.likes = facility.likes || 0;
    facility.likes = facility.liked ? facility.likes + 1 : Math.max(0, facility.likes - 1);

    // persist
    const likeCounts = JSON.parse(localStorage.getItem('facility_like_counts') || '{}');
    const userLikes = JSON.parse(localStorage.getItem('facility_user_likes') || '{}');
    likeCounts[facilityId] = facility.likes;
    userLikes[facilityId] = !!facility.liked;
    localStorage.setItem('facility_like_counts', JSON.stringify(likeCounts));
    localStorage.setItem('facility_user_likes', JSON.stringify(userLikes));

    // update visible count in popup if present
    const countEl = document.getElementById(`like-count-${facilityId}`);
    if (countEl) countEl.textContent = facility.likes;

    // update button visual state
    // the button will be re-rendered when popup reopens, but update current DOM
    const popup = document.querySelector('.leaflet-popup-content');
    if (popup) {
        const btn = popup.querySelector(`.like-btn`);
        if (btn) {
            if (facility.liked) btn.classList.add('liked'); else btn.classList.remove('liked');
        }
    }
}

// Load facilities and add markers
function loadFacilities() {
    console.log('Starting loadFacilities...');
    
    // Always clear existing markers when reloading
    if (markerClusterGroup) {
        console.log('Clearing existing markers');
        markerClusterGroup.clearLayers();
    }
    markers = [];
    
    // Ensure facilitiesData exists and is not empty
    if (!facilitiesData || !Array.isArray(facilitiesData)) {
        console.error('No facilities data available');
        return;
    }

    console.log(`Loading ${facilitiesData.length} facilities`);
    
    facilitiesData.forEach((facility, index) => {
        if (!facility.coordinates || !Array.isArray(facility.coordinates) || facility.coordinates.length !== 2) {
            console.warn(`Invalid coordinates for facility: ${facility.name}`);
            return;
        }
        
        console.log(`Creating marker for facility ${index + 1}: ${facility.name}`);

        try {
            const marker = L.marker(facility.coordinates, {
                icon: createMarkerIcon(facility.type),
                title: facility.name
            });
            
            // Bind popup and refresh content on open so likes/images stay up-to-date
            marker.bindPopup(createPopupContent(facility));
            marker.on('popupopen', function() {
                marker.setPopupContent(createPopupContent(facility));
            });
            marker.facilityData = facility;
            
            markerClusterGroup.addLayer(marker);
            markers.push(marker);
            
            console.log(`Successfully added marker for: ${facility.name}`);
        } catch (error) {
            console.error(`Error creating marker for facility ${facility.name}:`, error);
        }
    });

    // Update visible count
    const visibleEl = document.getElementById('visibleCount');
    if (visibleEl) {
        visibleEl.textContent = markers.length;
        console.log(`Updated visible count to: ${markers.length}`);
    }

    // Fit map to show all facilities
    if (markers.length > 0) {
        console.log(`Fitting map to ${markers.length} markers`);
        const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
        if (bounds.isValid()) {
            console.log('Bounds are valid, fitting map');
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 12  // Decreased max zoom for better overview
            });
            console.log('Map fitted to bounds');
        }
    }
    
    // Ensure marker cluster group is added to map
    if (!map.hasLayer(markerClusterGroup)) {
        console.log('Adding marker cluster group to map');
        map.addLayer(markerClusterGroup);
    }
    
    console.log('loadFacilities completed successfully');
}

// Filter facilities by district
function filterFacilitiesByDistrict(districtName) {
    if (!markerClusterGroup) {
        console.error('Marker cluster group not initialized');
        return;
    }
    
    console.log('Filtering by district:', districtName);
    
    // Always clear existing markers when filtering
    markerClusterGroup.clearLayers();
    markers = [];

    const name = (districtName || '').toString().trim();
    const facilities = (!name || name.toLowerCase().trim() === 'all') 
        ? facilitiesData 
        : facilitiesData.filter(f => {
            const facilityDistrict = (f.district || '').toString().trim().toLowerCase();
            const searchDistrict = name.toLowerCase().trim();
            return facilityDistrict === searchDistrict;
          });
    
    console.log(`Found ${facilities.length} facilities for district ${name}`);

    facilities.forEach(facility => {
        const marker = L.marker(facility.coordinates, {
            icon: createMarkerIcon(facility.type),
            title: facility.name
        });
        marker.bindPopup(createPopupContent(facility));
        marker.on('popupopen', function() {
            marker.setPopupContent(createPopupContent(facility));
        });
        marker.facilityData = facility;
        markerClusterGroup.addLayer(marker);
        markers.push(marker);
    });

    // Update visible count
    const visibleEl = document.getElementById('visibleCount');
    if (visibleEl) visibleEl.textContent = markers.length;

    // Fit bounds to visible facilities if any, with closer zoom
    if (markers.length) {
        try {
            const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
            if (bounds && bounds.isValid()) {
                // Tighter padding and higher zoom for better facility visibility
                map.fitBounds(bounds, { 
                    padding: [30, 30],
                    maxZoom: 15  // Increased for closer facility view
                });
            }
        } catch (e) {
            console.warn('Could not fit bounds to facilities:', e);
        }
    }

    // Ensure district boundary stays highlighted if one is selected
    if (window.selectedDistrict && window.districtFeatures) {
        const selectedLayer = window.districtFeatures[window.selectedDistrict.toLowerCase()];
        if (selectedLayer) {
            selectedLayer.setStyle({
                ...CONFIG.districtStyle.selected,
                opacity: 1,
                fillOpacity: 0.3
            });
            selectedLayer.bringToFront();
        }
    }
}

// Show facility details in right panel
function showFacilityDetails(facilityOrId) {
    let facility = null;
    if (!facilityOrId) return;
    if (typeof facilityOrId === 'object') facility = facilityOrId;
    else facility = facilitiesData.find(f => f.id === facilityOrId);
    if (!facility) return;

    const panel = document.getElementById('detailsPanel');
    const content = document.getElementById('panelContent');

    // Generate stars for rating
    const stars = facility.rating ? 
        '★'.repeat(Math.floor(facility.rating)) + '☆'.repeat(5 - Math.floor(facility.rating)) : '';

    content.innerHTML = `
        <div class="facility-detail">
            <div class="facility-header">
                <h2 class="facility-name">${facility.name}</h2>
                <span class="facility-type-badge type-${facility.type.toLowerCase().replace(' ', '-')}">
                    ${facility.type}
                </span>
                ${facility.rating ? `
                    <div class="facility-rating">
                        <span class="stars">${stars}</span>
                        <strong>${facility.rating}/5.0</strong>
                    </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Address</div>
                        <div class="detail-item-value">${facility.address}</div>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-signs"></i>
                    <div class="detail-item-content">
                        <div class="detail-item-label">District</div>
                        <div class="detail-item-value">${facility.district}</div>
                    </div>
                </div>
                ${facility.established ? `
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Established</div>
                            <div class="detail-item-value">${facility.established}</div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-phone"></i> Contact Information</h3>
                <div class="detail-item">
                    <i class="fas fa-phone-alt"></i>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Phone</div>
                        <div class="detail-item-value">${facility.contact}</div>
                    </div>
                </div>
                ${facility.email ? `
                    <div class="detail-item">
                        <i class="fas fa-envelope"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Email</div>
                            <div class="detail-item-value">${facility.email}</div>
                        </div>
                    </div>
                ` : ''}
                ${facility.website ? `
                    <div class="detail-item">
                        <i class="fas fa-globe"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-label">Website</div>
                            <div class="detail-item-value">
                                <a href="http://${facility.website}" target="_blank">${facility.website}</a>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>

            ${facility.services ? `
                <div class="detail-section">
                    <h3><i class="fas fa-stethoscope"></i> Services Offered</h3>
                    <div class="services-list">
                        ${facility.services.map(service => 
                            `<span class="service-tag">${service}</span>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}

            ${facility.openingHours ? `
                <div class="detail-section">
                    <h3><i class="fas fa-clock"></i> Opening Hours</h3>
                    <div class="detail-item">
                        <i class="fas fa-business-time"></i>
                        <div class="detail-item-content">
                            <div class="detail-item-value">${facility.openingHours}</div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="detail-section">
                <h3><i class="fas fa-location-arrow"></i> Location</h3>
                <div class="detail-item">
                    <i class="fas fa-compass"></i>
                    <div class="detail-item-content">
                        <div class="detail-item-label">Coordinates</div>
                        <div class="detail-item-value">
                            ${facility.coordinates[0].toFixed(4)}, ${facility.coordinates[1].toFixed(4)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="action-btn action-btn-primary" onclick="getDirections(${typeof facility.id === 'number' ? facility.id : '\'current\''})">
                    <i class="fas fa-directions"></i> Get Directions
                </button>
                <button class="action-btn action-btn-secondary" onclick="shareLocation(${typeof facility.id === 'number' ? facility.id : '\'current\''})">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        </div>
    `;

    panel.classList.add('active');
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu toggle
    document.querySelector('.hamburger').addEventListener('click', function() {
        this.classList.toggle('active');
        document.querySelector('.nav-menu').classList.toggle('active');
    });

    // District selection event listener
    document.getElementById('districtFilter')?.addEventListener('change', function(e) {
        const districtName = e.target.value;
        showDistrictBoundary(districtName);
        filterFacilitiesByDistrict(districtName);
    });

    // Close panel button
    const closePanel = document.getElementById('closePanel');
    if (closePanel) {
        closePanel.addEventListener('click', function() {
            const panel = document.getElementById('detailsPanel');
            if (panel) {
                panel.classList.remove('active');
            }
            
            // Hide the details panel and expand map area
            const layout = document.querySelector('.map-layout');
            if (layout) {
                layout.classList.add('details-closed');
            }

            // Create reopen button if it doesn't exist
            if (!document.getElementById('reopenDetailsBtn')) {
                const openBtn = document.createElement('button');
                openBtn.id = 'reopenDetailsBtn';
                openBtn.className = 'control-btn';
                openBtn.style.position = 'absolute';
                openBtn.style.top = '20px';
                openBtn.style.right = '80px';
                openBtn.style.zIndex = 1200;
                openBtn.title = 'Reopen details panel';
                openBtn.innerHTML = '<i class="fas fa-angle-left"></i>';
                openBtn.addEventListener('click', function() {
                    const layout = document.querySelector('.map-layout');
                    const panel = document.getElementById('detailsPanel');
                    if (layout) layout.classList.remove('details-closed');
                    if (panel) panel.classList.add('active');
                    openBtn.remove();
                });
                // attach to map container
                const mapMain = document.querySelector('.map-main');
                if (mapMain) mapMain.appendChild(openBtn);
            }
        });
    }

        // Map controls with improved error handling and visual feedback
    const mapControls = {
        'myLocation': { handler: getCurrentLocation, icon: 'fa-location-arrow' },
        'zoomIn': { handler: () => map.zoomIn(), icon: 'fa-plus' },
        'zoomOut': { handler: () => map.zoomOut(), icon: 'fa-minus' },
        'resetView': { handler: resetMapView, icon: 'fa-home' },
        'fullscreen': { handler: toggleFullscreen, icon: 'fa-expand' },
        'routingToggleBtn': { handler: toggleRoutingWidget, icon: 'fa-route' }
    };

    Object.entries(mapControls).forEach(([id, control]) => {
        const button = document.getElementById(id);
        if (button) {
            // Add visual feedback class
            button.classList.add('map-control-btn');
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Add click feedback
                button.classList.add('clicked');
                setTimeout(() => button.classList.remove('clicked'), 200);
                
                try {
                    control.handler();
                } catch (error) {
                    console.error(`Error in ${id} control:`, error);
                    showNotification(`Could not complete the ${id} action`, 'error');
                }
            });

            // Add hover tooltip if not present
            if (!button.title) {
                button.title = id.replace(/([A-Z])/g, ' $1')
                    .replace('btn', '')
                    .toLowerCase()
                    .replace(/^\w/, c => c.toUpperCase());
            }
        }
    });

    // Layer buttons
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchMapLayer(this.dataset.layer);
            document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Tool buttons
    document.getElementById('clusterToggle')?.addEventListener('click', toggleClustering);
    document.getElementById('heatmapToggle')?.addEventListener('click', toggleHeatmap);
    document.getElementById('printMap')?.addEventListener('click', printMap);
    document.getElementById('measureToggle')?.addEventListener('click', toggleMeasurement);
}

// Switch map layer
function switchMapLayer(layerType) {
    map.removeLayer(currentLayer);
    currentLayer = L.tileLayer(CONFIG.tileLayers[layerType].url, {
        attribution: CONFIG.tileLayers[layerType].attribution,
        maxZoom: CONFIG.map.maxZoom
    }).addTo(map);
}

// Toggle clustering
function toggleClustering() {
    const btn = document.getElementById('clusterToggle');
    if (!btn) return;

    try {
        if (map.hasLayer(markerClusterGroup)) {
            map.removeLayer(markerClusterGroup);
            markers.forEach(marker => map.addLayer(marker));
            btn.classList.remove('active');
            btn.title = 'Enable clustering';
            showNotification('Clustering disabled', 'info');
        } else {
            markers.forEach(marker => map.removeLayer(marker));
            map.addLayer(markerClusterGroup);
            btn.classList.add('active');
            btn.title = 'Disable clustering';
            showNotification('Clustering enabled', 'success');
        }
    } catch (error) {
        console.error('Error toggling clustering:', error);
        showNotification('Could not toggle clustering', 'error');
    }
}

// Toggle heatmap
function toggleHeatmap() {
    const btn = document.getElementById('heatmapToggle');
    if (!btn) return;

    try {
        if (!window.L.heatLayer) {
            // Initialize heatmap if not already done
            if (typeof window.L.heatLayer === 'undefined') {
                showNotification('Initializing heatmap...', 'info');
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet.heat';
                script.onload = () => initializeHeatmap();
                document.head.appendChild(script);
                return;
            }
        }

        if (heatmapLayer && map.hasLayer(heatmapLayer)) {
            map.removeLayer(heatmapLayer);
            btn.classList.remove('active');
            btn.title = 'Enable heatmap';
            showNotification('Heatmap disabled', 'info');
        } else {
            if (!heatmapLayer) {
                initializeHeatmap();
            } else {
                map.addLayer(heatmapLayer);
            }
            btn.classList.add('active');
            btn.title = 'Disable heatmap';
            showNotification('Heatmap enabled', 'success');
        }
    } catch (error) {
        console.error('Error toggling heatmap:', error);
        showNotification('Could not toggle heatmap', 'error');
    }
}

// Initialize heatmap
function initializeHeatmap() {
    try {
        // Convert markers to heatmap points with intensity based on facility type
        const points = markers.map(marker => {
            const intensity = getHeatmapIntensity(marker.facilityData.type);
            return [
                marker.getLatLng().lat,
                marker.getLatLng().lng,
                intensity
            ];
        });

        heatmapLayer = L.heatLayer(points, {
            radius: 25,
            blur: 15,
            maxZoom: 16,
            gradient: {
                0.4: '#ffffb2',
                0.6: '#fd8d3c',
                0.8: '#f03b20',
                1.0: '#bd0026'
            }
        });

        map.addLayer(heatmapLayer);
        const btn = document.getElementById('heatmapToggle');
        if (btn) {
            btn.classList.add('active');
            btn.title = 'Disable heatmap';
        }
    } catch (error) {
        console.error('Error initializing heatmap:', error);
        showNotification('Could not initialize heatmap', 'error');
    }
}

// Get heatmap intensity based on facility type
function getHeatmapIntensity(type) {
    const intensities = {
        'Hospital': 1.0,
        'Health Center': 0.8,
        'Clinic': 0.6,
        'Police Station': 0.7,
        'School': 0.5
    };
    return intensities[type] || 0.5;
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'location-loading';
        loadingDiv.innerHTML = 'Getting your precise location...';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            z-index: 1000;
        `;
        document.body.appendChild(loadingDiv);

        // Try to get position with maximum accuracy
        const watchId = navigator.geolocation.watchPosition(
            position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Remove loading indicator
                document.getElementById('location-loading')?.remove();
                
                // Fly to location with animation
                map.flyTo([lat, lng], 17, { // Increased zoom level
                    duration: 1.5
                });

                // First show a loading state
                const loadingFacility = {
                    id: 'current',
                    name: 'Getting location name...',
                    type: 'Current Location',
                    category: 'User',
                    contact: '',
                    coordinates: [lat, lng],
                    address: 'Fetching address...',
                    district: '',
                    rating: null
                };

                const curMarker = L.marker([lat, lng], {
                    title: 'Your Location',
                    icon: L.divIcon({
                        html: `<div style="
                            background: #4CAF50;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 14px;
                        ">📍</div>`,
                        className: '',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                }).addTo(map);

                curMarker.bindPopup(createPopupContent(loadingFacility));
                curMarker.openPopup();

                // Use Nominatim for reverse geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
                    .then(response => response.json())
                    .then(data => {
                        const address = data.display_name;
                        const parts = address.split(', ');
                        const locality = parts[0] || 'Unknown Location';
                        const district = parts.find(p => p.toLowerCase().includes('district')) || '';
                        
                        const currentFacility = {
                            id: 'current',
                            name: locality,
                            type: 'Current Location',
                            category: 'User',
                            contact: '',
                            coordinates: [lat, lng],
                            address: address,
                            district: district,
                            rating: null
                        };

                        curMarker.setPopupContent(createPopupContent(currentFacility));
                        curMarker.openPopup();
                        
                        // Show in details panel
                        showFacilityDetails(currentFacility);
                    })
                    .catch(() => {
                        // Fallback if geocoding fails
                        const fallbackFacility = {
                            id: 'current',
                            name: 'Your Location',
                            type: 'Current Location',
                            category: 'User',
                            contact: '',
                            coordinates: [lat, lng],
                            address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                            district: '',
                            rating: null
                        };
                        curMarker.setPopupContent(createPopupContent(fallbackFacility));
                    });

                curMarker.on('click', function() {
                    showFacilityDetails(curMarker.facilityData || loadingFacility);
                });
            },
            error => {
                // Remove loading indicator
                document.getElementById('location-loading')?.remove();

                let errorMessage = 'Unable to get your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Please allow location access to use this feature';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable. Please try again';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out. Please try again';
                        break;
                }
                alert(errorMessage);
            },
            // Maximum accuracy settings
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
        
        // Stop watching after 15 seconds or if accuracy is good enough
        setTimeout(() => {
            navigator.geolocation.clearWatch(watchId);
            document.getElementById('location-loading')?.remove();
        }, 15000);
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

// Reset map view
function resetMapView() {
    if (!map) {
        showNotification('Map not initialized', 'error');
        return;
    }

    try {
        // First reset any active features
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }

        // Reset to initial view with animation
        map.flyTo(CONFIG.map.center, CONFIG.map.zoom, {
            duration: 1,
            easeLinearity: 0.5
        });

        // Reset district selection if any
        if (window.selectedDistrict) {
            showDistrictBoundary('all');
            const districtFilter = document.getElementById('districtFilter');
            if (districtFilter) {
                districtFilter.value = 'all';
            }
        }

        showNotification('Map view reset', 'success');
    } catch (error) {
        console.error('Error resetting map view:', error);
        showNotification('Could not reset map view', 'error');
    }
}

// Toggle fullscreen
function toggleFullscreen() {
    const mapElement = document.querySelector('.map-main');
    const fullscreenBtn = document.getElementById('fullscreen');

    if (!mapElement) {
        showNotification('Map element not found', 'error');
        return;
    }

    try {
        if (!document.fullscreenElement) {
            mapElement.requestFullscreen().then(() => {
                if (fullscreenBtn) {
                    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    fullscreenBtn.title = 'Exit fullscreen';
                }
                // Ensure map fills the fullscreen space
                mapElement.style.height = '100vh';
                map.invalidateSize();
            }).catch(err => {
                showNotification('Could not enter fullscreen mode', 'error');
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                if (fullscreenBtn) {
                    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    fullscreenBtn.title = 'Enter fullscreen';
                }
                // Reset map height
                mapElement.style.height = '';
                map.invalidateSize();
            });
        }
    } catch (error) {
        showNotification('Fullscreen not supported in your browser', 'error');
        console.error('Fullscreen error:', error);
    }
}

// Toggle measurement tool
function toggleMeasurement() {
    const btn = document.getElementById('measureToggle');
    if (!btn) return;

    try {
        if (!measureControl) {
            // Initialize measurement control if not exists
            measureControl = new L.Control.Measure({
                primaryLengthUnit: 'kilometers',
                secondaryLengthUnit: 'meters',
                primaryAreaUnit: 'sqkilometers',
                secondaryAreaUnit: 'hectares',
                activeColor: '#3388ff',
                completedColor: '#33cc33'
            });
            measureControl.addTo(map);
            btn.classList.add('active');
            btn.title = 'Disable measurement';
            showNotification('Click on the map to start measuring', 'info');
        } else {
            map.removeControl(measureControl);
            measureControl = null;
            btn.classList.remove('active');
            btn.title = 'Enable measurement';
            showNotification('Measurement tool disabled', 'info');
        }
    } catch (error) {
        console.error('Error toggling measurement:', error);
        showNotification('Could not toggle measurement tool', 'error');
    }
}

// Print map
function printMap() {
    const btn = document.getElementById('printMap');
    if (!btn) return;

    try {
        // Get current view state
        const selectedDistrict = window.selectedDistrict;
        const currentBounds = map.getBounds();
        
        // Create print container
        const printContent = document.createElement('div');
        printContent.className = 'print-content';
        
        // Add map title
        const title = selectedDistrict && selectedDistrict !== 'all' 
            ? `${selectedDistrict} District Facilities Map`
            : 'Central Uganda Facilities Map';
            
        // Get facility counts
        const visibleFacilities = markers.filter(m => currentBounds.contains(m.getLatLng()));
        const facilityCounts = visibleFacilities.reduce((acc, m) => {
            acc[m.facilityData.type] = (acc[m.facilityData.type] || 0) + 1;
            return acc;
        }, {});

        // Create print HTML with specific print styles
        printContent.innerHTML = `
            <style>
                @media print {
                    body * { visibility: hidden; }
                    .print-content, .print-content * { visibility: visible !important; }
                    .print-content { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        height: 100%;
                        background: white;
                    }
                    .map-print-container { 
                        height: 650px !important;
                        width: 100% !important;
                        margin: 15px 0;
                        border: 1px solid #ccc;
                        page-break-inside: avoid;
                        background: white !important;
                    }
                    .leaflet-tile {
                        visibility: visible !important;
                        image-rendering: high-quality !important;
                        image-rendering: -webkit-optimize-contrast;
                    }
                    .leaflet-control-container { display: none !important; }
                    .print-header { text-align: center; margin-bottom: 20px; }
                    .print-footer { margin-top: 20px; font-size: 0.9em; text-align: center; }
                    .facility-counts { 
                        margin: 15px 0;
                        page-break-inside: avoid;
                    }
                    .facility-counts ul {
                        columns: 2;
                        -webkit-columns: 2;
                        -moz-columns: 2;
                        list-style-type: none;
                        padding: 0;
                    }
                    .facility-counts li {
                        margin: 5px 0;
                        break-inside: avoid;
                    }
                    .timestamp { font-size: 0.8em; color: #666; }
                    .legend {
                        margin: 10px 0;
                        padding: 10px;
                        background: #f8f9fa;
                        border-radius: 4px;
                        page-break-inside: avoid;
                    }
                    .legend-item {
                        display: inline-block;
                        margin-right: 15px;
                    }
                }
            </style>
            <div class="print-header">
                <h2>${title}</h2>
                <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
            </div>
            <div class="facility-counts">
                <h3>Facility Summary</h3>
                <ul>
                    ${Object.entries(facilityCounts)
                        .map(([type, count]) => `
                            <li>
                                <strong>${type}:</strong> ${count}
                            </li>`)
                        .join('')}
                    <li><strong>Total Facilities:</strong> ${visibleFacilities.length}</li>
                </ul>
            </div>
            <div id="map-print-container" class="map-print-container"></div>
            <div class="legend">
                <h4>Map Legend</h4>
                ${Object.entries(CONFIG.markerIcons).map(([type, config]) => `
                    <div class="legend-item">
                        <span style="color: ${config.color}">${config.emoji}</span>
                        ${type}
                    </div>
                `).join('')}
            </div>
            <div class="print-footer">
                <p>Map data © OpenStreetMap contributors</p>
                <p>Printed from Uganda Health Facilities Map</p>
            </div>
        `;

        // Add print content to body
        document.body.appendChild(printContent);

        // Create a new map for printing with higher quality settings
        const printMap = L.map(printContent.querySelector('#map-print-container'), {
            center: map.getCenter(),
            zoom: map.getZoom(),
            zoomControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            fadeAnimation: false,
            zoomAnimation: false,
            markerZoomAnimation: false,
            preferCanvas: true,
            worldCopyJump: false
        });

        // Add the same tile layer as the main map (keep reference so we can track loading)
        // Use noWrap to avoid world-wrapping tiles appearing in print
        const printTileLayer = L.tileLayer(CONFIG.tileLayers.street.url, {
            attribution: CONFIG.tileLayers.street.attribution,
            maxZoom: CONFIG.map.maxZoom,
            noWrap: true,
            detectRetina: false
        });
        printTileLayer.addTo(printMap);

        // If district is selected, show its boundary and add it first
        if (selectedDistrict && selectedDistrict !== 'all' && window.districtFeatures) {
            const districtLayer = window.districtFeatures[selectedDistrict.toLowerCase()];
            if (districtLayer) {
                // Add district boundary first so it's below markers
                L.geoJSON(districtLayer.toGeoJSON(), {
                    style: {
                        ...CONFIG.districtStyle.selected,
                        opacity: 1,
                        fillOpacity: 0.2,
                        weight: 3
                    }
                }).addTo(printMap);
                
                // Set immediate bounds to district
                try {
                    const bounds = districtLayer.getBounds();
                    if (bounds && bounds.isValid()) {
                        printMap.fitBounds(bounds.pad(0.1));
                        console.log('Set print map bounds to district:', selectedDistrict);
                    }
                } catch (e) {
                    console.warn('Could not fit to district bounds:', e);
                }
            }
        }

        // Add markers to print map, filtered to selected district if applicable
        const printMarkers = selectedDistrict && selectedDistrict !== 'all' 
            ? visibleFacilities.filter(m => m.facilityData.district.toLowerCase() === selectedDistrict.toLowerCase())
            : visibleFacilities;
            
        printMarkers.forEach(marker => {
            L.marker(marker.getLatLng(), {
                icon: createMarkerIcon(marker.facilityData.type)
            }).addTo(printMap);
        });

        // Determine print bounds
        let printBounds = null;

        if (!printBounds && currentBounds && currentBounds.isValid()) {
            printBounds = currentBounds;
            console.log('Using current map bounds for print');
        }

        if (printBounds) {
            // Use a small padding for print and fit
            printMap.fitBounds(printBounds.pad(0.05));
        } else {
            printMap.setView(map.getCenter(), map.getZoom());
        }

        // Force redraw and request tiles for the new view
        printMap.invalidateSize();
        try { printTileLayer.redraw(); } catch (e) { console.warn('Could not redraw print tile layer:', e); }

        // Show loading indicator
        // Create loading indicator with progress
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        `;
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Preparing map for print...';
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            overflow: hidden;
        `;
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: white;
            transition: width 0.3s ease;
        `;
        progressBar.appendChild(progressFill);
        loadingDiv.appendChild(loadingText);
        loadingDiv.appendChild(progressBar);
        document.body.appendChild(loadingDiv);

        // Robust tile-load handling: attach directly to the tile layer and use a fallback timeout
        let printed = false;
        const cleanupAndPrint = () => {
            if (printed) return;
            printed = true;
            try {
                if (loadingDiv && loadingDiv.parentNode) document.body.removeChild(loadingDiv);
            } catch (e) {}
            // Force a redraw of the map
            printMap.invalidateSize();
            // Short delay to ensure rendering completes
            setTimeout(() => {
                try {
                    window.print();
                } catch (e) {
                    console.error('Print failed:', e);
                }
                // Cleanup after print
                try { if (printContent.parentNode) printContent.parentNode.removeChild(printContent); } catch(e){}
                try { printMap.remove(); } catch(e){}
                showNotification('Map printed successfully', 'success');
            }, 600);
        };

        // If tile layer finishes loading, proceed
        printTileLayer.on('load', function() {
            console.log('Print tile layer load event');
            // Wait for any pending move/zoom transitions to finish
            printMap.once('moveend zoomend', () => cleanupAndPrint());
        });

        // Track tile loading progress
        let totalTiles = 0;
        let loadedTiles = 0;
        
        printTileLayer.on('loading', function(e) {
            totalTiles = 0;
            loadedTiles = 0;
            progressFill.style.width = '0%';
        });
        
        printTileLayer.on('tileload', function() {
            loadedTiles++;
            if (totalTiles === 0) {
                // Estimate total tiles based on viewport
                const bounds = printMap.getPixelBounds();
                const tileSize = 256;
                totalTiles = Math.ceil(bounds.getSize().x / tileSize) * Math.ceil(bounds.getSize().y / tileSize);
            }
            const progress = Math.min((loadedTiles / Math.max(totalTiles, 1)) * 100, 100);
            progressFill.style.width = progress + '%';
            loadingText.textContent = `Preparing map for print... ${Math.round(progress)}%`;
        });
        
        printTileLayer.on('tileerror', function(e) {
            console.warn('Tile error on print map', e);
            loadedTiles++;
            const progress = Math.min((loadedTiles / Math.max(totalTiles, 1)) * 100, 100);
            progressFill.style.width = progress + '%';
        });

        // Fallback: ensure print proceeds even if events don't fire (e.g., cached tiles)
        let fallbackTimer = null;
        fallbackTimer = setTimeout(() => {
            console.warn('Print fallback timer triggered');
            cleanupAndPrint();
        }, 7000);

        // Ensure cleanup clears fallback timer when printing proceeds
        const originalCleanup = cleanupAndPrint;
        cleanupAndPrint = function() {
            try { if (fallbackTimer) clearTimeout(fallbackTimer); } catch(e){}
            originalCleanup();
        };

        // Also listen for pagehide/visibility change to cleanup if user cancels
        const onVisibility = () => {
            if (!document.hidden && !printed) return;
            if (fallbackTimer) clearTimeout(fallbackTimer);
            cleanupAndPrint();
            document.removeEventListener('visibilitychange', onVisibility);
        };
        document.addEventListener('visibilitychange', onVisibility);

    } catch (error) {
        console.error('Error printing map:', error);
        showNotification('Could not print map', 'error');
    }
}

// Get directions (placeholder)
function getDirections(facilityOrId) {
    let facility = null;
    if (!facilityOrId) return;
    if (typeof facilityOrId === 'object') facility = facilityOrId;
    else facility = facilitiesData.find(f => f.id === facilityOrId);
    if (!facility) {
        // if facilityOrId is 'current' or undefined, no target
        showNotification('Destination not found', 'error');
        return;
    }

    // Use user's current position if available, else use map center
    function startRouting(startLatLng) {
        // Clear existing route
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }

        routingControl = L.Routing.control({
            waypoints: [
                    L.latLng(startLatLng.lat, startLatLng.lng),
                    L.latLng(facility.coordinates[0], facility.coordinates[1])
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            fitSelectedRoute: true,
            lineOptions: { styles: [{ color: '#667eea', weight: 6 }] },
            createMarker: function(i, wp, nWps) {
                // Use existing marker icon for destination
                if (i === nWps - 1) {
                    return L.marker(wp.latLng, { icon: createMarkerIcon(facility.type) });
                }
                return L.marker(wp.latLng);
            }
        }).addTo(map);

        // Make the routing container draggable
        const container = routingControl.getContainer();
        enableDragging(container);

        routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            if (routes && routes.length) {
                const summary = routes[0].summary;
                showNotification(`Route found — distance: ${(
                    summary.totalDistance / 1000
                ).toFixed(2)} km, time: ${Math.round(summary.totalTime / 60)} min`, 'success');
            }
        }).addTo(map);
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => {
                startRouting({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => {
                // fallback to map center
                startRouting({ lat: map.getCenter().lat, lng: map.getCenter().lng });
            }
        );
    } else {
        startRouting({ lat: map.getCenter().lat, lng: map.getCenter().lng });
    }
}

// Share location (placeholder)
function shareLocation(facilityOrId) {
    let facility = null;
    if (!facilityOrId) return;
    if (typeof facilityOrId === 'object') facility = facilityOrId;
    else facility = facilitiesData.find(f => f.id === facilityOrId);
    if (!facility) return;

    const shareData = {
        title: facility.name,
        text: `Check out ${facility.name} - ${facility.type}`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData);
    } else {
        // Fallback - copy to clipboard
        const url = `${window.location.origin}${window.location.pathname}?facility=${facility.id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Show district boundary on map
function showDistrictBoundary(districtName) {
    if (!window.districtLayers || !window.districtFeatures) return;

    // Store the selected district name globally
    window.selectedDistrict = districtName;

    // Reset all district layers to default style
    Object.values(window.districtFeatures).forEach(layer => {
        layer.setStyle(CONFIG.districtStyle.default);
        layer.bringToBack();
    });

    // Normalize input
    const raw = (districtName || '').toString().trim();
    const normalizedName = raw.toLowerCase();

    // If no district selected or "All Districts" selected, show all boundaries
    if (!raw || normalizedName === 'all') {
        Object.values(window.districtFeatures).forEach(layer => {
            layer.setStyle({
                ...CONFIG.districtStyle.default,
                opacity: 0.7,
                fillOpacity: 0.1
            });
            enableDistrictInteractivity(layer);
        });
        
        // Fit view to all districts
        const bounds = window.districtLayers.getBounds();
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 11 });
        }

        // Show all facilities
        filterFacilitiesByDistrict('all');
        return;
    }

    // Find the selected district layer
    const selectedLayer = window.districtFeatures[normalizedName];
    if (!selectedLayer) {
        console.warn(`No boundary data found for district: ${districtName}`);
        return;
    }

    // Apply the selected style from config and ensure visibility
    selectedLayer.setStyle({
        ...CONFIG.districtStyle.selected,
        opacity: 1,
        fillOpacity: 0.3  // Increased for better visibility
    });
    selectedLayer.bringToFront();
    enableDistrictInteractivity(selectedLayer);

    // Fit bounds to the selected district with tighter zoom
    const bounds = selectedLayer.getBounds();
    if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 14  // Increased max zoom level
        });
    }

    // Filter facilities to show only those in this district
    filterFacilitiesByDistrict(districtName);

    // Show district info in a popup
    const props = selectedLayer.feature.properties;
    selectedLayer.bindPopup(`
        <div class="district-popup">
            <h3>${props.name} District</h3>
            ${props.population ? `<p>Population: ${props.population.toLocaleString()}</p>` : ''}
            ${props.area ? `<p>Area: ${props.area} km²</p>` : ''}
            ${props.density ? `<p>Population Density: ${props.density}/km²</p>` : ''}
            ${props.description ? `<p>${props.description}</p>` : ''}
            <p class="district-popup-hint">Click to view facilities in this district</p>
        </div>
    `).openPopup();
}

// Make elements draggable
function enableDragging(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // Set initial position
    element.style.position = 'fixed';
    element.style.right = '20px';
    element.style.top = '80px';

    element.addEventListener('mousedown', dragStart);
    element.addEventListener('mouseup', dragEnd);
    element.addEventListener('mousemove', drag);
    element.addEventListener('touchstart', dragStart);
    element.addEventListener('touchend', dragEnd);
    element.addEventListener('touchmove', drag);

    function dragStart(e) {
        if (e.type === 'mousedown') {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
        } else {
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        }

        if (e.target === element || e.target.parentNode === element) {
            isDragging = true;
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();

            if (e.type === 'mousemove') {
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
            } else {
                currentX = e.touches[0].clientX - initialX;
                currentY = e.touches[0].clientY - initialY;
            }

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, element);
        }
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }
}

// Enable interactivity for district layers
function enableDistrictInteractivity(layer) {
    layer.off('mouseover mouseout click').on({
        mouseover: function(e) {
            const layer = e.target;
            if (window.selectedDistrict && 
                layer.feature.properties.name.toLowerCase() === window.selectedDistrict.toLowerCase()) {
                // If this is the selected district, use a highlighted hover style
                layer.setStyle({
                    ...CONFIG.districtStyle.selected,
                    fillOpacity: 0.5  // Increase opacity on hover
                });
            } else {
                layer.setStyle(CONFIG.districtStyle.hover);
            }
            layer.bringToFront();
        },
        mouseout: function(e) {
            const layer = e.target;
            if (window.selectedDistrict && 
                layer.feature.properties.name.toLowerCase() === window.selectedDistrict.toLowerCase()) {
                // Restore selected style
                layer.setStyle({
                    ...CONFIG.districtStyle.selected,
                    opacity: 1,
                    fillOpacity: 0.3
                });
            } else {
                layer.setStyle(CONFIG.districtStyle.default);
            }
        },
        click: function(e) {
            const districtName = e.target.feature.properties.name;
            // Update the district filter dropdown and show boundary + facilities
            const districtFilter = document.getElementById('districtFilter');
            if (districtFilter) {
                districtFilter.value = districtName;
            }
            showDistrictBoundary(districtName);
        }
    });
}

// Handle a user-uploaded GeoJSON: validate, add layer and register in districtFeatures
function handleUploadedGeoJSON(geojson) {
    if (!geojson) return;
    // Determine feature(s) — support FeatureCollection or single Feature / Geometry
    let features = [];
    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        features = geojson.features;
    } else if (geojson.type === 'Feature') {
        features = [geojson];
    } else if (geojson.type === 'GeometryCollection' || geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
        features = [{ type: 'Feature', properties: {}, geometry: geojson }];
    } else {
        alert('Unsupported GeoJSON structure');
        return;
    }

    features.forEach(f => {
        // try to get a name property
        const name = (f.properties && (f.properties.name || f.properties.NAME || f.properties.Name)) || null;
        let key = name ? name.toString().toLowerCase() : null;
        if (!key) {
            key = prompt('Enter a key/name for the uploaded boundary (e.g. Kampala):');
            if (!key) return; // skip
            key = key.toString().toLowerCase();
            f.properties = f.properties || {};
            f.properties.name = key;
        }

        // Remove previous layer for same key if present
        if (window.districtFeatures && window.districtFeatures[key]) {
            try { window.districtLayers.removeLayer(window.districtFeatures[key]); } catch (e) {}
        }

        const layer = L.geoJSON(f, { style: CONFIG.districtStyle.default }).addTo(window.districtLayers);
        // register
        window.districtFeatures = window.districtFeatures || {};
        window.districtFeatures[key] = layer;

        // notify and show
        alert(`Uploaded boundary registered as: ${key}`);
        // set dropdown if present
        const districtFilter = document.getElementById('districtFilter');
        if (districtFilter) {
            // try to add option if not present
            const exists = Array.from(districtFilter.options).some(o => o.value.toString().toLowerCase() === key);
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = f.properties.name || key;
                opt.text = f.properties.name || key;
                districtFilter.appendChild(opt);
            }
            districtFilter.value = f.properties.name || key;
        }

        // show the uploaded boundary
        try { showDistrictBoundary(f.properties.name || key); } catch (e) {}
    });
}
