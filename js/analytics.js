document.addEventListener('DOMContentLoaded', function() {
    const ALLOWED_TYPES = new Set(['Hospital','Health Center','School','Police Station','University','Clinic']);

    if (typeof facilitiesData === 'undefined' || !Array.isArray(facilitiesData)) {
        console.warn('facilitiesData not found or empty in root js/data.js. Ensure dataset is present.');
        return;
    }

    const filteredData = facilitiesData.filter(f => ALLOWED_TYPES.has(f.type));

    // Update summary cards (filtered)
    document.querySelectorAll('.summary-card').forEach(card => {
        const title = card.querySelector('h3')?.textContent?.toLowerCase() || '';
        const num = card.querySelector('.card-number');
        if (!num) return;
        if (title.includes('total facilities')) num.textContent = filteredData.length.toLocaleString();
        if (title.includes('districts')) num.textContent = new Set(filteredData.map(f => f.district)).size.toLocaleString();
        if (title.includes('categories')) num.textContent = new Set(filteredData.map(f => f.type)).size.toLocaleString();
        if (title.includes('avg. rating')) {
            const ratings = filteredData.map(f => f.rating).filter(r => typeof r === 'number');
            const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length) : 0;
            num.textContent = avg.toFixed(1);
        }
    });

    // Build charts & table from filtered data
    buildTypeChart(filteredData);
    buildDistrictChart(filteredData);
    buildComparisonChart(filteredData);
    populateFacilitiesTable(filteredData);
});

function buildTypeChart(data) {
    const ctx = document.getElementById('typeChart').getContext('2d');
    const order = ['Hospital','Health Center','Clinic','School','Police Station','University'];
    const colors = {
        'Hospital': '#e74c3c',
        'Health Center': '#3498db',
        'Clinic': '#2ecc71',
        'School': '#f39c12',
        'Police Station': '#34495e',
        'University': '#9b59b6'
    };
    const byType = data.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {});
    const labels = order.filter(t => byType[t]);
    const values = labels.map(l => byType[l]);
    new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ label: 'Facilities by Type', data: values, backgroundColor: labels.map(l => colors[l] || '#667eea') }] },
        options: { responsive: true }
    });
}

function buildDistrictChart(data) {
    const ctx = document.getElementById('districtChart').getContext('2d');
    const byDistrict = data.reduce((acc, f) => { acc[f.district] = (acc[f.district] || 0) + 1; return acc; }, {});
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(byDistrict),
            datasets: [{
                label: 'Facilities per District',
                data: Object.values(byDistrict),
                backgroundColor: '#3498db'
            }]
        },
        options: { responsive: true }
    });
}

function buildComparisonChart(data) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    const types = Array.from(new Set(data.map(d => d.type)));
    const districts = Array.from(new Set(data.map(d => d.district)));
    const datasets = types.map((t, idx) => ({
        label: t,
        data: districts.map(d => data.filter(x => x.type === t && x.district === d).length),
        backgroundColor: `hsl(${idx*70 % 360} 70% 50% / 0.7)`
    }));

    new Chart(ctx, {
        type: 'bar',
        data: { labels: districts, datasets },
        options: { responsive: true, interaction: { mode: 'index' }, stacked: false }
    });
}

function populateFacilitiesTable(data) {
    const tbody = document.querySelector('#facilitiesTable tbody');
    tbody.innerHTML = data.map(createTableRow).join('');
}


// Analytics Dashboard JavaScript

// Sample facility data (replace with your actual data from data.js)
const facilities = [
    { name: "Mulago National Referral Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-554-000", rating: 4.5, email: "info@mulago.go.ug", address: "Mulago Hill, Kampala", services: "Emergency, Surgery, Pediatrics, Maternity", beds: 1500 },
    { name: "Mengo Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-277-791", rating: 4.3, email: "info@mengohospital.org", address: "Namirembe Hill, Kampala", services: "General Medicine, Surgery, Maternity", beds: 300 },
    { name: "Nsambya Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-267-051", rating: 4.4, email: "info@nsambya.org", address: "Nsambya Hill, Kampala", services: "Surgery, Cardiology, Oncology", beds: 350 },
    { name: "Kampala International University Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-598-698", rating: 4.2, email: "kiuth@kiu.ac.ug", address: "Kansanga, Kampala", services: "Teaching Hospital, All Specialties", beds: 200 },
    { name: "Case Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-234-567", rating: 4.0, email: "info@casehospital.org", address: "Kampala Road, Kampala", services: "General Medicine, Diagnostics", beds: 150 },
    { name: "Kawempe National Referral Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-530-692", rating: 3.9, email: "info@kawempe.go.ug", address: "Kawempe, Kampala", services: "Maternity, Pediatrics, Emergency", beds: 400 },
    { name: "Lubaga Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-271-051", rating: 4.1, email: "info@lubagahospital.org", address: "Lubaga Hill, Kampala", services: "Surgery, Internal Medicine, OPD", beds: 250 },
    { name: "Entebbe Grade B Hospital", type: "Hospital", district: "Wakiso", contact: "+256-414-320-326", rating: 3.8, email: "info@entebbe.health.go.ug", address: "Entebbe Municipality", services: "General Medicine, Emergency", beds: 180 },
    { name: "Kisubi Hospital", type: "Hospital", district: "Wakiso", contact: "+256-414-267-781", rating: 4.2, email: "info@kisubihospital.org", address: "Kisubi, Wakiso", services: "Surgery, Maternity, Diagnostics", beds: 220 },
    { name: "Nakaseke Health Centre IV", type: "Health Center", district: "Nakaseke", contact: "+256-414-123-456", rating: 3.7, email: "nakaseke@health.go.ug", address: "Nakaseke Town", services: "Primary Care, Maternity, OPD", beds: 40 },
    { name: "Kampala City Clinic", type: "Clinic", district: "Kampala", contact: "+256-414-345-678", rating: 4.0, email: "info@kampalacityclinic.com", address: "City Center, Kampala", services: "Consultations, Diagnostics", beds: 20 },
    { name: "Nansana Health Centre III", type: "Health Center", district: "Wakiso", contact: "+256-414-789-012", rating: 3.5, email: "nansana@health.go.ug", address: "Nansana, Wakiso", services: "Primary Care, Immunization", beds: 25 },
    { name: "International Hospital Kampala", type: "Hospital", district: "Kampala", contact: "+256-312-200-400", rating: 4.6, email: "info@ihk.co.ug", address: "Namuwongo, Kampala", services: "All Specialties, ICU, Emergency", beds: 300 },
    { name: "Kampala Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-250-362", rating: 4.1, email: "info@kampalahospital.com", address: "Kololo, Kampala", services: "General Medicine, Surgery", beds: 180 },
    { name: "Medipal International Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-342-121", rating: 4.0, email: "info@medipal.co.ug", address: "Bukoto, Kampala", services: "Surgery, Radiology, Laboratory", beds: 120 },
    { name: "Nakaseke Hospital", type: "Hospital", district: "Nakaseke", contact: "+256-464-444-001", rating: 3.6, email: "info@nakaseke.health.go.ug", address: "Nakaseke District", services: "General Medicine, Surgery, Maternity", beds: 100 },
    { name: "Kira Health Centre IV", type: "Health Center", district: "Wakiso", contact: "+256-414-567-890", rating: 3.8, email: "kira@health.go.ug", address: "Kira Municipality", services: "Primary Care, Maternity, Lab", beds: 35 },
    { name: "Rubaga Hospital", type: "Hospital", district: "Kampala", contact: "+256-414-270-591", rating: 4.2, email: "info@rubagahospital.org", address: "Rubaga Hill, Kampala", services: "Surgery, Internal Medicine, OPD", beds: 280 },
    { name: "Nalufenya Health Centre", type: "Health Center", district: "Wakiso", contact: "+256-414-890-123", rating: 3.4, email: "nalufenya@health.go.ug", address: "Nalufenya, Wakiso", services: "Primary Care, Immunization", beds: 20 },
    { name: "Kampala Medical Chambers", type: "Clinic", district: "Kampala", contact: "+256-414-256-001", rating: 4.3, email: "info@kmc.co.ug", address: "Kampala Road, Kampala", services: "Specialist Consultations, Diagnostics", beds: 15 }
];

// Function to populate the table
function populateTable() {
    const tableBody = document.querySelector('#facilitiesTable tbody');
    
    if (!tableBody) {
        console.error('Table body not found');
        return;
    }
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Populate with facility data
    facilities.forEach((facility, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${facility.name}</strong></td>
            <td><span class="badge badge-${getBadgeClass(facility.type)}">${facility.type}</span></td>
            <td>${facility.district}</td>
            <td>${facility.contact}</td>
            <td>${generateStars(facility.rating)}</td>
            <td>
                <button class="btn-small btn-primary" onclick="viewDetails(${index})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function to get badge class based on facility type
function getBadgeClass(type) {
    const typeMap = {
        'Hospital': 'primary',
        'Health Center': 'success',
        'Clinic': 'info',
        'Pharmacy': 'warning',
        'Laboratory': 'secondary'
    };
    return typeMap[type] || 'default';
}

// Function to generate star rating display
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let starsHtml = '<span class="rating">';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (hasHalfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star"></i>';
    }
    
    starsHtml += ` <span class="rating-value">${rating.toFixed(1)}</span></span>`;
    
    return starsHtml;
}

// Function to create and show modal
function createModal() {
    // Check if modal already exists
    let modal = document.getElementById('facilityModal');
    if (modal) {
        return modal;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="facilityModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTitle">Facility Details</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body" id="modalBody">
                    <!-- Content will be inserted here -->
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('facilityModal');
    
    // Add close functionality
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // Close when clicking outside
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    return modal;
}

// Function to view facility details in a beautiful modal
function viewDetails(index) {
    const facility = facilities[index];
    const modal = createModal();
    const modalBody = document.getElementById('modalBody');
    
    // Create detailed form-like display
    modalBody.innerHTML = `
        <div class="facility-details-form">
            <div class="detail-section">
                <h3><i class="fas fa-hospital"></i> Basic Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label><i class="fas fa-building"></i> Facility Name</label>
                        <div class="detail-value">${facility.name}</div>
                    </div>
                    <div class="detail-item">
                        <label><i class="fas fa-tags"></i> Facility Type</label>
                        <div class="detail-value">
                            <span class="badge badge-${getBadgeClass(facility.type)}">${facility.type}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label><i class="fas fa-map-marker-alt"></i> District</label>
                        <div class="detail-value">${facility.district}</div>
                    </div>
                    <div class="detail-item">
                        <label><i class="fas fa-map-signs"></i> Address</label>
                        <div class="detail-value">${facility.address}</div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-phone"></i> Contact Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label><i class="fas fa-phone-alt"></i> Phone Number</label>
                        <div class="detail-value">
                            <a href="tel:${facility.contact}">${facility.contact}</a>
                        </div>
                    </div>
                    <div class="detail-item">
                        <label><i class="fas fa-envelope"></i> Email Address</label>
                        <div class="detail-value">
                            <a href="mailto:${facility.email}">${facility.email}</a>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Facility Information</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label><i class="fas fa-bed"></i> Number of Beds</label>
                        <div class="detail-value">${facility.beds} beds</div>
                    </div>
                    <div class="detail-item">
                        <label><i class="fas fa-star"></i> Rating</label>
                        <div class="detail-value">${generateStars(facility.rating)}</div>
                    </div>
                    <div class="detail-item full-width">
                        <label><i class="fas fa-stethoscope"></i> Services Offered</label>
                        <div class="detail-value services-list">
                            ${facility.services.split(',').map(service => 
                                `<span class="service-tag">${service.trim()}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn-primary" onclick="window.location.href='map.html'">
                    <i class="fas fa-map"></i> View on Map
                </button>
                <button class="btn-secondary" onclick="document.getElementById('facilityModal').style.display='none'">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
}

// Initialize charts
function initCharts() {
    // Facilities by Type Chart
    const typeCtx = document.getElementById('typeChart');
    if (typeCtx) {
        const typeCounts = {};
        facilities.forEach(f => {
            typeCounts[f.type] = (typeCounts[f.type] || 0) + 1;
        });
        
        new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: [
                        '#3498db',
                        '#2ecc71',
                        '#f39c12',
                        '#e74c3c',
                        '#9b59b6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Distribution by District Chart
    const districtCtx = document.getElementById('districtChart');
    if (districtCtx) {
        const districtCounts = {};
        facilities.forEach(f => {
            districtCounts[f.district] = (districtCounts[f.district] || 0) + 1;
        });
        
        new Chart(districtCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(districtCounts),
                datasets: [{
                    label: 'Number of Facilities',
                    data: Object.values(districtCounts),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
    
    // Category Comparison Chart
    const comparisonCtx = document.getElementById('comparisonChart');
    if (comparisonCtx) {
        const districts = [...new Set(facilities.map(f => f.district))];
        const types = [...new Set(facilities.map(f => f.type))];
        
        const datasets = types.map((type, index) => {
            const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];
            return {
                label: type,
                data: districts.map(district => 
                    facilities.filter(f => f.district === district && f.type === type).length
                ),
                backgroundColor: colors[index % colors.length]
            };
        });
        
        new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: districts,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        stacked: false
                    },
                    y: {
                        stacked: false,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// Hamburger menu functionality
function initMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    populateTable();
    initCharts();
    initMenu();
});