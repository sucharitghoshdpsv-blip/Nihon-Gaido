/// <reference types="@types/google.maps" />
import React, { useCallback, useEffect, useState } from 'react';
import {
  APILoadingStatus,
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMapsLibrary,
  type MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import { Loader2, MapPin, Search, Star } from 'lucide-react';
import { CITY_GUIDES, type CityGuide } from '../data/japanData';

interface GoogleJapanMapProps {
  selectedCity: CityGuide;
  onSelectCity: (city: CityGuide) => void;
}

interface LivePlaceSummary {
  id: string;
  name: string;
  address: string;
  category: string;
  rating: number | null;
  position: google.maps.LatLngLiteral;
}

const PLACE_PRESETS = [
  { label: 'Shrines & Temples', query: 'famous shrines and temples' },
  { label: 'Ramen & Dining', query: 'popular local ramen and dining' },
  { label: 'Rail Stations', query: 'major train stations' },
  { label: 'Gardens & Parks', query: 'scenic Japanese gardens and parks' },
];

function MapApiStatusWatcher() {
  const status = useApiLoadingStatus();

  useEffect(() => {
    if (status === APILoadingStatus.AUTH_FAILURE) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  }, [status]);

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs text-amber-300">
        Live Google Maps tiles are temporarily unavailable. Verify API key permissions or quota.
      </div>
    );
  }

  return null;
}

interface PlaceMarkerWithWindowProps {
  place: LivePlaceSummary;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const PlaceMarkerWithWindow: React.FC<PlaceMarkerWithWindowProps> = ({
  place,
  isSelected,
  onSelect,
  onClose,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.position}
        title={place.name}
        onClick={onSelect}
      >
        <Pin
          background={isSelected ? '#F6C945' : '#0F766E'}
          borderColor="#FFFFFF"
          glyphColor={isSelected ? '#111827' : '#FFFFFF'}
          scale={isSelected ? 1.15 : 0.95}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose} maxWidth={250}>
          <div className="text-slate-900 space-y-1 p-0.5">
            <p className="font-semibold text-sm leading-tight">{place.name}</p>
            {place.category && (
              <p className="text-[11px] font-medium text-slate-600">{place.category}</p>
            )}
            {place.address && (
              <p className="text-xs text-slate-700 leading-snug">{place.address}</p>
            )}
            {place.rating !== null && (
              <p className="text-xs font-semibold text-amber-700">
                Rating: {place.rating.toFixed(1)} / 5
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const InnerJapanMapContent: React.FC<GoogleJapanMapProps> = ({
  selectedCity,
  onSelectCity,
}) => {
  const placesLib = useMapsLibrary('places');
  const [camera, setCamera] = useState<{ center: google.maps.LatLngLiteral; zoom: number }>({
    center: selectedCity.geoCenter,
    zoom: 12,
  });
  const [searchInput, setSearchInput] = useState('famous shrines and temples');
  const [places, setPlaces] = useState<LivePlaceSummary[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setCamera({ center: selectedCity.geoCenter, zoom: 12 });
    setSelectedPlaceId(null);
  }, [selectedCity]);

  const runPlaceSearch = useCallback(
    async (queryText: string) => {
      if (!placesLib || !queryText.trim()) return;
      setSearching(true);
      setSearchError(null);

      try {
        // Uses modern Places API (New) Place.searchByText per Google Maps Platform standards
        const request: google.maps.places.SearchByTextRequest = {
          textQuery: `${queryText.trim()} in ${selectedCity.id}, Japan`,
          fields: [
            'id',
            'displayName',
            'location',
            'formattedAddress',
            'rating',
            'primaryTypeDisplayName',
          ],
          locationBias: selectedCity.geoCenter,
          language: 'en',
          region: 'jp',
          maxResultCount: 6,
        };

        const response = await placesLib.Place.searchByText(request);
        const found = (response?.places ?? [])
          .filter((p) => Boolean(p.location))
          .map((p, idx): LivePlaceSummary => ({
            id: p.id || `place-${idx}`,
            name: p.displayName || 'Unnamed Place',
            address: p.formattedAddress || '',
            category: p.primaryTypeDisplayName || 'Point of Interest',
            rating: typeof p.rating === 'number' ? p.rating : null,
            position: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
          }));

        setPlaces(found);
        if (found.length > 0) {
          setSelectedPlaceId(found[0].id);
          setCamera({ center: found[0].position, zoom: 13 });
        } else {
          setSelectedPlaceId(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429') ||
          msg.toLowerCase().includes('quota')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSearchError('Could not fetch nearby places right now.');
      } finally {
        setSearching(false);
      }
    },
    [placesLib, selectedCity]
  );

  useEffect(() => {
    if (placesLib) {
      runPlaceSearch(searchInput);
    }
  }, [placesLib, selectedCity.id]);

  const handleCameraChanged = useCallback((ev: MapCameraChangedEvent) => {
    setCamera({
      center: ev.detail.center,
      zoom: ev.detail.zoom,
    });
  }, []);

  return (
    <div className="space-y-4">
      <MapApiStatusWatcher />

      {/* Search & Preset Category Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runPlaceSearch(searchInput);
          }}
          className="flex flex-1 gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-token absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label={`Search places in ${selectedCity.id}`}
              placeholder={`Search shrines, ramen, or stations in ${selectedCity.id}…`}
              className="w-full rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm liquid-glass text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent-token disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {searching ? 'Searching…' : 'Search Map'}
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {PLACE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setSearchInput(preset.query);
                runPlaceSearch(preset.query);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                searchInput === preset.query
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Map + Places Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div
          className="lg:col-span-7 h-[340px] rounded-2xl overflow-hidden border border-black/10 dark:border-amber-200/15"
          data-testid="google-japan-map"
        >
          <GoogleMap
            mapId="DEMO_MAP_ID"
            center={camera.center}
            zoom={camera.zoom}
            onCameraChanged={handleCameraChanged}
            gestureHandling="greedy"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* City Hub Markers */}
            {CITY_GUIDES.map((city) => {
              const active = city.id === selectedCity.id;
              return (
                <AdvancedMarker
                  key={city.id}
                  position={city.geoCenter}
                  title={`${city.id} Hub (${city.district})`}
                  onClick={() => onSelectCity(city)}
                >
                  <Pin
                    background={active ? '#B45309' : '#334155'}
                    borderColor="#F6C945"
                    glyphColor="#FFFFFF"
                    scale={active ? 1.1 : 0.85}
                  />
                </AdvancedMarker>
              );
            })}

            {/* Live Places API (New) Results */}
            {places.map((place) => (
              <PlaceMarkerWithWindow
                key={place.id}
                place={place}
                isSelected={selectedPlaceId === place.id}
                onSelect={() => {
                  setSelectedPlaceId(place.id);
                  setCamera({ center: place.position, zoom: 14 });
                }}
                onClose={() => setSelectedPlaceId(null)}
              />
            ))}
          </GoogleMap>
        </div>

        {/* Live Places Results Sidebar */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 rounded-2xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 max-h-[340px] overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-primary-token">
              Live Places in {selectedCity.id}
            </h3>
            {searching && <Loader2 className="w-4 h-4 animate-spin text-accent-token" />}
          </div>

          {searchError ? (
            <p className="text-xs text-rose-400 my-auto">{searchError}</p>
          ) : places.length === 0 && !searching ? (
            <p className="text-xs text-muted-token my-auto">
              No matching places found in {selectedCity.id}. Try another category or keyword.
            </p>
          ) : (
            <div className="space-y-2">
              {places.map((place) => {
                const active = selectedPlaceId === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceId(place.id);
                      setCamera({ center: place.position, zoom: 15 });
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      active
                        ? 'liquid-glass-elevated border-[var(--accent)]'
                        : 'liquid-glass border-transparent hover:border-amber-300/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-primary-token truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent-token shrink-0" />
                          <span className="truncate">{place.name}</span>
                        </p>
                        <p className="text-[11px] text-muted-token mt-0.5 truncate">
                          {place.category}
                        </p>
                      </div>
                      {place.rating !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-accent-token shrink-0">
                          <Star className="w-3 h-3 fill-current" />
                          {place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {place.address && (
                      <p className="text-[11px] text-secondary-token mt-1 line-clamp-1">
                        {place.address}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-token">
            Powered by Google Maps Platform · Maps JS & Places API (New)
          </p>
        </div>
      </div>
    </div>
  );
};

export const GoogleJapanMap: React.FC<GoogleJapanMapProps> = ({
  selectedCity,
  onSelectCity,
}) => {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const initialKey = envKey && envKey !== 'MY_GOOGLE_MAPS_API_KEY' ? envKey : '';
  const [apiKey, setApiKey] = useState<string>(initialKey);
  const [loadingKey, setLoadingKey] = useState<boolean>(!initialKey);

  useEffect(() => {
    if (initialKey) return;
    let active = true;
    fetch('/api/maps/config')
      .then((res) => res.json())
      .then((data: { apiKey?: string }) => {
        if (active && data?.apiKey) {
          setApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Leave fallback empty if unavailable
      })
      .finally(() => {
        if (active) setLoadingKey(false);
      });
    return () => {
      active = false;
    };
  }, [initialKey]);

  if (loadingKey) {
    return (
      <div className="h-[340px] rounded-2xl bg-black/10 dark:bg-black/35 flex items-center justify-center gap-2 text-xs text-muted-token">
        <Loader2 className="w-4 h-4 animate-spin text-accent-token" />
        <span>Loading Google Maps Platform…</span>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-[260px] rounded-2xl bg-black/10 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-col items-center justify-center text-center p-6 gap-2">
        <p className="text-sm font-semibold text-primary-token">
          Google Maps Platform API Key Pending
        </p>
        <p className="text-xs text-muted-token max-w-md">
          Configure VITE_GOOGLE_MAPS_API_KEY in Settings &gt; Secrets to load interactive satellite/street tiles and live Places search alongside your offline Japan Rail &amp; Region Guide below.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'marker']} language="en" region="JP">
      <InnerJapanMapContent selectedCity={selectedCity} onSelectCity={onSelectCity} />
    </APIProvider>
  );
};
