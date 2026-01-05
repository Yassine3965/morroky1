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
        return this.data.streets || [];
    }

    getKissariat(streetId) {
        const street = this.getStreets().find(s => s.id === streetId);
        return street ? street.kissariat : [];
    }

    getAlleys(streetId, kissariaId) {
        const kissaria = this.getKissariat(streetId).find(k => k.id === kissariaId);
        return kissaria ? kissaria.alleys : [];
    }
}

export default new LocationService();
