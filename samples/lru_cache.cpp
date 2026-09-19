#include <iostream>
#include <unordered_map>
#include <list>

using namespace std;

/**
 * LRU Cache implementation using hash map and doubly linked list.
 * Time Complexity: O(1) for both get and put
 * Space Complexity: O(capacity)
 * Difficulty Order: b (Medium)
 */
class LRUCache {
private:
    int capacity;
    list<pair<int, int>> cacheList; // {key, value}
    unordered_map<int, list<pair<int, int>>::iterator> cacheMap;

public:
    LRUCache(int cap) : capacity(cap) {}

    int get(int key) {
        auto it = cacheMap.find(key);
        if (it == cacheMap.end()) return -1;
        // Move accessed item to front
        cacheList.splice(cacheList.begin(), cacheList, it->second);
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = cacheMap.find(key);
        if (it != cacheMap.end()) {
            cacheList.splice(cacheList.begin(), cacheList, it->second);
            it->second->second = value;
            return;
        }

        if (cacheList.size() == capacity) {
            int lruKey = cacheList.back().first;
            cacheList.pop_back();
            cacheMap.erase(lruKey);
        }

        cacheList.emplace_front(key, value);
        cacheMap[key] = cacheList.begin();
    }
};

int main() {
    LRUCache cache(2);
    cache.put(1, 10);
    cache.put(2, 20);
    cout << "get(1): " << cache.get(1) << endl;
    cache.put(3, 30); // evicts key 2
    cout << "get(2): " << cache.get(2) << endl; // returns -1
    return 0;
}
