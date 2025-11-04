// District boundary coordinates and center points
const districtBoundaries = {
    Kampala: {
        center: [0.3476, 32.5825],
        bounds: [
            [0.2894, 32.5345],
            [0.4058, 32.6305]
        ],
        zoom: 12
    },
    Wakiso: {
        center: [0.3981, 32.4789],
        bounds: [
            [0.2315, 32.3456],
            [0.5647, 32.6122]
        ],
        zoom: 11
    },
    Mukono: {
        center: [0.3528, 32.7550],
        bounds: [
            [0.2842, 32.6789],
            [0.4214, 32.8311]
        ],
        zoom: 11
    },
    // Add other districts with their boundaries...
};

// GeoJSON style for district boundaries
const districtStyle = {
    color: "#ff7800",
    weight: 2,
    opacity: 0.65,
    fillOpacity: 0.1
};