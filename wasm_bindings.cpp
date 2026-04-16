// File: wasm_bindings.cpp

#include <stdlib.h>

// This file contains simple glue functions, primarily the memory management helper.

extern "C" {

/**
 * Frees a string allocated on the C++ heap.
 * This MUST be called from JavaScript after using the returned char*
 * from any of the other functions to avoid memory leaks.
 * @param s The string pointer to free.
 */
void free_string(char* s) {
    if (s) {
        free(s);
    }
}

} // extern "C"

// Forward declarations for EXPORTED_FUNCTIONS from structures.cpp
extern "C" char* heap_init(int capacity);
extern "C" char* heap_insert(int value);
extern "C" char* heap_extract();
extern "C" char* heap_get_state();