
// Export functionality
document.addEventListener('DOMContentLoaded', function() {
    setupExportListeners();
});

function setupExportListeners() {
    document.getElementById('exportCSV')?.addEventListener('click', exportToCSV);
    document.getElementById('exportGeoJSON')?.addEventListener('click', exportToGeoJSON);
    document.getElementById('exportKML')?.addEventListener('click', exportToKML);
}

// Export to CSV
function exportToCSV() {
    const headers = ['ID', 'Name', 'Type', 'Category', 'District', 'Address', 'Contact', 'Email', 'Latitude', 'Longitude', 'Services', 'Opening Hours'];
    
    const csvContent = [
        headers.join(','),
        ...facilitiesData.map(f => [
            f.id,
            `"${f.name}"`,
            `"${f.type}"`,
            `"${f.category}"`,
            `"${f.district}"`,
            `"${f.address}"`,
            f.contact,
            f.email || '',
            f.coordinates[0],
            f.coordinates[1],
            `"${f.services ? f.services.join('; ') : ''}"`,
            `"${f.openingHours || ''}"`
        ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'uganda-gis-facilities.csv', 'text/csv');
}

// Export to GeoJSON
function exportToGeoJSON() {
    const geojson = {
        type: 'FeatureCollection',
        features: facilitiesData.map(f => ({
            type: 'Feature',
            properties: {
                id: f.id,
                name: f.name,
                type: f.type,
                category: f.category,
                district: f.district,
                address: f.address,
                contact: f.contact,
                email: f.email,
                services: f.services,
                openingHours: f.openingHours,
                rating: f.rating
            },
            geometry: {
                type: 'Point',
                coordinates: [f.coordinates[1], f.coordinates[0]] // GeoJSON uses [lng, lat]
            }
        }))
    };

    downloadFile(JSON.stringify(geojson, null, 2), 'uganda-gis-facilities.geojson', 'application/json');
}

// Export to KML
function exportToKML() {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Central Uganda Community Resources</name>
    <description>GIS mapping of healthcare, education, and public safety facilities</description>
`;

    facilitiesData.forEach(f => {
        kml += `
    <Placemark>
      <name>${escapeXml(f.name)}</name>
      <description>
        <![CDATA[
          <strong>Type:</strong> ${f.type}<br>
          <strong>District:</strong> ${f.district}<br>
          <strong>Contact:</strong> ${f.contact}<br>
          ${f.address ? `<strong>Address:</strong> ${f.address}<br>` : ''}
        ]]>
      </description>
      <Point>
        <coordinates>${f.coordinates[1]},${f.coordinates[0]},0</coordinates>
      </Point>
    </Placemark>`;
    });

    kml += `
  </Document>
</kml>`;

    downloadFile(kml, 'uganda-gis-facilities.kml', 'application/vnd.google-earth.kml+xml');
}

// Helper function to download file
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Helper function to escape XML
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}