// Filter management
let activeFilters = {
    categories: new Set(['Hospital', 'Health Center', 'Clinic', 'School', 'Police Station']),
    districts: 'all',
    searchQuery: ''
};

// Initialize filters
document.addEventListener('DOMContentLoaded', function() {
    setupFilterListeners();
    // Set initial state of the filter UI
    document.getElementById('filterAll').checked = true;
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.checked = true;
    });
});

function setupFilterListeners() {
    // Category filters
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.addEventListener('change', handleCategoryFilter);
    });

    // Select all filter
    const filterAll = document.getElementById('filterAll');
    if (filterAll) {
        filterAll.addEventListener('change', handleSelectAll);
    }

    // District filter
    const districtFilter = document.getElementById('districtFilter');
    if (districtFilter) {
        districtFilter.addEventListener('change', handleDistrictFilter);
    }
}

// Handle category filter
function handleCategoryFilter(e) {
    const category = e.target.value;
    if (e.target.checked) {
        activeFilters.categories.add(category);
    } else {
        activeFilters.categories.delete(category);
        document.getElementById('filterAll').checked = false;
    }
    updateFilterStats();
}

// Handle select all
function handleSelectAll(e) {
    const categoryFilters = document.querySelectorAll('.category-filter');
    categoryFilters.forEach(filter => {
        filter.checked = e.target.checked;
        if (e.target.checked) {
            activeFilters.categories.add(filter.value);
        } else {
            activeFilters.categories.delete(filter.value);
        }
    });
    updateFilterStats();
}

// Handle district filter
function handleDistrictFilter(e) {
    const selectedDistrict = e.target.value;
    activeFilters.districts = selectedDistrict;
    
    // Ensure all markers remain visible
    if (markers.length === 0) {
        loadFacilities();
    }
    
    if (selectedDistrict === 'all') {
        // Show all facilities by fitting bounds to all markers
        const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
        map.fitBounds(bounds, {
            padding: [50, 50],
            duration: 1.5
        });
    } else {
        // Filter markers for the selected district (but keep them visible)
        const districtMarkers = markers.filter(m => m.facilityData.district === selectedDistrict);
        if (districtMarkers.length > 0) {
            const bounds = L.latLngBounds(districtMarkers.map(m => m.getLatLng()));
            map.fitBounds(bounds, {
                padding: [50, 50],
                duration: 1.5
            });
        }
    }

    updateFilterStats();
    updateDistrictStats(selectedDistrict);
}

// Apply all active filters
function applyFilters() {
    // Always show all facilities
    let filteredFacilities = facilitiesData;
    
    // Update visible count to show all facilities
    const visibleCountElement = document.getElementById('visibleCount');
    if (visibleCountElement) {
        visibleCountElement.textContent = facilitiesData.length;
    }
    
    // Make sure all markers are visible
    if (markers.length === 0) {
        loadFacilities();
    }
    
    // Keep all markers visible
    if (markerClusterGroup && !map.hasLayer(markerClusterGroup)) {
        map.addLayer(markerClusterGroup);
    }
}

// Update map markers based on filtered data
function updateMapMarkers(filteredFacilities) {
    // Don't update markers - keep all facilities visible
    if (markers.length === 0) {
        // Only create markers if they don't exist
        console.log('Creating initial markers for all facilities');
        facilitiesData.forEach(facility => {
            const marker = L.marker(facility.coordinates, {
                icon: createMarkerIcon(facility.type),
                title: facility.name
            });

            marker.bindPopup(createPopupContent(facility));
            marker.facilityData = facility;
            
            markerClusterGroup.addLayer(marker);
            markers.push(marker);
        });
        
        // Ensure marker cluster is on the map
        if (!map.hasLayer(markerClusterGroup)) {
            map.addLayer(markerClusterGroup);
        }
    }
}

// Update filter statistics
function updateFilterStats() {
    let activeCount = 0;
    
    if (activeFilters.categories.size < 5) {
        activeCount++;
    }
    
    if (activeFilters.districts !== 'all') {
        activeCount++;
    }
    
    if (activeFilters.searchQuery) {
        activeCount++;
    }
    
    document.getElementById('activeFilters').textContent = activeCount;
}

// Update district statistics
function updateDistrictStats(district) {
    if (district === 'all') {
        // Show overall statistics
        document.querySelector('.stats-panel').innerHTML = `
            <h3><i class="fas fa-chart-pie"></i> Statistics</h3>
            <div class="stat-row">
                <span>Visible Facilities:</span>
                <strong id="visibleCount">${facilitiesData.length}</strong>
            </div>
            <div class="stat-row">
                <span>Total Mapped:</span>
                <strong>${facilitiesData.length}</strong>
            </div>
            <div class="stat-row">
                <span>Active Filters:</span>
                <strong id="activeFilters">0</strong>
            </div>
        `;
        return;
    }

    // Filter facilities for selected district
    const districtFacilities = facilitiesData.filter(f => f.district === district);
    
    // Count facilities by type
    const typeCounts = districtFacilities.reduce((acc, f) => {
        acc[f.type] = (acc[f.type] || 0) + 1;
        return acc;
    }, {});

    // Update stats panel with district-specific information
    document.querySelector('.stats-panel').innerHTML = `
        <h3><i class="fas fa-chart-pie"></i> ${district} Statistics</h3>
        <div class="stat-row">
            <span>Total Facilities:</span>
            <strong>${districtFacilities.length}</strong>
        </div>
        ${Object.entries(typeCounts).map(([type, count]) => `
            <div class="stat-row">
                <span>${type}s:</span>
                <strong>${count}</strong>
            </div>
        `).join('')}
        <div class="stat-row">
            <span>Active Filters:</span>
            <strong id="activeFilters">1</strong>
        </div>
    `;
}