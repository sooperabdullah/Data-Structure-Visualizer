// File: heap.js
// Contains logic specific to the Binary Heap visualizer.

const HeapApp = {
    // WASM function references
    heapInitFunc: null,
    heapInsertFunc: null,
    heapExtractFunc: null,
    heapGetStateFunc: null, // Need get state for intermediate draws
    bindingsReady: false,
    animationDuration: 500, // 0.5 second delay per step

    initializeBindings: function() {
        if (!Wasm.isReady) {
            logStep("WASM runtime not ready for Heap bindings.", 'error');
            return;
        }
        this.heapInitFunc = Wasm.cwrap('heap_init', 'number', ['number']);
        this.heapInsertFunc = Wasm.cwrap('heap_insert', 'number', ['number']);
        this.heapExtractFunc = Wasm.cwrap('heap_extract', 'number', []);
        this.heapGetStateFunc = Wasm.cwrap('heap_get_state', 'number', []); // Needed for intermediate states
        this.bindingsReady = true;
        
        this.init(); 
    },

    init: function() {
        if (!this.bindingsReady) return;
        const size = parseInt(document.getElementById('heap-init-size').value, 10);
        
        const state = callCppAndParseJson(this.heapInitFunc, size);
        if (state && state.action !== 'error') {
            this.updateVisualization(state);
            logStep(`Heap initialized with capacity ${size}.`, 'success');
        } else if (state && state.action === 'error') {
            this.clearVisualization();
        } else {
            this.clearVisualization(); 
        }
    },

    insert: function() {
        if (!this.bindingsReady) return;
        const valueInput = document.getElementById('heap-insert-value');
        const value = parseInt(valueInput.value, 10);
        if (isNaN(value)) { logStep("Please enter a valid number.", 'warn'); return; }
        
        // Get initial state before insert
        const initialState = callCppAndParseJson(this.heapGetStateFunc);
        if (!initialState) return;

        // Perform insert and get all steps
        const resultState = callCppAndParseJson(this.heapInsertFunc, value);
        
        if (resultState && resultState.action !== 'error') {
            this.animateSteps(initialState, resultState);
            valueInput.value = value + 1;
        }
    },

    extract: function() {
        if (!this.bindingsReady) return;
        
        // Get initial state before extract
        const initialState = callCppAndParseJson(this.heapGetStateFunc);
        if (!initialState) return;

        // Perform extract and get all steps
        const resultState = callCppAndParseJson(this.heapExtractFunc);
        
        if (resultState && resultState.action !== 'error') {
             this.animateSteps(initialState, resultState);
        }
    },
    
    clearVisualization: function() {
        document.getElementById('heap-canvas').innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ccc">Heap is Empty</text>';
        document.getElementById('heap-array-view').innerHTML = '<p style="color:#999; margin: 0;">Array View: Initialize the Heap to see the contents.</p>';
    },
    
    // --- ANIMATION CORE ---
    animateSteps: function(initialState, finalState) {
        const finalHeapArray = finalState.heap || [];
        const steps = finalState.steps || [];

        // 1. First frame: Draw the *initial* state + inserted/extracted element highlight
        this.updateVisualization(initialState, finalState.value, finalState.action);
        
        logStep(`Starting animation for ${finalState.action.toUpperCase()}...`, 'detail');

        setTimeout(() => {
            this.updateVisualization(finalState, null, finalState.action);
            logStep(`${finalState.action.toUpperCase()} complete.`, 'success');
        }, this.animationDuration); // Wait 500ms before showing final result
    },


    updateVisualization: function(state, focusValue = null, action = null) {
        const heapArray = state.heap || [];
        const arrayView = document.getElementById('heap-array-view');
        const svgCanvas = document.getElementById('heap-canvas');
        
        // 1. Update Array View
        arrayView.innerHTML = '';
        heapArray.forEach((value, index) => {
            const nodeDiv = document.createElement('div');
            nodeDiv.className = 'array-node';
            nodeDiv.textContent = `[${index+1}] ${value}`; 
            
            let isAffected = (value === focusValue && focusValue !== null);

            if (isAffected) nodeDiv.classList.add('highlight');
            arrayView.appendChild(nodeDiv);
        });

        // 2. Update Tree Visualization (SVG)
        svgCanvas.innerHTML = '';
        if (heapArray.length === 0) {
            this.clearVisualization();
            return;
        }

        // --- Dynamic Positioning Logic ---
        const width = svgCanvas.clientWidth || 800; 
        const height = svgCanvas.clientHeight || 450;
        const nodeRadius = 20;
        const nodeCount = heapArray.length;
        
        // Calculate max depth needed
        const maxDepth = Math.ceil(Math.log2(nodeCount + 1));
        const verticalSpacing = height / (maxDepth + 1);

        // Pre-calculate positions
        const positions = [];
        for (let i = 0; i < nodeCount; i++) {
            const depth = Math.floor(Math.log2(i + 1)) + 1;
            const nodesAtDepth = Math.pow(2, depth - 1);
            const indexAtDepth = i - (Math.pow(2, depth - 1) - 1); // 0-based index at this level
            
            // Calculate horizontal spacing (including margins)
            const levelWidth = width / nodesAtDepth;
            const x = levelWidth * (indexAtDepth + 0.5);
            const y = verticalSpacing * depth;
            positions.push({ x: x, y: y });
        }


        // 3. Draw Edges and Nodes
        for (let i = 0; i < nodeCount; i++) {
            const value = heapArray[i];
            const pos = positions[i];
            
            // Draw connecting line to parent
            if (i > 0) {
                const parentIndex = Math.floor((i - 1) / 2);
                const parentPos = positions[parentIndex];
                
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', pos.x); line.setAttribute('y1', pos.y-nodeRadius);
                line.setAttribute('x2', parentPos.x); line.setAttribute('y2', parentPos.y+nodeRadius);
                line.setAttribute('class', 'tree-link');
                svgCanvas.appendChild(line);
            }

            // Draw node circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x); circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', nodeRadius);
            circle.setAttribute('class', 'tree-node-circle');
            
            // Highlight logic
            let isAffected = (value === focusValue && focusValue !== null);
            
            if (isAffected) circle.classList.add('highlight');

            svgCanvas.appendChild(circle);

            // Draw node text
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x); text.setAttribute('y', pos.y + 5);
            text.textContent = value;
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('class', 'tree-node-text');
            if (isAffected) text.setAttribute('fill', '#333'); // Dark text on light highlight
            svgCanvas.appendChild(text);
        }
    }
};

// Register the module with the main app controller
AppRegistry['heap-view'] = HeapApp;