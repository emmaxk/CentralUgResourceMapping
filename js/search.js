// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    setupSearchListeners();
});

function setupSearchListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    // Search on button click
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    // Search on Enter key
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // Real-time search suggestions
        searchInput.addEventListener('input', function(e) {
            if (e.target.value.length >= 2) {
                showSearchSuggestions(e.target.value);
            } else {
                clearSearchResults();
            }
        });
    }
}

// Perform search
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    const queryLower = query.toLowerCase();
    
    if (!query) {
        clearSearchResults();
        return;
    }

    // First try to find exact name match
    const exactMatch = facilitiesData.find(f => 
        f.name.toLowerCase() === queryLower
    );

    if (exactMatch) {
        focusOnFacility(exactMatch.id);
        return;
    }

    // Rank and score results - focusing only on facility names and types
    const results = facilitiesData.map(f => {
        let score = 0;
        const name = f.name.toLowerCase();
        const type = f.type.toLowerCase();

        // Exact matches get highest score
        if (name === queryLower) score += 100;
        
        // Starting with search term gets high score
        if (name.startsWith(queryLower)) score += 80;
        if (type.toLowerCase() === queryLower) score += 70;
        
        // Word boundary matches
        if (new RegExp(`\\b${escapeRegExp(queryLower)}\\b`).test(name)) score += 60;
        
        // Partial matches in name
        if (name.includes(queryLower)) score += 40;
        
        // Type matches only if very relevant
        if (type.toLowerCase().startsWith(queryLower)) score += 20;

        // Return facility with its score
        return { facility: f, score };
    })
    .filter(result => result.score > 0)  // Only keep matches
    .sort((a, b) => b.score - a.score)   // Sort by score descending
    .map(result => result.facility);      // Extract just the facilities

    displaySearchResults(results);
}

// Escape special characters in string for regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Show search suggestions
function showSearchSuggestions(query) {
    const queryLower = query.toLowerCase();
    
    // First check for exact matches
    const exactMatches = facilitiesData.filter(f => 
        f.name.toLowerCase() === queryLower ||
        f.type.toLowerCase() === queryLower
    );

    if (exactMatches.length === 1) {
        // If exactly one exact match, focus on it immediately
        focusOnFacility(exactMatches[0].id);
        return;
    }
    
    // Rank and score suggestions
    const suggestions = facilitiesData.map(f => {
        let score = 0;
        const name = f.name.toLowerCase();
        const type = f.type.toLowerCase();
        
        // Exact match at start of name
        if (name.startsWith(queryLower)) score += 100;
        if (type.startsWith(queryLower)) score += 80;
        
        // Word boundary match
        if (new RegExp(`\\b${escapeRegExp(queryLower)}`).test(name)) score += 60;
        if (new RegExp(`\\b${escapeRegExp(queryLower)}`).test(type)) score += 40;
        
        // Contains match
        if (name.includes(queryLower)) score += 20;
        if (type.includes(queryLower)) score += 10;
        
        return { facility: f, score };
    })
    .filter(result => result.score > 0)  // Only keep matches
    .sort((a, b) => b.score - a.score)   // Sort by score descending
    .map(result => result.facility)       // Extract just the facilities
    .slice(0, 5);                        // Take top 5 results

    displaySearchResults(suggestions);
}

// Display search results
function displaySearchResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim().toLowerCase();
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: #7f8c8d;">
                <i class="fas fa-search"></i>
                <p>No facilities found matching "${query}"</p>
                <p style="font-size: 0.9em; margin-top: 5px;">Try searching for the facility name</p>
            </div>
        `;
        return;
    }

    // Take only top 5 most relevant results
    results = results.slice(0, 5);

    resultsContainer.innerHTML = results.map(facility => {
        // Highlight matching text in name
        const highlightedName = highlightMatches(facility.name, query);
        
        return `
            <div class="search-result-item" onclick="focusOnFacility(${facility.id})" style="cursor: pointer; padding: 8px 12px;">
                <div style="font-weight: 600; font-size: 1.1em; margin-bottom: 4px;">
                    ${highlightedName}
                </div>
                <div style="font-size: 0.9em; color: #666;">
                    ${facility.type}
                    <span style="color: #999; margin-left: 5px; font-size: 0.9em;">
                        Click to zoom in
                    </span>
                </div>
            </div>
        `;
    }).join('');
}


// Clear search results
function clearSearchResults() {
    document.getElementById('searchResults').innerHTML = '';
    activeFilters.searchQuery = '';
    applyFilters();
}

// Focus on specific facility
// Helper function to highlight matching text
function highlightMatches(text, query) {
    if (!query) return text;
    const escapedQuery = escapeRegExp(query);
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<span style="background-color: #fff3cd; color: #856404;">$1</span>');
}

function focusOnFacility(facilityId) {
    const facility = facilitiesData.find(f => f.id === facilityId);
    if (!facility) return;

    // Clear any existing search results and close other popups
    document.getElementById('searchResults').innerHTML = '';
    map.closePopup();

    // First zoom out slightly to show context
    map.setView(facility.coordinates, 16, {
        duration: 0.5,
        easeLinearity: 0.5
    });

    // Then zoom in close with animation
    setTimeout(() => {
        map.flyTo(facility.coordinates, 19, {
            duration: 1.5,
            easeLinearity: 0.25
        });

        // Find and highlight marker
        markers.forEach(marker => {
            if (marker.facilityData.id === facilityId) {
                // Enhanced highlight effect
                const icon = marker.getIcon();
                marker.setIcon(L.divIcon({
                    ...icon.options,
                    html: icon.options.html.replace('width:', 'transform: scale(1.4); width:')
                }));
                
                // Ensure marker is perfectly centered
                map.panTo(marker.getLatLng());
                
                // Open popup with delay for smooth animation
                setTimeout(() => {
                    marker.openPopup();
                    // Show facility details panel
                    showFacilityDetails(facilityId);
                }, 1000);
                
                // Pulse animation effect
                const pulseAnimation = () => {
                    marker.setIcon(L.divIcon({
                        ...icon.options,
                        html: icon.options.html.replace('width:', 'transform: scale(1.4); width:')
                    }));
                    setTimeout(() => {
                        marker.setIcon(L.divIcon({
                            ...icon.options,
                            html: icon.options.html.replace('width:', 'transform: scale(1.2); width:')
                        }));
                    }, 200);
                };

                // Pulse three times
                pulseAnimation();
                setTimeout(pulseAnimation, 400);
                setTimeout(pulseAnimation, 800);

                // Reset to normal size after animations
                setTimeout(() => {
                    marker.setIcon(L.divIcon(icon.options));
                }, 2000);
            }
        });
    }, 600);

    // Clear previous search results from UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.blur(); // Remove focus from search input
    }
}




