<script lang="ts">
    import { popupStore } from './store';
    import { X, AlertCircle, AlertTriangle } from 'lucide-svelte';
    import { onMount } from 'svelte';

    let inputValue = '';
    let inputRef: HTMLInputElement;
    let lastConfig: typeof $popupStore = null;

    $: config = $popupStore;

    function handleConfirm() {
        if (config?.onConfirm) {
            if (config.type === 'prompt') {
                config.onConfirm(inputValue);
            } else {
                config.onConfirm();
            }
        }
    }

    function handleCancel() {
        if (config?.onCancel) {
            config.onCancel();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            if (config?.type === 'alert') {
                handleConfirm();
            } else {
                handleCancel();
            }
        } else if (e.key === 'Enter' && config?.type !== 'prompt') {
            handleConfirm();
        }
    }

    $: if (config !== lastConfig) {
        lastConfig = config;
        if (config && config.type === 'prompt') {
            inputValue = config.defaultValue || '';
            // Focus input after render
            setTimeout(() => {
                inputRef?.focus();
                inputRef?.select();
            }, 0);
        }
    }

    onMount(() => {
        const handleGlobalKeydown = (e: KeyboardEvent) => {
            if (config) {
                handleKeydown(e);
            }
        };
        window.addEventListener('keydown', handleGlobalKeydown);
        return () => window.removeEventListener('keydown', handleGlobalKeydown);
    });
</script>

{#if config}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div 
        class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 pointer-events-auto"
        on:click={() => config.type === 'alert' ? handleConfirm() : handleCancel()}
        on:keydown|stopPropagation
    >
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div 
            class="bg-zinc-900 rounded-lg shadow-2xl border border-zinc-700/60 max-w-sm w-full pointer-events-auto"
            on:click|stopPropagation
        >
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <div class="flex items-center gap-2.5">
                    {#if config.type === 'alert'}
                        <AlertCircle size={18} class="text-zinc-400 flex-shrink-0" />
                    {:else if config.type === 'confirm'}
                        <AlertTriangle size={18} class="text-yellow-400 flex-shrink-0" />
                    {:else}
                        <AlertCircle size={18} class="text-zinc-400 flex-shrink-0" />
                    {/if}
                    <h3 class="text-base font-semibold text-zinc-100">
                        {#if config.type === 'alert'}
                            Alert
                        {:else if config.type === 'confirm'}
                            Confirm
                        {:else}
                            Input
                        {/if}
                    </h3>
                </div>
                <button 
                    class="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
                    on:click|stopPropagation={() => config.type === 'alert' ? handleConfirm() : handleCancel()}
                    title="Close"
                    type="button"
                >
                    <X size={16} />
                </button>
            </div>

            <!-- Body -->
            <div class="px-5 py-4 bg-zinc-900/50">
                <p class="text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">{config.message}</p>
                
                {#if config.type === 'prompt'}
                    <input
                        bind:this={inputRef}
                        bind:value={inputValue}
                        type="text"
                        id="popup-prompt-input"
                        class="mt-4 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-colors"
                        on:keydown={(e) => {
                            if (e.key === 'Enter') {
                                handleConfirm();
                            } else if (e.key === 'Escape') {
                                handleCancel();
                            }
                        }}
                    />
                {/if}
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-2 px-5 py-2 bg-zinc-800/50 rounded-b-lg border-t border-zinc-800">
                {#if config.type === 'alert'}
                    <button
                        type="button"
                        class="px-4 py-2 rounded text-sm font-medium text-zinc-100 bg-zinc-700 hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        on:click|stopPropagation={handleConfirm}
                    >
                        확인
                    </button>
                {:else}
                    <button
                        type="button"
                        class="px-4 py-2 rounded text-sm font-medium text-zinc-100 bg-zinc-700 hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        on:click|stopPropagation={handleConfirm}
                    >
                        확인
                    </button>
                    <button
                        type="button"
                        class="px-4 py-2 rounded text-sm font-medium text-zinc-200 bg-zinc-700/50 hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-500"
                        on:click|stopPropagation={handleCancel}
                    >
                        취소
                    </button>
                {/if}
            </div>
        </div>
    </div>
{/if}
