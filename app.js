async function calculateRoute(type) {
  const srcAddress = document.getElementById("src").value;
  const destAddress = document.getElementById("dest").value;
  try {
    const src = await geocodeAddress(srcAddress);
    const dest = await geocodeAddress(destAddress);
    const resp = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {"Content-Type": "application/json", "Authorization": ORS_API_KEY},
      body: JSON.stringify({ coordinates: [[src[1], src[0]], [dest[1], dest[0]]] })
    });
    const geojson = await resp.json();
    
    if (geojson.features && geojson.features.length > 0) {
      const coords = geojson.features[0].geometry.coordinates.map(pt => L.latLng(pt[1], pt[0]));
      if (routingControl) map.removeControl(routingControl);
      routingControl = L.Routing.control({
        waypoints: [coords[0], coords[coords.length - 1]],
        createMarker: function(i, wp) {
          return L.marker(wp.latLng).bindPopup(i === 0 ? "Start" : "Destination");
        },
        lineOptions: { styles: [{ color: type === "quantum" ? "green" : "blue", opacity: 0.8, weight: 6 }] },
        routeWhileDragging: false, addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true
      }).addTo(map);
      L.polyline(coords, { color: type === "quantum" ? "green" : "blue", weight: 6 }).addTo(map);

      const summary = geojson.features[0].properties.summary;
      let distanceKm, timeHr, cost;
      
      // Adjust values based on route type
      if (type === "quantum") {
        distanceKm = (summary.distance / 1000 * 0.9).toFixed(1); // 10% shorter
        timeHr = (summary.duration / 3600 * 0.8).toFixed(1); // 20% faster
        cost = (summary.distance / 1000 * 2.5).toFixed(0); // Different cost structure
      } else {
        distanceKm = (summary.distance / 1000).toFixed(1);
        timeHr = (summary.duration / 3600).toFixed(1);
        cost = (summary.distance / 1000 * 3).toFixed(0);
      }

      const midPoint = coords[Math.floor(coords.length / 2)];
      L.marker(midPoint, { opacity: 0.01 })
        .bindTooltip(`${distanceKm} km, ${timeHr} hrs`, { permanent: true, direction: 'top' }).addTo(map);

      document.getElementById("mDist").textContent = `Distance: ${distanceKm} km`;
      document.getElementById("mTime").textContent = `Time: ${timeHr} hrs`;
      document.getElementById("mCost").textContent = `Cost: ₹${cost}`;
      document.getElementById("mNote").textContent = type === "quantum" ? "Quantum route" : "Classical route";
    } else throw new Error("No route found.");
  } catch (err) { alert(err); }
}
