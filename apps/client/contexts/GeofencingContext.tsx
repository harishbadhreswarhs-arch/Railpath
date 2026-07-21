
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

interface Gate {
    id: string;
    name: string;
    status: 'OPEN' | 'CLOSED';
    latitude?: number;
    longitude?: number;
    isJammed?: boolean;
    jamAlertPayload?: string;
}

interface GeofencingContextType {
    userLocation: GeolocationCoordinates | null;
    permissionStatus: PermissionState | 'unknown';
    nearbyAlerts: string[]; // List of gate IDs we've alerted for
    activeJamAlert: string | null; // The JSON payload if a nearby gate is jammed
}

const GeofencingContext = createContext<GeofencingContextType>({
    userLocation: null,
    permissionStatus: 'unknown',
    nearbyAlerts: [],
    activeJamAlert: null
});

export const useGeofencing = () => useContext(GeofencingContext);

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export const GeofencingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionState | 'unknown'>('unknown');
    const [gates, setGates] = useState<Gate[]>([]);
    const alertedGates = useRef<Set<string>>(new Set());
    const [nearbyAlerts, setNearbyAlerts] = useState<string[]>([]);
    const [activeJamAlert, setActiveJamAlert] = useState<string | null>(null);

    // 1. Subscribe to Gates
    useEffect(() => {
        const q = query(collection(db, 'gates'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const gatesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gate));
            setGates(gatesData);
        });
        return () => unsubscribe();
    }, []);

    // 2. Watch Position
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            console.warn("Geolocation not supported");
            return;
        }

        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            setPermissionStatus(result.state);
            result.onchange = () => setPermissionStatus(result.state);
        });

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserLocation(position.coords);
            },
            (error) => {
                console.error("Geolocation error:", error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 5000
            }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // 3. Proximity Logic
    useEffect(() => {
        if (!userLocation) return;

        let foundJamPayload: string | null = null;

        gates.forEach(gate => {
            if (gate.status === 'CLOSED' && gate.latitude && gate.longitude) {
                const distanceKm = getDistanceFromLatLonInKm(
                    userLocation.latitude,
                    userLocation.longitude,
                    gate.latitude,
                    gate.longitude
                );

                // 500 meters = 0.5 km
                if (distanceKm <= 0.5) {
                    if (gate.isJammed && gate.jamAlertPayload) {
                        foundJamPayload = gate.jamAlertPayload;
                    }

                    if (!alertedGates.current.has(gate.id)) {
                        // Trigger Alert
                        triggerVoiceAlert(gate.name, distanceKm);
                        alertedGates.current.add(gate.id);
                        setNearbyAlerts(prev => [...prev, gate.id]);
                    }
                } else {
                    // Reset alert if user moves away (> 1km? or just outside 500m?)
                    // Let's use 600m to avoid rapid toggling at the boundary
                    if (distanceKm > 0.6 && alertedGates.current.has(gate.id)) {
                        alertedGates.current.delete(gate.id);
                        setNearbyAlerts(prev => prev.filter(id => id !== gate.id));
                    }
                }
            } else if (gate.status === 'OPEN' && alertedGates.current.has(gate.id)) {
                // If gate opens, clear alert
                alertedGates.current.delete(gate.id);
                setNearbyAlerts(prev => prev.filter(id => id !== gate.id));
            }
        });

        setActiveJamAlert(foundJamPayload);
    }, [userLocation, gates]);

    const triggerVoiceAlert = (gateName: string, distanceKm: number) => {
        if ('speechSynthesis' in window) {
            const distanceMeters = Math.round(distanceKm * 1000);
            const text = `Caution. Railway gate ${gateName} is closed, ${distanceMeters} meters ahead.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <GeofencingContext.Provider value={{ userLocation, permissionStatus, nearbyAlerts, activeJamAlert }}>
            {children}
        </GeofencingContext.Provider>
    );
};
