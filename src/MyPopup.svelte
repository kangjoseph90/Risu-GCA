<script lang="ts">
	import { RisuAPI } from './api';
	import { RISU_ARGS, RisuArgType } from './plugin';
	import { X } from 'lucide-svelte';

	export let onClose: () => void;
	
	/* Example Popup Component to manage plugin arguments */ 

	// Store arg values locally
	let argValues: { [key: string]: string | number } = {};
	const argNames = Object.keys(RISU_ARGS);

	// Initialize arg values from RisuAPI
	function initializeValues() {
		argNames.forEach((argName) => {
			argValues[argName] = RisuAPI.getArg(argName) ?? '';
		});
	}

	// Update arg value both locally and in RisuAPI
	function handleArgChange(argName: string, value: string | number) {
		argValues[argName] = value;
		RisuAPI.setArg(argName, value);
	}

	// Close Popup when the background is clicked
	function handleBackgroundClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Initialize values from RisuAPIon component mount
	initializeValues();
</script>

<!-- Popup Background -->
<div
	class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
	on:click={handleBackgroundClick}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
	role="button"
	tabindex="0"
>
	<div class="bg-white p-6 rounded shadow-lg w-96 relative">
		<!-- Close Button -->
		<button
			class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
			on:click={onClose}
			aria-label="Close"
		>
			<X size={24} />
		</button>
		
		<h2 class="text-xl font-bold mb-6 pr-8">Plugin Arguments</h2>
		
		<!-- Render inputs for each argument -->
		{#each argNames as argName (argName)}
			<div class="mb-4">
				<label for={argName} class="block text-sm font-medium text-gray-700 mb-2">
					{argName}
					<span class="text-xs text-gray-500">
						({RISU_ARGS[argName]})
					</span>
				</label>
				
				<!-- String type input -->
				{#if RISU_ARGS[argName] === RisuArgType.String}
					<input
						id={argName}
						type="text"
						value={argValues[argName]}
						on:input={(e) => handleArgChange(argName, e.currentTarget.value)}
						placeholder="Enter text..."
						class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				<!-- Int type input -->
				{:else if RISU_ARGS[argName] === RisuArgType.Int}
					<input
						id={argName}
						type="number"
						value={argValues[argName]}
						on:input={(e) => handleArgChange(argName, parseInt(e.currentTarget.value) || 0)}
						placeholder="Enter number..."
						class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				{/if}
				
				<p class="text-xs text-gray-500 mt-1">
					Current value: <span class="font-mono">{argValues[argName]}</span>
				</p>
			</div>
		{/each}
		
		<button
			class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
			on:click={onClose}
		>
			Done
		</button>
	</div>
</div>