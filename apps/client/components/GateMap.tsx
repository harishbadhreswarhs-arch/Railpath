
import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { useGeofencing } from '../contexts/GeofencingContext';

const containerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '1rem',
};

const defaultCenter = {
    lat: 28.6139,
    lng: 77.2090
};

interface Gate {
    id: string;
    name: string;
    status: 'OPEN' | 'CLOSED';
    latitude?: number;
    longitude?: number;
}

interface GateMapProps {
    gates: Gate[];
}

export default function GateMap({ gates }: GateMapProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const { userLocation } = useGeofencing();
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [selectedGate, setSelectedGate] = useState<Gate | null>(null);

    const onLoad = useCallback((map: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Fit bounds to show user and gates
    useEffect(() => {
        if (map && gates.length > 0) {
            const bounds = new google.maps.LatLngBounds();

            // Add gates to bounds
            gates.forEach(gate => {
                if (gate.latitude && gate.longitude) {
                    bounds.extend({ lat: gate.latitude, lng: gate.longitude });
                }
            });

            // Add user to bounds
            if (userLocation) {
                bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
            }

            if (!bounds.isEmpty()) {
                map.fitBounds(bounds);
            }
        }
    }, [map, gates, userLocation]);

    if (!isLoaded) return <div className="w-full h-[500px] bg-slate-800 rounded-xl animate-pulse flex items-center justify-center text-slate-500">Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={10}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    {
                        featureType: "administrative.locality",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "geometry",
                        stylers: [{ color: "#263c3f" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#6b9a76" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }],
                    },
                    {
                        featureType: "road",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9ca5b3" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#746855" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#1f2835" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#f3d19c" }],
                    },
                    {
                        featureType: "transit",
                        elementType: "geometry",
                        stylers: [{ color: "#2f3948" }],
                    },
                    {
                        featureType: "transit.station",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#515c6d" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#17263c" }],
                    },
                ]
            }}
        >
            {/* User Location */}
            {userLocation && (
                <Marker
                    position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#3B82F6",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2,
                    }}
                    title="You are here"
                />
            )}

            {/* Gates */}
            {gates.map(gate => {
                if (!gate.latitude || !gate.longitude) return null;
                return (
                    <React.Fragment key={gate.id}>
                        <Marker
                            position={{ lat: gate.latitude, lng: gate.longitude }}
                            onClick={() => setSelectedGate(gate)}
                            // We can use custom icons later, for now standard markers
                            label={{
                                text: gate.status === 'OPEN' ? 'O' : 'C',
                                color: "white",
                                fontWeight: "bold"
                            }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 10,
                                fillColor: gate.status === 'OPEN' ? "#22c55e" : "#ef4444",
                                fillOpacity: 1,
                                strokeColor: "white",
                                strokeWeight: 2,
                            }}
                        />

                        {/* 500m Geofence Radius for Closed Gates */}
                        {gate.status === 'CLOSED' && (
                            <Circle
                                center={{ lat: gate.latitude, lng: gate.longitude }}
                                radius={500}
                                options={{
                                    strokeColor: "#ef4444",
                                    strokeOpacity: 0.8,
                                    strokeWeight: 1,
                                    fillColor: "#ef4444",
                                    fillOpacity: 0.2, // Red zone
                                }}
                            />
                        )}
                        {/* 500m Safe Radius for Open Gates (Optional visualization) */}
                        {gate.status === 'OPEN' && (
                            <Circle
                                center={{ lat: gate.latitude, lng: gate.longitude }}
                                radius={500}
                                options={{
                                    strokeColor: "#22c55e",
                                    strokeOpacity: 0.5,
                                    strokeWeight: 1,
                                    fillColor: "#22c55e",
                                    fillOpacity: 0.1, // Green zone
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {/* Info Window */}
            {selectedGate && selectedGate.latitude && selectedGate.longitude && (
                <InfoWindow
                    position={{ lat: selectedGate.latitude, lng: selectedGate.longitude }}
                    onCloseClick={() => setSelectedGate(null)}
                >
                    <div className="bg-slate-800 p-2 rounded text-slate-900 min-w-[150px]">
                        <h3 className="font-bold text-lg">{selectedGate.name}</h3>
                        <div className={`font-bold ${selectedGate.status === 'OPEN' ? 'text-green-600' : 'text-red-600'}`}>
                            {selectedGate.status}
                        </div>
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    );
}
