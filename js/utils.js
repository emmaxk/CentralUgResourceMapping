// Utility functions

// Format date
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(2);
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

// Find nearest facilities
function findNearestFacilities(lat, lon, count = 5) {
    const distances = facilitiesData.map(f => ({
        facility: f,
        distance: calculateDistance(lat, lon, f.coordinates[0], f.coordinates[1])
    }));
    
    return distances
        .sort((a, b) => a.distance - b.distance)
        .slice(0, count);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Generate statistics
function generateStatistics() {
    return {
        total: facilitiesData.length,
        byType: {
            hospitals: facilitiesData.filter(f => f.type === 'Hospital').length,
            healthCenters: facilitiesData.filter(f => f.type === 'Health Center').length,
            clinics: facilitiesData.filter(f => f.type === 'Clinic').length,
            schools: facilitiesData.filter(f => f.type === 'School').length,
            policeStations: facilitiesData.filter(f => f.type === 'Police Station').length
        },
        byDistrict: {
            kampala: facilitiesData.filter(f => f.district === 'Kampala').length,
            wakiso: facilitiesData.filter(f => f.district === 'Wakiso').length
        }
    };
}

// Local storage helpers
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
        return null;
    }
}