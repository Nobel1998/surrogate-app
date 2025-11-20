// Shared storage utility for AsyncStorage with fallback

let AsyncStorageLib;
const memoryStorage = {}; // Shared in-memory storage fallback

try {
  AsyncStorageLib = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  // Fallback to in-memory storage if AsyncStorage is not available
  console.log('AsyncStorage not available, using in-memory storage');
  AsyncStorageLib = {
    getItem: async (key) => {
      return Promise.resolve(memoryStorage[key] || null);
    },
    setItem: async (key, value) => {
      memoryStorage[key] = value;
      return Promise.resolve();
    },
    removeItem: async (key) => {
      delete memoryStorage[key];
      return Promise.resolve();
    },
  };
}

export default AsyncStorageLib;




