
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem',
    border: '1px solid #334155'
};

const defaultCenter = {
    lat: 28.6139, // New Delhi
    lng: 77.2090
};

interface LocationPickerProps {
    initialLat?: number;
    initialLng?: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationPicker({ initialLat, initialLng, onLocationSelect }: LocationPickerProps) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);

    useEffect(() => {
        if (initialLat && initialLng) {
            setMarkerPosition({ lat: initialLat, lng: initialLng });
        }
    }, [initialLat, initialLng]);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
            const lat = e.latLng.lat();
            const lng = e.latLng.lng();
            setMarkerPosition({ lat, lng });
            onLocationSelect(lat, lng);
            setGeoError(null); // Clear error on manual selection
        }
    }, [onLocationSelect]);

    const handleCurrentLocation = () => {
        setGeoError(null);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setMarkerPosition({ lat: latitude, lng: longitude });
                    onLocationSelect(latitude, longitude);
                    map?.panTo({ lat: latitude, lng: longitude });
                    map?.setZoom(15);
                },
                (error) => {
                    let errorMessage = 'The Geolocation service failed.';
                    if (error.message) {
                        errorMessage += ` (Code: ${error.code}, Msg: ${error.message})`;
                    }
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'User denied the request for Geolocation. Please enable location services in your browser.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'The request to get user location timed out.';
                            break;
                    }
                    console.error("Geolocation Error:", error);
                    setGeoError(errorMessage);
                }
            );
        } else {
            setGeoError('Your browser doesn\'t support geolocation.');
        }
    };

    if (!isLoaded) return <div className="w-full h-[400px] bg-slate-800 rounded-xl animate-pulse flex items-center justify-center text-slate-500">Loading Maps...</div>;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-400">Location</label>
                <div className="flex flex-col items-end">
                    <button
                        type="button"
                        onClick={handleCurrentLocation}
                        className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs rounded-lg transition flex items-center gap-1 border border-blue-600/30"
                    >
                        <span>📍</span> Locate Me
                    </button>
                    {geoError && <span className="text-xs text-red-500 mt-1">{geoError}</span>}
                </div>
            </div>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={markerPosition || defaultCenter}
                zoom={markerPosition ? 15 : 4}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onClick={onMapClick}
                options={{
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
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
                    ],
                    disableDefaultUI: true,
                    zoomControl: true,
                }}
            >
                {markerPosition && <Marker position={markerPosition} />}
            </GoogleMap>

            {markerPosition && (
                <div className="text-xs text-slate-500 font-mono text-center">
                    Selected: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
                </div>
            )}
        </div>
    );
}
