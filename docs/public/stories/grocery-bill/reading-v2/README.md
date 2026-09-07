# grocery-bill: reading revision 2

This presentation revision uses the unchanged source edition e01-bls-2026-09-05-66f1d260. The original edition's raw files and downloads remain available. This adapter accepts the current story state and generates its expanded self-contained HTML.

Reproduce both presentations from the repository with:

`node --import tsx scripts/story-charts/build-previews.ts <empty-output-root>`

An independent consumer needs React and the Semiotic build containing the horizontal distribution and custom-layout color fixes. Import adapter.mjs; read default.packet.json. For groceries, verifyReceiptPacket(packet), then renderBasketHTML(prepareBasket(packet.snapshot, packet.state), packet.snapshot). For planes, importNotePacket(packet, the pinned source snapshot), then renderFlightHTML(snapshot, the imported day, the imported state). Source snapshots are in the named source-edition directory.

Chart shapes express data from the packet; they do not add source observations or numerical claims. Historical data is not refreshed by this presentation revision.
