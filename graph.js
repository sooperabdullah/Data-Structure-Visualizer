// File: graph.js
// Contains logic specific to the Graph visualizer (BFS, DFS, Dijkstra, Prim's).

const GraphApp = {
    // WASM function references
    graphInitFunc: null,
    graphAddEdgeFunc: null,
    graphRemoveEdgeFunc: null,
    graphRemoveVertexFunc: null,
    graphRunBfsFunc: null,
    graphRunDfsFunc: null,
    graphRunDijkstraFunc: null,
    graphRunPrimsFunc: null, 
    graphGetStateFunc: null,
    bindingsReady: false,

    // Visualization state
    edges: [],
    vertexCount: 0,
    nodePositions: [],
    algorithmSteps: [],
    currentStepIndex: 0,
    visitedNodes: {}, // Status: 0=default, 1=queued/pushed/tentative, 2=visited/finalized
    
    // Algorithm control state
    currentAlgorithm: null, // 'BFS', 'DFS', 'DIJKSTRA', or 'PRIMS'
    currentDistances: null, // Stores distances/keys for Dijkstra/Prim's
    
    // Edges that form the final MST or SP tree
    finalEdges: [], 

    initializeBindings: function() {
        if (!Wasm.isReady) {
            logStep("WASM runtime not ready for Graph bindings.", 'error');
            return;
        }
        // Bind all exported C++ functions
        this.graphInitFunc = Wasm.cwrap('graph_init', 'number', ['number']);
        this.graphAddEdgeFunc = Wasm.cwrap('graph_add_edge', 'number', ['number', 'number', 'number']);
        this.graphRemoveEdgeFunc = Wasm.cwrap('graph_remove_edge', 'number', ['number', 'number']);
        this.graphRemoveVertexFunc = Wasm.cwrap('graph_remove_vertex', 'number', ['number']);
        this.graphRunBfsFunc = Wasm.cwrap('graph_run_bfs', 'number', ['number']);
        this.graphRunDfsFunc = Wasm.cwrap('graph_run_dfs', 'number', ['number']);
        this.graphRunDijkstraFunc = Wasm.cwrap('graph_run_dijkstra', 'number', ['number']);
        this.graphRunPrimsFunc = Wasm.cwrap('graph_run_prims', 'number', ['number']); 
        this.graphGetStateFunc = Wasm.cwrap('graph_get_state', 'number', []);
        this.bindingsReady = true;
        
        // Initial setup only if this view is active
        if (document.querySelector('.view.active').id === 'graph-view') {
             this.init(); 
        }
    },
    
    // --- Layout and Drawing ---

    generateNodePositions: function(count, width, height) {
        const R = Math.min(width, height) / 2.5;
        const centerX = width / 2;
        const centerY = height / 2;
        const positions = [];
        for (let i = 0; i < count; i++) {
            // Use Math.PI / 2 offset to start at the top
            const angle = (i / count) * 2 * Math.PI - (Math.PI / 2);
            const x = centerX + R * Math.cos(angle);
            // FIX: Removed extra 'R *' to correct Y coordinate scaling
            const y = centerY + R * Math.sin(angle); 
            positions.push({ x: x, y: y });
        }
        return positions;
    },

    // Check if an edge (f->t) is part of the final MST/SP tree
    isFinalizedEdge: function(f, t) {
        if (!this.finalEdges) return false;
        // Check for edge f->t
        if (this.finalEdges.some(e => e.f === f && e.t === t)) return true;
        
        // Check for symmetric edge t->f if graph is undirected for MST/Prim's
        if (this.currentAlgorithm === 'PRIMS') {
             return this.finalEdges.some(e => e.f === t && e.t === f);
        }
        return false;
    },

    updateVisualization: function(data) {
        this.edges = data.edges || this.edges;
        this.vertexCount = data.value || this.vertexCount;
        
        const svg = document.getElementById('graph-canvas');
        const width = svg.clientWidth || 800;
        const height = svg.clientHeight || 500;
        svg.innerHTML = '';
        
        if (this.nodePositions.length !== this.vertexCount) {
            this.nodePositions = this.generateNodePositions(this.vertexCount, width, height);
        }
        
        // Draw edges (lines and arrowheads)
        this.edges.forEach(edge => {
        const p1 = this.nodePositions[edge.f];
        const p2 = this.nodePositions[edge.t];
        const r = 25; // node radius (match your circle radius)

        const finalized = this.isFinalizedEdge(edge.f, edge.t);
        const color = finalized ? '#27ae60' : '#95a5a6';
        const strokeWidth = finalized ? 3.5 : 2;

        // SELF-LOOP CASE
        if (edge.f === edge.t) {
            const loopRadius = r + 12; // distance from center to the loop

            const loop = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            loop.setAttribute('cx', p1.x);
            loop.setAttribute('cy', p1.y - loopRadius); // place loop on top of the node
            loop.setAttribute('r', loopRadius);
            loop.setAttribute('fill', 'none');
            loop.setAttribute('stroke', color);
            loop.setAttribute('stroke-width', strokeWidth);
            svg.appendChild(loop);

            // Optional: small arrowhead on the loop
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            arrow.setAttribute('d',
                `M ${p1.x} ${p1.y - loopRadius - 12} 
                L ${p1.x - 8} ${p1.y - loopRadius - 4} 
                L ${p1.x + 8} ${p1.y - loopRadius - 4} Z`);
            arrow.setAttribute('fill', color);
            svg.appendChild(arrow);

            // Weight label above the loop
            const weightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            weightText.setAttribute('x', p1.x);
            weightText.setAttribute('y', p1.y - loopRadius - 20);
            weightText.textContent = edge.w;
            weightText.setAttribute('text-anchor', 'middle');
            weightText.setAttribute('fill', finalized ? '#1e8449' : '#e67e22');
            weightText.setAttribute('font-size', '14px');
            weightText.setAttribute('font-weight', 'bold');
            svg.appendChild(weightText);

            return; // skip normal edge drawing
        }

        // NORMAL EDGE (non-self-loop) – your original code (slightly cleaned)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy) || 1;

        const arrowHeadLen = 15;
        const targetOffset = r + 8;
        const ratio = (length - targetOffset) / length;

        const endX = p1.x + dx * ratio;
        const endY = p1.y + dy * ratio;

        // Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p1.x);
        line.setAttribute('y1', p1.y);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', strokeWidth);
        svg.appendChild(line);

        // Arrowhead
        const arrowhead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrowhead.setAttribute('points', `
            ${endX},${endY}
            ${endX - arrowHeadLen * Math.cos(angle - 0.3)},${endY - arrowHeadLen * Math.sin(angle - 0.3)}
            ${endX - arrowHeadLen * Math.cos(angle + 0.3)},${endY - arrowHeadLen * Math.sin(angle + 0.3)}
        `);
        arrowhead.setAttribute('fill', color);
        svg.appendChild(arrowhead);

        // Weight
        const midX = p1.x + dx * 0.55;
        const midY = p1.y + dy * 0.55;
        const weightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        weightText.setAttribute('x', midX);
        weightText.setAttribute('y', midY - 8);
        weightText.textContent = edge.w;
        weightText.setAttribute('text-anchor', 'middle');
        weightText.setAttribute('fill', finalized ? '#1e8449' : '#e67e22');
        weightText.setAttribute('font-size', '14px');
        weightText.setAttribute('font-weight', 'bold');
        svg.appendChild(weightText);
    });

        // Draw nodes
        for (let i = 0; i < this.vertexCount; i++) {
            const pos = this.nodePositions[i];
            const status = this.visitedNodes[i] || 0; // 0=default, 1=queued/tentative, 2=visited/finalized
            const isFocus = (this.algorithmSteps.length > 0 && this.currentStepIndex > 0 && this.algorithmSteps[this.currentStepIndex - 1].v === i);

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', 25); 
            circle.setAttribute('stroke', '#2c3e50');
            circle.setAttribute('stroke-width', 3);
            
            let fillColor = '#fff';
            if (status === 1) fillColor = '#f1c40f'; // Queued/Tentative (Yellow)
            if (status === 2) fillColor = '#2ecc71'; // Visited/Finalized (Green)
            if (isFocus && status !== 2) fillColor = '#e74c3c'; // Current Focus (Red)

            circle.setAttribute('fill', fillColor);
            circle.setAttribute('class', 'tree-node-circle');
            svg.appendChild(circle);

            // 1. Draw Node ID
            const textID = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textID.setAttribute('x', pos.x);
            textID.setAttribute('y', pos.y - 5);
            textID.textContent = `V: ${i}`;
            textID.setAttribute('text-anchor', 'middle');
            textID.setAttribute('fill', isFocus || status !== 0 ? 'white' : '#333');
            textID.setAttribute('font-weight', 'bold');
            svg.appendChild(textID);
            
            // 2. Draw Distance/Key (Dijkstra/Prim's only)
            if ((this.currentAlgorithm === 'DIJKSTRA' || this.currentAlgorithm === 'PRIMS') && this.currentDistances) {
                const metric = this.currentDistances[i];
                const label = (this.currentAlgorithm === 'DIJKSTRA') ? 'D' : 'K';
                
                const textMetric = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                textMetric.setAttribute('x', pos.x);
                textMetric.setAttribute('y', pos.y + 15);
                textMetric.textContent = `${label}: ${metric}`; // Metric is already string ("INF" or number)
                textMetric.setAttribute('text-anchor', 'middle');
                textMetric.setAttribute('fill', isFocus || status !== 0 ? 'white' : '#333');
                textMetric.setAttribute('font-size', '12px');
                svg.appendChild(textMetric);
            }
        }
    },
    
    // --- General Graph Operations ---

    init: function() {
        if (!this.bindingsReady) return;
        const size = parseInt(document.getElementById('graph-init-size').value, 10);
        const data = callCppAndParseJson(this.graphInitFunc, size);
        if (data) {
            this.vertexCount = size;
            this.resetAlgorithmState();
            this.updateVisualization(data);
            logStep(`Graph initialized with ${size} vertices.`, 'success');
        }
    },

    addEdge: function() {
        if (!this.bindingsReady) return;
        const from = parseInt(document.getElementById('edge-from').value, 10);
        const to = parseInt(document.getElementById('edge-to').value, 10);
        const weight = parseInt(document.getElementById('edge-weight').value, 10);
        const data = callCppAndParseJson(this.graphAddEdgeFunc, from, to, weight);
        if (data) this.updateVisualization(data);
    },

    removeEdge: function() {
        if (!this.bindingsReady) return;
        const from = parseInt(document.getElementById('edge-from').value, 10);
        const to = parseInt(document.getElementById('edge-to').value, 10);
        const data = callCppAndParseJson(this.graphRemoveEdgeFunc, from, to);
        if (data) this.updateVisualization(data);
    },

    // --- Algorithm Control ---
    
    resetAlgorithmState: function() {
        this.visitedNodes = {};
        this.currentAlgorithm = null;
        this.algorithmSteps = [];
        this.currentStepIndex = 0;
        this.currentDistances = null;
        this.finalEdges = []; // Clear final edges
        document.getElementById('algo-step-button').style.display = 'none';
        document.getElementById('queue-state').textContent = 'Queue/Stack/PQ: [ ]';
        
        // Redraw based on current edges (clears highlights)
        const state = callCppAndParseJson(this.graphGetStateFunc);
        if (state) this.updateVisualization(state);
        logStep("Algorithm state reset.", 'info');
    },

    // Unified start function called by UI buttons
    startAlgorithm: function(algorithm) {
        if (!this.bindingsReady) return;
        const startNode = parseInt(document.getElementById('algo-start-node').value, 10);
        
        if (startNode < 0 || startNode >= this.vertexCount) {
            logStep("Invalid start node.", 'error');
            return;
        }

        this.resetAlgorithmState();
        this.currentAlgorithm = algorithm;

        let func;
        if (algorithm === 'BFS') func = this.graphRunBfsFunc;
        else if (algorithm === 'DFS') func = this.graphRunDfsFunc;
        else if (algorithm === 'DIJKSTRA') func = this.graphRunDijkstraFunc;
        else if (algorithm === 'PRIMS') func = this.graphRunPrimsFunc;
        else return;

        // Run C++ to get all steps
        const data = callCppAndParseJson(func, startNode);

        if (data && data.steps && data.steps.length > 0) {
            // Filter out initial/final summary strings (first and last objects are usually final data)
            this.algorithmSteps = data.steps.filter(s => typeof s === 'object');
            
            // Process the final result step immediately to save final edges/costs
            const finalResultStep = data.steps.find(s => typeof s === 'object' && s.action === 'final_result');

            if (finalResultStep) {
                // Save final edges for coloring
                this.finalEdges = finalResultStep.final_sp_edges || finalResultStep.final_mst_edges || [];
            }
            
            if (this.algorithmSteps.length === 0) {
                logStep(`${algorithm} finished instantly or failed to produce steps.`, 'warn');
                return;
            }
            
            document.getElementById('algo-step-button').style.display = 'block';
            logStep(`${algorithm} started from node ${startNode}.`, 'success');
            
            // Start the stepping process
            this.stepAlgorithm(); 
        } else {
            logStep(`${algorithm} failed to run or graph is disconnected.`, 'error');
        }
    },
    
    startBFS: function() { this.startAlgorithm('BFS'); },
    startDFS: function() { this.startAlgorithm('DFS'); },
    startDijkstra: function() { this.startAlgorithm('DIJKSTRA'); },
    startPrims: function() { this.startAlgorithm('PRIMS'); },

    // Unified step function called by the 'Next Step' button
    stepAlgorithm: function() {
        if (this.currentStepIndex >= this.algorithmSteps.length) {
            logStep(`${this.currentAlgorithm} Complete!`, 'success');
            document.getElementById('algo-step-button').style.display = 'none';
            // Mark all visited nodes as finalized (2) for a final green visualization
            Object.keys(this.visitedNodes).forEach(key => this.visitedNodes[key] = 2);
            this.updateVisualization({edges: this.edges});
            return;
        }
        
        const step = this.algorithmSteps[this.currentStepIndex];
        this.updateAlgorithmState(step);
        this.currentStepIndex++;
    },

    // Handles JSON step data and updates internal state for visualization
    updateAlgorithmState: function(step) {
        let statusMessage = '';
        
        // 1. Check for Final Result (Must be handled first)
        if (step.action === 'final_result') {
            const finalCost = step.final_cost || 'N/A';
            const finalDistances = step.final_dist || step.final_key || [];
            
            // Display final result summary
            if (this.currentAlgorithm === 'DIJKSTRA') {
                 logStep(`FINAL DIJKSTRA: Shortest Paths calculated. Distances: ${JSON.stringify(finalDistances)}`, 'success');
            } else if (this.currentAlgorithm === 'PRIMS') {
                 logStep(`FINAL PRIMS MST COST: ${finalCost}`, 'success');
            }
            // Display final edges and arrays
            this.currentDistances = finalDistances;
            this.updateVisualization({edges: this.edges});
            return; // Stop stepping here, final visualization is static
        }


        // 2. Update Visited/Finalized Status
        (step.nodes || []).forEach(n => {
            this.visitedNodes[n.n] = n.s; // n: node, s: status (1=queued, 2=visited)
        });
        
        // 3. Update Queue/Stack/PQ Visualization & Distance/Key
        
        if (this.currentAlgorithm === 'DIJKSTRA' || this.currentAlgorithm === 'PRIMS') {
            
            const isDijkstra = this.currentAlgorithm === 'DIJKSTRA';
            const arrayName = isDijkstra ? 'dist' : 'key';
            const actionLabel = isDijkstra ? 'DIJKSTRA' : 'PRIMS';
            
            // Update distance/key array state
            this.currentDistances = step[arrayName]; // Use dist or key array
            const pqContent = step.pq; // JSON string of PQ content
            
            // Update UI with current PQ status
            document.getElementById('queue-state').textContent = `${actionLabel} PQ: ${pqContent}`; // ADDED LABEL
            
            // Log specific action
            if (step.action === 'extract_min') {
                statusMessage = `${actionLabel}: Extracted minimum ${arrayName} node ${step.v}.`;
            } else if (step.action === 'relax' || step.action === 'key_update') {
                const arrayIndex = step.edge[1];
                statusMessage = `${actionLabel}: ${step.action === 'relax' ? 'Relaxed' : 'Updated Key'} edge ${step.edge[0]} -> ${arrayIndex}. New ${arrayName}: ${this.currentDistances[arrayIndex]}`;
            }
        
        } else if (this.currentAlgorithm === 'BFS') {
            document.getElementById('queue-state').textContent = `BFS Queue: ${step.q}`; // ADDED LABEL
            if (step.action === 'dequeue') {
                 statusMessage = `BFS: Dequeued node ${step.v}. Visiting neighbors.`;
            } else if (step.action === 'enqueue') {
                 statusMessage = `BFS: Enqueued neighbor ${step.v}.`;
            }
            
        } else if (this.currentAlgorithm === 'DFS') {
            document.getElementById('queue-state').textContent = `DFS Stack: ${step.s}`; // ADDED LABEL
            if (step.action === 'visit') {
                 statusMessage = `DFS: Visiting node ${step.v}. Pushed next neighbor.`;
            } else if (step.action === 'pop_backtrack' || step.action === 'pop') {
                 statusMessage = `DFS: Pop/Backtracking from node ${step.v}.`;
            } 
        }
        
        // Log the step action
        if (statusMessage) {
             logStep(statusMessage, 'detail');
        }

        // 4. Redraw with new states
        this.updateVisualization({edges: this.edges});
    }
};

// Register the module with the main app controller
AppRegistry['graph-view'] = GraphApp;