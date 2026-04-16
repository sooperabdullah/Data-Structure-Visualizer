#include <sstream>
#include <string>
#include <cstring> // For strcpy
#include <stdlib.h> // For malloc/free
#include <iostream> // For std::to_string

// Define a large number for infinity in algorithms
const int INF = 1000000000; 

// --- Global Management ---
class Graph;
Graph* graphPtr = nullptr;

// --- Node Definition for Adjacency List ---
struct AdjNode {
    int weight;
    AdjNode* nextNode;
    int adjacent_vertex;
    AdjNode() : nextNode(NULL), adjacent_vertex(0), weight(0) {}
    AdjNode(int v, int w) : nextNode(NULL), adjacent_vertex(v), weight(w) {}
};

// --- Non-STL Stack Implementation (for DFS) ---
// Specialized for int data
class Stack {
private:
    struct StackNode {
        int data;
        StackNode* next;
    };
    StackNode* topNode;

public:
    Stack() : topNode(NULL) {}
    ~Stack() { while (!empty()) pop(); }

    void push(int data) {
        StackNode* newNode = new StackNode();
        newNode->data = data;
        newNode->next = topNode;
        topNode = newNode;
    }

    int pop() {
        if (empty()) return -1; 
        StackNode* temp = topNode;
        int data = temp->data;
        topNode = topNode->next;
        delete temp;
        return data;
    }

    int top() const {
        if (empty()) return -1;
        return topNode->data;
    }

    bool empty() const {
        return topNode == NULL;
    }

    // Serialization helper
    std::string toJsonString() const {
        std::stringstream ss;
        ss << "[";
        StackNode* current = topNode;
        bool first = true;
        // Output from top to bottom
        while (current != NULL) {
            if (!first) ss << ",";
            ss << current->data;
            first = false;
            current = current->next;
        }
        ss << "]";
        return ss.str();
    }
};

// --- Non-STL Queue Implementation (for BFS) ---
// Specialized for int data
class Queue {
private:
    struct QueueNode {
        int data;
        QueueNode* next;
    };
    QueueNode* q_front;
    QueueNode* q_rear;

public:
    Queue() : q_front(NULL), q_rear(NULL) {}
    ~Queue() { while (!empty()) dequeue(); }

    void enqueue(int data) {
        QueueNode* temp = new QueueNode();
        temp->data = data;
        temp->next = NULL;
        if (q_rear == NULL) {
            q_front = q_rear = temp;
            return;
        }
        q_rear->next = temp;
        q_rear = temp;
    }

    int dequeue() {
        if (empty()) return -1;
        QueueNode* temp = q_front;
        int data = temp->data;
        q_front = q_front->next;
        if (q_front == NULL) q_rear = NULL;
        delete temp;
        return data;
    }

    bool empty() const {
        return q_front == NULL;
    }

    // Serialization helper
    std::string toJsonString() const {
        std::stringstream ss;
        ss << "[";
        QueueNode* current = q_front;
        bool first = true;
        // Output from front to rear
        while (current != NULL) {
            if (!first) ss << ",";
            ss << current->data;
            first = false;
            current = current->next;
        }
        ss << "]";
        return ss.str();
    }
};

// --- Non-STL Min Heap Structure (for Dijkstra's/Prim's PQ) ---
struct KeyDistance {
    int vertex;
    int distance;
    bool operator>(const KeyDistance& other) const { return distance > other.distance; }
    bool operator<(const KeyDistance& other) const { return distance < other.distance; }
};

class MinHeap {
private:
    KeyDistance* arr;
    int capacity;
    int front; // Current size (1-based index of last element)

    void swap(int i, int j) {
        KeyDistance temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    void heapifyUp(int i) {
        while (i > 1 && arr[i] < arr[i / 2]) {
            swap(i, i / 2);
            i /= 2;
        }
    }

    void heapifyDown(int i) {
        while (2 * i <= front) {
            int left = 2 * i;
            int right = 2 * i + 1;
            int smallest = left;

            if (right <= front && arr[right] < arr[left]) {
                smallest = right;
            }

            if (arr[i] > arr[smallest]) {
                swap(i, smallest);
                i = smallest;
            } else {
                break;
            }
        }
    }

public:
    MinHeap(int cap) : capacity(cap) {
        arr = new KeyDistance[cap + 1];
        front = 0;
    }
    ~MinHeap() { delete[] arr; }

    void insert(int v, int d) {
        if (front >= capacity) return;
        arr[++front] = {v, d};
        heapifyUp(front);
    }

    KeyDistance extractMin() {
        if (front == 0) return {-1, -1};
        KeyDistance minVal = arr[1];
        arr[1] = arr[front--];
        if (front > 0) heapifyDown(1);
        return minVal;
    }
    
    bool empty() const { return front == 0; }

    // Serialization helper (FIXED: Ensure no trailing comma)
    std::string toJsonString() const {
        std::stringstream ss;
        ss << "[";
        bool first = true;
        for (int i = 1; i <= front; ++i) {
            if (!first) ss << ",";
            ss << "{\"v\":" << arr[i].vertex << ",\"d\":" << arr[i].distance << "}";
            first = false;
        }
        ss << "]";
        return ss.str();
    }
};


// --- Graph Class Definition ---

class Graph {
public:
	struct Node {
		int weight;
		Node* nextNode;
		int adjacent_vertex;
		Node() : nextNode(NULL), adjacent_vertex(0), weight(0) {}
        Node(int v, int w) : nextNode(NULL), adjacent_vertex(v), weight(w) {}
	} *list; // Array of linked list sentinel heads
	
private:
	int vertix;
    
public:
	Graph(int v) : vertix(v) { 
        list = new Node[vertix]; 
    }

	~Graph() { 
        for (int i = 0; i < vertix; ++i) {
            Node* current = list[i].nextNode;
            while (current != NULL) {
                Node* next = current->nextNode;
                delete current;
                current = next;
            }
        }
        delete[] list; 
    }

	void addEdge(int from, int to, int weight) {
		if (from >= vertix || to >= vertix || from < 0 || to < 0) return;
        
        Node* temp = list[from].nextNode;
        while(temp != NULL) {
            if (temp->adjacent_vertex == to) return; 
            temp = temp->nextNode;
        }

		Node* newNode = new Node(to, weight);
		newNode->nextNode = list[from].nextNode;
        list[from].nextNode = newNode;
	}
    
	void removeEdge(int from, int to) {
		if (from >= vertix || to >= vertix || from < 0 || to < 0) return;
        
		Node* head = &list[from]; 
		Node* prev = head;
		Node* curr = head->nextNode; 
        
		while (curr != NULL) {
			if (curr->adjacent_vertex == to) {
				prev->nextNode = curr->nextNode;
				delete curr;
				return;
			}
			prev = curr;
			curr = curr->nextNode;
		}
	}
    
	void removeVertex(int v) {
        if (v >= vertix || v < 0) return;
        
        Node* current = list[v].nextNode;
        while (current != NULL) {
            Node* next = current->nextNode;
            delete current;
            current = next;
        }
        list[v].nextNode = NULL;
        
        for (int i = 0; i < vertix; i++) {
            if (i != v) {
                removeEdge(i, v);
            }
        }
	}
    
	std::string getEdgesJsonString() const {
		std::stringstream ss;
		ss << "[";
        bool first_edge = true;
        
		for (int i = 0; i < vertix; i++) {
			Node* temp = list[i].nextNode;
			while (temp != NULL) {
				if (!first_edge) ss << ",";
				ss << "{\"f\":" << i 
                   << ",\"t\":" << temp->adjacent_vertex 
                   << ",\"w\":" << temp->weight << "}";
				first_edge = false;
				temp = temp->nextNode;
			}
		}
		ss << "]";
		return ss.str();
	}

    // Helper to serialize distances/keys/parents array
    std::string getArrayJsonString(const int* arr) const {
        std::stringstream ss;
        ss << "[";
        for (int i = 0; i < vertix; ++i) {
            if (i > 0) ss << ",";
            // Use "INF" or the value
            if (arr[i] == INF) ss << "\"INF\""; 
            else ss << arr[i];
        }
        ss << "]";
        return ss.str();
    }
    
    // Helper to serialize the final shortest path/MST edges
    std::string getFinalEdgesJsonString(const int* parent) const {
        std::stringstream ss;
        ss << "[";
        bool first = true;
        for (int v = 0; v < vertix; ++v) {
            if (parent[v] != -1) {
                if (!first) ss << ",";
                // Find weight of edge (parent[v] -> v)
                Node* current_edge = list[parent[v]].nextNode;
                int weight = 0;
                while (current_edge != NULL) {
                    if (current_edge->adjacent_vertex == v) {
                        weight = current_edge->weight;
                        break;
                    }
                    current_edge = current_edge->nextNode;
                }
                ss << "{\"f\":" << parent[v] << ",\"t\":" << v << ",\"w\":" << weight << "}";
                first = false;
            }
        }
        ss << "]";
        return ss.str();
    }


    // --- 1. BFS Algorithm (State tracking Queue) ---
	std::string run_bfs(int startIndex) {
		if (startIndex >= vertix || startIndex < 0) {
            return "[\"Error: Invalid start vertex.\"]";
        }

		Queue q;
		int* visited = new int[vertix]; // 0=unvisited, 1=queued, 2=visited
		for (int i = 0; i < vertix; ++i) visited[i] = 0;

		std::stringstream ss;
		
		// 1. Initialization Step
		visited[startIndex] = 1; // Mark as queued
		q.enqueue(startIndex);
		
		ss << "\"Initialized BFS. Start node: " << startIndex << ".\",";
		ss << "{\"q\":" << q.toJsonString() << ", \"v\":" << startIndex << ", \"action\":\"visit_start\", \"nodes\":[{\"n\":" << startIndex << ",\"s\":1}]}"; 

		// 2. Main BFS Loop
		while (!q.empty()) {
			int u = q.dequeue();
			
			visited[u] = 2; 

			// Add step for dequeuing
			ss << ",{\"q\":" << q.toJsonString() << ", \"v\":" << u << ", \"action\":\"dequeue\", \"nodes\":[{\"n\":" << u << ",\"s\":2}]}";
			
			// Iterate over neighbors of u
			Node* current_edge = list[u].nextNode;
			while (current_edge != NULL) {
				int v = current_edge->adjacent_vertex;
				
				if (visited[v] == 0) {
					visited[v] = 1; // Mark as queued
					q.enqueue(v);
					
					// Add step for edge traversal and enqueuing
					ss << ",{\"q\":" << q.toJsonString() << ", \"v\":" << v << ", \"action\":\"enqueue\", \"edge\":[" << u << "," << v << "], \"nodes\":[{\"n\":" << v << ",\"s\":1}]}";
				}
				
				current_edge = current_edge->nextNode;
			}
		}
		
		delete[] visited;

		std::string result = ss.str();
		if (result.length() > 0 && result.back() == ',') result.pop_back();
		
		return "[" + result + "]";
    }
    
    // --- 2. DFS Algorithm (State tracking Stack) ---
    std::string run_dfs(int startIndex) {
		if (startIndex >= vertix || startIndex < 0) return "[\"Error: Invalid start vertex.\"]";
        
        Stack s;
		int* visited = new int[vertix]; 
		for (int i = 0; i < vertix; ++i) visited[i] = 0;
        
		std::stringstream ss;

		s.push(startIndex);
		visited[startIndex] = 1; //Pushed
		
		ss << "\"Initialized DFS. Start node: " << startIndex << ".\",";
        ss << "{\"s\":" << s.toJsonString() << ", \"v\":" << startIndex << ", \"action\":\"push_start\", \"nodes\":[{\"n\":" << startIndex << ",\"st\":1}]}"; 

		while (!s.empty()) {
			int u = s.top(); 
            
            if (visited[u] == 2) {
                s.pop();
                ss << ",{\"s\":" << s.toJsonString() << ", \"v\":" << u << ", \"action\":\"pop\", \"nodes\":[{\"n\":" << u << ",\"st\":2}]}";
                continue;
            }
            
            visited[u] = 2; 

            ss << ",{\"s\":" << s.toJsonString() << ", \"v\":" << u << ", \"action\":\"visit\", \"nodes\":[{\"n\":" << u << ",\"st\":2}]}";

			Node* curr = list[u].nextNode;
			bool pushed_new = false;
            
			while (curr != NULL) {
				int v = curr->adjacent_vertex;
				if (visited[v] == 0) {
					s.push(v);
					visited[v] = 1;
                    pushed_new = true;
                    
                    ss << ",{\"s\":" << s.toJsonString() << ", \"v\":" << v << ", \"action\":\"push\", \"edge\":[" << u << "," << v << "], \"nodes\":[{\"n\":" << v << ",\"st\":1}]}";
					break; 
				}
				curr = curr->nextNode;
			}
            
            if (!pushed_new) {
                s.pop();
                ss << ",{\"s\":" << s.toJsonString() << ", \"v\":" << u << ", \"action\":\"pop_backtrack\", \"nodes\":[{\"n\":" << u << ",\"st\":2}]}";
            }
		}
		
		delete[] visited;
        
        std::string result = ss.str();
        if (result.length() > 0 && result.back() == ',') result.pop_back();
        
        return "[" + result + "]";
    }
    
    // --- 3. Dijkstra's Algorithm (State tracking PQ, Distances) ---
    std::string run_dijkstra(int startIndex) {
		if (startIndex >= vertix || startIndex < 0) return "[\"Error: Invalid start vertex.\"]";

		int* dist = new int[vertix];
        int* parent = new int[vertix]; // To track the shortest path tree
        bool* finalized = new bool[vertix];   //Visited

		for (int i = 0; i < vertix; ++i) {
			dist[i] = INF;
            parent[i] = -1;
            finalized[i] = false;
		}

		dist[startIndex] = 0;
		MinHeap pq(vertix * 2); 
		
		std::stringstream ss;
        
		pq.insert(startIndex, 0);
		
		ss << "\"Initialized Dijkstra's. Start node: " << startIndex << ".\",";
        ss << "{\"pq\":" << pq.toJsonString() << ", \"dist\":" << getArrayJsonString(dist) << ", \"action\":\"init_start\", \"v\":" << startIndex << ", \"nodes\":[{\"n\":" << startIndex << ",\"s\":1}]}"; 
        
        while (!pq.empty()) {
            KeyDistance current = pq.extractMin();
            int u = current.vertex;
            
            if (finalized[u]) continue;
            finalized[u] = true;
            
            // Add step for extracting the minimum
            ss << ",{\"pq\":" << pq.toJsonString() << ", \"dist\":" << getArrayJsonString(dist) << ", \"action\":\"extract_min\", \"v\":" << u << ", \"nodes\":[{\"n\":" << u << ",\"s\":2}]}";

            Node* current_edge = list[u].nextNode;
            while (current_edge != NULL) {
                int v = current_edge->adjacent_vertex;
                int weight = current_edge->weight;

                if (!finalized[v]) {
                    if (dist[u] != INF && (dist[u] + weight < dist[v])) {
                        dist[v] = dist[u] + weight;
                        parent[v] = u; // Track parent for shortest path tree
                        pq.insert(v, dist[v]);
                        
                        // Add step for relaxation
                        ss << ",{\"pq\":" << pq.toJsonString() << ", \"dist\":" << getArrayJsonString(dist) << ", \"action\":\"relax\", \"edge\":[" << u << "," << v << "], \"nodes\":[{\"n\":" << v << ",\"s\":1}]}";
                    }
                }
                current_edge = current_edge->nextNode;
            }
        }
        
        // Final summary step: Total path cost and final edges
        std::string final_edges = getFinalEdgesJsonString(parent);
        
        // Output final array state for visualization
        ss << ",\"" << "Dijkstra's complete. Final shortest paths calculated.\",";
        ss << "{\"final_dist\":" << getArrayJsonString(dist) << ", \"final_sp_edges\":" << final_edges << ", \"action\":\"final_result\"}";
        
        
		delete[] dist;
        delete[] parent;
        delete[] finalized;
        
        std::string result = ss.str();
        if (result.length() > 0 && result.back() == ',') result.pop_back();
        
        return "[" + result + "]";
    }


    // --- 4. Prim's Algorithm (MST) ---
    std::string run_prims(int startIndex) {
		if (startIndex >= vertix || startIndex < 0) return "[\"Error: Invalid start vertex.\"]";

		// Setup arrays (non-STL)
		int* key = new int[vertix]; 
        int* parent = new int[vertix]; // Parent array to store MST structure
        bool* inMST = new bool[vertix];

		for (int i = 0; i < vertix; ++i) {
			key[i] = INF;
            parent[i] = -1;
            inMST[i] = false;
		}

		key[startIndex] = 0;
		MinHeap pq(vertix * 2); // Priority Queue stores {vertex, key}
		
		std::stringstream ss;
        
        // 1. Initialization Step
		pq.insert(startIndex, 0);
		
		ss << "\"Initialized Prim's. Start node: " << startIndex << ".\",";
        ss << "{\"pq\":" << pq.toJsonString() << ", \"key\":" << getArrayJsonString(key) << ", \"action\":\"init_start\", \"v\":" << startIndex << ", \"nodes\":[{\"n\":" << startIndex << ",\"s\":1}]}"; 
        
        long long total_mst_cost = 0;

        // 2. Main Loop
        while (!pq.empty()) {
            KeyDistance current = pq.extractMin();
            int u = current.vertex;
            int current_key = current.distance;
            
            if (inMST[u]) continue;
            inMST[u] = true;
            
            if (parent[u] != -1) {
                total_mst_cost += current_key; 
            }
            
            // Add step for extracting the minimum
            ss << ",{\"pq\":" << pq.toJsonString() << ", \"key\":" << getArrayJsonString(key) << ", \"action\":\"extract_min\", \"v\":" << u << ", \"nodes\":[{\"n\":" << u << ",\"s\":2}]}";

            // Iterate over neighbors (v)
            Node* current_edge = list[u].nextNode;
            while (current_edge != NULL) {
                int v = current_edge->adjacent_vertex;
                int weight = current_edge->weight;

                if (!inMST[v]) {
                    // Check if current edge weight is smaller than the current key for v
                    if (weight < key[v]) {
                        key[v] = weight;
                        parent[v] = u; // update parent in MST
                        pq.insert(v, key[v]);//Decrease
                        
                        // Add step for key update/PQ insert
                        ss << ",{\"pq\":" << pq.toJsonString() << ", \"key\":" << getArrayJsonString(key) << ", \"action\":\"key_update\", \"edge\":[" << u << "," << v << "], \"nodes\":[{\"n\":" << v << ",\"s\":1}]}";
                    }
                }
                current_edge = current_edge->nextNode;
            }
        }

        // Final summary step: Total MST cost and final edges
        std::string final_edges = getFinalEdgesJsonString(parent);
        
        // Output final array state for visualization
        ss << ",\"" << "Prim's complete. Total MST Cost: " << total_mst_cost << "\",";
        ss << "{\"final_cost\":" << total_mst_cost << ", \"final_key\":" << getArrayJsonString(key) << ", \"final_mst_edges\":" << final_edges << ", \"action\":\"final_result\"}";
        
        
		delete[] key;
        delete[] parent;
        delete[] inMST;
        
        std::string result = ss.str();
        if (result.length() > 0 && result.back() == ',') result.pop_back();
        
        return "[" + result + "]";
    }


};


char* create_graph_json_output(const std::string& action, int value, const std::string& steps_json, const std::string& edges_json) {
	
    std::stringstream json_ss;
    json_ss << "{\"type\":\"graph\",\"action\":\"" << action
            << "\",\"value\":" << value
            << ",\"edges\":" << edges_json
            << ",\"steps\":" << steps_json << "}"; 

	std::string json_result = json_ss.str();

	char* c_str = (char*)malloc(json_result.length() + 1);
	if (c_str) {
		std::strcpy(c_str, json_result.c_str());
	}
	return c_str;
}

// --- Exported C Functions ---

extern "C" {

	char* graph_init(int number) {
		if (graphPtr) {
            delete graphPtr; 
		}
		graphPtr = new Graph(number);
        
		std::string steps = "\"Initialized graph with " + std::to_string(number) + " vertices.\"";
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("init", number, "[" + steps + "]", edges);
	}
    
    char* graph_add_edge(int from, int to, int weight) {
        if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        graphPtr->addEdge(from, to, weight);
        
        std::string steps = "\"Added edge " + std::to_string(from) + " -> " + std::to_string(to) + " (w=" + std::to_string(weight) + ").\"";
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("add_edge", 0, "[" + steps + "]", edges);
    }
    
    char* graph_remove_edge(int from, int to) {
        if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        graphPtr->removeEdge(from, to);
        
        std::string steps = "\"Removed edge " + std::to_string(from) + " -> " + std::to_string(to) + ".\"";
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("remove_edge", 0, "[" + steps + "]", edges);
    }
    
    char* graph_remove_vertex(int v) {
         if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        graphPtr->removeVertex(v);
        
        std::string steps = "\"Removed vertex " + std::to_string(v) + " and all connected edges.\"";
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("remove_vertex", 0, "[" + steps + "]", edges);
    }

    char* graph_run_bfs(int startVertex) {
        if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        std::string steps = graphPtr->run_bfs(startVertex);
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("run_bfs", startVertex, steps, edges);
    }
    
    char* graph_run_dfs(int startVertex) {
        if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        std::string steps = graphPtr->run_dfs(startVertex);
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("run_dfs", startVertex, steps, edges);
    }
    
    char* graph_run_dijkstra(int startVertex) {
        if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        std::string steps = graphPtr->run_dijkstra(startVertex);
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("run_dijkstra", startVertex, steps, edges);
    }
    
    char* graph_run_prims(int startVertex) {
        if (!graphPtr) {
            return create_graph_json_output("error", 0, "[\"Error: Graph not initialized.\"]", "[]");
        }
        std::string steps = graphPtr->run_prims(startVertex);
        std::string edges = graphPtr->getEdgesJsonString();
		return create_graph_json_output("run_prims", startVertex, steps, edges);
    }


	char* graph_get_state() {
        std::string edges = graphPtr ? graphPtr->getEdgesJsonString() : "[]";
		return create_graph_json_output("state", 0, "[\"Current state.\"]", edges);
	}


} // extern "C"