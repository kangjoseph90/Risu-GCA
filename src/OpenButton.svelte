<script lang="ts">
    import MyPopup from './MyPopup.svelte';
    import { Settings } from 'lucide-svelte'

    function onClick(): void {
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        let popup: any;
        popup = new MyPopup({
            target: container,
            props: {
                onClose: () => {
                    popup.$destroy();
                    document.body.removeChild(container);
                }
            }
        });
    }   
</script>

<div class="fixed top-10 right-4 z-50 flex justify-end">
    <button
        class="bg-gray-800 text-white rounded-full p-3 shadow translate-y-2 hover:bg-gray-700 focus:outline-none"
        on:click={onClick}
    >
        <Settings size="28" color="white" />
    </button>
</div>