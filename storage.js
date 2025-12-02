// Zaawansowany local storage manager
const Storage = {
    // Zapisz dane
    set: function(key, data, ttl = null) {
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    },
    
    // Pobierz dane
    get: function(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        try {
            const item = JSON.parse(itemStr);
            
            // Sprawdź czy dane wygasły
            if (item.ttl && (Date.now() - item.timestamp) > item.ttl) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.data;
        } catch {
            return null;
        }
    },
    
    // Usuń dane
    remove: function(key) {
        localStorage.removeItem(key);
    },
    
    // Wyczyść wszystkie dane
    clear: function() {
        localStorage.clear();
    },
    
    // Specjalne metody dla klientów
    saveClientData: function(clientId, data) {
        this.set(`client_${clientId}`, data, 24 * 60 * 60 * 1000); // 24h TTL
    },
    
    getClientData: function(clientId) {
        return this.get(`client_${clientId}`);
    },
    
    // Cache dla API
    cacheApiResponse: function(endpoint, data, ttl = 5 * 60 * 1000) { // 5 minut domyślnie
        this.set(`cache_${endpoint}`, data, ttl);
    },
    
    getCachedApiResponse: function(endpoint) {
        return this.get(`cache_${endpoint}`);
    }
};

// Eksport dla Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}