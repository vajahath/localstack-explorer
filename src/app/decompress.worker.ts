/// <reference lib="webworker" />

addEventListener('message', async ({ data }) => {
    const { buffer } = data;

    if (!buffer) {
        postMessage({ error: 'No buffer provided' });
        return;
    }

    try {
        // Create a stream from the input buffer
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(buffer);
                controller.close();
            }
        });

        // Pipe through GZIP decompression
        const decompressionStream = new DecompressionStream('gzip');
        const decompressedStream = stream.pipeThrough(decompressionStream);

        // Read the result
        const response = new Response(decompressedStream);
        const resultBuffer = await response.arrayBuffer();

        // Decode as text
        const decoder = new TextDecoder();
        const text = decoder.decode(resultBuffer);

        postMessage({ text });
    } catch (error) {
        console.error('Worker decompression failed:', error);
        postMessage({ error: (error as Error).message });
    }
});
