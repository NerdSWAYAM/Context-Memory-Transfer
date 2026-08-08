// It takes raw chat messages 
// → calls summariser + entity extractor (via the ML worker) 
// → receives structured JSON → then triggers embedding.
// This layer is completely independent of the UI.