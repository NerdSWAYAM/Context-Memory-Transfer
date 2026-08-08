/*
 Each AI chat site has different DOM structure.
 The adapter interface exposes a method injectContext(text) 
 that finds the input, sets the value, and optionally triggers send. 
 This keeps injection logic clean and extensible.
*/