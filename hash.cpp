#include <sstream>
#include <string>
#include <cstring> // For strcpy
#include <stdlib.h> // For malloc/free

// --- Global Management ---
class Hash;
Hash* hashTablePtr = nullptr;

// --- Hash Class Definition (Chaining) ---
class Hash {
private:
    // Hashed array size (number of buckets)
    int hashSize; 

    struct Node {
        int data;
        Node* nextNode;
        Node() : data(-1), nextNode(NULL) {} // Sentinel node default
        Node(int v) : data(v), nextNode(NULL) {}
    } *list; // Array of bucket sentinel heads

    // Helper to calculate hash index
    int calculateIndex(int value) const {
        // Simple modulo hash, ensuring positive result for negative inputs
        return (value % hashSize + hashSize) % hashSize;
    }

public:
    Hash(int s) : hashSize(s) {
        // Create an array of sentinel nodes (buckets)
        list = new Node[hashSize]; 
    }

    ~Hash() { 
        // Iterate through all buckets and free the linked list nodes
        for (int i = 0; i < hashSize; ++i) {
            Node* curr = list[i].nextNode;
            while (curr != NULL) {
                Node* next = curr->nextNode;
                delete curr;
                curr = next;
            }
        }
        delete[] list; 
    }

    // Insert value into the Hash Table
    std::string Insert(int value) {
        std::stringstream ss;
        int index = calculateIndex(value);
        
        // Find the end of the chain starting from the bucket sentinel head
        Node* curr = &list[index];
        int chainLength = 0;

        // Check for duplicates before insertion
        while (curr->nextNode != NULL) {
            curr = curr->nextNode;
            chainLength++;
        }

        // Insert new node at the end of the chain
        curr->nextNode = new Node(value);
        chainLength++;
        
        ss << "\"Inserted value " << value << " at bucket " << index << " (Chain length: " << chainLength << ").\"";
        return ss.str();
    }

    // Search for a value in the Hash Table
    std::string Search(int value) {
        std::stringstream ss;
        int index = calculateIndex(value);

        Node* curr = list[index].nextNode; // Start search from the first data node (skip sentinel)
        int step = 0;
        
        while (curr != NULL) {
            step++;
            if (curr->data == value) {
                ss << "\"Found value " << value << " at bucket " << index << ", step " << step << ".\"";
                return ss.str();
            }
            curr = curr->nextNode;
        }

        ss << "\"Value " << value << " not found after checking " << step << " steps in bucket " << index << ".\"";
        return ss.str();
    }
    
    // Deletion (Required for completeness)
    std::string Delete(int value) {
        std::stringstream ss;
        int index = calculateIndex(value);
        
        Node* prev = &list[index]; // Start at sentinel head
        Node* curr = prev->nextNode; 
        int step = 0;

        while (curr != NULL) {
            step++;
            if (curr->data == value) {
                prev->nextNode = curr->nextNode;
                delete curr;
                ss << "\"Deleted value " << value << " from bucket " << index << ".\"";
                return ss.str();
            }
            prev = curr;
            curr = curr->nextNode;
        }
        
        ss << "\"Value " << value << " not found for deletion.\"";
        return ss.str();
    }


    // Serialize the entire Hash Table state to JSON format
    std::string PrintHash() const {
        std::stringstream ss;
        ss << "[";
        bool firstBucket = true;

        for (int i = 0; i < hashSize; i++) {
            if (!firstBucket) ss << ",";
            ss << "{\"bucket\":" << i << ",\"chain\":[";
            
            Node* curr = list[i].nextNode; // Start from the first data node
            bool firstNode = true;

            while (curr != NULL) {
                if (!firstNode) ss << ",";
                ss << curr->data;
                firstNode = false;
                curr = curr->nextNode;
            }
            ss << "]}";
            firstBucket = false;
        }
        ss << "]";
        return ss.str();
    }
    
    int getSize() const {
        return hashSize;
    }
};

// --- WASM Bridge Helpers ---

char* create_hash_json_output(const std::string& action, int value, const std::string& steps_json, const std::string& hash_json) {
    
    std::stringstream json_ss;
    json_ss << "{\"type\":\"hash\",\"action\":\"" << action
            << "\",\"value\":" << value
            << ",\"hashTable\":" << hash_json 
            << ",\"steps\":[" << steps_json << "]}"; 

	std::string json_result = json_ss.str();

	char* c_str = (char*)malloc(json_result.length() + 1);
	if (c_str) {
		std::strcpy(c_str, json_result.c_str());
	}
	return c_str;
}

// --- Exported C Functions ---

extern "C" {

	char* hash_init(int size) {
		if (hashTablePtr) {
			delete hashTablePtr;
		}
		hashTablePtr = new Hash(size);
        
        std::string steps = "\"Hash Table initialized with " + std::to_string(size) + " buckets.\"";
        std::string hash_state = hashTablePtr->PrintHash();
		return create_hash_json_output("init", size, steps, hash_state);
	}

	char* hash_insert(int value) {
		if (!hashTablePtr) { 
			return create_hash_json_output("error", value, "\"Error: Hash Table not initialized.\"", "[]");
		}
        
        std::string logs = hashTablePtr->Insert(value);
        std::string hash_state = hashTablePtr->PrintHash();
        
        // FIX: Conditionally add the comma separator
		std::string steps = "\"Inserting " + std::to_string(value) + ".\"";
        if (!logs.empty()) {
            steps += "," + logs;
        }
        
		return create_hash_json_output("insert", value, steps, hash_state);
	}
    
	char* hash_search(int value) {
		if (!hashTablePtr) { 
			return create_hash_json_output("error", value, "\"Error: Hash Table not initialized.\"", "[]");
		}
        
        std::string logs = hashTablePtr->Search(value);
        std::string hash_state = hashTablePtr->PrintHash();
        
        // FIX: Conditionally add the comma separator
		std::string steps = "\"Searching for " + std::to_string(value) + ".\"";
        if (!logs.empty()) {
            steps += "," + logs;
        }
        
		return create_hash_json_output("search", value, steps, hash_state);
	}
    
	char* hash_delete(int value) {
		if (!hashTablePtr) { 
			return create_hash_json_output("error", value, "\"Error: Hash Table not initialized.\"", "[]");
		}
        
        std::string logs = hashTablePtr->Delete(value);
        std::string hash_state = hashTablePtr->PrintHash();
        
        // FIX: Conditionally add the comma separator
		std::string steps = "\"Deleting " + std::to_string(value) + ".\"";
        if (!logs.empty()) {
            steps += "," + logs;
        }
        
		return create_hash_json_output("delete", value, steps, hash_state);
	}

	char* hash_get_state() {
        std::string hash_state = hashTablePtr ? hashTablePtr->PrintHash() : "[]";
		return create_hash_json_output("state", 0, "\"Current state.\"", hash_state);
	}
} // extern "C"