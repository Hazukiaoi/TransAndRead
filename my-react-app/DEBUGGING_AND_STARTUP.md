# Debugging and Startup Guide

## Project Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd my-react-app
    ```

2.  **Install Dependencies:**
    Make sure you have Node.js and npm installed. Then run:
    ```bash
    npm install
    ```

## Running the Application (Development Mode)

To start the application in development mode, run:
```bash
npm run dev
```
This will typically start a development server (often on `http://localhost:5173` or a similar port if using Vite). Open this URL in your web browser to use the application. The server supports Hot Module Replacement (HMR), so changes in the code should reflect in the browser almost immediately.

## Debugging

### Browser Developer Tools
Modern web browsers come with powerful developer tools. You can usually open them by right-clicking on the page and selecting "Inspect" or by pressing `F12`.

-   **Console Tab:**
    -   View application logs: The application uses an in-app console (accessible via the "控制台" menu item) which also mirrors logs to the browser's console.
    -   JavaScript errors and warnings will appear here.
    -   You can execute JavaScript commands in the context of the page.
-   **Elements Tab (or Inspector):**
    -   Inspect the HTML structure and CSS styles of the application.
    -   Modify HTML and CSS in real-time to test changes.
-   **Sources Tab:**
    -   View the source code of the application (often the transpiled JavaScript if not using source maps properly).
    -   Set breakpoints in the JavaScript code to pause execution and inspect variables.
-   **Network Tab:**
    -   Inspect network requests, such as those made to an LLM API.
    -   View request headers, payloads, and responses. This is very useful for debugging LLM API calls.
-   **Application Tab (or Storage):**
    -   Inspect local storage, session storage, cookies, and other browser storage if the application uses them. (Currently, this app primarily manages state in memory and through file downloads/uploads).

### React Developer Tools
It's highly recommended to install the React Developer Tools browser extension (available for Chrome, Firefox, Edge). This extension adds new tabs to your browser's developer tools, specifically for debugging React applications:
-   **Components Tab:** Inspect the React component hierarchy, view component props and state, and modify them in real-time.
-   **Profiler Tab:** Analyze the performance of your React components to identify bottlenecks.

### LLM API Debugging
-   **API Key:** Ensure your LLM API key is correctly entered in the "LLM Configuration" page.
-   **API Address:** Double-check the API address. For OpenAI-compatible APIs, it should typically end with `/v1`. The "Test Server" button uses the address for `/v1/chat/completions`.
-   **Model Name:** Verify the model name is correct and supported by your LLM provider. The "Get from server" button (once fully implemented) will help list available models.
-   **Network Tab:** Use the browser's Network tab to inspect the request and response when using the "Test Server" button or when translations are performed. Check the request payload, headers (especially `Authorization` for the API key), and the response body for error messages from the LLM API.
-   **In-App Console:** The application's console ("控制台") will also log information about LLM API calls and their success or failure.

## Common Troubleshooting
-   **`vite: not found` or similar errors:** This usually means project dependencies are not installed correctly or the `node_modules/.bin` directory is not in your PATH. Running `npm install` again often resolves this. If you're using `npx vite dev` instead of `npm run dev`, ensure Vite is installed globally or locally.
-   **Errors after pulling new changes:** Run `npm install` to ensure you have any new or updated dependencies.
-   **LLM API Errors:**
    -   `401 Unauthorized`: Usually an incorrect or missing API key.
    -   `404 Not Found`: Often an incorrect API address or model name.
    -   `429 Too Many Requests`: You might have exceeded your API rate limits.
    -   Other errors: Check the response body in the Network tab or the in-app console for specific error messages from the LLM provider.
-   **File Handling Issues:** Ensure your browser has permissions to download files if exporting configurations or glossaries. Drag-and-drop might have specific browser behaviors or restrictions.

This guide provides a starting point for running and debugging the application.
