// File: hash.js
// Contains logic specific to the Hash Table visualizer (Chaining).

const HashApp = {
    // WASM function references
    hashInitFunc: null,
    hashInsertFunc: null,
    hashSearchFunc: null,
    hashDeleteFunc: null,
    hashGetStateFunc: null,
    bindingsReady: false,

    // Visualization state
    currentHashTable: [], // Array of {bucket: N, chain: [v1, v2, ...]}
    hashSize: 0,
    animationDuration: 1000, // Duration for highlighting

    initializeBindings: function() {
        if (!Wasm.isReady) {
            logStep("WASM runtime not ready for Hash bindings.", 'error');
            return;
        }
        // Bind all exported C++ functions
        this.hashInitFunc = Wasm.cwrap('hash_init', 'number', ['number']);
        this.hashInsertFunc = Wasm.cwrap('hash_insert', 'number', ['number']);
        this.hashSearchFunc = Wasm.cwrap('hash_search', 'number', ['number']);
        this.hashDeleteFunc = Wasm.cwrap('hash_delete', 'number', ['number']);
        this.hashGetStateFunc = Wasm.cwrap('hash_get_state', 'number', []);
        this.bindingsReady = true;
        
        // Initial setup only if this view is active
        if (document.querySelector('.view.active').id === 'hash-view') {
             this.init(); 
        }
    },
    
    // --- Core Operations ---
    
    // Helper to robustly get the value from a specific input ID
    getInputValue: function(inputId, operationName) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) {
             logStep(`Error: Input field '${inputId}' not found for ${operationName}. Assuming shared input field.`, 'error');
             // Fallback to the primary input if the dedicated one is missing
             return this.getInputValue('hash-insert-key', operationName);
        }
        const value = parseInt(inputElement.value, 10);
        if (isNaN(value)) { 
             logStep(`Please enter a valid key for ${operationName}.`, 'warn'); 
             return NaN;
        }
        return value;
    },

    init: function() {
        if (!this.bindingsReady) return;
        const size = this.getInputValue('hash-init-size', 'Initialization');
        if (isNaN(size)) return;
        
        const state = callCppAndParseJson(this.hashInitFunc, size);
        if (state && state.action !== 'error') {
            this.hashSize = state.value;
            this.currentHashTable = state.hashTable || [];
            this.updateVisualization(state);
            logStep(`Hash Table initialized with ${this.hashSize} buckets.`, 'success');
        } else {
            this.clearVisualization();
        }
    },

    insert: function() {
        if (!this.bindingsReady) return;
        const value = this.getInputValue('hash-insert-key', 'Insertion');
        if (isNaN(value)) return;
        
        const resultState = callCppAndParseJson(this.hashInsertFunc, value);
        if (resultState && resultState.action !== 'error') {
            this.currentHashTable = resultState.hashTable;
            this.updateVisualization(resultState, { type: 'insert', value: value });
        }
    },

    search: function() {
        if (!this.bindingsReady) return;
        // FIX: Using hash-insert-key as the source for the value (since hash-search-key is missing in HTML)
        const value = this.getInputValue('hash-insert-key', 'Search');
        if (isNaN(value)) return;
        
        // Get the current hash state (search doesn't change structure)
        const currentState = callCppAndParseJson(this.hashGetStateFunc);
        const resultState = callCppAndParseJson(this.hashSearchFunc, value); // Contains logs
        
        if (resultState && resultState.action !== 'error') {
            // Highlight the found node using the pre-search state, but with the result logs
            this.updateVisualization(currentState, { 
                type: 'search', 
                value: value, 
                logs: resultState.steps.join(' ') // Pass the success/fail log message
            });
        }
    },
    
    delete: function() {
        if (!this.bindingsReady) return;
        // FIX: Using hash-insert-key as the source for the value (since hash-delete-key is missing in HTML)
        const value = this.getInputValue('hash-insert-key', 'Deletion');
        if (isNaN(value)) return;
        
        const resultState = callCppAndParseJson(this.hashDeleteFunc, value);
        if (resultState && resultState.action !== 'error') {
            // The result state contains the *new* (post-deletion) table structure
            this.currentHashTable = resultState.hashTable;
            
            this.updateVisualization(resultState, { 
                type: 'delete', 
                value: value, 
                logs: resultState.steps.join(' ') // Pass the success/fail log message
            });
        }
    },
    
    // --- Visualization ---
    
    clearVisualization: function() {
        document.getElementById('hash-table-view').innerHTML = '<h2>Hash Table not initialized.</h2>';
    },

    updateVisualization: function(state, interaction = {}) {
        const hashTableView = document.getElementById('hash-table-view');
        // Use the new hashTable structure if provided, otherwise use the last known state
        const data = state.hashTable || this.currentHashTable; 
        
        if (data.length === 0 && this.hashSize === 0) {
            this.clearVisualization();
            return;
        }
        
        hashTableView.innerHTML = '';
        
        // Determine outcome of the operation from the logs
        const logs = interaction.logs || state.steps.join(' ');
        const isFound = logs.includes("Found value");
        const isDeleted = logs.includes("Deleted value");
        const isNotFound = logs.includes("not found");


        data.forEach(bucket => {
            const bucketIndex = bucket.bucket;
            const chain = bucket.chain || [];
            
            const bucketContainer = document.createElement('div');
            bucketContainer.className = 'hash-bucket-container';

            // 1. Bucket Index (Vertical label)
            const indexLabel = document.createElement('div');
            indexLabel.className = 'bucket-label';
            indexLabel.textContent = `[${bucketIndex}]`;
            
            // Highlight the target bucket for interaction
            if (interaction.value !== undefined) {
                 const targetIndex = this.calculateIndex(interaction.value);
                 if (targetIndex === bucketIndex) {
                     indexLabel.classList.add('highlight');
                     // Flash highlight the bucket
                     setTimeout(() => indexLabel.classList.remove('highlight'), this.animationDuration); 
                 }
            }
            
            bucketContainer.appendChild(indexLabel);

            // 2. Chain Visualization (Horizontal flow)
            const chainContainer = document.createElement('div');
            chainContainer.className = 'hash-chain';

            chain.forEach((value, index) => {
                const node = document.createElement('div');
                node.className = 'chain-node';
                node.textContent = value;
                
                let isHighlighted = false;
                
                // Highlight logic: Only highlight if the value is the target
                if (value === interaction.value) {
                    if (interaction.type === 'search' && isFound) {
                        isHighlighted = true;
                    } else if (interaction.type === 'insert') {
                        isHighlighted = true;
                    } 
                    // Note: For delete, the node is gone, so we just flash the bucket (handled above).
                }
                
                if (isHighlighted) {
                     node.classList.add('highlight');
                     // Flash highlight the node
                     setTimeout(() => node.classList.remove('highlight'), this.animationDuration); 
                }

                chainContainer.appendChild(node);
                
                // Add arrow connector if not the last node
                if (index < chain.length - 1) {
                    const arrow = document.createElement('div');
                    arrow.className = 'chain-arrow';
                    arrow.innerHTML = '&#10140;'; // Rightwards arrow
                    chainContainer.appendChild(arrow);
                }
            });

            bucketContainer.appendChild(chainContainer);
            hashTableView.appendChild(bucketContainer);
        });
        
        // Log the final status
        if (logs) {
             // Use ternary operator to determine log type
             const logType = isFound || state.action === 'insert' || isDeleted ? 'success' : isNotFound ? 'warn' : 'info';
             logStep(`Hash Operation: ${logs}`, logType);
        }
    },
    
    // Helper function to calculate hash index locally (for highlighting purposes)
    calculateIndex: function(value) {
        if (this.hashSize === 0) return -1;
        // Must match C++ logic: return (value % hashSize + hashSize) % hashSize;
        const index = (value % this.hashSize + this.hashSize) % this.hashSize;
        return index;
    }
};

// Register the module with the main app controller
AppRegistry['hash-view'] = HashApp;