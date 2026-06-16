// Mobile-friendly, Touch/Pointer-based Drag-and-Drop for "Monster Lab: Evolution"

let activeDrag = null; // Stores info about the currently dragged element

/**
 * Triggers a short vibration on mobile devices.
 */
function triggerVibration() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
    }
}

/**
 * Gets cell type and index/slot.
 * @param {HTMLElement} cell 
 */
function getCellInfo(cell) {
    if (!cell) return null;
    if (cell.classList.contains("incubator-slot")) {
        return {
            type: "incubator",
            index: parseInt(cell.getAttribute("data-slot"), 10),
            cell: cell
        };
    } else if (cell.hasAttribute("data-index")) {
        return {
            type: "inventory",
            index: parseInt(cell.getAttribute("data-index"), 10),
            cell: cell
        };
    }
    return null;
}

/**
 * Initializes PointerEvent-based drag-and-drop on the main container.
 * 
 * @param {HTMLElement} container - The app or layout container containing both grid and incubator
 * @param {Function} onDrop - Callback(source, target) when dropped
 */
export function initDragDrop(container, onDrop) {
    
    // Listen for pointerdown
    container.addEventListener("pointerdown", (e) => {
        const monsterCard = e.target.closest(".monster-card");
        if (!monsterCard) return;

        // Prevent default actions like selecting text/images
        e.preventDefault();
        
        const cell = monsterCard.closest(".grid-cell");
        if (!cell) return;
        
        const sourceInfo = getCellInfo(cell);
        if (!sourceInfo) return;
        
        // LIMITATION: Dragging is ONLY allowed from the inventory grid!
        if (sourceInfo.type !== "inventory") return;
        
        // Setup dragging state
        const rect = monsterCard.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        // Create float preview (clone)
        const preview = monsterCard.cloneNode(true);
        preview.classList.add("dragging-preview");
        preview.style.width = `${rect.width}px`;
        preview.style.height = `${rect.height}px`;
        preview.style.left = `${e.clientX - offsetX}px`;
        preview.style.top = `${e.clientY - offsetY}px`;
        document.body.appendChild(preview);
        
        // Hide the original card during drag
        monsterCard.classList.add("card-hidden");
        
        activeDrag = {
            element: monsterCard,
            preview: preview,
            source: sourceInfo,
            offsetX: offsetX,
            offsetY: offsetY,
            lastHoveredCell: null
        };
        
        // Set pointer capture to capture move/up events even outside the window
        container.setPointerCapture(e.pointerId);
        triggerVibration(); // Vibration feedback on pick up
    });

    container.addEventListener("pointermove", (e) => {
        if (!activeDrag) return;
        
        // Move the preview element
        activeDrag.preview.style.left = `${e.clientX - activeDrag.offsetX}px`;
        activeDrag.preview.style.top = `${e.clientY - activeDrag.offsetY}px`;
        
        // Determine what is under the cursor
        // Temporarily hide preview to not block elementFromPoint
        activeDrag.preview.style.display = "none";
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        activeDrag.preview.style.display = "flex";
        
        // Find closest cell under cursor
        const cellUnderCursor = elementUnderCursor ? elementUnderCursor.closest(".grid-cell") : null;
        
        // Remove previous highlight
        if (activeDrag.lastHoveredCell && activeDrag.lastHoveredCell !== cellUnderCursor) {
            activeDrag.lastHoveredCell.classList.remove("drag-over-occupied", "drag-over-empty");
            activeDrag.lastHoveredCell = null;
        }
        
        if (cellUnderCursor) {
            const targetInfo = getCellInfo(cellUnderCursor);
            
            // LIMITATION: Highlight ONLY if it is an incubator slot!
            if (targetInfo && targetInfo.type === "incubator") {
                activeDrag.lastHoveredCell = cellUnderCursor;
                const isOccupied = cellUnderCursor.querySelector(".monster-card") !== null;
                
                if (isOccupied) {
                    cellUnderCursor.classList.add("drag-over-occupied");
                } else {
                    cellUnderCursor.classList.add("drag-over-empty");
                }
            }
        }
    });

    const handlePointerUp = (e) => {
        if (!activeDrag) return;
        
        // Remove pointer capture
        try {
            container.releasePointerCapture(e.pointerId);
        } catch (err) {}
        
        // Cleanup highlights
        if (activeDrag.lastHoveredCell) {
            activeDrag.lastHoveredCell.classList.remove("drag-over-occupied", "drag-over-empty");
        }
        
        // Find drop location
        activeDrag.preview.style.display = "none";
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        const cellUnderCursor = elementUnderCursor ? elementUnderCursor.closest(".grid-cell") : null;
        
        let actionTriggered = false;
        
        if (cellUnderCursor) {
            const targetInfo = getCellInfo(cellUnderCursor);
            
            // LIMITATION: Can only drop onto incubator slots!
            if (targetInfo && targetInfo.type === "incubator") {
                // Trigger drop callback!
                onDrop(activeDrag.source, targetInfo);
                actionTriggered = true;
            }
        }
        
        // Clean up preview
        activeDrag.preview.remove();
        
        // If no action was performed, show the original card again
        if (!actionTriggered) {
            activeDrag.element.classList.remove("card-hidden");
        }
        
        activeDrag = null;
    };

    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerUp);
}
