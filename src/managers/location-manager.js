import LocationService from '../services/location.service';

export const locationSchema = [
    { id: 'city', label: 'المدينة', level: 0, type: 'static' },
    { id: 'market', label: 'السوق', level: 1, type: 'static' },
    { id: 'street', label: 'الشارع', level: 2, type: 'select' },
    { id: 'kissaria', label: 'القيسارية', level: 3, type: 'select' },
    { id: 'alley', label: 'الزقة/الممر', level: 4, type: 'select' },
    { id: 'shopNumber', label: 'رقم المحل', level: 5, type: 'text' }
];

class LocationManager {
    constructor() {
        this.schema = locationSchema;
    }

    getSchema() {
        return this.schema;
    }

    async getOptions(fieldId, context = {}) {
        await LocationService.loadLocations();

        switch (fieldId) {
            case 'street':
                return LocationService.getStreets().map(s => ({ id: s.id, name: s.name }));
            case 'kissaria':
                return LocationService.getKissariat(context.streetId).map(k => ({ id: k.id, name: k.name }));
            case 'alley':
                return LocationService.getAlleys(context.streetId, context.kissariaId).map(a => ({ id: a, name: a }));
            default:
                return [];
        }
    }

    formatAddress(locationData) {
        const parts = [];
        if (locationData.city) parts.push(locationData.city);
        if (locationData.market) parts.push(locationData.market);

        // For IDs, we should ideally resolve names, but for now we use what we have in the state/data
        // In a real app, IDs are stored, but labels are shown
        if (locationData.streetName) parts.push(locationData.streetName);
        if (locationData.kissariaName) parts.push(locationData.kissariaName);
        if (locationData.alley) parts.push(locationData.alley);
        if (locationData.shopNumber) parts.push(`محل ${locationData.shopNumber}`);

        return parts.join(' - ');
    }
}

export default new LocationManager();
