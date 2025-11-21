<script lang="ts">
    import Modal from "./Modal.svelte";

    export let id: string;

    function onClick(): void {
        const container = document.createElement("div");
        container.id = "risu-gca-container";
        document.body.appendChild(container);
        const modal = new Modal({
            target: container,
            props: {
                onClose: () => {
                    modal.$destroy();
                    document.body.removeChild(container);
                },
            },
        });
    }
</script>

<button
    class="flex gap-2 items-center hover:text-textcolor text-textcolor2"
    {id}
    on:click={onClick}
>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="M17.788 5.108A9 9 0 1 0 21 12h-8" />
    </svg>
    <span>GCA</span>
</button>
