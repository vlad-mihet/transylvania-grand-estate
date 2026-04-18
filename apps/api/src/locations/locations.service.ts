import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PhotonFeature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    type?: string; // city, town, village, street, house, etc.
  };
}

interface AddressResult {
  name: string;
  sublabel: string;
  type: string; // 'city' | 'street' | 'house' | 'district' | etc.
  latitude: number;
  longitude: number;
  city?: string;
  county?: string;
}

// Romania center coordinates for Photon bias
const ROMANIA_LAT = 45.94;
const ROMANIA_LNG = 24.97;
const PHOTON_BASE = 'https://photon.komoot.io/api';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private prisma: PrismaService) {}

  async search(q: string) {
    if (!q || q.length < 2) {
      return { counties: [], cities: [], neighborhoods: [], addresses: [] };
    }

    const [dbResults, addresses] = await Promise.all([
      this.searchDatabase(q),
      this.searchPhoton(q),
    ]);

    return { ...dbResults, addresses };
  }

  private async searchDatabase(q: string) {
    const [counties, cities, neighborhoods] = await Promise.all([
      this.prisma.county.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        orderBy: { name: 'asc' },
        take: 10,
      }),
      this.prisma.city.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        include: {
          county: true,
          neighborhoods: { orderBy: { name: 'asc' }, take: 4 },
        },
        orderBy: { name: 'asc' },
        take: 10,
      }),
      this.prisma.neighborhood.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        include: {
          city: { include: { county: true } },
        },
        orderBy: { name: 'asc' },
        take: 10,
      }),
    ]);

    return { counties, cities, neighborhoods };
  }

  private async searchPhoton(q: string): Promise<AddressResult[]> {
    try {
      const params = new URLSearchParams({
        q,
        lat: ROMANIA_LAT.toString(),
        lon: ROMANIA_LNG.toString(),
        limit: '7',
        lang: 'default',
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${PHOTON_BASE}?${params}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Reveria/1.0' },
      });
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data = await res.json();
      const features: PhotonFeature[] = data.features ?? [];

      // Filter to Romania only and map to our format
      return features
        .filter((f) => {
          const c = f.properties.country?.toLowerCase() ?? '';
          return c === 'romania' || c === 'românia';
        })
        .map((f) => this.mapPhotonFeature(f))
        .filter((a): a is AddressResult => a !== null);
    } catch (err) {
      // Photon is a best-effort enhancement — never block the response
      this.logger.warn(`Photon search failed: ${err}`);
      return [];
    }
  }

  private mapPhotonFeature(feature: PhotonFeature): AddressResult | null {
    const p = feature.properties;
    const [lng, lat] = feature.geometry.coordinates;

    if (!p.name && !p.street) return null;

    const type = p.type ?? 'place';

    // Build display name and sublabel
    let name = '';
    let sublabel = '';

    if (p.housenumber && p.street) {
      name = `${p.street} ${p.housenumber}`;
      sublabel = [p.city, p.county].filter(Boolean).join(', ');
    } else if (p.street) {
      name = p.street;
      sublabel = [p.city, p.county].filter(Boolean).join(', ');
    } else if (type === 'city' || type === 'town' || type === 'village') {
      name = p.name ?? '';
      sublabel = [p.county, 'România'].filter(Boolean).join(', ');
    } else if (type === 'district' || type === 'suburb' || type === 'neighbourhood') {
      name = p.name ?? '';
      sublabel = [p.city, p.county].filter(Boolean).join(', ');
    } else {
      name = p.name ?? p.street ?? '';
      sublabel = [p.city, p.county].filter(Boolean).join(', ');
    }

    if (!name) return null;

    return {
      name,
      sublabel,
      type,
      latitude: lat,
      longitude: lng,
      city: p.city,
      county: p.county,
    };
  }
}
