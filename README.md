# LocalStack Explorer [![Build and Deploy to GitHub Pages](https://github.com/vajahath/localstack-explorer/actions/workflows/deploy.yml/badge.svg)](https://github.com/vajahath/localstack-explorer/actions/workflows/deploy.yml) 

A modern, fast, and **privacy-focused** client-side UI for exploring LocalStack S3 buckets.

Use app here: [vajahath.github.io/localstack-explorer](https://vajahath.github.io/localstack-explorer/)

![Demo](ui.webp)

## 🔒 Privacy & Security First

- **Offline & Serverless**: This application runs entirely in your browser. There is no middleman or backend server collecting your data.
- **Local Data Only**: All communication happens directly between your browser and your LocalStack endpoint (usually `localhost`).
- **No Data Leakage**: Your AWS credentials, bucket names, and file contents **never leave your system**.
- **Transparency**: Fully open-source and client-side, allowing you to audit how your data is handled.

## ✨ Features

- 📁 **Miller Column Navigation**: Intuitive multi-column layout for navigating through deeply nested S3 folders and objects.
- 🛡️ **100% Client-Side**: Runs entirely in your browser. No server-side component needed beyond your LocalStack instance.
- 📦 **S3 Object Management**: Browse buckets, list objects, and view detailed metadata with **Pagination Support** for large directories.
- 📤 **High-Performance Uploads**: Effortlessly upload files via **Drag & Drop** or header buttons. Supports **Bulk Uploads** and **S3 Multipart Upload** for large files with real-time progress tracking.
- 📂 **Folder Creation**: Create new S3 folders (directory prefixes) directly within any Miller column via an inline header UI.
- 🏷️ **Custom Metadata Editing**: Easily view, add, edit, and delete custom S3 object metadata via a fast, reactive inline editor.
- 💻 **Code Previews**: Integrated [Monaco Editor](https://microsoft.github.io/monaco-editor/) for high-quality syntax highlighting.
- 🗜️ **Smart Previews**: Automatically handles **GZIP decompression** in a background web worker for compressed log files or data.
- 🧙 **Setup Wizard**: Easy configuration to connect to your local or remote LocalStack instance.
- 🎨 **Modern UI/UX**: Built with a "premium" feel, featuring dark mode support and smooth transitions.
- ⚡ **High Performance**: Leverages Angular Signals for efficient change detection and reactive state management.

## 🛠️ Tech Stack

- **Framework**: [Angular 21+](https://angular.dev/) (using Signals, Standalone Components, and Native Control Flow)
- **SDK**: [AWS SDK for JavaScript v3](https://aws.amazon.com/sdk-for-javascript/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Testing**: [Vitest](https://vitest.dev/)

## 🚀 Getting Started

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [LocalStack](https://localstack.cloud/) running locally (e.g., via Docker)

### 💻 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vajahath/localstack-explorer.git
   cd localstack-explorer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:4200`.

## ⚙️ Configuration

When you first launch the app, use the **Setup Wizard** to configure:
- **Endpoint**: Usually `http://localhost:4566` for LocalStack.
- **Region**: Your default AWS region (e.g., `us-east-1`).
- **Credentials**: Access Key and Secret Key (LocalStack usually accepts `test`/`test`).

## 🧪 Development

### 🏃 Running Tests

To execute unit tests with Vitest:
```bash
npm test
```

### 🏗️ Building for Production

To create a production-ready bundle:
```bash
npm run build
```
The artifacts will be stored in the `dist/` directory.

## 📄 License

This project is licensed under the MIT License.
