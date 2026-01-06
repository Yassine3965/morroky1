import derbOmarData from '../data/derb-omar.json';

class LocationService {
    constructor() {
        this.data = derbOmarData;
        this.isLoaded = false;
    }

    async loadLocations() {
        if (this.isLoaded) return this.data;
        this.isLoaded = true;
        return this.data;
    }

    getStreets() {
        const streets = this.data.streets || [];
        return [...streets, { id: 'other', name: 'أخرى' }];
    }

    getKissariat(streetId) {
        if (streetId === 'other') {
            return [{ id: 'other', name: 'أخرى' }];
        }
        const street = this.getStreets().find(s => s.id === streetId);
        const kissariat = street ? street.kissariat : [];
        return [...kissariat, { id: 'other', name: 'أخرى' }];
    }

    getAlleys(streetId, kissariaId) {
        if (kissariaId === 'other') {
            return ['أخرى'];
        }
        const kissaria = this.getKissariat(streetId).find(k => k.id === kissariaId);
        const alleys = kissaria ? kissaria.alleys : [];
        return [...alleys, 'أخرى'];
    }
}

export default new LocationService();
