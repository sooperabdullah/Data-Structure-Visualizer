// File: avl.js
// Contains logic specific to the AVL Tree visualizer, including rotation animation.

const AVLApp = {
    // WASM function references
    avlInitFunc: null,
    avlInsertFunc: null,
    avlDeleteFunc: null,
    bindingsReady: false,
    
    // Visualization state
    currentTreeState: null, // Stores the latest structural JSON tree
    animationSteps: [],     // Stores the detailed log steps from C++
    stepIndex: 0,           // Current step in the animation
    animationDuration: 1000, // 1 second delay per step/rotation
    
    // Layout control variables
    nodeRadius: 15,
    hSpacing: 65, // Increased horizontal spacing unit
    vSpacing: 70, // Fixed vertical spacing between levels
    layoutContext: { x: 0, y: 0, positions: new Map() }, // Stores calculated (x, y) coordinates
    
    initializeBindings: function() {
        if (!Wasm.isReady) {
            logStep("WASM runtime not ready for AVL bindings.", 'error');
            return;
        }
        this.avlInitFunc = Wasm.cwrap('avl_init', 'number', []);
        this.avlInsertFunc = Wasm.cwrap('avl_insert', 'number', ['number']);
        this.avlDeleteFunc = Wasm.cwrap('avl_delete', 'number', ['number']);
        this.avlGetStateFunc = Wasm.cwrap('avl_get_state', 'number', []);
        
        this.bindingsReady = true;
        this.init(); 
    },

    // --- Core Operations ---

    init: function() {
        if (!this.bindingsReady) return;
        
        const state = callCppAndParseJson(this.avlInitFunc);
        if (state && state.action !== 'error') {
            this.currentTreeState = state.tree;
            this.updateVisualization(state);
            logStep(`AVL Tree initialized.`, 'success');
        } else {
            this.clearVisualization();
        }
    },

    insert: function() {
        if (!this.bindingsReady) return;
        const valueInput = document.getElementById('avl-insert-value');
        const value = parseInt(valueInput.value, 10);
        if (isNaN(value)) { logStep("Please enter a valid number.", 'warn'); return; }
        
        const resultState = callCppAndParseJson(this.avlInsertFunc, value);
        
        if (resultState && resultState.action !== 'error') {
            this.currentTreeState = resultState.tree;
            // FIX: Ensure logs are filtered to remove initial 'Inserted node X' message 
            this.animationSteps = resultState.steps.filter(s => typeof s === 'string' && !s.includes('Inserted node'));
            this.stepIndex = 0;
            
            document.querySelectorAll('#avl-view .controls button').forEach(btn => btn.disabled = true);
            
            // Initial redraw with insertion highlight
            this.updateVisualization({ tree: this.currentTreeState, focus: value, rotation: null });
            this.animateSteps();
            valueInput.value = value + 1;
        }
    },
    
    delete: function() {
        if (!this.bindingsReady) return;
        const keyInput = document.getElementById('avl-delete-key');
        const key = parseInt(keyInput.value, 10);
        if (isNaN(key)) { logStep("Please enter a key to delete.", 'warn'); return; }
        
        const resultState = callCppAndParseJson(this.avlDeleteFunc, key);
        
        if (resultState && resultState.action !== 'error') {
            this.currentTreeState = resultState.tree;
            // FIX: Ensure logs are filtered to remove initial 'Deletion of X started' message 
            this.animationSteps = resultState.steps.filter(s => typeof s === 'string' && !s.includes('Deletion of '));
            this.stepIndex = 0;
            
            document.querySelectorAll('#avl-view .controls button').forEach(btn => btn.disabled = true);
            
            // Initial redraw with deletion highlight
            this.updateVisualization({ tree: this.currentTreeState, focus: key, rotation: null });
            this.animateSteps();
        }
    },

    // --- Animation Driver ---

    animateSteps: function() {
        if (this.stepIndex >= this.animationSteps.length) {
            logStep("AVL Operation complete. Final state reached.", 'success');
            document.querySelectorAll('#avl-view .controls button').forEach(btn => btn.disabled = false);
            this.updateVisualization({ tree: this.currentTreeState }); // Final clear redraw
            return;
        }

        const stepMessage = this.animationSteps[this.stepIndex];
        logStep(`[STEP ${this.stepIndex + 1}] ${stepMessage}`, 'detail');

        // Identify rotation/focus
        let focusNode = stepMessage.match(/at (\d+)/) ? parseInt(stepMessage.match(/at (\d+)/)[1], 10) : null;
        let rotationType = stepMessage.match(/(LL|RR|LR|RL) Case/) ? stepMessage.match(/(LL|RR|LR|RL)/)[0] : null;

        // Redraw the tree with the rotation/focus highlighted
        this.updateVisualization({ tree: this.currentTreeState, focus: focusNode, rotation: rotationType });

        this.stepIndex++;
        setTimeout(() => this.animateSteps(), this.animationDuration);
    },

    clearVisualization: function() {
        document.getElementById('avl-canvas').innerHTML = '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ccc">AVL Tree is Empty</text>';
    },
    
    // --- LAYOUT AND DRAWING CORE FIX ---

    // 1. Recursive function to calculate node X, Y coordinates (In-Order Traversal)
    calculatePosition: function(node, depth) {
        if (!node || node === 'null') return;

        // Recursively calculate left subtree positions
        this.calculatePosition(node.l, depth + 1);
        
        // In-Order traversal logic: Calculate X based on the next available unit
        const x = this.layoutContext.x * this.hSpacing + (this.hSpacing / 2);
        const y = depth * this.vSpacing + 30; // 30px offset from top

        // Store position by node data value (key)
        this.layoutContext.positions.set(node.data, { x: x, y: y, h: node.h, b: node.b });
        
        // Increment the horizontal unit counter
        this.layoutContext.x++;

        // Recursively calculate right subtree positions
        this.calculatePosition(node.r, depth + 1);
    },
    
    updateVisualization: function(state) {
        const svgCanvas = document.getElementById('avl-canvas');
        svgCanvas.innerHTML = '';
        const tree = state.tree || this.currentTreeState;
        
        if (!tree || tree === 'null') {
            this.clearVisualization();
            return;
        }

        const width = svgCanvas.clientWidth || 800;
        const height = svgCanvas.clientHeight || 450;
        
        // 1. Calculate all (x, y) coordinates
        this.layoutContext.x = 0; // Reset horizontal counter
        this.layoutContext.positions.clear();
        this.calculatePosition(tree, 0); 
        
        // 2. Adjust all X coordinates to center the tree
        const totalUnits = this.layoutContext.x;
        const treeWidth = totalUnits * this.hSpacing;
        // Center the tree horizontally within the SVG
        const offsetX = (width - treeWidth) / 2;
        
        // 3. Draw the tree using the calculated positions
        this.drawNodesAndEdges(svgCanvas, tree, offsetX, state.focus, state.rotation);
    },

    // FIX: Simplified recursive drawing to handle connections and nodes in one pass (Root -> Children)
    drawNodesAndEdges: function(svg, node, offsetX, focusNode, rotationType, parentX = 0, parentY = 0) {
        if (!node || node === 'null') return;
        
        const nodeRadius = this.nodeRadius;
        const pos = this.layoutContext.positions.get(node.data);
        const x = pos.x + offsetX;
        const y = pos.y;
        
        const isRoot = (node === this.currentTreeState);

        // --- 1. Draw Edge to Parent (must be before the node itself) ---
        if (!isRoot) {
            // FIX: Draw simple line connecting current node's center to parent's center
            const lineConn = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            lineConn.setAttribute('x1', parentX); 
            lineConn.setAttribute('y1', parentY + nodeRadius); // Start below parent circle
            lineConn.setAttribute('x2', x); 
            lineConn.setAttribute('y2', y - nodeRadius); // End above current node circle
            lineConn.setAttribute('class', 'tree-link');
            svg.appendChild(lineConn);
        }
        
        // --- 2. Draw Node Circle ---
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x); circle.setAttribute('cy', y);
        circle.setAttribute('r', nodeRadius);
        circle.setAttribute('class', 'tree-node-circle');
        
        // Highlight logic
        const isFocus = (node.data === focusNode);
        if (isFocus) circle.classList.add('highlight');
        if (node.b > 1 || node.b < -1) circle.style.fill = '#e74c3c'; // Red if unbalanced

        svg.appendChild(circle);

        // --- 3. Draw Metrics and Data ---
        
        // Data (Value)
        const textData = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textData.setAttribute('x', x); textData.setAttribute('y', y + 5);
        textData.textContent = node.data;
        textData.setAttribute('text-anchor', 'middle');
        textData.setAttribute('class', 'tree-node-text');
        svg.appendChild(textData);
        
        // Balance Factor (BF) - Right of Node
        const textBF = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textBF.setAttribute('x', x + nodeRadius + 5); 
        textBF.setAttribute('y', y + 5);
        textBF.textContent = `BF: ${node.b}`;
        textBF.setAttribute('class', 'metrics-text'); 
        svg.appendChild(textBF);
        
        // Height (H) - Left of Node
        const textHeight = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textHeight.setAttribute('x', x - nodeRadius - 5); 
        textHeight.setAttribute('y', y + 5);
        textHeight.textContent = `H: ${node.h}`;
        textHeight.setAttribute('class', 'metrics-text'); 
        textHeight.setAttribute('text-anchor', 'end');
        svg.appendChild(textHeight);

        // --- 4. Recurse for Children ---
        
        // Left Child
        if (node.l && node.l !== 'null') {
            this.drawNodesAndEdges(svg, node.l, offsetX, focusNode, rotationType, x, y);
        }
        // Right Child
        if (node.r && node.r !== 'null') {
            this.drawNodesAndEdges(svg, node.r, offsetX, focusNode, rotationType, x, y);
        }
    },
    
    // Helper function (No longer used as parent position is passed down, but kept for future compatibility)
    findParent: function(root, targetData, parent = null) {
        if (!root || root === 'null') return null;
        if (root.data === targetData) return parent;
        
        if (targetData < root.data) {
            return this.findParent(root.l, targetData, root);
        } else {
            return this.findParent(root.r, targetData, root);
        }
    }
};

// Register the module with the main app controller
AppRegistry['avl-view'] = AVLApp;