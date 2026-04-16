#include<iostream>
#include<string>
#include<sstream>
class Heap;
Heap* heapPtr;
class Heap {
	int* arr;
	int front;
	int size;
	void swap(int& a, int& b) {
		int temp = a;
		a = b;
		b = temp;
	}
	std::string PerculateUp() {
		std::stringstream ss;
		for (int i = front; i >1;)
		{
			int parent = i / 2;
			if (arr[i] < arr[parent]) {
				swap(arr[i],arr[parent]);
				ss << "\"Swapping " << arr[i] << " with Parent " << arr[parent] << ".\",";
			}
			i /= 2;
		}
        std::string result = ss.str();
        if (result.length() > 0 && result.back() == ',') {
            result.pop_back();
        }
		return result;
	}
	int min(int a, int b) { return arr[a] < arr[b] ? a : b; }
	std::string PerculateDown() {
		std::stringstream ss;
		for (int i = 1; i <= front;)
		{
			if (2 * i > front)break;
			int minIndex = min(2 * i, 2 * i + 1);
			if (arr[i] > arr[minIndex]) {
				swap(arr[i], arr[minIndex]);
				ss << "\"Swapping " << arr[i] << " with Child " << arr[minIndex] << ".\",";
			}
			i = minIndex;
		}
		std::string result = ss.str();
		if (result.length() > 0 && result.back() == ',') {
			result.pop_back();
		}
		return result;
	}
public:
	Heap(int s) :size(s) { arr = new int[size + 1]; front = 0; }
	~Heap() { delete[] arr; }
	std::string InsertMinHeap(int data) {
		if (front >= size)return"";
		arr[++front] = data;
		return PerculateUp();
	}
	std::string ExtrxctMin(int &value) {
		if (front == 0)return "";
		value = arr[1];
		arr[1] = arr[front--];
		return PerculateDown();
		
	}
	std::string PrintMinHeap()const {
		std::stringstream ss;
		ss << "[";
		for (int i = 1; i <= front; i++) {
			ss << arr[i];
			if (i < front) ss << ",";
		}
		ss << "]";
		return ss.str();
	}
	bool isEmpty()const { return front == 0; }
	bool isFull()const { return front == size; }
};

char* create_heap_json_output(const std::string& action, int value, const std::string& steps_json) {
	std::string heap_array_str = heapPtr ? heapPtr->PrintMinHeap() : "[]";

	std::stringstream json_ss;
	json_ss << "{\"type\":\"minheap\",\"action\":\"" << action
		<< "\",\"value\":" << value
		<< ",\"heap\":" << heap_array_str
		<< ",\"steps\":[" << steps_json << "]}";

	std::string json_result = json_ss.str();

	char* c_str = (char*)malloc(json_result.length() + 1);
	if (c_str) {
		std::strcpy(c_str, json_result.c_str());
	}
	return c_str;
}



extern "C" {

	char* heap_init(int number) {
		if (heapPtr) {
			delete heapPtr;
		}
		heapPtr = new Heap(number);

		std::string steps = "[\"Min Heap initialized with capacity " + std::to_string(number) + ".\"]";
		return create_heap_json_output("init", 0, steps);
	}

	char* heap_insert(int data) {
		if (!heapPtr) {
			return create_heap_json_output("error", data, "[\"Error: Heap not initialized.\"]");
		}
		if (heapPtr->isFull()) {
			return create_heap_json_output("error", data, "[\"Error: Heap is full.\"]");
		}

		std::string operation = heapPtr->InsertMinHeap(data);

		std::string steps = "\"Inserted value " + std::to_string(data) + ".\"";
		if (!operation.empty()) {
			steps += "," + operation;
		}
		return create_heap_json_output("insert", data, steps);
	}

	char* heap_extract() {
		if (!heapPtr || heapPtr->isEmpty()) {
			// If uninitialized or empty, return appropriate error JSON
			std::string error_msg = heapPtr ? "Error: Heap is empty." : "Error: Heap not initialized.";
			return create_heap_json_output("error", 0, "[\"" + error_msg + "\"]");
		}
		int value=0;
		std::string operation = heapPtr->ExtrxctMin(value);

		// Build composite steps: Initial messages (quoted)
		std::string steps = "\"Extracted minimum value " + std::to_string(value) + ".\",\"Swapped root with last element.\"";

		if (!operation.empty()) {
			steps += "," + operation;
		}		
		return create_heap_json_output("extract", value, steps);
	}

	char* heap_get_state() {
		return create_heap_json_output("state", 0, "[\"Current state.\"]");
	}

	char* heap_destroy() {
		if (heapPtr) {
			delete heapPtr;
			heapPtr = nullptr;
		}
		return create_heap_json_output("destroy", 0, "[\"Heap instance destroyed.\"]");
	}

	// char* free_string(char* s) {
	// 	if (s) {
	// 		free(s);
	// 	}
	// 	// Return s pointer to match the original signature, even though memory is freed.
	// 	return s;
	// }

} // extern "C"