import { useState, useCallback } from 'react';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  isLoading: boolean;
  isSupported: boolean;
  captureLocation: () => Promise<GeolocationPosition | null>;
  clearPosition: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const captureLocation = useCallback(async (): Promise<GeolocationPosition | null> => {
    if (!isSupported) {
      setError({ code: 0, message: 'Geolocation is not supported by this browser' });
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: new Date(pos.timestamp),
          };
          setPosition(newPosition);
          setIsLoading(false);
          resolve(newPosition);
        },
        (err) => {
          const errorMessage = getErrorMessage(err.code);
          setError({ code: err.code, message: errorMessage });
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // Cache for 1 minute
        }
      );
    });
  }, [isSupported]);

  const clearPosition = useCallback(() => {
    setPosition(null);
    setError(null);
  }, []);

  return {
    position,
    error,
    isLoading,
    isSupported,
    captureLocation,
    clearPosition,
  };
}

function getErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return 'Location access denied. Please enable location permissions in your browser settings.';
    case 2:
      return 'Unable to determine location. Please check your GPS settings.';
    case 3:
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting location.';
  }
}
