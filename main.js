// File: main.js
// Central script to manage WASM loading and UI state.

// Global registry for app modules (HeapApp, GraphApp, etc.)
const AppRegistry = {}; 

// WASM Globals - Defined here to ensure they are available globally after module load
let Wasm = {
    isReady: false,
    Module: null,
    cwrap: function(name, returnType, argTypes) {
        if (!Wasm.isReady) {
            console.error(`WASM not ready. Cannot wrap function: ${name}`);
            return () => null;
        }
        return Wasm.Module.cwrap(name, returnType, argTypes);
    }
};

// --- Initialization ---

Module.onRuntimeInitialized = function() {
    Wasm.Module = Module;
    Wasm.isReady = true;
    console.log("WASM Runtime Initialized.");
    
    document.getElementById('wasm-status').textContent = "WASM Status: Ready";
    document.getElementById('wasm-status').style.backgroundColor = "#4CAF50";

    // Initialize the currently active view
    const initialView = document.querySelector('.view.active').id;
    if (AppRegistry[initialView]) {
        AppRegistry[initialView].initializeBindings();
        console.log(`Initialized bindings for ${initialView}.`);
    }

    // Set up navigation active state
    document.querySelector('.nav-sidebar button').classList.add('active');
};


// --- UI Management ---

function changeView(targetId) {
    const views = document.querySelectorAll('.view');
    const buttons = document.querySelectorAll('.nav-sidebar button');
    
    views.forEach(view => {
        view.classList.remove('active');
        if (view.id === targetId) {
            view.classList.add('active');
            
            // Re-initialize bindings for the target view if needed
            if (AppRegistry[targetId] && !AppRegistry[targetId].bindingsReady) {
                AppRegistry[targetId].initializeBindings();
            }
        }
    });

    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-target') === targetId) {
            btn.classList.add('active');
        }
    });

    // Clear logs when switching views
    document.getElementById('step-log').innerHTML = '';
    document.getElementById('queue-state').textContent = '';
}

/**
 * Shared function to log messages to the bottom footer panel.
 */
function logStep(message, type = 'info') {
    const logDiv = document.getElementById('step-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${type.toUpperCase()}] ${message}`;
    logDiv.prepend(entry);
}

/**
 * Shared function to call C++ functions, handle JSON, and clean up memory.
 */
function callCppAndParseJson(cppFunction, ...args) {
    if (!Wasm.isReady) {
        logStep("WASM not ready.", 'error');
        return null;
    }

    const jsonPtr = cppFunction(...args);
    if (jsonPtr === 0) return null;

    const jsonString = Wasm.Module.UTF8ToString(jsonPtr);
    
    // Free C++ allocated memory (CRITICAL)
    const freeStringFunc = Wasm.Module.cwrap('free_string', 'void', ['number']);
    freeStringFunc(jsonPtr);

    try {
        const state = JSON.parse(jsonString);

        if (state.action === 'error') {
            const errorMessage = state.steps.join(' ');
            logStep(errorMessage, 'error');
            return null;
        }

        // Log successful operations (excluding 'state' checks)
        if (state.action !== 'state') {
            logStep(`Action: ${state.action.toUpperCase()} -> Value: ${state.value}`, 'success');
            // Log detailed steps if available (only for non-error actions)
            if (state.steps && state.steps.length > 0) {
                 state.steps.forEach(step => {
                     // Check if step is a detailed object or a simple string
                     if (typeof step === 'string') {
                         logStep(`[DETAIL] ${step}`, 'detail');
                     } else if (step.action === 'enqueue' || step.action === 'dequeue') {
                         logStep(`[BFS] ${step.action}: Node ${step.v}`, 'detail');
                     }
                 });
            }
        }
        
        return state;

    } catch (e) {
        logStep(`Failed to parse JSON: ${jsonString}. Error: ${e}`, 'error');
        return null;
    }
}