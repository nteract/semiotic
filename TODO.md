# TODO Items

## Known Issues

### Canvas Interaction Example Not Rendering
**Status**: Blocked - needs investigation
**Issue**: The canvas-interaction example at `/examples/canvas-interaction` loads but shows a blank page. The diamonds.csv file loads successfully (confirmed in Network tab) but nothing renders.

**What we've tried**:
- Fixed data loading path from bundle-text import to fetch()
- Added error handling and logging
- Data loads successfully (Network tab shows 200 OK for diamonds.csv)
- No errors in console
- Component shows neither "Loading..." nor error state

**Next steps**:
- Check if DocumentComponent or layout is swallowing the render
- Check React DevTools to see if component is mounting
- Verify XYFrame with canvas is rendering correctly in simpler examples
- May be related to the website vs docs target differences

**Files involved**:
- `src/docs/components/CanvasInteraction.js`
- `src/docs/components/CanvasInteractionRaw.js`
- `docs/public/data/diamonds.csv`
