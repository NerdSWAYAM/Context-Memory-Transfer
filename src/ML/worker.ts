/*
 Transformers.js model inference runs off 
 the main thread. The service worker cannot 
 run long tasks, so we use an offscreen document 
 (or a Web Worker spawned by the background) 
 to perform summarisation and embedding without 
 blocking the extension. The offscreen.ts 
 creates a hidden page that hosts the worker.
*/

