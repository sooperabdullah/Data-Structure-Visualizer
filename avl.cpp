#include <sstream>
#include <string>
#include <cstring> // For strcpy
#include <stdlib.h> // For malloc/free
#include <iostream> // For std::to_string, debugging

// --- Global Management ---
class Tree;
Tree* avlTreePtr = nullptr;

// Helper function to return the maximum of two integers
int max(int a, int b) {
    return (a > b) ? a : b;
}

// --- Node Definition ---
struct Node {
    Node* left;
    Node* right;
    int data;
    int height;
    int balance; // Added balance factor storage for clarity
    Node(int val) : data(val), left(nullptr), right(nullptr), height(1), balance(0) {}
};

// --- Tree Class Definition ---
class Tree {
private:
    Node* root;

    int Height(Node* root) const {
        return (root == nullptr) ? 0 : root->height;
    }

    // Calculates the balance factor (Left Height - Right Height)
    int getBalance(Node* root) const {
        return (root == nullptr) ? 0 : Height(root->left) - Height(root->right);
    }
    
    // --- Rotations ---
    
    // Single Right Rotation (LL Case)
    Node* SingleRightRotation(Node* z) {
        Node* y = z->left;
        Node* T3 = y->right;

        y->right = z;
        z->left = T3;

        // Update heights and balance factors
        z->height = 1 + max(Height(z->left), Height(z->right));
        y->height = 1 + max(Height(y->left), Height(y->right));
        z->balance = getBalance(z);
        y->balance = getBalance(y);

        return y; // New root
    }

    // Single Left Rotation (RR Case)
    Node* SingleLeftRotation(Node* z) {
        Node* y = z->right;
        Node* T2 = y->left;

        y->left = z;
        z->right = T2;

        // Update heights and balance factors
        z->height = 1 + max(Height(z->left), Height(z->right));
        y->height = 1 + max(Height(y->left), Height(y->right));
        z->balance = getBalance(z);
        y->balance = getBalance(y);

        return y; // New root
    }

    // Double Left-Right Rotation (LR Case)
    Node* DoubleLeftRightRotation(Node* z) {
        z->left = SingleLeftRotation(z->left); // RR rotation on z->left
        return SingleRightRotation(z); // LL rotation on z
    }

    // Double Right-Left Rotation (RL Case)
    Node* DoubleRightLeftRotation(Node* z) {
        z->right = SingleRightRotation(z->right); // LL rotation on z->right
        return SingleLeftRotation(z); // RR rotation on z
    }
    
    // --- Recursive Insertion ---
    
    // Inserts a node and returns the balanced subtree root and logs steps
    // NOTE: Logs are formatted as quoted JSON strings, ending with a comma if more follow.
    Node* insertRecursive(Node* root, int data, std::stringstream& ss) {
        // 1. Standard BST Insertion
        if (root == nullptr) {
            ss << "\"Inserted node " << data << ".\",";
            return new Node(data);
        }

        if (data < root->data) {
            root->left = insertRecursive(root->left, data, ss);
        } else if (data > root->data) {
            root->right = insertRecursive(root->right, data, ss);
        } else {
            ss << "\"Double value " << data << " is not allowed.\",";
            return root; // Duplicate data not allowed
        }

        // 2. Update Height and Balance Factor
        root->height = 1 + max(Height(root->left), Height(root->right));
        int balance = getBalance(root);
        root->balance = balance;

        // 3. Check for Unbalance and Perform Rotations
        
        // Left Heavy (balance > 1)
        if (balance > 1) {
            // Left-Left Case (LL): Right Rotation
            if (data < root->left->data) {
                ss << "\"Unbalance at " << root->data << ". LL Case: Right Rotation.\",";
                return SingleRightRotation(root);
            }
            // Left-Right Case (LR): Double Rotation
            if (data > root->left->data) {
                ss << "\"Unbalance at " << root->data << ". LR Case: Double Rotation.\",";
                return DoubleLeftRightRotation(root);
            }
        }

        // Right Heavy (balance < -1)
        if (balance < -1) {
            // Right-Right Case (RR): Left Rotation
            if (data > root->right->data) {
                ss << "\"Unbalance at " << root->data << ". RR Case: Left Rotation.\",";
                return SingleLeftRotation(root);
            }
            // Right-Left Case (RL): Double Rotation
            if (data < root->right->data) {
                ss << "\"Unbalance at " << root->data << ". RL Case: Double Rotation.\",";
                return DoubleRightLeftRotation(root);
            }
        }
        
        return root;
    }
    
    // Helper to find the node with minimum value (Successor)
    Node* minValueNode(Node* node) const {
        Node* current = node;
        while (current->left != nullptr)
            current = current->left;
        return current;
    }

    // Deletes a node and returns the balanced subtree root and logs steps
    Node* deleteRecursive(Node* root, int key, std::stringstream& ss) {
        if (root == nullptr) {
            ss << "\"Key " << key << " not found for deletion.\",";
            return root;
        }

        // 1. Standard BST Deletion Traversal
        if (key < root->data) {
            root->left = deleteRecursive(root->left, key, ss);
        } else if (key > root->data) {
            root->right = deleteRecursive(root->right, key, ss);
        } else {
            // Node found (root->data == key)
            
            // Case 1: Node with 0 or 1 child
            if ((root->left == nullptr) || (root->right == nullptr)) {
                Node* temp = root->left ? root->left : root->right;
                
                if (temp == nullptr) { 
                    // 0 children (Leaf Node)
                    ss << "\"Deleting leaf node " << root->data << ".\",";
                    temp = root;
                    root = nullptr;
                } else { 
                    // 1 child 
                    ss << "\"Deleting node " << root->data << ", replacing with single child " << temp->data << ".\",";
                    *root = *temp; 
                }
                delete temp;
            } 
            // Case 2: Node with 2 children
            else { 
                Node* temp = minValueNode(root->right); // Get in-order successor
                ss << "\"Deleting node " << root->data << ", replacing with successor " << temp->data << ".\",";
                
                root->data = temp->data; // Copy successor's data
                
                // Delete the successor from the right subtree
                root->right = deleteRecursive(root->right, temp->data, ss);
            }
        }

        if (root == nullptr) 
            return root;

        // 2. Update Height and Balance Factor
        root->height = 1 + max(Height(root->left), Height(root->right));
        int balance = getBalance(root);
        root->balance = balance;

        // 3. Check for Unbalance and Perform Rotations (Rebalancing)
        
        // Left Heavy (Balance > 1)
        if (balance > 1) {
            // Left-Left Case (LL): Single Right Rotation
            if (getBalance(root->left) >= 0) { 
                ss << "\"Unbalance after deletion at " << root->data << ". LL Case: Right Rotation.\",";
                return SingleRightRotation(root);
            }
            // Left-Right Case (LR): Double Rotation
            else { 
                ss << "\"Unbalance after deletion at " << root->data << ". LR Case: Double Rotation.\",";
                return DoubleLeftRightRotation(root);
            }
        }

        // Right Heavy (Balance < -1)
        if (balance < -1) {
            // Right-Right Case (RR): Single Left Rotation
            if (getBalance(root->right) <= 0) { 
                ss << "\"Unbalance after deletion at " << root->data << ". RR Case: Left Rotation.\",";
                return SingleLeftRotation(root);
            }
            // Right-Left Case (RL): Double Rotation
            else { 
                ss << "\"Unbalance after deletion at " << root->data << ". RL Case: Double Rotation.\",";
                return DoubleRightLeftRotation(root);
            }
        }
        
        return root;
    }

    // --- JSON Serialization ---

    // Recursive function to build JSON structure of the tree
    std::string serializeTree(Node* node) const {
        if (node == nullptr) {
            return "null";
        }
        
        std::stringstream ss;
        ss << "{\"data\":" << node->data
           << ",\"h\":" << node->height
           << ",\"b\":" << node->balance // Use stored balance factor
           << ",\"l\":" << serializeTree(node->left)
           << ",\"r\":" << serializeTree(node->right) << "}";
        
        return ss.str();
    }


public:
    Tree() : root(nullptr) {}
    
    // Function to run insertion and capture all steps
    std::string insert(int data, std::string& logs) {
        std::stringstream ss_logs;
        root = insertRecursive(root, data, ss_logs);
        
        // FIX 1: Remove trailing comma from logs before passing back
        std::string log_result = ss_logs.str();
        if (log_result.length() > 0 && log_result.back() == ',') {
            log_result.pop_back();
        }
        logs = log_result; 
        
        return serializeTree(root);
    }
    
    // Function to run deletion and capture all steps
    std::string deleteNode(int key, std::string& logs) {
        std::stringstream ss_logs;
        root = deleteRecursive(root, key, ss_logs);
        
        // FIX 1: Remove trailing comma from logs before passing back
        std::string log_result = ss_logs.str();
        if (log_result.length() > 0 && log_result.back() == ',') {
            log_result.pop_back();
        }
        logs = log_result;
        
        return serializeTree(root);
    }

    std::string getTreeState() const {
        return serializeTree(root);
    }
    
    // Destructor helper
    void destroyRecursive(Node* node) {
        if (node) {
            destroyRecursive(node->left);
            destroyRecursive(node->right);
            delete node;
        }
    }
    ~Tree() {
        destroyRecursive(root);
    }
};

// --- WASM Bridge Helpers ---

// The AVL structure will be passed back in the steps_json field for serialization efficiency.
char* create_avl_json_output(const std::string& action, int value, const std::string& steps_json, const std::string& tree_json) {
    
    std::stringstream json_ss;
    json_ss << "{\"type\":\"avl\",\"action\":\"" << action
            << "\",\"value\":" << value
            << ",\"tree\":" << tree_json // Full serialized tree structure
            << ",\"steps\":[" << steps_json << "]}"; // steps_json is already quoted/comma-separated

	std::string json_result = json_ss.str();

	char* c_str = (char*)malloc(json_result.length() + 1);
	if (c_str) {
		std::strcpy(c_str, json_result.c_str());
	}
	return c_str;
}

// --- Exported C Functions ---

extern "C" {
    
    char* avl_init() {
        if (avlTreePtr) {
            delete avlTreePtr;
        }
        avlTreePtr = new Tree();
        
        std::string steps = "\"AVL Tree initialized.\"";
        std::string tree_state = avlTreePtr->getTreeState();
		return create_avl_json_output("init", 0, steps, tree_state);
    }

	char* avl_insert(int data) {
		if (!avlTreePtr) { 
			return create_avl_json_output("error", data, "\"Error: Tree not initialized.\"", "null");
		}
        
        std::string logs;
        std::string tree_state = avlTreePtr->insert(data, logs); // logs filled by reference
        
        // FIX: Remove comma from start message and only add it if logs are present
        std::string steps = "\"Insertion of " + std::to_string(data) + " started.\"";
        if (!logs.empty()) {
            steps += "," + logs; 
        }
		return create_avl_json_output("insert", data, steps, tree_state);
	}
    
    char* avl_delete(int key) {
        if (!avlTreePtr) { 
			return create_avl_json_output("error", key, "\"Error: Tree not initialized.\"", "null");
		}
        
        std::string logs;
        std::string tree_state = avlTreePtr->deleteNode(key, logs); // logs filled by reference
        
		std::string steps = "\"Deletion of " + std::to_string(key) + " started.\"";
        if (!logs.empty()) {
            steps += "," + logs;
        }
        
		return create_avl_json_output("delete", key, steps, tree_state);
    }

	char* avl_get_state() {
        std::string tree_state = avlTreePtr ? avlTreePtr->getTreeState() : "null";
		return create_avl_json_output("state", 0, "\"Current state.\"", tree_state);
	}

	char* free_string(char* s) {
		if (s) {
			free(s);
		}
		return s;
	}
} // extern "C"