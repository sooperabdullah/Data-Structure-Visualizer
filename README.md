# 🌳 Structr: C++ Data Structure & Algorithm Engine

An interactive, high-performance web application designed to execute and visualize complex data structures and algorithms in real-time. 

Rather than relying on modern web frameworks for the heavy lifting, the core engine of this project is built entirely from scratch in **C++**, focusing on deep algorithmic logic and manual memory management. The C++ logic is then compiled to WebAssembly (WASM) to provide a seamless, interactive frontend experience.

## 🚀 Engineering Highlights

* **Zero-STL Backend:** Bypassed the C++ Standard Template Library (STL) to manually implement foundational structures. Custom `Stack`, `Queue`, and `MinHeap` classes were built using raw pointers to drive the graph traversal algorithms, demonstrating a ground-up understanding of system architecture.
* **Complex Algorithmic Logic:** Implemented advanced traversal and balancing algorithms, handling complex edge cases for self-balancing trees, weighted graphs, and collision-resistant hash maps.
* **Manual Memory Management:** Ensured strict memory safety and prevented leaks during dynamic node allocations/deletions by utilizing rigorous constructor and destructor paradigms across all data structures.
* **WebAssembly (WASM) Bridge:** Architected a seamless pipeline where the C++ backend calculates state changes and serializes them into optimized JSON strings. These strings are passed to the JavaScript frontend via Emscripten bindings for real-time DOM/SVG rendering.

## ✨ Implemented Systems

### 1. Graph Algorithms
Custom Adjacency List implementation supporting weighted, directed, and undirected graphs. Features step-by-step execution tracking for:
* **BFS & DFS:** Full state tracking of custom Queues and Stacks during graph traversal.
* **Dijkstra's Shortest Path:** Utilizes a custom-built Min-Heap to calculate, relax edges, and visualize shortest paths.
* **Prim's Minimum Spanning Tree (MST):** Real-time key updates and edge relaxation visualization.

### 2. AVL Tree
A self-balancing binary search tree that tracks balance factors and heights dynamically.
* Logic to detect imbalances and perform `LL`, `RR`, `LR`, and `RL` rotations.
* Automatic rebalancing upon dynamic insertions and complex deletions (e.g., in-order successor replacements).

### 3. Hash Table (Separate Chaining)
A collision-resistant hash map implementation.
* Visualizes the modulo hashing process across defined buckets.
* Demonstrates dynamic chaining, linked-list traversal, and pointer manipulation for searching, inserting, and deleting values.

### 4. Binary Min-Heap
A priority queue implementation demonstrating the mathematical relationship between tree structures and memory arrays.
* Dual-view state serialization that updates both the logical Tree shape and the underlying contiguous Array in real-time during `insert` and `extract_min` operations.

## 🛠️ Tech Stack
* **Core Engine:** C++ (OOP, Pointers, Manual Memory Allocation)
* **Web Deployment:** WebAssembly (WASM) / Emscripten
* **Frontend Visualization:** HTML5, CSS3, Vanilla JavaScript (DOM manipulation, SVG rendering)

## 👥 Collaboration & Roles
This project was developed as a 2-person group collaboration for our Data Structures & Algorithms coursework. 

**My primary contributions included:**
* Architecting the core C++ backend and standardizing the JSON serialization pipeline.
* Writing the non-STL foundational data structures (custom Stacks, Queues, Heaps).
* Implementing the complex graph traversal logic, specifically Dijkstra's Shortest Path and Prim's MST algorithms.
