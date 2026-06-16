// Yandex Games SDK Integration Wrapper for "Monster Lab: Evolution"

let ysdkInstance = null;
let playerInstance = null;
let isSdkInitialized = false;

// Success merge counter for Interstitial Ads
let successfulMergesCount = 0;

/**
 * Initializes the Yandex Games SDK and loads the Player object.
 */
export async function initYandex() {
    try {
        if (typeof YaGames !== 'undefined') {
            ysdkInstance = await YaGames.init();
            isSdkInitialized = true;
            console.log("Yandex Games SDK initialized successfully.");
            
            try {
                // Initialize player profile, scopes: false avoids authentication dialog popup on startup
                playerInstance = await ysdkInstance.getPlayer({ scopes: false });
                console.log("Yandex Player profile loaded successfully. Status:", playerInstance.getMode());
            } catch (playerError) {
                console.warn("Yandex Player initialization failed/guest mode:", playerError);
            }
            
            // Call ysdk.ready() to inform Yandex platform that the game has loaded
            ysdkInstance.ready();
        } else {
            console.warn("YaGames global object not found. Local offline/fallback mode active.");
        }
    } catch (e) {
        console.error("Yandex SDK initialization error:", e);
    }
}

/**
 * Returns whether Yandex SDK is active.
 */
export function isYandexActive() {
    return isSdkInitialized;
}

/**
 * Checks if the player is authenticated with Yandex.
 */
export function isPlayerAuthorized() {
    if (playerInstance) {
        return playerInstance.getMode() !== 'lite';
    }
    return false;
}

/**
 * Prompts the user to log in to Yandex Games.
 */
export async function requestAuth() {
    if (ysdkInstance && !isPlayerAuthorized()) {
        try {
            await ysdkInstance.auth.openAuthDialog();
            // Reinitialize player after login
            playerInstance = await ysdkInstance.getPlayer({ scopes: false });
            return true;
        } catch (e) {
            console.error("User cancelled or failed authorization dialog:", e);
        }
    }
    return false;
}

/**
 * Retrieves player save data from Yandex Cloud storage.
 */
export async function getCloudData() {
    if (playerInstance) {
        try {
            const data = await playerInstance.getData();
            console.log("Cloud data successfully downloaded:", data);
            return data;
        } catch (e) {
            console.error("Error retrieving cloud data:", e);
        }
    }
    return null;
}

/**
 * Writes player save data to Yandex Cloud storage.
 */
export async function saveCloudData(data) {
    if (playerInstance) {
        try {
            await playerInstance.setData(data, true); // flush = true forces instant synchronization
            console.log("Cloud data successfully saved.");
            return true;
        } catch (e) {
            console.error("Error saving cloud data:", e);
        }
    }
    return false;
}

/**
 * Registers a successful merge to trigger interstitial ads after every 5 merges.
 */
export function registerSuccessfulMerge() {
    successfulMergesCount++;
    console.log(`Merge registered. Total: ${successfulMergesCount}`);
    if (successfulMergesCount % 5 === 0) {
        showInterstitialAd();
    }
}

/**
 * Displays Yandex Interstitial (Fullscreen) Ad.
 */
export function showInterstitialAd() {
    if (ysdkInstance && ysdkInstance.adv) {
        console.log("Triggering Yandex Interstitial Ad...");
        
        // Dispatch event so the game loop and sound manager can pause during ads
        document.dispatchEvent(new CustomEvent('yandex-ad-start'));
        
        ysdkInstance.adv.showFullscreenAdv({
            callbacks: {
                onOpen: () => {
                    console.log("Interstitial Ad Opened: Pausing game.");
                },
                onClose: (wasShown) => {
                    console.log(`Interstitial Ad Closed. wasShown: ${wasShown}. Resuming game.`);
                    document.dispatchEvent(new CustomEvent('yandex-ad-end'));
                },
                onError: (error) => {
                    console.error("Interstitial Ad Error:", error);
                    document.dispatchEvent(new CustomEvent('yandex-ad-end'));
                },
                onOffline: () => {
                    console.warn("Interstitial Ad Offline.");
                    document.dispatchEvent(new CustomEvent('yandex-ad-end'));
                }
            }
        });
    } else {
        console.log("Yandex Ads not initialized. Skipping interstitial (mock environment).");
    }
}

/**
 * Gets the first name of the player from Yandex profile, fallback to "Ученый"
 */
export function getPlayerName() {
    if (playerInstance) {
        try {
            return playerInstance.getName() || "Ученый";
        } catch (e) {
            console.warn("Could not retrieve Yandex player name:", e);
        }
    }
    return "Ученый";
}
