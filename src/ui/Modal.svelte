<script lang="ts">
    import { onMount } from "svelte";
    import { AuthManager } from "../auth";
    import { GCAManager } from "../gca";
    import { ModelManager } from "../model";
    import { RequestType, type ModelParameters } from "../shared/types";
    import { BackupManager } from "../shared/backup";
    import { Logger } from "../shared/logger";
    import { RisuAPI } from "../api";
    import { PROJECT_ID, SERVICE_TIER, OPT_OUT, IS_LOGGED_IN } from "../plugin";
    import { alert, confirm } from "./popup";

    export let onClose: () => void;

    let isLoggedIn = false;
    let userProfile: { name: string; picture: string; email: string } | null =
        null;
    let projectId = "";
    let serviceTier = "";
    let optOut = false;
    let showProfileDropdown = false;
    let showBackupDropdown = false;
    let showRestoreDropdown = false;

    let activeTab: RequestType = RequestType.Chat;

    // Local state for the current tab's config to bind to inputs
    let currentModelId = "";
    let currentParams: ModelParameters = {};

    // Thinking mode state
    let thinkingMode: "level" | "tokens" = "level";

    const requestTypes = Object.values(RequestType).filter(
        (t) => t !== RequestType.Unknown
    );

    let fileInput: HTMLInputElement;

    onMount(async () => {
        await checkLoginStatus();
        loadModelConfig(activeTab);
    });

    async function checkLoginStatus() {
        isLoggedIn = AuthManager.isLoggedIn();
        if (isLoggedIn) {
            try {
                userProfile = await AuthManager.fetchUserProfile();

                // Initialize GCA to get project ID and tier
                try {
                    await GCAManager.ensureInitialized();
                    const gcaInfo = GCAManager.getCachedInfo();
                    projectId = gcaInfo.projectId || "";
                    serviceTier = gcaInfo.serviceTier || "";
                    optOut = gcaInfo.optOut || false;
                } catch (e) {
                    Logger.error("Failed to initialize GCA:", e);
                }
            } catch (e) {
                Logger.error("Error checking login status:", e);
                isLoggedIn = false;
            }
        }
    }

    async function handleLogin() {
        try {
            await AuthManager.login();
            await checkLoginStatus();
        } catch (e) {
            Logger.error("Login failed:", e);
        }
    }

    function handleLogout() {
        AuthManager.logout();
        isLoggedIn = false;
        userProfile = null;
        projectId = "";
        serviceTier = "";
        showProfileDropdown = false;
        showBackupDropdown = false;
        showRestoreDropdown = false;
    }

    function loadModelConfig(type: RequestType) {
        const config = ModelManager.getConfig(type);
        currentModelId = config.model_id;
        currentParams = { ...config.parameters };

        // Determine thinking mode
        if (currentParams.thinking_tokens !== undefined) {
            thinkingMode = "tokens";
        } else {
            thinkingMode = "level";
        }
    }

    function saveCurrentConfig() {
        // Clean up thinking params based on mode
        const paramsToSave = { ...currentParams };
        if (thinkingMode === "level") {
            delete paramsToSave.thinking_tokens;
        } else {
            delete paramsToSave.thinking_level;
        }

        ModelManager.setConfig(activeTab, {
            model_id: currentModelId,
            parameters: paramsToSave,
        });
    }

    function handleTabChange(type: RequestType) {
        saveCurrentConfig(); // Save previous tab
        activeTab = type;
        loadModelConfig(type);
    }

    // Backup Handlers
    async function handleQuickBackup() {
        if (await BackupManager.backup()) {
            await alert("Backup saved successfully!");
        } else {
            await alert("Backup failed.");
        }
        showBackupDropdown = false;
    }

    async function handleQuickRestore() {
        if (
            await confirm(
                "Are you sure you want to restore? Current settings will be overwritten."
            )
        ) {
            if (await BackupManager.restore()) {
                await alert("Restored successfully!");
                await checkLoginStatus();
                loadModelConfig(activeTab);
            } else {
                await alert("Restore failed or no backup found.");
            }
        }
        showRestoreDropdown = false;
    }

    async function handleExport() {
        await BackupManager.exportBackupToFile();
        showBackupDropdown = false;
    }

    function handleImportClick() {
        fileInput.click();
        showRestoreDropdown = false;
    }

    async function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            const file = target.files[0];
            if (await BackupManager.importBackupFromFile(file)) {
                await alert("Imported successfully!");
                await checkLoginStatus();
                loadModelConfig(activeTab);
            } else {
                await alert("Import failed.");
            }
        }
        target.value = ""; // Reset
    }

    // Watch for changes to save automatically (or we could add a save button, but auto-save is nicer)
    $: {
        if (currentModelId || currentParams) {
            // We need to be careful not to trigger this on initial load
            // But since we load values into these variables, it might trigger.
            // For now, let's just call saveCurrentConfig() when values change in the UI
        }
    }

    function formatServiceTier(tier: string): string {
        if (!tier) return "Unknown Tier";
        return tier
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-label-has-associated-control -->
<div
    class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
    on:click={onClose}
    on:keydown={(e) => e.key === "Escape" && onClose()}
    role="button"
    tabindex="0"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="flex flex-col bg-[#1e1e20] w-full max-w-4xl h-[90vh] rounded-xl shadow-2xl border border-zinc-800 overflow-hidden ring-1 ring-white/10 cursor-default"
        on:click|stopPropagation={() => {
            showBackupDropdown = false;
            showRestoreDropdown = false;
            showProfileDropdown = false;
        }}
        role="dialog"
        aria-modal="true"
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between px-6 py-3 bg-[#252528] border-b border-zinc-800 select-none shadow-2xl"
        >
            <div class="flex items-center gap-4">
                <div class="p-2 bg-blue-500/10 rounded-lg">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <div>
                    <h2 class="text-lg font-bold text-zinc-100 tracking-tight">
                        Risu-GCA
                    </h2>
                    <p class="text-xs text-zinc-500 font-medium">
                        Gemini Code Assist Integration
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <!-- Backup Menu -->
                <div class="relative">
                    <button
                        class="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 rounded-lg transition-all duration-200"
                        on:click|stopPropagation={() => {
                            const wasOpen = showBackupDropdown;
                            showBackupDropdown = !wasOpen;
                            showRestoreDropdown = false;
                            showProfileDropdown = false;
                        }}
                        title="Backup"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                        </svg>
                    </button>

                    {#if showBackupDropdown}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="absolute right-0 mt-2 w-56 bg-[#252528] rounded-xl shadow-xl border border-zinc-700/50 py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                            on:click|stopPropagation
                        >
                            <button
                                class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                                on:click={handleQuickBackup}
                            >
                                Backup to Browser
                            </button>
                            <button
                                class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                                on:click={handleExport}
                            >
                                Export to File
                            </button>
                        </div>
                    {/if}
                </div>

                <!-- Restore Menu -->
                <div class="relative">
                    <button
                        class="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 rounded-lg transition-all duration-200"
                        on:click|stopPropagation={() => {
                            const wasOpen = showRestoreDropdown;
                            showRestoreDropdown = !wasOpen;
                            showBackupDropdown = false;
                            showProfileDropdown = false;
                        }}
                        title="Restore"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                    </button>

                    {#if showRestoreDropdown}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <div
                            class="absolute right-0 mt-2 w-56 bg-[#252528] rounded-xl shadow-xl border border-zinc-700/50 py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                            on:click|stopPropagation
                        >
                            <button
                                class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                                on:click={handleQuickRestore}
                            >
                                Restore from Browser
                            </button>
                            <button
                                class="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
                                on:click={handleImportClick}
                            >
                                Import from File
                            </button>
                        </div>
                    {/if}
                    <input
                        type="file"
                        class="hidden"
                        bind:this={fileInput}
                        on:change={handleFileChange}
                        accept=".json"
                    />
                </div>

                <div class="h-6 w-px bg-zinc-700/50 mx-1"></div>

                {#if isLoggedIn && userProfile}
                    <div class="relative">
                        <button
                            class="flex items-center gap-3 pl-4 pr-1 py-1 rounded-full hover:bg-zinc-700/50 transition-all duration-200 group"
                            on:click|stopPropagation={() => {
                                const wasOpen = showProfileDropdown;
                                showProfileDropdown = !wasOpen;
                                showBackupDropdown = false;
                                showRestoreDropdown = false;
                            }}
                        >
                            <span
                                class="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors"
                                >{userProfile.name}</span
                            >
                            <img
                                src={userProfile.picture}
                                alt="Profile"
                                class="w-8 h-8 rounded-full ring-2 ring-zinc-700 group-hover:ring-blue-500/50 transition-all"
                            />
                        </button>

                        {#if showProfileDropdown}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <!-- svelte-ignore a11y-no-static-element-interactions -->
                            <div
                                class="absolute right-0 mt-2 w-72 bg-[#252528] rounded-xl shadow-xl border border-zinc-700/50 z-50 animate-in fade-in zoom-in-95 duration-100"
                                on:click|stopPropagation
                            >
                                <div
                                    class="px-5 py-3 border-b border-zinc-700/50"
                                >
                                    <p class="text-sm font-semibold text-white">
                                        {userProfile.name}
                                    </p>
                                    <p class="text-xs text-zinc-400 mt-0.5">
                                        {userProfile.email}
                                    </p>
                                </div>
                                <div class="px-5 py-3 text-sm space-y-2.5">
                                    <div
                                        class="flex justify-between items-center"
                                    >
                                        <span class="text-zinc-500"
                                            >Project ID</span
                                        >
                                        <span
                                            class="text-zinc-300 font-mono text-xs bg-zinc-800 px-2 py-1 rounded"
                                            >{projectId || "N/A"}</span
                                        >
                                    </div>
                                    <div
                                        class="flex justify-between items-center"
                                    >
                                        <span class="text-zinc-500">Tier</span>
                                        <span class="text-zinc-300 font-medium"
                                            >{formatServiceTier(
                                                serviceTier
                                            )}</span
                                        >
                                    </div>
                                    {#if serviceTier === "free-tier" || serviceTier === "free"}
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <span class="text-zinc-500"
                                                >Opt-out</span
                                            >
                                            <span class="text-zinc-300"
                                                >{optOut ? "Yes" : "No"}</span
                                            >
                                        </div>
                                    {/if}
                                </div>
                                <div
                                    class="border-t border-zinc-700/50 mt-2 py-2 px-2"
                                >
                                    <button
                                        class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2"
                                        on:click={handleLogout}
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                            ></path></svg
                                        >
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <button
                        class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                        on:click={handleLogin}
                    >
                        <svg
                            class="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            ><path
                                d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                            /></svg
                        >
                        Sign in
                    </button>
                {/if}

                <button
                    class="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-all duration-200 ml-1"
                    on:click={onClose}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Body -->
        <div class="flex flex-1 overflow-hidden">
            <!-- Sidebar -->
            <div
                class="w-56 bg-[#202022] border-r border-zinc-800 overflow-y-auto flex flex-col"
            >
                <div class="p-4">
                    <h3
                        class="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-2"
                    >
                        Request Types
                    </h3>
                    <div class="space-y-1">
                        {#each requestTypes as type}
                            <button
                                class="w-full px-3 py-2.5 text-left rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3
                                {activeTab === type
                                    ? 'bg-blue-600/10 text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}"
                                on:click={() => handleTabChange(type)}
                            >
                                <div
                                    class="w-1.5 h-1.5 rounded-full {activeTab ===
                                    type
                                        ? 'bg-blue-400'
                                        : 'bg-zinc-600'}"
                                ></div>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto bg-[#1e1e20]">
                <div class="max-w-3xl mx-auto p-6 space-y-8">
                    <!-- Model Selection -->
                    <div class="space-y-3">
                        <label class="block text-sm font-medium text-zinc-300"
                            >Model Configuration</label
                        >
                        <div class="relative group">
                            <div
                                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                            >
                                <svg
                                    class="h-5 w-5 text-zinc-500 group-focus-within:text-blue-500 transition-colors"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                                    />
                                </svg>
                            </div>
                            <input
                                type="text"
                                bind:value={currentModelId}
                                on:change={saveCurrentConfig}
                                placeholder="e.g. gemini-2.5-pro"
                                class="w-full pl-10 pr-4 py-3 bg-[#252528] border border-zinc-700 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <!-- Parameters -->
                    <div class="space-y-6">
                        <!-- Stream Toggle -->
                        <div
                            class="flex items-center justify-between px-4 py-3 bg-[#252528] rounded-xl border border-zinc-800 shadow-sm"
                        >
                            <label class="text-sm font-medium text-zinc-200"
                                >Streaming Response</label
                            >
                            <button
                                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 {currentParams.use_stream
                                    ? 'bg-blue-600'
                                    : 'bg-zinc-700'}"
                                on:click={() => {
                                    currentParams.use_stream =
                                        !currentParams.use_stream;
                                    saveCurrentConfig();
                                }}
                            >
                                <span class="sr-only">Enable streaming</span>
                                <span
                                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm {currentParams.use_stream
                                        ? 'translate-x-6'
                                        : 'translate-x-1'}"
                                />
                            </button>
                        </div>

                        <div class="grid grid-cols-1 gap-6">
                            <!-- Temperature -->
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <label
                                            class="text-sm font-medium text-zinc-300"
                                            >Temperature</label
                                        >
                                        <!-- Toggle -->
                                        <button
                                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 {currentParams.temperature !==
                                            undefined
                                                ? 'bg-blue-600'
                                                : 'bg-zinc-700'}"
                                            on:click={() => {
                                                if (
                                                    currentParams.temperature !==
                                                    undefined
                                                ) {
                                                    currentParams.temperature =
                                                        undefined;
                                                } else {
                                                    currentParams.temperature = 1.0;
                                                }
                                                saveCurrentConfig();
                                            }}
                                        >
                                            <span class="sr-only"
                                                >Enable Temperature</span
                                            >
                                            <span
                                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm {currentParams.temperature !==
                                                undefined
                                                    ? 'translate-x-4.5'
                                                    : 'translate-x-1'}"
                                                style="transform: translateX({currentParams.temperature !==
                                                undefined
                                                    ? '18px'
                                                    : '4px'});"
                                            />
                                        </button>
                                    </div>
                                    <span
                                        class="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded"
                                        >{currentParams.temperature ??
                                            "Default"}</span
                                    >
                                </div>
                                <div
                                    class="flex gap-4 items-center {currentParams.temperature ===
                                    undefined
                                        ? 'opacity-50'
                                        : ''}"
                                >
                                    <input
                                        type="range"
                                        min="0"
                                        max="2"
                                        step="0.1"
                                        value={currentParams.temperature ?? 1.0}
                                        on:input={(e) => {
                                            currentParams.temperature =
                                                +e.currentTarget.value;
                                            saveCurrentConfig();
                                        }}
                                        class="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            <!-- Top P -->
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <label
                                            class="text-sm font-medium text-zinc-300"
                                            >Top P</label
                                        >
                                        <!-- Toggle -->
                                        <button
                                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 {currentParams.top_p !==
                                            undefined
                                                ? 'bg-blue-600'
                                                : 'bg-zinc-700'}"
                                            on:click={() => {
                                                if (
                                                    currentParams.top_p !==
                                                    undefined
                                                ) {
                                                    currentParams.top_p =
                                                        undefined;
                                                } else {
                                                    currentParams.top_p = 1.0;
                                                }
                                                saveCurrentConfig();
                                            }}
                                        >
                                            <span class="sr-only"
                                                >Enable Top P</span
                                            >
                                            <span
                                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm"
                                                style="transform: translateX({currentParams.top_p !==
                                                undefined
                                                    ? '18px'
                                                    : '4px'});"
                                            />
                                        </button>
                                    </div>
                                    <span
                                        class="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded"
                                        >{currentParams.top_p ??
                                            "Default"}</span
                                    >
                                </div>
                                <div
                                    class="flex gap-4 items-center {currentParams.top_p ===
                                    undefined
                                        ? 'opacity-50'
                                        : ''}"
                                >
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={currentParams.top_p ?? 1.0}
                                        on:input={(e) => {
                                            currentParams.top_p =
                                                +e.currentTarget.value;
                                            saveCurrentConfig();
                                        }}
                                        class="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            <!-- Min P -->
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center gap-3">
                                        <label
                                            class="text-sm font-medium text-zinc-300"
                                            >Min P</label
                                        >
                                        <!-- Toggle -->
                                        <button
                                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 {currentParams.min_p !==
                                            undefined
                                                ? 'bg-blue-600'
                                                : 'bg-zinc-700'}"
                                            on:click={() => {
                                                if (
                                                    currentParams.min_p !==
                                                    undefined
                                                ) {
                                                    currentParams.min_p =
                                                        undefined;
                                                } else {
                                                    currentParams.min_p = 0.0;
                                                }
                                                saveCurrentConfig();
                                            }}
                                        >
                                            <span class="sr-only"
                                                >Enable Min P</span
                                            >
                                            <span
                                                class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm"
                                                style="transform: translateX({currentParams.min_p !==
                                                undefined
                                                    ? '18px'
                                                    : '4px'});"
                                            />
                                        </button>
                                    </div>
                                    <span
                                        class="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded"
                                        >{currentParams.min_p ??
                                            "Default"}</span
                                    >
                                </div>
                                <div
                                    class="flex gap-4 items-center {currentParams.min_p ===
                                    undefined
                                        ? 'opacity-50'
                                        : ''}"
                                >
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={currentParams.min_p ?? 0.0}
                                        on:input={(e) => {
                                            currentParams.min_p =
                                                +e.currentTarget.value;
                                            saveCurrentConfig();
                                        }}
                                        class="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Top K -->
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <label class="text-sm font-medium text-zinc-300"
                                    >Top K</label
                                >
                            </div>
                            <input
                                type="number"
                                bind:value={currentParams.top_k}
                                on:change={saveCurrentConfig}
                                class="w-full px-4 py-2.5 bg-[#252528] border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <!-- Penalties -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-zinc-300"
                                    >Frequency Penalty</label
                                >
                                <input
                                    type="number"
                                    step="0.1"
                                    bind:value={currentParams.frequency_penalty}
                                    on:change={saveCurrentConfig}
                                    class="w-full px-4 py-2.5 bg-[#252528] border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-zinc-300"
                                    >Presence Penalty</label
                                >
                                <input
                                    type="number"
                                    step="0.1"
                                    bind:value={currentParams.presence_penalty}
                                    on:change={saveCurrentConfig}
                                    class="w-full px-4 py-2.5 bg-[#252528] border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div class="space-y-2">
                                <label class="text-sm font-medium text-zinc-300"
                                    >Repetition Penalty</label
                                >
                                <input
                                    type="number"
                                    step="0.1"
                                    bind:value={
                                        currentParams.repetition_penalty
                                    }
                                    on:change={saveCurrentConfig}
                                    class="w-full px-4 py-2.5 bg-[#252528] border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <!-- Thinking -->
                        <div
                            class="space-y-3 px-5 py-3 bg-[#252528] rounded-xl border border-zinc-800 shadow-sm"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <svg
                                        class="w-5 h-5 text-purple-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                        />
                                    </svg>
                                    <label
                                        class="text-sm font-medium text-zinc-200"
                                        >Thinking Configuration</label
                                    >
                                </div>
                                <div
                                    class="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800"
                                >
                                    <button
                                        class="px-3 py-1 text-xs font-medium rounded-md transition-all {thinkingMode ===
                                        'level'
                                            ? 'bg-zinc-700 text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300'}"
                                        on:click={() => {
                                            thinkingMode = "level";
                                            saveCurrentConfig();
                                        }}
                                    >
                                        Level
                                    </button>
                                    <button
                                        class="px-3 py-1 text-xs font-medium rounded-md transition-all {thinkingMode ===
                                        'tokens'
                                            ? 'bg-zinc-700 text-white shadow-sm'
                                            : 'text-zinc-500 hover:text-zinc-300'}"
                                        on:click={() => {
                                            thinkingMode = "tokens";
                                            saveCurrentConfig();
                                        }}
                                    >
                                        Tokens
                                    </button>
                                </div>
                            </div>

                            {#if thinkingMode === "level"}
                                <select
                                    bind:value={currentParams.thinking_level}
                                    on:change={saveCurrentConfig}
                                    class="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value={undefined}>Default</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            {:else}
                                <input
                                    type="number"
                                    bind:value={
                                        currentParams.thinking_tokens
                                    }
                                    on:change={saveCurrentConfig}
                                    placeholder="e.g. 4096"
                                    class="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            {/if}
                        </div>

                        <!-- Media Resolution -->
                        <div class="space-y-2">
                            <label class="text-sm font-medium text-zinc-300"
                                >Media Resolution</label
                            >
                            <select
                                bind:value={currentParams.media_resolution}
                                on:change={saveCurrentConfig}
                                class="w-full px-4 py-2.5 bg-[#252528] border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value={undefined}>Default</option>
                                <option value="media_resolution_low">Low</option
                                >
                                <option value="media_resolution_medium"
                                    >Medium</option
                                >
                                <option value="media_resolution_high"
                                    >High</option
                                >
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
