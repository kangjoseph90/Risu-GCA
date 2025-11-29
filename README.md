# Risu GCA (Gemini Code Assist)

This plugin integrates **Gemini Code Assist** as a chat completion provider within RisuAI. It allows you to use Gemini models directly in your chats.

## Features

### Gemini Code Assist Provider

-   **Seamless Integration**: Adds "Gemini Code Assist" to the list of available providers in RisuAI.

### Authentication & Security

-   **Secure Login**: Handles authentication securely using access tokens.
-   **Token Management**: Automatically manages access token expiration and refreshing.

### Model Management

-   **Model Selection**: Choose from available Gemini models.
-   **Configuration**: Customize model parameters to suit your needs.

### User Interface

-   **Easy Setup**: Simple UI for logging in and configuring the provider.
-   **Status Indicators**: Visual indicators for login status and service tier.

---

## Installation & Build

### 1. Install Dependencies

```sh
npm install
```

### 2. Build Plugin

```sh
npm run build
```

This will generate a `dist/risu-gca.js` file.

### 3. Import to RisuAI

Import the generated `dist/risu-gca.js` file into RisuAI as a plugin.

---

## License

This project is licensed under the **MIT License**.
